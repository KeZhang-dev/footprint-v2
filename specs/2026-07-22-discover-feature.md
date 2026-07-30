# 2026-07-22 — Discover Feature

## Context

Trips were private-only up to this point. This session added a public feed
— any trip its owner marks public becomes visible to every user, with
likes, favorites, and comments. This was the largest feature added so far,
so a plan was reviewed and confirmed before implementation, particularly
around the Like/Favorite/Comment table shapes and Discover's pagination
strategy.

## Outcome

- **Backend (`/API`)**
  - `Trip.IsPublic` (bool, default `false`) gates Discover visibility.
  - `Like`/`Favorite` (`Models/Like.cs`, `Favorite.cs`) — identical shape,
    composite primary key `(UserId, TripId)`. This was the central table
    design decision: a composite PK makes "has this user liked this trip"
    a primary-key lookup (`FindAsync(userId, tripId)`) and makes
    double-liking structurally impossible at the DB level — no separate
    unique index needed.
  - `Comment` (`Models/Comment.cs`) — its own `Id`, since one user can post
    many comments on the same trip. Indexed on `TripId`.
  - All three cascade-delete with their `Trip` (`FootprintDbContext
    .OnModelCreating`, the DbContext's first use of Fluent API
    configuration) — deleting a trip cleans up its social data instead of
    hitting an FK violation, since this app has SQLite foreign keys turned
    on.
  - All three also `[JsonIgnore]` their `Trip`/`User` back-references, same
    reasoning as `TripPhoto.Trip` — though moot in practice here, since
    every Discover-facing response is a hand-built DTO, never a raw entity.
  - `TripsController` gained the trip-scoped social actions: `POST`/`DELETE
    /api/trips/{id}/like`, same for `/favorite` (both idempotent — liking
    twice, or unliking when not liked, is a no-op, not an error), and
    `GET`/`POST /api/trips/{id}/comments` (permanent — no edit/delete
    endpoint, matching the requested endpoint list exactly). All four share
    one access rule (`GetAccessibleTripAsync`): the trip must be `IsPublic`
    or owned by the caller, else `404` — same not-found-not-forbidden
    convention the rest of this controller already uses.
  - `Controllers/DiscoverController.cs` (`api/discover`) is new and
    separate from `TripsController`, mirroring how `ProfileController` got
    its own controller rather than living in `TripsController`:
    - `GET /api/discover` — the paginated public feed.
    - `GET /api/discover/{id}` — a richer read (author name/avatar, all
      photo URLs, like/favorite state) than `GetTrip` provides, because
      `GetTrip` is deliberately owner-only and returns a bare `Trip`.
      Relaxing `GetTrip` itself to also serve public trips to other users
      would have conflated two different access models in one action;
      a separate endpoint keeps both simple.
  - Discover DTOs (`Models/DiscoverDtos.cs`): `DiscoverTripSummary` (feed
    card data), `DiscoverFeedResponse` (`{ items, nextCursor }`),
    `DiscoverTripDetail` (modal data), `CommentResponse`,
    `CreateCommentRequest`, `LikeToggleResponse`
    (`{ liked, likeCount }`), `FavoriteToggleResponse` (`{ favorited }`).
    `LikedByMe`/`FavoritedByMe` aren't in the original endpoint list but
    were added as the only way for the like/favorite buttons to render
    filled-vs-outline state.
  - `LikeCount` is computed via `t.Likes.Count` in the EF projection (a SQL
    subquery, never materializes the Like rows). `CoverPhotoUrl` is the
    trip's first photo by `UploadedAt`, or `null` if it has none.
  - Migration: `AddDiscoverFeature` (one migration for `IsPublic` + all
    three new tables together, since they ship as one feature).

