# 2026-07-26 — Session State Migration to Zustand

## Context

Per MSA Phase 2's state management requirement, session state (the logged-in
user's token/identity) moves from `AuthContext` (React Context) to a
Zustand store. Profile state (display name, avatar, bio, interests) stays
in Context — this was a deliberate boundary decision confirmed with the
project owner before implementation, not a full replacement of Context with
Zustand everywhere.

## Outcome

- **`client/src/auth/authStore.ts`** (new) — a Zustand store (`useAuthStore`)
  holding `session: Session | null` plus `login`/`register`/`logout`
  actions. Initialized synchronously from `session.ts`'s `loadSession()` in
  the store creator. `login`/`register` call the existing `api/auth.ts`
  functions and persist via `saveSession()`; `logout` calls `clearSession()`.
  The `onSessionExpired()` subscription (previously wired inside
  `AuthContext` via a mount-effect) now lives at module scope in this file —
  `onSessionExpired(() => useAuthStore.setState({ session: null }))` right
  after the store is created. This didn't need a React effect even before;
  the store is a singleton for the page's whole lifetime either way, and
  putting the subscription at module scope is the more natural fit for a
  store that exists independent of any component tree.
- **`client/src/auth/AuthContext.tsx`** — now profile-only. `AuthContextValue`
  dropped `session`, `login`, `register`, `logout` entirely; only `profile`
  and `setProfile` remain. Its profile-fetch effect (which was keyed on its
  own `session` state) now reads `session` reactively from
  `useAuthStore((s) => s.session)` instead, so it still refetches on
  login/logout/session-expiry — it just no longer *owns* that value.
  `logout()` no longer needs to explicitly clear `profile`; that happens
  naturally when the effect observes the store's `session` become `null`.
- **`client/src/auth/session.ts`** — dropped `getToken()` (its only caller,
  `api/http.ts`, now reads the Zustand store directly — see below). Kept
  `loadSession`/`saveSession`/`clearSession`/`reportSessionExpired`/
  `onSessionExpired`, which the store is built on top of, not a replacement
  for.
- **`client/src/api/http.ts`** — `authHeaders()` changed from
  `getToken()` (which called `loadSession()`, re-parsing `localStorage` and
  re-checking `expiresAt` on *every single API call*) to
  `useAuthStore.getState().session?.token` — a plain in-memory property
  read. `getState()` outside a component is exactly Zustand's
  "accessible outside React" feature, and it's the same mechanism the
  store's own `onSessionExpired` listener uses. This does drop the
  per-request client-side expiry pre-check — not a correctness regression,
  since the server is the real authority on token expiry and already
  returns `401` for an expired token regardless, which still flows through
  the same `reportSessionExpired()` path. The client-side expiry check still
  runs once, at store-init time and whenever `onSessionExpired` fires.
- **Consumers updated** to read session from `useAuthStore()` instead of
  `useAuth()`: `App.tsx` (now uses *both* — `useAuth()` for `profile`,
  `useAuthStore()` for `session`/`logout`), `RequireAuth.tsx`, `Login.tsx`,
  `Register.tsx`, `Home/Hero.tsx`. `Profile/index.tsx` needed no change —
  it only ever touched `setProfile`, never `session`.

## Key decisions

- **Boundary: session → Zustand, profile → Context, not everything → Zustand.**
  Specified directly by the project owner and confirmed in the plan before
  implementation. Profile still needs its own fetch-on-session-change
  effect and a way for editing pages to push fresh data back in
  (`setProfile`) — that's still naturally a Context/provider concern, not
  something the migration needed to touch.
- **`onSessionExpired` subscription moved to module scope, not a React hook
  inside the store.** Zustand stores don't need a component to exist; tying
  the event subscription to a component's mount lifecycle (as the old
  `useEffect(() => onSessionExpired(...), [])` in `AuthContext` did) was
  really only necessary because Context requires a component. Once session
  moved to a plain module-level store, the subscription could move to
  module scope too — one less thing tied to React's render cycle.
- **`authHeaders()` moved off `getToken()` onto the store directly** — see
  the `api/http.ts` bullet above for the full reasoning. This was flagged
  as an open question in the plan ("check if this is now cleaner") rather
  than assumed, since it's a real trade-off (loses a redundant client-side
  expiry pre-check) rather than a strict improvement with no downside;
  concluded the trade-off is worth it since the dropped check was already
  redundant with server-side enforcement.

## Prompts used (this session, in order)

1. > Before we implement Zustand, help me understand the current state
   > management: how is auth state (logged-in user, token) currently
   > handled across the app? [...] Don't write to specs yet - just explain
   > to me for now.

   (Explanation given, no code changes — covered `session.ts`,
   `AuthContext.tsx`, `RequireAuth.tsx`, `api/http.ts`, and the
   `onSessionExpired` event bridge between the imperative fetch layer and
   the reactive Context layer.)

2. > Migrate session state management from AuthContext to Zustand, per MSA
   > Phase 2's State Management requirement: [the 5 numbered requirements
   > — new authStore.ts, profile stays in Context, update the 5 consumers,
   > reconsider the api/http.ts workaround now that Zustand is accessible
   > outside components, move the onSessionExpired wiring]. Give me a plan
   > first — especially confirm the boundary between what moves to Zustand
   > (session) vs what stays in Context (profile). Update specs.

3. > yes, go ahead

## Process notes

- The explanation-only turn first established an accurate map of the
  existing pattern before any migration plan was drafted — worth doing
  given how much the request depended on getting the current
  Context/localStorage/event-bridge shape exactly right.
- The plan explicitly surfaced the `api/http.ts` question as a decision
  point rather than silently making the call, since the project owner
  asked to "check if this is now cleaner" rather than telling me to change
  it outright.
- Implementation order: install `zustand` → `authStore.ts` → trim
  `session.ts` (`getToken()` removed) → `AuthContext.tsx` reduced to
  profile-only → `api/http.ts` → the five consumers → this document.
- No backend code was touched this session. Verified via `npm run build`
  (`tsc -b` + Vite, confirming no type errors across the refactored
  interfaces) and confirming via the live Vite
  dev server that the served bundle actually contains the new
  `useAuthStore.getState()` call in `http.ts` and the `onSessionExpired`
  subscription in `authStore.ts`, plus exercising login and an
  authenticated request through the dev proxy against the real API. No
  headless-browser tool is available in this environment, so the actual
  React re-render/redirect behavior (login → nav updates, session-expiry →
  redirect to `/login`) was verified by code reading and the type-checker,
  not by watching it happen in a browser — worth a manual pass before
  calling this done, same caveat as every frontend change this session.
