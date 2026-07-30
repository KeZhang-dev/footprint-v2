# 2026-07-29 — RBAC: Admin role enforcement

## Context

`"User"` and `"Admin"` roles have existed since
`specs/2026-07-20-authentication.md` — seeded on startup, carried as a
`role` claim in every JWT — but nothing ever checked the claim. Every
`[Authorize]`-protected endpoint accepted any authenticated user regardless
of role, and no account could ever hold `"Admin"` (registration hardcodes
`"User"`, and there was no promotion path). RBAC existed structurally but
had zero enforcement effect. This session closed that gap: a real
Admin-only endpoint, and a way to actually get an Admin account.

## Outcome

- **`ApplicationUser.CreatedAt`** (`Models/ApplicationUser.cs`) — new
  `DateTime` column, defaulted at object construction. Needed so the new
  admin endpoint can report account creation dates, which nothing tracked
  before. Migration `20260728180643_AddUserCreatedAt` backfills existing
  local accounts to `0001-01-01` (the CLR default) since their real
  creation time was never recorded — cosmetic only, doesn't affect any
  existing behavior.
- **Seeded Admin account** (`Program.cs`, Development-only block, same spot
  as role seeding) — `admin@footprint.com` / `Admin123!`, created via
  `UserManager.CreateAsync` (so it's hashed exactly like any other account)
  and assigned the `"Admin"` role via `AddToRoleAsync`, idempotently
  (skipped if the account already exists). This was the simpler of the two
  options the project owner offered (seeded account vs. a manual promotion
  endpoint) and needs no extra UI or endpoint to use.
- **`GET /api/admin/users`** (`Controllers/AdminController.cs`, new) — the
  first and only role-gated endpoint in the app.
  `[Authorize(Roles = "Admin")]` on the controller. Returns every
  registered user's id, email, display name, resolved role name (joined
  from `AspNetUserRoles`/`AspNetRoles`, defaulting to `"User"` if somehow
  unassigned), and `CreatedAt`, ordered oldest-first. No pagination — the
  user base is small enough that it wasn't worth the complexity for a
  first admin capability.
- **Role-check semantics confirmed distinct from the ownership pattern**:
  ASP.NET Core's built-in `[Authorize(Roles = ...)]` returns `403
  Forbidden` for an authenticated request whose role doesn't match (vs.
  `401` when unauthenticated) — no custom handler needed, this is default
  framework behavior. Verified live against the running API:
  - Admin JWT → `200` with the full user list.
  - Regular User JWT → `403`.
  - No token → `401`.
  This is deliberately different from `TripsController`'s
  ownership-mismatch `404` (see `specs/2026-07-20-authentication.md`) —
  that `404` exists to avoid confirming *that a specific resource id
  exists* to someone who doesn't own it. There's no equivalent concern for
  an admin-only endpoint: its existence isn't a secret, so `403` (correct
  role-based semantics) is the right response rather than borrowing the
  ownership convention.

## How to log in as Admin (dev/demo)

1. Start the API (`dotnet run` from `/API`, or `dotnet run --project API`
   from the repo root) — the seed step runs automatically in Development,
   same as role seeding.
2. `POST /api/auth/login` with `{ "email": "admin@footprint.com",
   "password": "Admin123!" }`. The response's `role` field will be
   `"Admin"` and the JWT carries the `Admin` role claim.
3. Call `GET /api/admin/users` with that token as a Bearer header. A token
   from any other (regular-registration) account gets `403` from the same
   call — useful as the quick way to demonstrate the role check actually
   works, not just that the role exists.

There's currently no frontend surface for this (no admin UI page, no
promotion flow for turning another account into Admin) — this session was
scoped to backend enforcement only, per the project owner's request.

## Key decisions

- **Seeded admin over a promotion endpoint**: the project owner offered
  either; a seeded dev account was simpler and sufficient to unblock
  testing/demo without adding another endpoint's worth of attack surface
  (a promotion endpoint would itself need to be Admin-gated, which is
  circular for the very first Admin).
- **`GET /api/admin/users` as the first Admin capability**: suggested by
  the project owner as a "reasonable admin capability for user
  management" — read-only, so it carries no risk of an admin action
  breaking another user's data while RBAC is still new.
- **`403`, not `404`, for the role check**: role-based access failures and
  ownership-based access failures are different kinds of "no" and
  shouldn't share a status code — see the Outcome section above for the
  reasoning already applied consistently now that both patterns exist
  side by side in the same app.

## Prompts used (this session, in order)

1. > Complete the RBAC feature - roles exist but are never enforced. Add:
   >
   > 1. A way to create/promote an Admin account - either a seeded admin
   >    user on startup (e.g. admin@footprint.com with a known dev
   >    password), or a way for me to manually promote an existing account
   >    to Admin role
   > 2. At least one real Admin-only endpoint, protected with
   >    [Authorize(Roles = "Admin")]. Suggest: GET /api/admin/users - lists
   >    all registered users (id, email, display name, role, created date)
   >    - a reasonable admin capability for user management
   > 3. Confirm: a regular User account hitting this endpoint gets 403
   >    Forbidden (not 404 - this is role-based access, different from the
   >    ownership-based 404 pattern already used elsewhere for good reason)
   > 4. Update specs/ to document RBAC as now fully implemented, including
   >    how to log in as Admin for testing/demo purposes

## Process notes

- A prior `dotnet run` instance (from an earlier session) was holding a
  file lock on the build output; stopped after checking with the project
  owner first (per the standing rule about not touching anything the
  running app might depend on without asking), then rebuilt cleanly.
- Verified with `dotnet build` (0 errors) and a live curl pass against the
  running API: admin login, a fresh regular-user registration, then all
  three response codes above confirmed directly against
  `GET /api/admin/users`.
