import 'server-only';
import {
  GoogleGenAI,
  Modality,
  PartMediaResolutionLevel,
  createPartFromBase64,
} from '@google/genai';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

/* ============================================================
 *  Developer tuning knobs — edit here, no UI exposure.
 *  Keep this block at the top so it's easy to find.
 * ============================================================ */

// Nano Banana 2 (Gemini 3.x Flash image-preview). Pro variant returned 503 on
// 2026-05-12; revisit when it's back. Pro also unlocks 4K output if needed.
const MODEL = 'gemini-3.1-flash-image-preview';

// Per-input image token budget. AI Studio defaults to MEDIUM (560); that is
// not enough for fine Burmese subscript clusters and the model substitutes
// visually-similar more-common clusters. HIGH (1120) gave the best quality
// in the 2026-05-12 A/B; ULTRA_HIGH (2240) is the documented ceiling.
const MEDIA_RESOLUTION: PartMediaResolutionLevel =
  PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH;

// Output image size. 2K (~3014×1408 on landscape scans) gives ~140 DPI on a
// 370×270 mm box face — adequate for flexographic carton print. 1K is the
// SDK default but looks pixelated when zoomed. 4K is Pro-only; Flash silently
// drops 4K requests (returns no image).
const IMAGE_SIZE: '1K' | '2K' | '4K' = '2K';

// Downscale the input scan to this max edge before sending. The hard cap on
// detail is MEDIA_RESOLUTION, not raw pixels, so >2048px adds upload weight
// without benefit.
const MAX_INPUT_EDGE_PX = 2048;

// JPEG quality for the downscaled input.
const INPUT_JPEG_QUALITY = 92;

const PROMPT =
  'This is a scan of a cardboard carton box design. The scan has imperfections: ' +
  'some text is faded where ink was thinly deposited, some letters have small gaps ' +
  'where the stamp pad lifted, and the cardboard has texture/noise visible. ' +
  'Produce a CLEANED version of this exact design: ' +
  '(1) restore all text strokes to their full solid ink color, including faded edges and slim text; ' +
  '(2) fill in small gaps within letter strokes that are clearly part of the design; ' +
  '(3) replace the cardboard texture with a clean uniform light background; ' +
  '(4) keep the exact same text characters (the script is Burmese — do not change any characters), ' +
  'the exact same layout, and the exact same colors as the original. ' +
  'Do not add anything that is not already in the original. Do not stylize. ' +
  'Output the cleaned design as a raster image.';

/* ============================================================
 *  Retry helper — model occasionally HEADERS_TIMEOUTs or 5xx's.
 * ============================================================ */

function isTransient(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as {
    status?: number;
    code?: number | string;
    name?: string;
    message?: string;
    cause?: { code?: string; name?: string };
  };
  if (typeof e.status === 'number' && e.status >= 500 && e.status < 600) return true;
  if (typeof e.code === 'number' && e.code >= 500 && e.code < 600) return true;
  if (e.name === 'AbortError' || e.name === 'TimeoutError') return true;
  const causeCode = e.cause?.code ?? '';
  if (/HEADERS_TIMEOUT|UND_ERR|ECONNRESET|ETIMEDOUT/i.test(String(causeCode))) return true;
  if (
    typeof e.message === 'string' &&
    /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|UNAVAILABLE/i.test(e.message)
  )
    return true;
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts - 1) throw err;
      const delayMs = (i + 1) * 10_000;
      console.warn(
        `[clean-image] transient failure (${(err as Error).message?.slice(0, 120)}). Retrying in ${delayMs / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/* ============================================================
 *  Public API
 * ============================================================ */

export class CleanImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CleanImageError';
  }
}

/**
 * Reads an input scan, runs the Nano Banana cleanup pass, and writes the
 * cleaned PNG to `outputPath`. Overwrites any existing file.
 */
export async function cleanImage(args: {
  inputPath: string;
  outputPath: string;
}): Promise<{ width: number | null; height: number | null; bytes: number }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new CleanImageError('GEMINI_API_KEY is not set');
  }

  const sourceBuffer = await fs.readFile(args.inputPath);
  const jpegBuffer = await sharp(sourceBuffer)
    .resize({
      width: MAX_INPUT_EDGE_PX,
      height: MAX_INPUT_EDGE_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: INPUT_JPEG_QUALITY })
    .toBuffer();

  const imagePart = createPartFromBase64(
    jpegBuffer.toString('base64'),
    'image/jpeg',
    MEDIA_RESOLUTION
  );

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const t0 = Date.now();
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: [imagePart, PROMPT],
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: { imageSize: IMAGE_SIZE },
      },
    })
  );
  console.log(`[clean-image] model returned in ${Date.now() - t0}ms`);

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inlineData = (part as { inlineData?: { data?: string; mimeType?: string } })
      .inlineData;
    if (!inlineData?.data) continue;
    const buf = Buffer.from(inlineData.data, 'base64');
    await fs.mkdir(path.dirname(args.outputPath), { recursive: true });
    await fs.writeFile(args.outputPath, buf);
    const meta = await sharp(buf).metadata().catch(() => null);
    return {
      width: meta?.width ?? null,
      height: meta?.height ?? null,
      bytes: buf.length,
    };
  }

  throw new CleanImageError(
    'Model returned no image. This usually means the model refused the request or returned only text.'
  );
}
