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
`ALTER` guarded by checks).

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
- Foreign keys ON: enable `PRAGMA foreign_keys = ON` per connection if/when we add FKs

## Tables
*(none yet — added alongside the feature that needs them)*
