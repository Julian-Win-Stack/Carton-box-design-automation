# Build Plan

**Major scope pivot on 2026-05-11.** Short version:

- Final v1 deliverable redefined: a print-shop **die-cut layout sheet** with
  the cleaned design placed on the panels, scaled to user-input dimensions
  (L×W×H). No per-color recoloring required. No layered SVG export required.

**Part A direction locked on 2026-05-12:** Nano Banana 2 (Gemini 3.x image
edit) is the cleanup model. Output stays as raster all the way through to
the final PDF — **no vectorization step in v1**.

**Pipeline collapse on 2026-05-12 (this build).** The whole per-color
pipeline (color detection → palette confirm → per-region masking →
vectorization → combined SVG → PDF) was removed from the codebase. The app
is now just: upload scan → one button → cleaned PNG. Developer tunes the
model knobs at the top of `src/lib/clean-image.ts`. The legacy
`experiment/lab-color-distance` branch is preserved as a fallback should we
ever need to revive per-color separation.

---

## Step 1 — Scan upload + storage ✅

Designer uploads a scan; app saves it to disk and creates a `designs` row.
After this step a designer can load `/upload`, pick a scan file, submit, and
land on `/designs/<id>`.

## Step 2 — Cleanup pass ✅

`/designs/<id>` shows the original scan side-by-side with a **Clean** button.
Clicking the button hits `POST /api/designs/[id]/clean`, which:

1. Reads the upload from disk, downscales to 2048px max edge (sharp).
2. Calls Nano Banana 2 with `media_resolution=HIGH` (1120 input tokens) and
   `imageSize=2K` output.
3. Writes the returned PNG to `${DATA_DIR}/cleaned/<id>.png`, overwriting
   any previous run.
4. Updates `designs.cleaned_path`.

The detail page then renders the cleaned image next to the original and
offers a **Download PNG** link.

**Developer tuning knobs** (top of `src/lib/clean-image.ts` — no UI):
- `MODEL` — `gemini-3.1-flash-image-preview` (Banana 2). Pro variant
  (`gemini-3-pro-image-preview`) was 503'ing on 2026-05-12; revisit when
  back. Pro unlocks 4K output.
- `MEDIA_RESOLUTION` — `HIGH` (1120 input tokens). `ULTRA_HIGH` (2240) is
  the ceiling. `MEDIUM` (560 — AI Studio default) corrupts Burmese
  subscript clusters; do not use.
- `IMAGE_SIZE` — `2K`. `1K` is the SDK default but looks pixelated. `4K`
  is Pro-only; Flash silently returns no image when asked for 4K.
- `MAX_INPUT_EDGE_PX`, `INPUT_JPEG_QUALITY` — upload weight tuning. Detail
  cap is `MEDIA_RESOLUTION`, not pixel count.
- `PROMPT` — single source of truth for the cleanup instructions.

**Outstanding risks / open work on Part A:**

- Output is stochastic. One-shot A/B (2026-05-12, scan.png) showed HIGH
  beating ULTRA_HIGH on the မြုပ်ထွက် test, but ULTRA_HIGH may have been
  an unlucky draw. **Need 5-run variance test per resolution** before
  picking a production default with confidence.
- Burmese numerals (၄, ၄၈) substituted with Latin digits (4, 48)
  regardless of resolution. Prompt-side fix needed — explicit instruction
  to preserve Burmese numerals.
- Cardboard background sometimes preserved (tan), sometimes washed
  lavender. Prompt instruction "clean uniform light background" is not
  reliably followed — may need re-wording or accept whatever tone we get.

**Validation script:** `scripts/test-gemini-image-enhance.ts` stays in the
repo for offline A/B-ing different `media_resolution` levels without
touching the DB. Same prompt as the app; CLI arg picks LOW/MEDIUM/HIGH/
ULTRA_HIGH/all.

---

## Step 3 — Dieline generator (Part B) ⏳

*Not yet started.*

Given user inputs (length, width, height in mm; box type defaulting to RSC;
clip/glue style), generate an SVG of the unfolded box layout with correct
panel proportions, crease lines (dashed), cut lines (solid), top/bottom
flaps, and glue tab. RSC geometry:

- 4 panels horizontally: L, W, L, W
- Top + bottom flaps = W/2 each
- Glue tab ≈ 30 mm on the leftmost side

Pure geometry — well-documented in packaging-industry references. Output is
an SVG with named regions so Part C knows where each face lives.

**Demo:** input `370×310×270 mm`, see the layout SVG at scale.

**Budget:** ~half a day.

---

## Step 4 — Composition (Part C) ⏳

*Not yet started.*

Combines Step 2 output (cleaned raster) with Step 3 output (dieline) +
metadata form fields into the final print-shop PDF.

- **Embed the cleaned raster directly on the front-facing panels** at
  correct scale (design scales proportionally with panel — bigger box ⇒
  bigger design, per the 2026-05-11 decision). The PDF container holds
  the raster artwork alongside the vector dieline geometry — print shops
  handle this mix natively.
- **Side panels** (the `300g × 50 pcs` / `700g × 30 pcs` spec table from
  the reference dieline) are generated from form inputs, not from a
  scan. Trivial SVG/PDF text + lines + checkboxes.
- **Cut/crease line format** (vector paths vs. raster guides) is
  **deferred** until we hear the print shop's actual cutting workflow.
  Default is vector — the safe-superset that works for both hand-cutting
  from a printed template *and* digital cutters that drive off PDF line
  geometry.
- **Metadata table header** (Customer, Description, Paper, Size, Confirm
  Date, Clip/Glue, Type, Flim Date, Design by, Confirmed, color swatches,
  abbreviation legend, PTZ logo) rendered from form fields.
- **DPI math:** at 2K output (~3014×1408 px) we get ~140 DPI on a 370×270
  mm front face — adequate for flexographic carton printing. Step up to
  Pro + 4K (~$0.15/scan) if the shop wants 300 DPI.
- Output a single PDF as the v1 deliverable.

**Demo:** matches the reference die-cut sheet provided 2026-05-11 in
substance and quality.

**Budget:** ~1 day.
