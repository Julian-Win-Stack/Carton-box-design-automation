import 'server-only';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const CLEANED_DIR = path.join(DATA_DIR, 'cleaned');
const DB_PATH = path.join(DATA_DIR, 'app.db');
const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(CLEANED_DIR, { recursive: true });

const g = globalThis as unknown as { __db?: Database.Database };

function open(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  // Live-migrations for existing dev DBs created before the 2026-05-12 pivot.
  // Each ALTER is wrapped: ok to fail if column already exists.
  try {
    db.exec('ALTER TABLE designs ADD COLUMN cleaned_path TEXT');
  } catch {
    // column already exists — safe to ignore
  }

  // Drop the legacy regions table (and its index) if a pre-pivot dev DB
  // still has them. New schema.sql no longer creates them.
  try {
    db.exec('DROP TABLE IF EXISTS regions');
  } catch {
    // not present — safe to ignore
  }

  return db;
}

const db = g.__db ?? open();
if (process.env.NODE_ENV !== 'production') g.__db = db;

export default db;
export { DATA_DIR, UPLOADS_DIR, CLEANED_DIR };
