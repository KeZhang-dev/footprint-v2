# Footprint

A travel journaling app. Client/server structure:

- `/API` — .NET 10 Web API (Controller-based), EF Core + SQLite, Scalar for
  API docs.
- `/client` — React + TypeScript frontend (Vite), React Router, Tailwind CSS.
- `/specs` — log of AI-assisted development sessions (prompts + decisions),
  one dated Markdown file per session.

## Backend (`/API`)

- Entity: `Trip` (`Models/Trip.cs`) — Id, Title, Destination, StartDate,
  EndDate, Notes, CreatedAt, UserId (owner FK).
- `Data/FootprintDbContext.cs` — EF Core `IdentityDbContext<ApplicationUser>`,
  SQLite (`footprint.db`, connection string in `appsettings.json`).
- Auth: ASP.NET Core Identity (`Models/ApplicationUser.cs`) + JWT bearer
  tokens (`Services/JwtTokenService.cs`). `Controllers/AuthController.cs`
  exposes `POST /api/auth/register` and `POST /api/auth/login`, both
  returning `{ token, userId, email, role, expiresAt }`. Roles `"User"` and
  `"Admin"` are seeded on startup; registration always assigns `"User"`.
  `ApplicationUser.CreatedAt` is stamped at creation (existing pre-migration
  accounts backfilled to `0001-01-01` — real creation time wasn't tracked
  before). JWT signing key lives under `Jwt:Key` in
  `appsettings.Development.json` (dev-only secret — see
  `specs/2026-07-20-authentication.md`).
