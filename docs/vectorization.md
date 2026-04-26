# Vectorization

What belongs here: how raster images become SVG paths — the preprocessing
pipeline, the vectorizer config we ship, and the fallback options if the
primary library breaks. Update when the pipeline changes or a parameter is
tuned based on real samples.

## Pipeline (planned)
1. Crop a region of the uploaded photo (client-side or server-side).
2. **sharp** — preprocess: increase contrast, denoise, optionally quantize
   colors. Goal: clean input for the tracer.
3. **@neplex/vectorizer** — trace to SVG.
4. Output: SVG string with one `<path fill="…">` per detected shape.

## Vectorizer config (starting point)
Picked from the @neplex/vectorizer README; tune against real customer
samples once the upload flow exists.

```ts
{
  colorMode: ColorMode.Color,
  colorPrecision: 6,
  filterSpeckle: 4,
  spliceThreshold: 45,
  cornerThreshold: 60,
  hierarchical: Hierarchical.Stacked,
  mode: PathSimplifyMode.Spline,
  layerDifference: 5,
  lengthThreshold: 5,
  maxIterations: 2,
  pathPrecision: 5,
}
```

## Verified
- macOS arm64 (local dev), 800×600 input with text-like shapes → 30 ms,
  ~52 KB SVG. Native binary installed cleanly.

## Fallbacks
- **vtracer CLI** (Rust binary) — same engine; shell out to it from a child
  process. Use if the Node binding stops working on Railway's Linux runtime.
- **imagetracerjs** — pure JS, ~5× slower per the @neplex/vectorizer
  benchmark. Last-resort fallback if no native option works.
