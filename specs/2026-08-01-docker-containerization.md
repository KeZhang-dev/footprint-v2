# 2026-08-01 — Docker containerization (MSA Phase 2)

## Context

MSA Phase 2 requirement: containerize both services for local development,
with `docker-compose up` as the single entry point. No cloud deployment
target yet — this is local-only. Two things called out as needing careful
handling: the SQLite file must survive container restarts (volume, not
baked into the image), and the JWT signing key must come from environment
variables, never hardcoded into a Dockerfile.

## Key decisions

- **Reverse proxy instead of CORS.** `client/Dockerfile` builds the Vite
  app into static files served by nginx, and `client/nginx.conf` proxies
  `/api/*` and `/uploads/*` to the `api` service — the exact same routing
  `vite.config.ts`'s dev-server proxy already does for `npm run dev`. This
  means the browser only ever talks to the client container's own origin;
  requests to the API are same-origin from the browser's point of view, so
  **no CORS changes were needed** anywhere in the API. `nginx.conf` also
  has a SPA fallback (`try_files $uri /index.html`) so React Router routes
  survive a hard refresh.
- **Container runs `ASPNETCORE_ENVIRONMENT=Development`.** This reuses
  `Program.cs`'s existing dev-gated startup logic (`Database.Migrate()`,
  role seeding, the seeded admin account, Scalar docs) with zero code
  changes — containerized local use should behave like local `dotnet run`,
  and restructuring that gating for a "container" environment wasn't
  needed for a local-only requirement.
- **`appsettings.Development.json` is excluded from the API image**
  (`API/.dockerignore`) even though it's already checked into git as a
  dev-only secret (see `specs/2026-07-20-authentication.md`). This is the
  "handle carefully" requirement for the JWT key: the *image* itself
  carries zero secrets, so the app has no choice but to get `Jwt:Key` from
  the `Jwt__Key` environment variable `docker-compose.yml` injects (env
  vars outrank `appsettings*.json` in ASP.NET Core's config provider
  order). `Jwt:Issuer`/`Audience`/`ExpiryMinutes` stay in the non-secret
  `appsettings.json`, which is copied normally.
- **`.env` (already gitignored) holds `JWT_KEY`; `.env.example` is the
  checked-in template.** `docker-compose.yml` reads `${JWT_KEY:?...}` —
  compose refuses to start rather than silently falling back to an empty
  key if `.env` is missing.
- **SQLite and uploads each get their own named Docker volume**
  (`footprint-db-data` → `/data`, `footprint-uploads-data` →
  `/app/wwwroot/uploads`), with the connection string pointed at
  `/data/footprint.db`. This is a *separate* database from the host's
  `API/footprint.db` — the container never touches the file the
  project owner's own `dotnet run` instance has open, per the standing
  rule against touching that file. The uploads volume wasn't explicitly
  requested but solves the identical persistence problem for trip
  photos/avatars, flagged to the project owner as a one-line addition
  rather than silently bundled in.
- **Non-default host ports** (API `5280→8080`, client `8081→80`) so
  `docker compose up` doesn't collide with an already-running native
  `dotnet run`/`npm run dev` on the usual `5228`/`5173`.

## Files added

- `API/Dockerfile` — multi-stage (`sdk:10.0` publish → `aspnet:10.0`
  runtime), `ASPNETCORE_URLS=http://+:8080`.
- `API/.dockerignore` — excludes `bin/`, `obj/`, the SQLite file, real
  uploaded files, and `appsettings.Development.json`.
- `client/Dockerfile` — multi-stage (`node:24-alpine` build →
  `nginx:1.27-alpine` serving `dist/`).
- `client/nginx.conf` — reverse proxy + SPA fallback, described above.
- `client/.dockerignore` — excludes `node_modules/`, `dist/`.
- `docker-compose.yml` (repo root) — `api` + `client` services, two named
  volumes, env vars for connection string/JWT.
- `.env.example` (repo root, checked in) — template for `JWT_KEY`.

## Verification

Docker Desktop wasn't running locally; started it, then ran the full
sequence via `docker compose build` / `up -d`. All checks via `curl`
(no browser automation was available this session):

- Client serves `index.html` (200) at `http://localhost:8081/`.
- API's Scalar docs reachable directly at `http://localhost:5280/scalar/v1`
  (200).
- `POST /api/auth/register` and `/api/auth/login`, both routed through the
  client's nginx proxy (`http://localhost:8081/api/...`), return valid JWTs
  — confirms the reverse-proxy path works end-to-end, not just direct
  API access.
- Created a trip and uploaded a photo through the proxy; the returned
  `/uploads/<file>` URL was fetched back through the proxy (200,
  `image/jpeg`, correct byte count).
- **Restart persistence**: `docker compose restart api` — login and photo
  fetch both still succeeded afterward.
- **Full recreate persistence**: `docker compose down` (no `-v`, so
  volumes survive) then `up -d` — login and photo fetch both still
  succeeded, confirming the data lives in the named volumes, not in the
  removed containers.

Containers were left running after verification for a manual visual check
in the browser at `http://localhost:8081` — the project owner's Chrome
extension for browser automation isn't connected this session, so that
last step (visually confirming the UI renders/behaves correctly) is a
manual follow-up rather than one this session completed itself.

## Prompts used (this session, in order)

1. > I want to containerize this project with Docker. [requirements:
   > Dockerfiles for API and client, docker-compose.yml, local-only,
   > SQLite persistence via volume, JWT/secrets via env vars, not
   > hardcoded]. Give me a plan first, then implement and verify it
   > actually runs end-to-end locally (docker-compose up, then confirm
   > the site works in the browser). Update specs/ documenting this as
   > the Docker feature for MSA Phase 2.
