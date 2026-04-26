import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import db, { UPLOADS_DIR } from '@/lib/db';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('photo');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'File must be PNG, JPEG, or WebP' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 413 });
  }

  const filename = randomUUID() + ext;
  const fullPath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

  const result = db
    .prepare('INSERT INTO designs (original_filename, storage_path) VALUES (?, ?)')
    .run(file.name, filename);

  const id = Number(result.lastInsertRowid);
  return NextResponse.redirect(new URL(`/designs/${id}`, req.url), 303);
}