- RBAC: a seeded Admin account (`admin@footprint.com` / `Admin123!`,
  Development only, `Program.cs`) is the only way to reach the `"Admin"`
  role today — there's no promotion endpoint. `Controllers/
  AdminController.cs` (`[Authorize(Roles = "Admin")]`, `api/admin`) exposes
  `GET /api/admin/users` (id, email, display name, role, created date for
  every registered user) — the only role-gated endpoint in the app; a
  `"User"`-role JWT gets `403` from it (role check, not the ownership `404`
  convention used elsewhere). Role resolution there is grouped, not a
  straight dictionary build, because a user can hold more than one role row
  (e.g. a manually-promoted account keeps its original `"User"` row) —
  `"Admin"` wins if present. See `specs/2026-07-29-rbac-admin.md`.
  `DELETE /api/admin/users/{id}` hard-deletes an account: blocked with `400`
  for deleting yourself or another Admin, otherwise deletes the
  `AspNetUsers` row (which cascades in the database to the user's Trips,
  those Trips' Photos/Likes/Favorites/Comments, and the user's own
  Likes/Favorites/Comments left elsewhere), then separately deletes the
  now-orphaned trip-photo and avatar files from `wwwroot/uploads` — DB
  cascade never touches the filesystem, so those filenames are collected
  *before* the delete and removed from disk *after* it succeeds. See
  `specs/2026-07-29-admin-user-deletion.md`.
- `Controllers/TripsController.cs` — full CRUD at `/api/trips`, `[Authorize]`-
  protected; every trip is scoped to the caller's user id from the JWT, and
  accessing another user's trip returns `404`.
- Photos: `TripPhoto` (`Models/TripPhoto.cs`) — Id, TripId (FK), FileName
  (server-generated, not the client's original name), UploadedAt, computed
  `Url`. `POST /api/trips/{id}/photos` (multipart, owner-only, JPG/PNG only,
  2MB/file max, 10 files/request max) and `DELETE
  /api/trips/{id}/photos/{photoId}` (owner-only) on `TripsController`.
  Files are validated and saved by `Services/PhotoStorageService.cs` to
  `wwwroot/uploads` by default (gitignored, `.gitkeep`d) — overridable via
  `Storage:UploadsPath` (e.g. `Storage__UploadsPath=/data/uploads` on Render,
  landing on the same persistent disk as `ConnectionStrings__FootprintDb`,
  since Render allows only one disk per service) — and served unauthenticated
  at `/uploads/*` via a second `app.UseStaticFiles()` call in `Program.cs`
  pointed at `IPhotoStorageService.UploadsPath`, so the serving path can
  never drift from the save path — see `specs/2026-07-20-photo-upload.md`.
- Profile: `ApplicationUser` also carries `DisplayName`, `Bio` (max 200
  chars), `Interests` (max 300 chars, free text — the frontend treats it as
  comma-separated tags), `AvatarFileName` — a public nickname/bio/avatar
  layered on the Identity user, separate from the login email. `Controllers/
  ProfileController.cs` (`[Authorize]`, `api/profile`) exposes `GET`/`PUT
  /api/profile` (own profile only; email isn't editable here) and `POST
  /api/profile/avatar` (reuses `IPhotoStorageService`, same 2MB/JPG-PNG
  rule as trip photos, deletes the previous avatar file after a successful
  replace). `DisplayName` defaults to the email's local part at
  registration. See `specs/2026-07-21-user-profile.md`.
- Discover: `Trip.IsPublic` (bool, default `false`) gates visibility. `Like`
  and `Favorite` (`Models/Like.cs`, `Favorite.cs`) share a shape — composite
  primary key `(UserId, TripId)`, so "did I like this" is a PK lookup and
  double-liking is structurally impossible. `Comment` (`Models/Comment.cs`)
  has its own `Id` since one user can post many. All three cascade-delete
  with their `Trip` (configured in `FootprintDbContext.OnModelCreating`).
  `TripsController` gained the trip-scoped social actions — `POST`/`DELETE
  /api/trips/{id}/like`, same for `/favorite` (both idempotent — liking
  twice or unliking when not liked is a no-op, not an error), and `GET`/
  `POST /api/trips/{id}/comments` (permanent once posted, no edit/delete).
  All four share one access rule: the trip must be `IsPublic` or owned by
  the caller, else `404`. `Controllers/DiscoverController.cs`
  (`api/discover`) is separate: `GET /api/discover` is the paginated public
  feed (see below), `GET /api/discover/{id}` is the richer detail read
  (author, all photos, like/favorite state) that `GetTrip` deliberately
  doesn't provide, since `GetTrip` stays owner-only by design. See
  `specs/2026-07-22-discover-feature.md`.
- `GET /api/discover` pagination is cursor/keyset, not offset: ordered by
  `CreatedAt DESC, Id DESC`, cursor = base64 of `"{CreatedAt:O}_{Id}"` from
  the last item on a page, next page filters `CreatedAt < cursor.CreatedAt
  OR (CreatedAt == cursor.CreatedAt AND Id < cursor.Id)`. Chosen over
  offset/page-number pagination so the feed stays correct (no
  skipped/duplicated cards) as new public trips appear between page loads.
  `limit` defaults to 20, clamped server-side to 50 max.
- Migrations are applied automatically (`Database.Migrate()`) on startup in
  Development — no manual migration step needed to run locally.
- API docs UI: Scalar, served at `/scalar/v1` in Development (replaces the
  bare OpenAPI JSON endpoint).
- CORS is open to `http://localhost:5173` (the Vite dev server) in
  Development.

Run: `cd API && dotnet run` (or `dotnet run --project API` from repo root).
Root `Footprint.sln` references `API/Footprint.csproj` for
`dotnet build`/Visual Studio.

To add a new migration after model changes: `cd API && dotnet ef migrations
add <Name>` (uses the local `dotnet-ef` tool via `dotnet-tools.json`).

## Frontend (`/client`)

- Vite + React + TypeScript, React Router for navigation, Tailwind CSS v4
  (via `@tailwindcss/vite`), Zustand for session state (see below).
- `src/api/trips.ts` — fetch wrapper for the Trips CRUD endpoints (attaches
  the JWT as a Bearer token to every request) plus `uploadPhotos`/
  `deletePhoto` for trip photos.
- `src/api/auth.ts` — register/login calls.
- `src/api/profile.ts` — `getProfile`/`updateProfile`/`uploadAvatar`, reusing
  `MAX_PHOTO_BYTES`/`ALLOWED_PHOTO_TYPES` from `api/trips.ts` for avatar
  validation.
- `src/api/discover.ts` — feed/detail reads, like/favorite toggles,
  comment list/post. `TripComment` is named that, not `Comment` — the DOM
  lib already declares a global `Comment` interface, and this project has
  already hit one real build break from a local name shadowing something
  reserved (`Profile` the type vs. `Profile` the component).
- `src/api/admin.ts` — `getUsers`/`deleteUser` for the admin panel.
- `src/api/http.ts` — shared `authHeaders()`/`handleJson()` used by
  `trips.ts`, `profile.ts`, and `discover.ts`. `authHeaders()` reads the
  token via `useAuthStore.getState().session?.token` (see below —
  `getState()` outside a component is the supported way to touch a Zustand
  store from non-component code). `handleJson` treats a `401` as an
  expired session everywhere, and a `404` as an expired session only when
  the caller passes `sessionBound: true` (only correct for "my own
  resource" endpoints like `GET /api/profile` — never for by-id lookups
  like `GET /api/trips/{id}`, where `404` legitimately means "not
  found/not yours"). On session expiry it calls `auth/session.ts`'s
  `reportSessionExpired()`, which clears the stored session and fires an
  event `authStore.ts` listens for, turning into a redirect to `/login`
  via the existing `RequireAuth` guard.
- **State management**: session (token/userId/email/role/expiresAt) lives
  in `src/auth/authStore.ts` — a Zustand store (`useAuthStore`), not
  Context. It's seeded from `auth/session.ts`'s `loadSession()`
  (localStorage) and exposes `session`/`login`/`register`/`logout`; the
  `onSessionExpired()` subscription is wired at module scope right after
  the store is created (no React effect needed — the store outlives any
  component). Profile (display name/avatar/bio/interests) is the one thing
  still in `src/auth/AuthContext.tsx` (`useAuth()`) — it needs its own
  fetch-on-session-change effect and a `setProfile()` editing pages call
  after a save so the nav bar stays in sync, which is still naturally a
  Context/provider concern. `src/auth/RequireAuth.tsx` (route guard,
  redirects to `/login` when signed out) reads `session` from
  `useAuthStore`. See `specs/2026-07-26-zustand-session-migration.md` for
  why the boundary sits exactly there. `src/auth/RequireAdmin.tsx` is the
  same idea for `/admin`: no session → `/login`, session but
  `session.role !== "Admin"` → redirect to `/` (never a rendered 403 page —
  the backend `403` from `api/admin.ts` calls is the actual enforcement,
  this guard is UX only). The `App.tsx` nav only renders the "Admin" link
  when `session.role === "Admin"`, so it's absent from the DOM (not just
  hidden) for everyone else.
- `src/pages/` — route components (`Home`, `Trips`, `Login`, `Register`,
  `Profile/`, `Discover/`, `Admin.tsx`). `/trips`, `/profile`, `/discover`
  require auth; `/admin` requires the Admin role (see `RequireAdmin` above).
  `Trips.tsx`'s trip form includes a multi-file JPG/PNG picker (2MB/file,
  validated client- and server-side) plus an "IsPublic" checkbox; trip
  cards show a thumbnail strip with per-photo delete and a "Public" badge.
  `Admin.tsx` is a single table (email, display name, role, created date)
  with a per-row Delete button — hidden for the signed-in admin's own row
  and any other `"Admin"` row, matching the backend's safety checks exactly
  so a click never has to fail. Deleting asks for confirmation via
  `window.confirm` (no custom modal — kept deliberately minimal) and
  refetches the list on success. See
  `specs/2026-07-29-admin-user-deletion.md`.
  `Profile/` is a folder: `index.tsx` owns the fetched profile + active tab
  (`useState`, not routed) and lays out `ProfileSidebar.tsx` (read-only
  avatar/display name/bio/interests-as-tags/placeholder IP location, plus
  the avatar upload control) next to 3 tabs — `EditProfileTab.tsx` (the
  actual display name/bio/interests form, Save button), `SavedTripsTab.tsx`
  and `LikedTripsTab.tsx` (still static placeholders — the backend
  Favorite/Like data they'd need now exists via `api/discover.ts`, but
  wiring these two tabs to it hasn't been done).
  `Discover/` is a folder: `index.tsx` owns the feed (cursor-based "Load
  more") and the open modal's trip id; `TripCard.tsx` is the grid card
  (photo, title, author, like count — read-only, no like button on the
  card itself); `TripModal.tsx` is the detail view (author header, a
  hand-rolled swipeable photo carousel — no new dependency pulled in for
  this — description/dates/location, and a like/favorite/comment action
  bar); `CommentSection.tsx` (list + a post form the modal's Comment button
  shows/hides) lives inside the modal's scroll area.
- Dev server proxies `/api/*` and `/uploads/*` to `http://localhost:5228`
  (see `vite.config.ts`) — run the API first, or requests will fail.

Run: `cd client && npm run dev`. Build: `npm run build` (runs `tsc -b` then
`vite build`).

## Working with the local dev database

**Never delete, reset, or recreate `footprint.db`** (or its `-shm`/`-wal`
files) for testing or cleanup purposes, even in dev, even though it's
gitignored. The app may already be running against it with real local
session/account data. If a clean state is needed to test something, ask the
project owner first, or point a throwaway instance at a separate database
file (e.g. via `ConnectionStrings:FootprintDb` override) — never touch the
one the currently-running app is using.

## Specs (`/specs`)

Each file documents one development session: what changed, key decisions,
and the prompts that drove the work. Add a new dated file
(`YYYY-MM-DD-<topic>.md`) per significant session rather than editing past
entries.
