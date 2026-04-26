# API

What belongs here: every route under `src/app/api/`, the HTTP method, the
request shape, the response shape, and any auth requirements. Update when a
route is added, removed, or its contract changes. One route = one short
section.

## Routes

### `POST /api/uploads`
Upload a photo. Saves to `${UPLOADS_DIR}/<uuid>.<ext>`, inserts a `designs` row, and redirects `303` to `/designs/<id>`.

**Request:** `multipart/form-data` with field `photo` (PNG, JPEG, or WebP; max 20 MB).

**Responses:**
- `303` + `Location: /designs/<id>` — success
- `400 { error }` — missing file or unsupported type
- `413 { error }` — file exceeds 20 MB

### `GET /api/designs/[id]/image`
Serve the raw photo bytes for a design by id. Used by `<img>` tags on `/designs/[id]`.

**Responses:**
- `200` with `content-type` matching the uploaded format — success
- `404` — design id not found, or file missing on disk

## Conventions
- App Router route handlers in `src/app/api/<name>/route.ts`
- Request/response bodies are JSON unless explicitly noted (uploads are
  `multipart/form-data`)
- Errors return `{ error: string }` with appropriate HTTP status
