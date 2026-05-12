# Architecture

What belongs here: high-level system design, data flow between components, and
the folder layout that makes the design legible. Update when the shape of the
system changes (new layer, new pipeline stage, new top-level folder), not for
internal refactors.

## v1 data flow

Input is a scan from a flatbed scanner (cardboard laid flat). Not a phone photo.

```
scan upload → POST /api/designs/[id]/clean (Nano Banana 2) → cleaned PNG
```

The 2026-05-12 pivot collapsed the pipeline: no per-color palette extraction,
no per-color masking, no vectorization step. A single AI cleanup pass takes
the scan to a print-ready raster. Subsequent parts (dieline geometry +
composition) are not yet built.

See `docs/build-plan.md` for current step and outstanding work.

## Folder structure

- `src/app/` — App Router routes & layouts
- `src/components/` — UI components
- `src/lib/` — server utilities (`db.ts`, `clean-image.ts`)
- `db/schema.sql` — raw SQL schema (re-run on every boot, see `docs/database.md`)
- `data/` — gitignored runtime data: `app.db`, `uploads/`, `cleaned/`. Mirrors Railway volume `/data`.
- `docs/` — topical reference docs, fetched on demand
- `public/` — static assets
- `scripts/` — dev-only experiments (e.g. `test-gemini-image-enhance.ts` for A/B-ing media_resolution)
