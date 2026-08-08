# 2026-08-01 — Gamification: points, badges, leaderboard

## Context

MSA Phase 2 requirement: reward users for sharing trips publicly with
points, badges, and a leaderboard. No backend groundwork existed yet — this
session designs and implements the feature end to end.

## Key decision: points computed on-the-fly, not stored

Points = count of a user's `Trip` rows where `IsPublic == true`. Computed
per-request via a query rather than cached on `ApplicationUser`:

- Trip counts are cheap to query (a single indexed-by-`UserId` count), and
  every other read endpoint in this app (Discover feed, Admin user list,
  the Liked/Saved tabs) already does comparable per-request query work —
  no caching precedent exists anywhere in the codebase.
- A stored/cached point total would need updating at every place trip
  visibility changes — `POST`/`PUT`/`DELETE /api/trips` whenever `IsPublic`
  flips, plus trip deletion — multiple call sites to keep in sync, and a
  missed one silently desyncs a badge. Computing on read removes that
  failure mode entirely.
- No new column, no new migration — stays inside the existing `Trips`
  table.

## Outcome

- **`Models/GamificationDtos.cs`** (new) — `LeaderboardEntry` record
  (`UserId`, `DisplayName`, `AvatarUrl`, `Points`, `Badge`, `Rank`) and a
  `Badges.ForPoints(int points)` static helper — the single source of truth
  for tier thresholds (`>=7` Gold, `>=5` Silver, `>=3` Bronze, else no
  badge), shared by both the leaderboard and the profile response so the
  two can never disagree on a user's tier.
- **`Controllers/LeaderboardController.cs`** (new), `[Authorize]`,
  `api/leaderboard` — matches every other endpoint in this app requiring
  auth (nothing here, including Discover, is public today).
  `GET /api/leaderboard` computes points per user via a correlated
  subquery (`_db.Trips.Count(t => t.UserId == u.Id && t.IsPublic)` inside
  a `Users.Select`), filters out 0-point users, orders by points
  descending then `DisplayName` ascending as a deterministic tiebreak, and
  takes the top 10. Users with no public trips never occupy a leaderboard
  slot — confirmed with the project owner rather than assumed, since "rank
  all users" read literally would otherwise pad empty slots with
  0-point/no-badge users.
- **`ProfileController`** — `ProfileResponse` (`Models/ProfileDtos.cs`)
  gained `Points`/`Badge`. `ToResponse` became an instance method (was
  `static`) so it can query the caller's own public-trip count via the
  controller's `_context`; `GetProfile`, `UpdateProfile`, and
  `UploadAvatar` all return this DTO, so all three now carry the caller's
  points/badge with no extra endpoint needed.

- **Frontend (`/client`)**
  - `api/leaderboard.ts` — `getLeaderboard()`, plain (non-`sessionBound`)
    `handleJson`, matching `api/discover.ts`'s treatment of by-id/list
    reads that aren't "my own resource."
  - `api/profile.ts` — `Profile` gained `points`/`badge`.
  - `Profile/BadgeChip.tsx` (new, shared) — a small colored pill
    (Gold/Silver/Bronze) or "No badge yet" text; used by both the
    leaderboard table and the sidebar so tier colors are defined once.
  - `Profile/LeaderboardTab.tsx` (new) — fetch-on-mount table (rank,
    avatar+name, points, badge), styled after `Admin.tsx`'s table rather
    than the trip-card grid used by Saved/Liked, since rows are compact
    and rank order is the point of the view.
  - `Profile/index.tsx` — added a 4th `'leaderboard'` tab.
  - `Profile/ProfileSidebar.tsx` — shows the caller's own points count and
    `BadgeChip` next to their name, just below the avatar/display-name
    block.

## Prompts used (this session, in order)

1. > Implement the Gamification feature (MSA Phase 2 requirement): points,
   > badges, and a leaderboard. [rules for points/badges/leaderboard;
   > asked for a plan — especially reasoning on computed-vs-stored
   > points — before implementing]
2. > Confirmed: only rank users with at least 1 point (don't pad empty
   > leaderboard slots with 0-point users); keep `[Authorize]` on the
   > leaderboard endpoint. Go ahead with the plan.

## Process notes

- Verified: `npx tsc -b` in `/client` passes clean. `dotnet build` in
  `/API` completes compilation with 0 errors; the only failures reported
  are `MSB3027`/`MSB3021` from the final copy-to-`bin` step, caused by a
  file lock on `Footprint.dll`/`Footprint.exe` from the project owner's
  already-running `dotnet run` instance — same situation as the prior
  Liked/Saved-Trips session, left untouched rather than stopped without
  asking. A live Scalar/browser pass (leaderboard populating as expected,
  sidebar badge appearing after crossing 3/5/7 public trips) is still
  worth doing once the API is restarted.