- **Pagination** — the other decision explicitly reviewed before building:
  cursor/keyset, not offset. `GET /api/discover` orders by `CreatedAt DESC,
  Id DESC` (composite tie-breaker, since two trips can share a timestamp).
  The cursor is base64 of `"{CreatedAt:O}_{Id}"` from the last item on a
  page; the next page filters `CreatedAt < cursor.CreatedAt OR (CreatedAt
  == cursor.CreatedAt AND Id < cursor.Id)`. The query fetches `limit + 1`
  rows to detect whether there's a next page without a separate `COUNT`
  query; the extra row gets trimmed and its predecessor's cursor becomes
  `nextCursor` (`null` when exhausted). `limit` defaults to 20, clamped
  server-side to a max of 50 regardless of what's requested. Chosen over
  offset/page-number pagination specifically because a live "Load more"
  feed can have new public trips appear between page fetches — keyset
  pagination stays correct (no skipped or duplicated cards) where offset
  pagination would shift.
  - Implementation note: the feed's EF query cannot select
    `TripPhoto.Url` or `ApplicationUser`'s avatar-URL-shaped properties
    directly — those are `[NotMapped]` C# string-interpolation getters,
    which EF Core can't translate to SQL when referenced inside a
    `.Select(...)` that gets translated (as opposed to evaluated
    in-memory after `Include`+materialization, which is what `GetTrip` and
    `GetTripDetail` do). The feed query instead builds URLs with `"/uploads/"
    + fileName` string concatenation, which SQLite/EF Core can translate.

- **Frontend (`/client`)**
  - `api/discover.ts` — feed/detail reads, like/favorite toggles,
    comment list/post, all through the shared `handleJson`/`authHeaders`
    from `api/http.ts` (no `sessionBound` anywhere here — a `404` on a
    by-id trip lookup is a legitimate "not found," never a stale session).
    The comment type is named `TripComment`, not `Comment` — the DOM lib
    already declares a global `Comment` interface (`document
    .createComment()`), and this project already hit one real build
    failure from a local type name colliding with something reserved
    (`Profile` the type vs. `Profile` the page component, in the previous
    session) — not repeating that mistake.
  - `Trips.tsx` gained an "Make this trip public" checkbox in the
    create/edit form, and a small "Public" badge on trip cards that are
    marked public.
  - `pages/Discover/` (new route `/discover`, `RequireAuth`-wrapped, nav
    link added next to Trips):
    - `index.tsx` — owns the feed array, `nextCursor`, and which trip's
      modal is open. "Load more" is a button (not scroll-triggered
      infinite loading) that fetches the next cursor page and appends.
    - `TripCard.tsx` — the grid card: cover photo (or a "No photo"
      placeholder), title, date, author avatar+name, like count. No like
      button on the card itself — liking only happens inside the modal,
      per the original spec ("card: ... like count bottom-right"; the
      like/favorite/comment *buttons* are explicitly modal-only).
    - `TripModal.tsx` — author header, a hand-rolled photo carousel
      (prev/next buttons, dot indicators, swipe via pointer events — no
      new dependency; this project has stayed at just Tailwind + React
      Router and a photo carousel is small enough not to need one),
      title/destination/dates/notes, and a bottom action bar
      (like/favorite/comment). Liking or favoriting inside the modal calls
      back up to `index.tsx` (`onLikeChange`) so the grid's like count
      stays in sync after the modal closes, without needing to refetch the
      whole feed.
    - `CommentSection.tsx` — always shows the existing comment list;
      the "add a comment" input is hidden until the modal's Comment button
      toggles it, and hides again after a successful post.
  - Grid is `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` — reads "minimum 4
    per row" as the wide-screen floor, not literally 4 columns on a phone;
    flagged as an assumption during planning, not corrected.
  - Card photo/info split is vertical (photo on top half, info on bottom
    half) rather than a horizontal photo-left/info-right split — also
    flagged as an assumption during planning, not corrected.

## Key decisions

- **Composite-key Like/Favorite** over a surrogate `Id` + unique index —
  simpler existence checks, uniqueness enforced structurally rather than by
  a separate constraint.
- **Cursor/keyset pagination** over offset — reviewed and confirmed with
  the project owner before implementation specifically because it stays
  correct under concurrent writes to a growing feed, at the cost of not
  supporting "jump to page N" (not needed here — the UI only ever asks for
  "the next page").
