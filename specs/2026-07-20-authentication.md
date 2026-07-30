# 2026-07-20 — Authentication

## Context

Up to this point every Trip belonged to nobody in particular — the API had
no concept of a user, and anyone could read, edit, or delete any trip. This
session added user accounts and made trips private to their owner.

## Outcome

- **Backend (`/API`)**
  - ASP.NET Core Identity (`Microsoft.AspNetCore.Identity.EntityFrameworkCore`)
    added to `FootprintDbContext`, which now extends
    `IdentityDbContext<ApplicationUser>` instead of plain `DbContext`.
    `ApplicationUser` (`Models/ApplicationUser.cs`) is a bare `IdentityUser`
    subclass — no extra profile fields yet.
  - Two Identity roles, `"User"` and `"Admin"`, are seeded on startup
    (Development only, alongside the existing auto-migrate step). New
    registrations are always assigned `"User"`; nothing currently grants
    `"Admin"` — that's a hook for future admin-only endpoints, not a feature
    in itself.
  - `POST /api/auth/register` and `POST /api/auth/login`
    (`Controllers/AuthController.cs`) — both take `{ email, password }` and
    return `{ token, userId, email, role, expiresAt }`. Passwords are hashed
    by Identity's default PBKDF2 hasher; nothing custom was written for
    password storage.
  - JWTs are issued by `Services/JwtTokenService.cs` (HMAC-SHA256), carrying
    the user id (`sub` / `NameIdentifier`), email, and role as claims.
    Configuration lives under the `Jwt` section: `Issuer`/`Audience`/
    `ExpiryMinutes` in `appsettings.json`, `Key` in
    `appsettings.Development.json` (a generated dev-only secret — production
    deployment would need this from an environment variable or secret store
    instead, which is out of scope here since the app only targets local
    development).
  - `Program.cs` wires up `AddIdentityCore<ApplicationUser>` +
    `AddRoles<IdentityRole>` + `AddEntityFrameworkStores<FootprintDbContext>`,
    JWT bearer authentication (`AddAuthentication().AddJwtBearer(...)`), and
    `AddAuthorization()`. `UseAuthentication()` now runs before
    `UseAuthorization()` in the pipeline.
  - `Trip` gained a required `UserId` (string, FK to `AspNetUsers`) and a
    `User` navigation property.
  - `TripsController` is now `[Authorize]`-protected. Every action reads the
    caller's id from the `NameIdentifier` claim and filters/stamps `UserId`
    accordingly — `GetTrips` only returns the caller's trips, and
    `GetTrip`/`UpdateTrip`/`DeleteTrip` return `404` (not `403`, to avoid
    revealing that a trip with that id exists) for another user's trip.
  - Create/update no longer bind directly to the `Trip` entity — a new
    `TripRequest` DTO (`Models/TripDtos.cs`) is used instead, since binding
    to `Trip` directly caused model validation to reject requests missing the
    (server-assigned) `UserId` before the action method ever ran.
  - Migration: `20260720104109_AddIdentityAndTripOwnership` adds the full
    Identity schema (`AspNetUsers`, `AspNetRoles`, etc.) and `Trip.UserId`.
    The local dev `footprint.db` (gitignored) was deleted rather than
    migrated in place, since it only had a handful of ownerless test rows
    and a NOT NULL backfill wasn't worth the complexity for local-only data.

- **Frontend (`/client`)**
  - `src/api/auth.ts` — `register`/`login` calls to the new endpoints.
  - `src/auth/session.ts` — reads/writes the JWT + user info as a single
    JSON blob in `localStorage` (`footprint.session`), and treats it as
    absent once past its `expiresAt`.
  - `src/auth/AuthContext.tsx` — React context exposing `session`, `login`,
    `register`, `logout`, backed by `session.ts`.
  - `src/auth/RequireAuth.tsx` — route guard; redirects to `/login` with the
    attempted path in router state so `Login` can send the user back where
    they were headed after a successful login.
  - `src/pages/Login.tsx` / `src/pages/Register.tsx` — new routes at
    `/login` and `/register`.
  - `src/api/trips.ts` — every request now attaches
    `Authorization: Bearer <token>` from `session.ts`; the `PUT` body no
    longer sends `id` (the backend `TripRequest` DTO doesn't need it — see
    above).
  - `App.tsx` nav shows the logged-in email + a Log out button, or a Log in
    link when signed out.
  - `/trips` is now wrapped in `RequireAuth` in `main.tsx`.

## Key decisions

- **JWT over cookies**: specified directly by the project owner. Token is
  stored in `localStorage` (also specified), which is simple but means it's
  readable by any script on the page — acceptable for this project's current
  scope (no third-party scripts), worth revisiting if that changes.
- **ASP.NET Core Identity** for user management and its default PBKDF2
  hashing, rather than a hand-rolled user table/hasher — specified directly.
- **Roles**: `"User"` and `"Admin"` seeded, but only `"User"` is actually
  assignable today (via registration). No admin-only endpoints exist yet;
  the role is present so future work doesn't need another migration.
- **Ownership semantics**: a request for another user's trip returns `404`,
  not `403`, so the API doesn't leak whether a given trip id exists.
- **`TripRequest` DTO**: added mid-session after discovering that binding
  `CreateTrip`/`UpdateTrip` directly to the `Trip` entity broke, because
  `[ApiController]` runs model validation (including `Trip.UserId`'s
  `[Required]`) before the action body executes, and `UserId` is meant to be
  server-assigned from the caller's token, never client-supplied.

## Prompts used (this session, in order)

1. > Add authentication to Footprint. Implement it directly - here are the
   > decisions:
   >
   > 1. Auth approach: JWT tokens
   > 2. User management: ASP.NET Core Identity with EF Core (SQLite), using
   >    its default PBKDF2 password hashing
   > 3. Roles via Identity: "User" and "Admin"
   > 4. New endpoints: POST /api/auth/register, POST /api/auth/login
   >    - Login returns a JWT containing user id and role
   > 5. Protect all /api/trips endpoints with [Authorize]; each user can
   >    only access their own trips (add UserId FK to Trip)
   > 6. Frontend:
   >    - Login and Register pages (React Router)
   >    - Store JWT in localStorage, attach as Bearer token to API calls
   >    - /trips requires login, redirect to /login if not authenticated
   > 7. Update specs/ with this feature's documentation
   >
   > Implement now.

## Process notes

- All decisions were specified up front, so implementation proceeded
  directly: NuGet packages → `ApplicationUser`/`FootprintDbContext` →
  `Trip.UserId` → JWT DTOs/`JwtTokenService` → `AuthController` →
  `Program.cs` wiring (Identity, JWT bearer auth, role seeding) →
  `TripsController` (`[Authorize]` + ownership scoping) → EF Core migration
  → frontend (`api/auth.ts`, `auth/session.ts`, `AuthContext`, `RequireAuth`,
  `Login`/`Register` pages, `trips.ts` Bearer header, nav) → this document.
- Two leftover processes from an earlier session (`Footprint.exe` bound to
  port 5228, a stray Vite dev server bound to port 5173) were locking build
  output/ports and had to be stopped before building and testing — flagged
  to the project owner before killing the first one.
- Verified via `dotnet build`, `npm run build` (`tsc -b` + Vite), and a full
  curl-driven pass through the running API and the Vite dev server's `/api`
  proxy: register two users, confirm unauthenticated `GET /api/trips` is
  `401`, confirm a created trip is only visible to its owner, and confirm a
  second user gets `404` fetching the first user's trip by id.
