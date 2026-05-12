import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import db, { DATA_DIR, UPLOADS_DIR } from '@/lib/db';
import { cleanImage, CleanImageError } from '@/lib/clean-image';

interface DesignRow {
  id: number;
  storage_path: string;
}

const CLEANED_DIR = path.join(DATA_DIR, 'cleaned');

// The model call takes a few seconds. Bump the route timeout so Vercel/Next
// doesn't kill us mid-flight in production. On localhost this is a no-op.
export const maxDuration = 120;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid design id' }, { status: 400 });
  }

  const row = db
    .prepare('SELECT id, storage_path FROM designs WHERE id = ?')
    .get(id) as DesignRow | undefined;

  if (!row) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  const inputPath = path.join(UPLOADS_DIR, row.storage_path);
  // We only keep the newest cleaned image per design — overwrite in place.
  const outputFilename = `${row.id}.png`;
  const outputPath = path.join(CLEANED_DIR, outputFilename);

  try {
    const meta = await cleanImage({ inputPath, outputPath });
    db.prepare('UPDATE designs SET cleaned_path = ? WHERE id = ?').run(
      outputFilename,
      row.id
    );
    return NextResponse.json({
      ok: true,
      width: meta.width,
      height: meta.height,
      bytes: meta.bytes,
    });
  } catch (err) {
    if (err instanceof CleanImageError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error('[/api/designs/:id/clean] unexpected error', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
