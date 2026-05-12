# Stack

What belongs here: every dependency that shapes the project, the reason it was
picked, what was considered instead, and the signal that would prompt
reconsideration. Update when a dependency is added, swapped, or dropped.

## Application

- **Next.js 14 (App Router) + TypeScript (strict)** — full-stack React with
  server actions/routes; one deployable. Reconsider if we need a separate API
  service.
- **Tailwind CSS** — utility-first; no design system overhead for an internal
  tool. Reconsider if we onboard a dedicated designer.

## Persistence & storage

- **better-sqlite3 + raw SQL (no ORM)** — small schema, two users, file-backed.
  No migration layer or query builder needed at this size. Reconsider if the
  schema grows past ~10 tables or we hit concurrent-write contention.
- **Local disk file storage** at `${DATA_DIR}/uploads` (originals) and
  `${DATA_DIR}/cleaned` (cleanup outputs) — lives on the Railway persistent
  volume. Reconsider if we need multi-region or CDN-backed delivery.

## AI

- **@google/genai** — Google's current Gemini SDK. Used for the Nano Banana 2
  image cleanup pass (`gemini-3.1-flash-image-preview`). Env var:
  `GEMINI_API_KEY`. Critical: input image parts must be built via
  `createPartFromBase64(data, mime, PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH)`
  — the AI Studio default (MEDIUM) is too low for fine Burmese subscript
  clusters.

## Image pipeline

- **sharp** — server-side preprocessing (downscale to 2048px max edge, JPEG
  re-encode at quality 92) before sending to the model. Native binary, fast.

## Hosting

- **Railway with persistent volume at `/data`** — long-lived Node server, not
  serverless. Native binaries (sharp, better-sqlite3) work without bundler
  quirks; the model call isn't bound by serverless timeouts; volume preserves
  SQLite + uploads + cleaned outputs across deploys. Reconsider if we need
  horizontal scaling beyond a single node.

## Removed (2026-05-12 pivot)

- `@neplex/vectorizer`, `svgo` — vectorization step retired (cleaned raster
  is embedded directly in final PDF; no per-color SVG layers).
- `pdfkit`, `svg-to-pdfkit` — old layered-SVG PDF download was tied to the
  vectorization pipeline; removed with it.
- `react-konva` — was planned for canvas drag-and-drop; never integrated.
