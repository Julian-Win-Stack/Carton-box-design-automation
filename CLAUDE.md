# Carton Box Design

Internal web app for a family carton-box manufacturing business in Myanmar.
Designers scan customer sample boxes (cardboard laid flat on a flatbed scanner)
and upload the scan; the app runs a single AI cleanup pass (Nano Banana 2) to
restore faded ink, fill stroke gaps, and remove cardboard texture, producing
a print-ready raster. Future steps will drop that raster onto a parameterized
die-cut layout sheet. Internal tool, ~1–2 designers. Not public.

**Input is always a scan, not a phone photo.** Assume clean, calibrated,
shadow-free input on a uniform scanner-bed background. Do not engineer for
camera artifacts (lens blur, perspective distortion, lighting variation).

## v1 scope
One designer can: upload a scan → input box dimensions (L×W×H) →
get a print-ready **die-cut layout sheet** with the cleaned design placed on
the box panels and **scaled proportionally with the entered dimensions**.
The final deliverable looks like a standard print-shop die-cut spec sheet
(metadata header table + unfolded RSC layout + design on the appropriate
panels). Output format is whatever the print shop accepts (PDF/SVG/raster).

**Explicit non-goals for v1:**
- No per-color recoloring. The design's colors are sourced from the scan
  as-is; if the cleanup gets "close enough" to the original ink colors,
  that's good enough.
- No per-color layered SVG export with named groups. Single composited
  output is fine.

**The hard problem of v1 is "Part A — clean design source":** producing a
print-ready raster or vector of the design content from an imperfect scan
(faded ink, small gaps, cardboard texture). The dieline geometry and the
metadata table are mechanical, easy work once the design source is solved.

See `docs/build-plan.md` for the current step and architecture status.

## Stack highlights
- `@google/genai` — Gemini SDK. Image cleanup uses `gemini-3.1-flash-image-preview` (Nano Banana 2). Build input image parts via `createPartFromBase64(data, mime, PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH)` — the AI Studio default (MEDIUM, 560 input tokens) corrupts fine Burmese subscript clusters. Set `imageConfig.imageSize: '2K'` on the request config; the SDK default (1K) looks pixelated. 4K is Pro-only — Flash returns no image when asked for 4K.
- Developer tuning knobs (model, media_resolution, imageSize, prompt) all live at the top of `src/lib/clean-image.ts`. No UI exposure by design.

## Engineering principles
- Ship the smallest working version first.
- Raw SQL, not ORMs — until we hit real pain.
- No premature optimization.
- Clean, readable code over clever code.
- TypeScript strict mode is on and stays on.

## Context7 Usage

Context7 fetches live library docs. Use it selectively — every call burns tokens and time.

**Use when:** working with rapidly-changing libs (Next.js App Router, `@google/genai` — version-diverging APIs); generated code fails with "X is not a function" / "method removed in vN".

**Skip when:** stable libs unchanged in years (sharp, better-sqlite3); standard JS/TS/Node features; a working example already exists in this repo (reference that instead); conceptual/architectural questions.

## Documentation policy
Do NOT load files under `docs/` at session start. When the current task touches
a specific topic, check the index below and fetch only that file. Do NOT
maintain a separate decision log; significant decisions live in commit
messages and in the relevant `docs/*.md` file's body. Never create or
re-introduce a `docs/decisions.md`.

## Documentation index
- `docs/build-plan.md` — numbered build plan; current step + scope
- `docs/architecture.md` — system design, data flow, folder structure
- `docs/stack.md` — full stack list with rationale per choice
- `docs/database.md` — schema, tables, migration approach
- `docs/api.md` — API routes, request/response shapes
- `docs/conventions.md` — code style, naming, folder rules, README update rule
