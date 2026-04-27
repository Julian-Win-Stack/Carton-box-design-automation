# Decisions

Append-only log of significant technical decisions. **New entries go at the
top.** Each entry: date (YYYY-MM-DD), one-line summary, then a short paragraph
on the reasoning and what would change our minds.

What counts: choices that another contributor (or future-you) would otherwise
have to ask about — pivots, swaps, deliberate non-choices. Skip routine
implementation details.

---

## 2026-04-27 — Color-based region detection (replaces semantic regions)
Decision: Detect ink colors via LLM, create one layer per color via sharp
masking, vectorize each layer in monochrome mode.
Reasoning: (1) aligns with print color-separation workflow, (2) higher
vectorization quality (monochrome beats multi-color), (3) recoloring becomes
the natural editing operation, (4) eliminates fuzzy region-boundary judgment
calls.
Tradeoffs accepted: lose semantic labels (logo/text/illustration); halftone
handling deferred to v2; threshold tuning needed.
Trigger to revisit: if real photos consistently produce more than 8 color
layers, or if users report difficulty editing color-based layers, reconsider
hybrid approach.

## 2026-04-26 — Lean CLAUDE.md + on-demand `docs/`
Restructured project context: CLAUDE.md is now an orientation file pointing at
topical docs, fetched on demand. Reasoning: CLAUDE.md is loaded every session,
so packing detail there burns tokens for every turn whether or not the topic
is relevant. Reconsider if the indirection ever causes Claude to miss critical
context — i.e. if we see decisions made that contradict documented patterns
because the relevant doc wasn't fetched.

## 2026-04-26 — @neplex/vectorizer verified
Installed and tested locally: 800×600 sample traces in ~30 ms with clean SVG
output (one `<path fill="…">` per shape). The 30+ second worry from the README
about Vercel timeouts is moot. Reconsider if Railway's Linux runtime fails the
install or if real customer samples expose accuracy issues.

## 2026-04-26 — Railway + SQLite + local disk (replacing Vercel + Supabase)
Picked Railway over Vercel because vectorization runs as a long-lived Node
process and we want native binaries (sharp, better-sqlite3, vectorizer) without
bundler workarounds. Picked SQLite + local disk over Supabase for data ownership
and simpler ops at 1–2 user scale. Reconsider if we ever need horizontal
scaling, multi-region, or hand off the app to non-engineers.

## 2026-04-26 — Raw SQL via better-sqlite3, no ORM
Schema is small and the team is small. ORMs introduce abstractions whose edge
cases we'd have to learn anyway. Reconsider when the schema grows past ~10
tables or we want type-safe query results we can't get from manual typing.
