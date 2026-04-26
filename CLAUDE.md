# Carton Box Design

Internal web app for a family carton-box manufacturing business in Myanmar.
Designers upload photos of customer sample boxes; the app vectorizes text/logos,
drops them onto a die-cut canvas where shapes can be recolored, then exports
print-ready SVG/PDF artwork. Internal tool, ~1–2 designers. Not public.

## v1 scope
One designer can: upload a photo → crop one region → vectorize to SVG → drop on
a die-cut canvas → recolor a shape → export SVG/PDF. Anything beyond that is
v2+.

## Engineering principles
- Ship the smallest working version first.
- Raw SQL, not ORMs — until we hit real pain.
- No premature optimization.
- Clean, readable code over clever code.
- TypeScript strict mode is on and stays on.

## Documentation policy
Do NOT load files under `docs/` at session start. When the current task touches
a specific topic, check the index below and fetch only that file. If a decision
or pattern needs to be recorded, identify the right `docs/*.md` file, propose
the update, and ask before writing.

## Documentation index
- `docs/architecture.md` — system design, data flow, folder structure
- `docs/stack.md` — full stack list with rationale per choice
- `docs/database.md` — schema, tables, migration approach
- `docs/api.md` — API routes, request/response shapes
- `docs/vectorization.md` — preprocessing pipeline, vectorizer config, fallbacks
- `docs/decisions.md` — append-only log of significant technical decisions
- `docs/conventions.md` — code style, naming, folder rules, README update rule
