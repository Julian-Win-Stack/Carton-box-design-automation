-- db/schema.sql
-- v1 schema lives here. Tables added as features land.
-- Convention: snake_case table & column names, INTEGER PRIMARY KEY for ids,
-- created_at TEXT DEFAULT (datetime('now')) for timestamps.

CREATE TABLE IF NOT EXISTS designs (
  id INTEGER PRIMARY KEY,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
