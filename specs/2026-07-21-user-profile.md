# 2026-07-21 — User Profile

## Context

Accounts had nothing but an email/password. This session added a public
profile — display name, bio, avatar — on top of the existing Identity user,
reusing the trip-photo upload machinery for the avatar file itself.

## Outcome

- **Backend (`/API`)**
  - `ApplicationUser` (`Models/ApplicationUser.cs`) gained `DisplayName`
    (`[MaxLength(100)]`), `Bio` (`[MaxLength(200)]`, optional), and
    `AvatarFileName` (optional) — all plain columns on `AspNetUsers` via the
    existing `IdentityDbContext<ApplicationUser>`, no new table.
  - `AuthController.Register` now seeds `DisplayName` from the email's
    local part (`email.Split('@')[0]`) so every account has a sane public
    name from the start — registration still only collects email/password,
    per the original auth session's decisions; nothing there was reopened.
  - `Controllers/ProfileController.cs` (`[Authorize]`, `api/profile`):
    - `GET /api/profile` — the caller's own profile (`ProfileResponse`:
      email, displayName, bio, avatarUrl). There is no `GET
      /api/profile/{userId}` or similar — this feature is "my profile,"
      not public profile pages, matching what was asked.
    - `PUT /api/profile` — updates `DisplayName`/`Bio` only. Email/username
      is intentionally not editable here — the spec was explicit that
      DisplayName is a nickname, not the login identity.
    - `POST /api/profile/avatar` — takes a single `IFormFile file`,
      validated and saved through the *same* `IPhotoStorageService`
      (`Services/PhotoStorageService.cs`) introduced for trip photos, with
      no changes to that service — it was already generic (2MB max,
      JPG/PNG only, GUID filename, saves under `wwwroot/uploads`). On
      success the previous avatar file (if any) is deleted from disk *after*
      the new one is confirmed saved and the user record updated, so a
      failed update never leaves the user without an avatar file.
  - Migration: `AddUserProfile` (adds the three columns to `AspNetUsers`).
  - No changes to `Program.cs` — `IPhotoStorageService` was already
    registered and is now consumed by a second controller.

- **Frontend (`/client`)**
  - `src/api/profile.ts` — `getProfile`, `updateProfile`, `uploadAvatar`
    (multipart, same pattern as `uploadPhotos` in `api/trips.ts`). Imports
    `MAX_PHOTO_BYTES`/`ALLOWED_PHOTO_TYPES` from `api/trips.ts` for
    client-side avatar validation rather than redefining the 2MB/JPG-PNG
    rule a second time.
  - `src/pages/Profile.tsx` — new route at `/profile` (added to
    `main.tsx`, wrapped in the existing `RequireAuth`). Shows the avatar
    (or a generated initial-letter circle when there isn't one yet),
    display name, and bio; a separate "Change avatar" control uploads
    immediately on file selection (no separate save step, since it's a
    single self-contained action); display name/bio are edited in their
    own form with an explicit Save button, per the "editable form with Save
    button" requirement — the two are deliberately independent so a failed
    avatar upload can't block saving text edits or vice versa.
  - `App.tsx` — added a "Profile" nav link, shown only when signed in,
    next to the existing email/Log out controls.

## Key decisions

- **DisplayName default**: not specified by the project owner beyond "the
  public nickname — NOT the login email/username." Defaulting it to the
  email's local part at registration was the simplest way to avoid a
  half-configured profile (empty display name) immediately after signup,
  while still leaving it fully editable on the new Profile page.
- **Avatar upload commits immediately**: chosen over a "select then Save"
  two-step flow because the requirement already treats it as a "separate
  avatar upload control," distinct from the DisplayName/Bio form — an
  avatar has no meaningful "unsaved" intermediate state the way text fields
  do.
- **Reused `IPhotoStorageService` unmodified**: the service was already
  generic over "a photo" (no trip-specific logic lives in it — that's all
  in `TripsController`), so avatars needed zero changes to it, only a new
  caller. Old-avatar cleanup on replace follows the same
  validate-then-save-then-delete-old ordering as trip photo replacement
  logic would, to avoid ever deleting a file before its replacement is
  confirmed persisted.

## Prompts used (this session, in order)

1. > Add a user profile feature. Decisions:
   >
   > 1. Extend the User (Identity) data with a profile:
   >    DisplayName (string, the public nickname - NOT the login email/username),
   >    Bio (string, optional, max 200 chars),
   >    AvatarFileName (string, optional)
   > 2. Reuse the existing photo upload pattern (wwwroot/uploads) for avatars:
   >    max 2MB, jpg/png only
   > 3. New endpoints:
   >    - GET /api/profile (returns the logged-in user's own profile)
   >    - PUT /api/profile (update DisplayName and Bio)
   >    - POST /api/profile/avatar (upload/replace avatar image)
   > 4. Frontend:
   >    - New Profile page (React Router), accessible from the nav
   >    - Shows current avatar, DisplayName, Bio
   >    - Editable form with Save button for DisplayName and Bio
   >    - Separate avatar upload control
   > 5. Add Profile link to the navigation
   > 6. Update specs/ when done
   >
   > Implement now.

## Process notes

- All decisions were specified up front; implementation proceeded directly:
  `ApplicationUser` fields → registration default → `ProfileDtos`/
  `ProfileController` (reusing `IPhotoStorageService`) → migration →
  frontend (`api/profile.ts`, `Profile.tsx`, route, nav link) → this
  document.
- One naming collision surfaced at the TypeScript build step:
  `Profile.tsx` imported the `Profile` type from `api/profile.ts` into a
  module that also declares a component named `Profile`, which
  `verbatimModuleSyntax` rejected (`TS1485`) once re-exported as the page's
  default export. Fixed by aliasing the import (`type Profile as
  ProfileData`) rather than renaming the page component, since the
  component name is what shows up in `main.tsx`/routing and matches the
  file name.
- Verified via `dotnet build`, `npm run build`, and a curl-driven pass
  against both the raw API and the Vite dev proxy: registered a user and
  confirmed the default `DisplayName`; updated display name/bio and
  confirmed the response; uploaded a JPG avatar, confirmed it's served at
  its URL; replaced it with a PNG and confirmed the old file was deleted
  from disk (404 on its old URL) while the DB pointed at the new one;
  confirmed unauthenticated `GET /api/profile` is `401` and a second user
  only ever sees their own profile; confirmed a >2MB avatar and a >200-char
  bio are both rejected with `400`. No headless-browser tool is available
  in this environment, so the Profile page itself (avatar circle fallback,
  the upload control, the Save button) wasn't visually exercised in an
  actual browser — worth a manual pass before calling this done.
- No leftover dev-server processes this time — the ones from the previous
  session's cleanup stayed down, and the only new one (this session's own
  Vite instance on 5173) was stopped deliberately at the end rather than
  left running.
