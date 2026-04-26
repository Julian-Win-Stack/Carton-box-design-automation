# Architecture

What belongs here: high-level system design, data flow between components, and
the folder layout that makes the design legible. Update when the shape of the
system changes (new layer, new pipeline stage, new top-level folder), not for
internal refactors.

## v1 data flow

(To be drawn as the pipeline is built.)

```
photo upload  →  crop region  →  preprocess (sharp)  →  vectorize (vtracer)
              →  drop on canvas (Konva)  →  recolor  →  export SVG/PDF
```

## Folder structure

- `src/app/` — App Router routes & layouts
- `src/components/` — UI components
- `src/lib/` — server utilities (e.g. `db.ts`)
- `db/schema.sql` — raw SQL schema (re-run on every boot, see `docs/database.md`)
- `data/` — gitignored runtime data: `app.db`, `uploads/`. Mirrors Railway volume `/data`.
- `docs/` — topical reference docs, fetched on demand
- `public/` — static assets
