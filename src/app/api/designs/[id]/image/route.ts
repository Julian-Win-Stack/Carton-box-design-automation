import 'server-only';
import { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import db, { UPLOADS_DIR } from '@/lib/db';

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

interface DesignRow {
  storage_path: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 404 });

  const row = db
    .prepare('SELECT storage_path FROM designs WHERE id = ?')
    .get(id) as DesignRow | undefined;

  if (!row) return new Response(null, { status: 404 });

  const fullPath = path.join(UPLOADS_DIR, row.storage_path);
  let ab: ArrayBuffer;
  try {
    ab = new Uint8Array(await fs.readFile(fullPath)).buffer;
  } catch {
    return new Response(null, { status: 404 });
  }

  const ext = path.extname(row.storage_path);
  const mime = EXT_TO_MIME[ext] ?? 'application/octet-stream';

  return new Response(ab, {
    headers: {
      'content-type': mime,
      'cache-control': 'private, max-age=3600',
    },
  });
}
