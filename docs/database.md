# Database

What belongs here: schema decisions, tables, relationships, and how schema
changes are managed. Update when tables are added/altered, columns change
meaning, or the migration approach changes.

## Engine
SQLite via `better-sqlite3`. WAL mode is enabled at startup in
`src/lib/db.ts`. The DB file lives at `${DATA_DIR}/app.db`.

## Schema management — current approach (v1)
Single file `db/schema.sql` is read and `db.exec()`'d on every server boot.
All statements use `CREATE TABLE IF NOT EXISTS` so re-running is safe. Good
enough for append-only schema changes (new tables, new columns via separate
`ALTER` guarded by checks). `src/lib/db.ts` also runs a small set of
idempotent `ALTER`/`DROP IF EXISTS` calls to migrate pre-pivot dev DBs
forward.

## Schema management — planned approach (when we hit real pain)
Sequentially-numbered raw SQL files in `db/migrations/` (e.g.
`0001_init.sql`, `0002_add_designs.sql`). A small `applied_migrations` table
tracks which have run. Adopt when we first need to drop/rename a column or
backfill data. **Do not adopt prematurely** — schema.sql + IF NOT EXISTS is
fine until it isn't.

## Conventions
- `snake_case` table and column names
- `INTEGER PRIMARY KEY` for ids (SQLite alias for ROWID, fastest lookup)
- `created_at TEXT DEFAULT (datetime('now'))` for timestamps

## Tables

### `designs`
Tracks each uploaded design scan and its most recent cleanup output.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY` | auto ROWID |
| `original_filename` | `TEXT NOT NULL` | name provided by the browser on upload |
| `storage_path` | `TEXT NOT NULL` | filename only (e.g. `<uuid>.png`); full path = `${UPLOADS_DIR}/<storage_path>` |
| `cleaned_path` | `TEXT` | filename of the most recent cleaned PNG (e.g. `<id>.png`); full path = `${DATA_DIR}/cleaned/<cleaned_path>`. `NULL` until `POST /api/designs/[id]/clean` runs successfully. Overwritten in place on each clean — no history. |
| `created_at` | `TEXT NOT NULL DEFAULT (datetime('now'))` | |

## Removed tables
The `regions` table (one row per ink-color layer) and its associated
columns (`color_count`, `palette_confirmed_at` on `designs`) were dropped
in the 2026-05-12 pivot when the per-color separation pipeline was retired.
`src/lib/db.ts` issues `DROP TABLE IF EXISTS regions` on boot to clean up
pre-pivot dev DBs. The unused `color_count` and `palette_confirmed_at`
columns are left dormant on existing `designs` rows; new rows leave them
`NULL`.
