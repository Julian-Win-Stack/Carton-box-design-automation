# API

What belongs here: every route under `src/app/api/`, the HTTP method, the
request shape, the response shape, and any auth requirements. Update when a
route is added, removed, or its contract changes. One route = one short
section.

## Routes

### `POST /api/uploads`
Upload a scan (cardboard laid flat on a flatbed scanner). Saves to
`${UPLOADS_DIR}/<uuid>.<ext>`, inserts a `designs` row, and redirects `303`
to `/designs/<id>`.

**Request:** `multipart/form-data` with field `photo` (PNG, JPEG, or WebP;
max 20 MB). The field is named `photo` for legacy reasons — the project
pivoted to scanner input after this endpoint shipped. Rename to `scan` when
convenient (requires updating the route handler and upload form).

**Responses:**
- `303` + `Location: /designs/<id>` — success
- `400 { error }` — missing file or unsupported type
- `413 { error }` — file exceeds 20 MB

### `GET /api/designs/[id]/image`
Serve the raw scan bytes for a design. Used by the `<img>` tag on the design
detail page.

**Responses:**
- `200` with `content-type` matching the uploaded format — success
- `404` — design id not found, or file missing on disk

### `POST /api/designs/[id]/clean`
Run the Nano Banana (Gemini 3.x image-preview) cleanup pass on the scan:
restore faded ink, fill stroke gaps, replace cardboard texture with a clean
background. Writes the output PNG to `${DATA_DIR}/cleaned/<id>.png`,
overwriting any previous run, and updates `designs.cleaned_path`.

Tunable constants (model name, `media_resolution`, output `imageSize`,
prompt) live at the top of `src/lib/clean-image.ts`. No UI exposure — these
are developer knobs.

**Request:** no body.

**Responses:**
- `200 { ok: true, width, height, bytes }` — success
- `400 { error }` — invalid design id
- `404 { error }` — design not found
- `500 { error }` — unexpected server error
- `502 { error }` — model returned no image (refused, or output-only-text)

### `GET /api/designs/[id]/cleaned`
Serve the most recent cleaned PNG for a design.

**Responses:**
- `200` with `content-type: image/png`, `cache-control: no-store` — success
- `404` — design not found, or no cleaned image yet

## Conventions
- App Router route handlers in `src/app/api/<name>/route.ts`
- Request/response bodies are JSON unless explicitly noted (uploads are
  `multipart/form-data`)
- Errors return `{ error: string }` with appropriate HTTP status
