# 2026-07-29 — Admin: hard-delete a user

## Context

`specs/2026-07-29-rbac-admin.md` (earlier the same day) gave the Admin role
its first real capability — a read-only user list — plus a frontend page
for it. This session added the second capability: permanently deleting a
user account and every trace of their data, driven from that same admin
page.

## Outcome

- **`DELETE /api/admin/users/{id}`** (`Controllers/AdminController.cs`,
  `[Authorize(Roles = "Admin")]`):
  1. `404` if the target id doesn't resolve to a user.
  2. `400` (`{ error: "You cannot delete your own account." }`) if the
     caller targets their own id.
  3. `400` (`{ error: "Cannot delete another Admin account." }`) if the
     target holds the `"Admin"` role.
  4. Otherwise: collect the target's trip-photo filenames and avatar
     filename, delete the `AspNetUsers` row via
     `UserManager.DeleteAsync`, then delete each collected file from
     `wwwroot/uploads`. `204` on success.
- **No new migration needed.** All the cascade-delete FKs this relies on
  already existed: `Trips.UserId → AspNetUsers` (cascade, from
  `specs/2026-07-20-authentication.md`), `TripPhotos.TripId → Trips`
  (cascade, from `specs/2026-07-20-photo-upload.md`), and
  `Likes`/`Favorites`/`Comments` → both `Trip` and `User` (cascade on both
  FKs, from `specs/2026-07-22-discover-feature.md`). Deleting the
  `AspNetUsers` row cascades in SQLite itself to: the user's own Trips →
  those Trips' Photos/Likes/Favorites/Comments (regardless of who left
  them), *and separately* the user's own Likes/Favorites/Comments left on
  other people's trips (via the `User`-side FK). Nothing needed
  strengthening — the two-sided cascade already covered every case.
- **Photo files needed explicit handling.** DB cascade happens inside
  SQLite's engine; EF's change tracker never sees the child rows
  disappear, so nothing would have triggered
  `IPhotoStorageService.Delete()` for the orphaned files. Fixed by
  querying `TripPhotos` for the target's trips (plus their
  `AvatarFileName`) *before* the delete, then looping `_photoStorage
  .Delete()` over that list *after* `DeleteAsync` succeeds — so a failed
  delete never touches the filesystem.
- **Bug found and fixed while testing the "can't delete another Admin"
  safety check**: `GetUsers` (added in the earlier session) built its
  role lookup with `ToDictionaryAsync`, which throws
  `ArgumentException: An item with the same key has already been added`
  the moment any user holds more than one role row — exactly the shape a
  manually-promoted account has (its original `"User"` row plus the new
  `"Admin"` row; there's still no promotion endpoint, so this was tested
  by inserting the role row directly). Fixed by grouping by `UserId`
  first and preferring `"Admin"` when a user has multiple roles, instead
  of assuming one role per user. This shipped as part of this session,
  not the prior one, since the prior session's manual testing only ever
  used single-role accounts.
- **Frontend**: `deleteUser(id)` added to `api/admin.ts`. `Admin.tsx` gets
  a Delete button per row, hidden for the signed-in admin's own row and
  any `"Admin"`-role row (mirrors the backend rule so a click can't hit a
  guaranteed `400`). Confirms via `window.confirm("Are you sure you want
  to permanently delete {email} and all their data? This cannot be
  undone.")`, then removes the row from local state and (on failure)
  surfaces the backend's error message inline rather than a silent
  no-op.

## Key decisions

- **`400`, not `403`, for the two safety checks**: the caller *is*
  authorized to hit this endpoint (they're an Admin) — the target is what's
  disallowed, which is a request/business-rule problem, not an
  authorization one. Kept consistent with how the rest of the app already
  distinguishes "you can't do this at all" from "not for this specific
  target."
- **Collect-then-delete ordering for files**: doing the DB delete first
  and only then touching disk means a DB failure (e.g. a constraint issue
  Identity itself rejects) never leaves a half-deleted user with some
  files already gone — the operation is only irreversible once the part
  that actually can't be rolled back (the DB row) has already succeeded.
- **No promotion endpoint, so the multi-role bug had to be tested by
  writing directly to `AspNetUserRoles` via a throwaway script** — flagged
  here rather than silently glossed over, since it's a bypass of the
  normal app surface for the sake of test coverage, not something a real
  admin flow can currently reach on its own. The test account (and its
  extra role row) were fully removed afterward, restoring the DB to only
  the accounts that existed before this session.

## Prompts used (this session, in order)

1. > Add a "Delete user" feature to the Admin panel. When a user is
   > deleted, ALL their data should be permanently removed too - their
   > Trips, TripPhotos (including files from wwwroot/uploads), Likes,
   > Favorites, and Comments. This is a hard delete, not a soft delete -
   > nothing about the user or their content should remain.
   >
   > Backend:
   > 1. New endpoint: DELETE /api/admin/users/{id}, [Authorize(Roles =
   >    "Admin")]
   > 2. Cascade delete all associated data as described above. Confirm/
   >    fix foreign key constraints or migrations as needed for this to
   >    work cleanly.
   > 3. Safety checks: an Admin cannot delete their own account, and
   >    cannot delete another Admin account.
   >
   > Frontend:
   > 1. Add a "Delete" button in each row of the Admin users table
   >    (hidden/disabled for the Admin's own row and other Admin rows)
   > 2. Require a confirmation dialog before deleting ("Are you sure you
   >    want to permanently delete [email] and all their data? This
   >    cannot be undone.")
   > 3. Refresh the list after successful deletion
   >
   > Give me a plan first, especially confirming the physical photo
   > files get deleted from disk too, not just the database records.
2. > Go ahead with this plan

## Process notes

- Verified live, not just by reading the code: registered a disposable
  "victim" and "bystander" account, gave the victim a trip photo and an
  avatar (confirmed both existed on disk first), had each account
  like/comment on the other's public trip, then deleted the victim via
  the new endpoint and directly queried `footprint.db` (read-only, via a
  small Python script — no `sqlite3` CLI available on this machine) to
  confirm every related row was gone: the `AspNetUsers` row, their Trip,
  that Trip's photo row, their Likes/Comments in both directions, and
  their `AspNetUserRoles` row — while the bystander's own trip and data
  were untouched. Separately confirmed the two physical files were
  actually removed from `wwwroot/uploads`, not just their DB rows.
- Also verified the three failure paths directly: an authenticated
  non-admin gets `403`; the seeded admin attempting to delete itself gets
  `400`; and (after temporarily granting a throwaway test account the
  Admin role to get a genuine second Admin to target) deleting another
  Admin gets `400` — which is what surfaced the `GetUsers` multi-role bug
  above.
- All test accounts created for this pass (`rbactest@example.com` left
  over from the prior session, plus this session's victim/bystander/
  second-admin accounts) were removed afterward — the User-role ones via
  the new delete endpoint itself, the throwaway second-admin account via
  direct cleanup since the app correctly refuses to let anyone delete an
  Admin through the API. Final state: only the project owner's real
  accounts and the seeded `admin@footprint.com` remain.
- A leftover `dotnet run` process from earlier testing locked the build
  output twice during this session; stopped each time before rebuilding
  (no uncommitted work was at risk — it was the same throwaway instance
  each time).
