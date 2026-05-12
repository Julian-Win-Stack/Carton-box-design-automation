import 'server-only';
import { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import db, { DATA_DIR } from '@/lib/db';

interface DesignRow {
  cleaned_path: string | null;
}

const CLEANED_DIR = path.join(DATA_DIR, 'cleaned');

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 404 });

  const row = db
    .prepare('SELECT cleaned_path FROM designs WHERE id = ?')
    .get(id) as DesignRow | undefined;

  if (!row?.cleaned_path) return new Response(null, { status: 404 });

  const fullPath = path.join(CLEANED_DIR, row.cleaned_path);
  let ab: ArrayBuffer;
  try {
    ab = new Uint8Array(await fs.readFile(fullPath)).buffer;
  } catch {
    return new Response(null, { status: 404 });
  }

  return new Response(ab, {
    headers: {
      'content-type': 'image/png',
      // No cache: file is overwritten on every clean run. The client adds a
      // cache-buster query param anyway, but be defensive.
      'cache-control': 'no-store',
    },
  });
}
