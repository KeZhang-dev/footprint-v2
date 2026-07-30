# 2026-07-15 — Client/Server Restructure

## Context

The repository started as a single .NET 10 Web API project (Controller-based,
generated from the default template) at the repo root, with no frontend and
no persistence layer. This session restructured it into a client/server
layout, added a real data model and CRUD API, and scaffolded a React
frontend.

## Outcome

- `/API` — the .NET 10 Web API, moved from the repo root. Added EF Core with
  SQLite for local persistence, a `Trip` entity (title, destination, date
  range, notes), a `TripsController` with full CRUD, and Scalar as the
  OpenAPI documentation UI (served at `/scalar/v1` in Development) in place
  of a bare OpenAPI JSON endpoint.
- `/client` — a new Vite + React + TypeScript app using React Router, styled
  with Tailwind CSS v4, with a Home page and a Trips page that performs full
  CRUD against the API (dev server proxies `/api` to the backend).
- `/specs` — this document, the first entry in an ongoing log of AI-assisted
  development sessions.
- Root `Footprint.sln` added referencing `API/Footprint.csproj` for
  `dotnet build`/Visual Studio convenience.
- `CLAUDE.md` updated to describe the new structure and how to run each part.

## Key decisions

- **Entity model**: `Trip` (Id, Title, Destination, StartDate, EndDate,
  Notes, CreatedAt) — specified directly by the project owner; this is a
  travel-journaling app, not a generic placeholder.
- **Styling**: Tailwind CSS (v4, via `@tailwindcss/vite`) chosen for a fast
  path to a modern, responsive look without hand-rolling a design system.
- **Solution file**: a root `.sln` was added for convenience; the project
  could equally be built by `cd`-ing into `/API` and running `dotnet build`.
- **Persistence**: SQLite via EF Core, migrated automatically
  (`Database.Migrate()`) on startup in Development — no manual migration
  step required to run the app locally.

## Prompts used (this session, in order)

1. > I'm restructuring this project to meet some requirements. Please do the
   > following:
   >
   > 1. Reorganize the project into a client-server structure:
   >    - /client folder: frontend project
   >    - /API folder: backend project (move the existing Footprint Web API
   >      into it)
   >    - /specs folder: for documenting AI prompts and the development
   >      process
   > 2. Frontend (/client): React + TypeScript (created with Vite), React
   >    Router for navigation, responsive UI with a modern, polished visual
   >    design
   > 3. Backend (/API): the existing .NET 10 Web API (Controller-based),
   >    integrate EF Core with SQLite for local development, implement CRUD
   >    operations, use Scalar instead of the default OpenAPI documentation
   >    UI
   > 4. Create the first document in /specs recording today's development
   >    process and the prompts used
   > 5. Update CLAUDE.md to reflect the new project structure when done
   >
   > Give me an execution plan first. Do not make any changes until I
   > confirm.

2. > Plan looks good overall, but change assumption #1: Do NOT use a
   > placeholder Item entity. The entity is "Trip" — this is a travel
   > journaling app. Fields: Id (int), Title (string, required), Destination
   > (string, required), StartDate (DateTime), EndDate (DateTime), Notes
   > (string, optional), CreatedAt (DateTime). So it should be
   > `Models/Trip.cs` and `Controllers/TripsController.cs`. Assumptions #2
   > (Tailwind) and #3 (solution file) are fine. Proceed.

## Process notes

- A plan was drafted and presented before any files were touched, per the
  project owner's request. Two assumptions were proposed (styling library,
  solution file) and confirmed as-is; the third (CRUD entity) was corrected
  from a generic placeholder to the real domain model (`Trip`) before
  execution began.
- Execution proceeded file-by-file: backend move via `git mv` (preserving
  history) → remove template sample code → add NuGet packages → model/
  DbContext → controller → `Program.cs` wiring → EF Core migration →
  `.gitignore` updates → Vite scaffold → Tailwind/router setup → page
  components → solution file → this document → `CLAUDE.md`.
- Verified via `dotnet build` (API), `npm run build` (client, includes `tsc
  -b` type-check), and running both dev servers together to exercise the
  Trip CRUD flow end-to-end through the UI.
