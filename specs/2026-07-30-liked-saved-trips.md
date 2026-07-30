# 2026-07-30 — Liked/Saved Trips tabs wired up + response leak fixed

## Context

`Profile/SavedTripsTab.tsx` and `Profile/LikedTripsTab.tsx` have been static
placeholders since `specs/2026-07-21-user-profile.md` — the backend data
(`Like`/`Favorite`, added in `specs/2026-07-22-discover-feature.md`) existed,
but nothing served it to these two tabs. This session's starting point: the
project owner had already added `GET /api/profile/liked-trips` and `GET
/api/profile/saved-trips` to `ProfileController.cs` and confirmed both work
via Scalar. The remaining work was wiring the frontend tabs to them, plus a
requested audit of the two new endpoints' response shape.

## Outcome

- **Response-shape audit found a real leak, fixed.** Both endpoints
  originally did `.Include(l => l.Trip).Select(l => l.Trip)` and returned the
  raw `Trip` entity list. Unlike `Like.User`/`Favorite.User`/`Trip.Likes`
  /`Trip.Favorites`/`Trip.Comments`, `Trip.User` carries no `[JsonIgnore]`
  (`Models/Trip.cs`). If a request's `DbContext` already had an
  `ApplicationUser` tracked — which it does, since both actions call
  `_userManager.GetUserAsync(User)` first — EF Core's identity-map fixup can
  populate `Trip.User` on any trip in the result set whose `UserId` matches a
  tracked user (trivially true for a trip the caller liked/favorited that
  they also own). That serializes the full `ApplicationUser`, including
  `PasswordHash`, `SecurityStamp`, and `ConcurrencyStamp`, straight into the
  JSON response. Fixed by projecting into the existing `DiscoverTripSummary`
  DTO (`Models/DiscoverDtos.cs`, from the Discover feature) instead of
  returning entities — same pattern already used by `GET /api/discover` and
  `GET /api/admin/users` (`AdminUserResponse`). Both endpoints now return
  `List<DiscoverTripSummary>`.
  - `GET /api/profile/liked-trips` — projects from `Likes` ordered by
    `Like.CreatedAt DESC` (most recently liked first); `LikedByMe` is
    hardcoded `true` (the row's existence in `Likes` is what put it in this
    list).
  - `GET /api/profile/saved-trips` — projects from `Favorites` ordered by
    `Favorite.CreatedAt DESC`; `LikedByMe` is computed
    (`Trip.Likes.Any(l => l.UserId == callerId)`), since a saved trip isn't
    necessarily also liked.
  - Neither endpoint needed a new DTO — reusing `DiscoverTripSummary` also
    means the frontend could reuse `TripCard` and `TripModal` unmodified.

- **Frontend (`/client`)**
  - `api/profile.ts` gained `getLikedTrips()`/`getSavedTrips()`, both typed
    `Promise<DiscoverTripSummary[]>` (imported from `api/discover.ts`) and
    routed through the existing `sessionBound` `handleJson` — same
    reasoning as every other `api/profile.ts` call: these are always "my
    own" data, so a `404` can only mean the account behind the token no
    longer exists.
  - `LikedTripsTab.tsx` / `SavedTripsTab.tsx` now fetch on mount and render
    a `TripCard` grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, matching
    `Discover/index.tsx` exactly) with loading/error/empty states. Clicking
    a card opens the same `Discover/TripModal.tsx` used by the Discover
    feed — it fetches `GET /api/discover/{id}`, which already resolves for
    any trip that's public or owned by the caller, so every liked/saved
    trip is guaranteed accessible to it.
  - `TripModal` gained an optional `onFavoriteChange?: (tripId, favorited)`
    prop (parallel to the existing `onLikeChange`), called after a
    successful favorite/unfavorite toggle. Discover's usage doesn't pass it
    (favorite state isn't tracked in that grid). `SavedTripsTab` does pass
    it, and removes a trip from its list as soon as it's unfavorited inside
    the modal, so the tab doesn't show a stale saved trip until the next
    reload. `LikedTripsTab` gets the same live-removal behavior from the
    existing `onLikeChange` — unliking inside the modal drops the card from
    the Liked tab immediately.

## Key decisions

- **Reuse `DiscoverTripSummary` rather than a new Liked/Saved-specific
  DTO** — the two tabs need exactly the same card fields Discover already
  displays, and reusing the type meant `TripCard`/`TripModal` needed zero
  changes to support the new tabs.
- **DTO projection over `[JsonIgnore]` on `Trip.User`** as the fix for the
  leak: a `[JsonIgnore]` would have also silently suppressed `User` from any
  future legitimate use (e.g. if `GetTrip` ever needed to expose owner
  info), and wouldn't address that `TripsController.GetTrip`/`GetTrips`
  still return raw `Trip` entities today — out of scope for this session,
  but worth flagging: any endpoint that returns a raw `Trip` while another
  tracked `ApplicationUser` shares the request's `DbContext` is exposed to
  the same fixup-leak pattern. `TripsController`'s current callers never
  trigger the fixup (no `UserManager` call precedes them in those actions),
  so it isn't an active leak today, but it's fragile — the DTO-projection
  pattern used here, in Discover, and in Admin should be the default for
  any new read endpoint rather than returning entities directly.

## Prompts used (this session, in order)

1. > I added GET /api/profile/liked-trips and GET /api/profile/saved-trips
   > to ProfileController.cs - these are working (tested via Scalar).
   >
   > Now connect the Profile page's "Liked Trips" and "Saved Trips" tabs to
   > actually call these endpoints and display the trips - reuse the
   > existing TripCard component style from Discover. Currently these tabs
   > show no data / no reaction when clicked, they need to be wired up.
   >
   > Also double check: does the response from these two endpoints leak
   > any sensitive User fields (like passwordHash, securityStamp) the way
   > the earlier issue did? If so, fix that too using the same DTO pattern
   > already used elsewhere.
   >
   > Update specs/ documenting this as completing the previously-deferred
   > Liked/Saved Trips feature.

## Process notes

- Verified: `npx tsc -b` in `/client` passes with no errors. `dotnet build`
  in `/API` was blocked purely by a file lock on `Footprint.exe` from the
  project owner's already-running `dotnet run` instance (`MSB3027`/`MSB3021`
  copying the build output) — the compiler itself reported no errors before
  that copy step, and the running process was left untouched rather than
  stopped without asking, per the standing rule about not touching a
  process the user has running. A live curl/Scalar pass against the two
  endpoints and a browser check of both tabs is still worth doing once the
  API is rebuilt and restarted.