- **Separate `DiscoverController`** rather than adding `IsPublic`-aware
  branches into `TripsController`'s existing `GetTrip`/`GetTrips` — keeps
  the owner-only CRUD semantics of `TripsController` unchanged and gives
  the public-facing reads their own, differently-shaped response DTOs.
- **No comment edit/delete, no favorite count anywhere in the UI, no
  anonymous access** — all matching the endpoint list and UI description
  exactly as specified, not extended beyond it.
- **Any user can like/favorite/comment on their own public trip** — no
  special-casing to prevent that.
- **Feed sort order is the trip's original `CreatedAt`**, not a separate
  "made public at" timestamp — a trip flipped public today but created
  months ago appears at its original position in the feed, not bumped to
  the top. Flagged during planning, not corrected.

## Prompts used (this session, in order)

1. > Add a Discover feature - a public feed of trips from all users.
   > Decisions: [IsPublic + toggle; Like/Favorite/Comment entities; the
   > four endpoint groups; grid/card/modal/comment frontend spec as
   > described]. Give me a plan first, especially how you'll structure the
   > Like/Favorite/Comment tables and the pagination for Discover. Do not
   > implement until I confirm.

2. > yes please

(A plan was presented between these two messages, covering the data model,
endpoint/controller placement, and — via a direct question — the
pagination strategy, before any code was written.)

## Process notes

- This was a plan-first feature by explicit request; the only blocking
  question asked before implementation was cursor vs. offset pagination
  (cursor was chosen). Card split orientation and "4 per row" breakpoint
  interpretation were flagged as assumptions in the same plan rather than
  turned into blocking questions, since both are cheap CSS changes to
  revisit later if wrong.
- Implementation proceeded in the order laid out in the plan: `Trip
  .IsPublic` → `Like`/`Favorite`/`Comment` entities + `OnModelCreating` →
  Discover DTOs → `TripsController` social actions → `DiscoverController`
  → migration → frontend (`api/discover.ts`, `IsPublic` toggle in
  `Trips.tsx`, `Discover/` page folder, nav link) → this document.
- One EF Core translation pitfall was caught before it could ship: the
  Discover feed query initially would have tried to `.Select(p => p.Url)`
  inside a database-translated LINQ query — `Url` is a `[NotMapped]` C#
  getter, which EF Core cannot turn into SQL. Fixed by projecting the raw
  `FileName` and building the URL with string concatenation instead
  (translatable), while `GetTripDetail`'s equivalent code is safe to call
  `.Url` directly because it runs on an already-`Include`d, in-memory list
  (LINQ-to-Objects, not LINQ-to-Entities).
- Verified via `dotnet build`, `npm run build`, and a curl-driven pass
  against both the raw API and the Vite dev proxy: created a private and a
  public trip and confirmed only the public one appears in `GET
  /api/discover`; liked/favorited/commented as a second user and confirmed
  idempotent like/unlike; confirmed a second user gets `404` liking,
  favoriting, or commenting on the first user's *private* trip; confirmed
  `GET /api/discover/{id}` on that same private trip also `404`s for a
  non-owner; walked cursor pagination across two pages with `limit=1` and
  confirmed no overlap and a `null` `nextCursor` once exhausted; uploaded a
  photo to a public trip and confirmed both `coverPhotoUrl` (feed) and
  `photoUrls` (detail/carousel) populate. No headless-browser tool is
  available in this environment, so the grid layout, card split, swipeable
  carousel, and comment-input toggle were never visually exercised in an
  actual browser — worth a manual pass before calling this done.
- The already-running dev API and Vite processes (started by the project
  owner in earlier sessions) were stopped and restarted once each, with
  explicit confirmation beforehand, to compile the new entities and apply
  the migration — consistent with the "never delete/reset the database,
  ask before touching the running process" rule established earlier this
  session. `footprint.db` itself was never deleted or reset; all
  pre-existing accounts and trips were confirmed intact after each
  restart.
