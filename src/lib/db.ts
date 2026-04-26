import 'server-only';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'app.db');
const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const g = globalThis as unknown as { __db?: Database.Database };

function open(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

const db = g.__db ?? open();
if (process.env.NODE_ENV !== 'production') g.__db = db;

export default db;
export { DATA_DIR, UPLOADS_DIR };
