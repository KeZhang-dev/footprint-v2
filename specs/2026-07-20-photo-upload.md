# 2026-07-20 — Trip Photo Upload

## Context

Trips were text-only. This session added the ability to attach photos to a
trip: upload from the Trip form, store them on disk, and show thumbnails on
each trip card.

## Outcome

- **Backend (`/API`)**
  - `TripPhoto` entity (`Models/TripPhoto.cs`) — Id, TripId (FK), FileName
    (the server-generated stored name, not the client's original filename),
    UploadedAt, plus a `[NotMapped]` `Url` property (`/uploads/{FileName}`)
    for the frontend to render directly. `Trip.Photos` is the corresponding
    collection nav property; `TripPhoto.Trip` is `[JsonIgnore]`d to stop
    `Trip → Photos → TripPhoto.Trip → ...` from becoming a JSON
    serialization cycle (EF Core wires up the inverse navigation
    automatically once both sides are tracked by the same `DbContext`, so
    this isn't hypothetical — it reproduces immediately once `Include
    (t => t.Photos)` is added).
  - `Services/PhotoStorageService.cs` — validates each upload (JPG/PNG only,
    matched against both extension *and* `IFormFile.ContentType`, max 2MB)
    and, once accepted, saves it to `wwwroot/uploads` under a
    server-generated GUID filename (the client's original filename is
    discarded rather than stored — no path-traversal surface, no
    collisions, no need to sanitize user-supplied names). Registered as a
    singleton in `Program.cs` since it's stateless aside from the resolved
    uploads path.
  - `TripsController` gained:
    - `POST /api/trips/{id}/photos` — `[FromForm] List<IFormFile> files`,
      owner-only (`404` if the trip isn't the caller's), rejects with `400`
      if any file fails validation or if more than 10 files are sent in one
      request (only checked count, chosen as a sane batch-size guard for
      "multiple photos" — no size specified by the project owner, so this
      is a placeholder to prevent unbounded batches rather than a
      spec'd number). Validates every file *before* saving any of them, so
      a bad file in a batch doesn't leave a partial upload on disk.
    - `DELETE /api/trips/{id}/photos/{photoId}` — owner-only, removes both
      the DB row and the file on disk.
    - `GetTrips`/`GetTrip` now `.Include(t => t.Photos)` so photo URLs come
      back with the trip instead of requiring a second round-trip.
  - `app.UseStaticFiles()` added to `Program.cs` (before `UseCors`) so
    `/uploads/*` is served directly — unauthenticated, matching "serve
    uploaded files as static files." Anyone with a photo's (unguessable,
    GUID-named) URL can view it; only the owner can upload or delete
    through the API. That's an intentional trade-off for a personal travel
    journal, not an oversight — flagged here in case that changes.
  - `wwwroot/uploads/` is gitignored (contents only; a `.gitkeep` keeps the
    directory itself in the repo) — uploaded files are local, per-developer
    state, the same treatment as `footprint.db`.
  - Migration: `AddTripPhotos`.

- **Frontend (`/client`)**
  - `vite.config.ts` — added a `/uploads` proxy entry alongside `/api`
    (same target), since the dev server only proxies `/api` by default and
    `<img src="/uploads/...">` would otherwise 404 against Vite itself
    rather than reaching the API.
  - `src/api/trips.ts` — `Trip` now carries `photos: TripPhoto[]`;
    `uploadPhotos(tripId, files)` posts a `FormData` multipart body (no
    manual `Content-Type` header — the browser sets the multipart boundary)
    and `deletePhoto(tripId, photoId)`. `MAX_PHOTO_BYTES`/
    `ALLOWED_PHOTO_TYPES` constants are exported so the same 2MB/JPG-PNG
    rule can be checked client-side before a request is even made.
    `handle()` now reads the API's `{ error }` JSON body on failure so
    validation messages (wrong type, too large) reach the UI instead of a
    generic "Request failed" string.
  - `src/pages/Trips.tsx` — the trip form gained a multi-file `<input
    type="file" accept="image/jpeg,image/png" multiple>`; selected files
    are validated client-side (type/size) immediately on selection, then
    uploaded after the trip is created/updated on submit (photo upload
    needs a trip id, so for a brand-new trip the create call runs first).
    Each trip card renders its photos as a thumbnail strip; hovering a
    thumbnail reveals a small delete button that calls `DELETE
    /api/trips/{id}/photos/{photoId}` and refreshes.

## Key decisions

- **Filenames**: only the server-generated GUID filename is stored — the
  `TripPhoto.FileName` field the project owner specified is this stored
  name, not the client's original filename. Nothing currently surfaces the
  original filename back to the user; if that's wanted later it'd need its
  own column, since overloading `FileName` for both purposes would either
  reintroduce a path-traversal/collision concern or require separate
  sanitization logic.
- **Validation happens twice**: once client-side (fast feedback, avoids a
  round trip for an obviously-oversized or wrong-type file) and once
  server-side (the only check that actually matters — the client-side one
  is UX, not security, and is trivially bypassable).
- **Static files are unauthenticated**: matches "serve uploaded files as
  static files" literally. URLs are unguessable (GUID filenames) but not
  access-controlled — acceptable for this app's scope; would need a
  different serving strategy (signed URLs, an authenticated download
  endpoint) if photos ever needed to be actually private.
- **10-file batch cap**: not specified by the project owner; added as a
  minimal guard against unbounded multipart requests since each file only
  gets a 2MB check individually. Easy to change if it turns out to be
  wrong.

## Prompts used (this session, in order)

1. > Add photo upload to Trips. Decisions:
   >
   > 1. New entity: TripPhoto (Id, TripId FK, FileName, UploadedAt)
   > 2. Storage: save files to a local folder (/API/wwwroot/uploads),
   >    store only file paths in the database
   > 3. New endpoints:
   >    - POST /api/trips/{id}/photos (multipart upload, max 2MB per file,
   >      jpg/png only, owner only)
   >    - DELETE /api/trips/{id}/photos/{photoId} (owner only)
   > 4. Serve uploaded files as static files
   > 5. Frontend: in the Trip form, allow selecting and uploading multiple
   >    photos; show thumbnails on the trip card
   > 6. Update specs/ when done
   >
   > Implement now.

## Process notes

- All decisions were specified up front; implementation proceeded directly:
  `TripPhoto`/`Trip.Photos`/DbContext → `PhotoStorageService` → controller
  endpoints (+ `.Include(Photos)` on the read actions) → `UseStaticFiles` →
  migration → frontend (`vite.config.ts` proxy, `api/trips.ts`,
  `Trips.tsx` form + thumbnails) → this document.
- Discovered and fixed a JSON serialization cycle (`Trip.Photos` →
  `TripPhoto.Trip` → back to the same `Trip`) by adding `[JsonIgnore]` to
  the back-reference — this only shows up once photos are actually
  `Include`d, so it wasn't visible until wiring up `GetTrips`.
- Verified via `dotnet build`, `npm run build`, and a curl-driven pass
  against both the raw API and through the Vite dev server's proxy
  (matching exactly what the browser app sends): uploaded a JPG + PNG to a
  trip and confirmed they came back on `GET /api/trips/{id}`; fetched the
  saved file directly over `/uploads/...` and via the Vite proxy; confirmed
  a >2MB file and a non-image file are both rejected with `400` and a
  readable error message; confirmed a second user gets `404` (not
  `403`) attempting to upload to or delete a photo from another user's
  trip; deleted a photo as its owner and confirmed both the DB row and the
  file on disk were gone. No headless-browser tool is available in this
  environment, so the file `<input>` and thumbnail hover/delete UI weren't
  visually exercised in an actual browser — worth a manual pass before
  calling this done.
- Two more leftover dev-server processes from earlier in the session
  (another `Footprint.exe`, another stray Vite instance on port 5173) had
  to be stopped again before testing — same pattern as the auth session;
  worth remembering to shut these down deliberately at the end of a
  session instead of leaving them running.
