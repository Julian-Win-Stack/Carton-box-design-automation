/**
 * Path D experiment: ask a Gemini image-generation/editing model to produce
 * a CLEANED version of the input scan — faded text restored, cardboard
 * texture removed, edges crisp — as a regular colored image. Then we'd feed
 * that to vtracer directly (no per-color binary masking needed).
 *
 * Per-input media resolution control: AI Studio defaults to MEDIUM (560
 * tokens per input image). For dense scans with fine Burmese script, the
 * model can't disambiguate small character clusters at that budget — it
 * substitutes more-frequent clusters from its prior (e.g. မြုပ် → မြင်).
 * This script lets you crank the budget up to ULTRA_HIGH (2240 tokens, 4×
 * the AI Studio default), which is the documented fix for "model can't
 * read fine text in the input image."
 *
 * Usage:
 *   npx tsx scripts/test-gemini-image-enhance.ts <imagePath> [resolution] [model]
 *
 * resolution: LOW | MEDIUM | HIGH | ULTRA_HIGH | all   (default: ULTRA_HIGH)
 *   "all"  → runs MEDIUM, HIGH, ULTRA_HIGH in sequence so you can A/B compare
 *
 * Example:
 *   npx tsx scripts/test-gemini-image-enhance.ts ./data/uploads/abc.png
 *   npx tsx scripts/test-gemini-image-enhance.ts ./data/uploads/abc.png HIGH
 *   npx tsx scripts/test-gemini-image-enhance.ts ./data/uploads/abc.png all
 *   npx tsx scripts/test-gemini-image-enhance.ts ./data/uploads/abc.png ULTRA_HIGH gemini-3.1-flash-image-preview
 *
 * Default model: gemini-3.1-flash-image-preview (Nano Banana 2). Same
 * Gemini-3.x family as Pro, supports the same media_resolution parameter,
 * costs half as much per scan ($0.067 vs $0.134 at 1K output).
 * Other candidates: gemini-3-pro-image-preview (Nano Banana Pro — was
 *                   returning 503 on 2026-05-12; retry later when fixed),
 *                   gemini-2.5-flash-image (legacy).
 *
 * Output: ./tmp/image-enhance/<timestamp>/<resolution>/
 *   input.jpg        — what we sent (downscaled if needed)
 *   output-0.png     — model's cleaned image
 *   response.txt     — any accompanying text from the model
 */

import { GoogleGenAI, Modality, PartMediaResolutionLevel, createPartFromBase64 } from '@google/genai';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

async function loadEnvFile(): Promise<void> {
  try {
    const content = await fs.readFile('.env', 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {}
}

// Single source of truth for the cleanup prompt. The bottleneck for output
// quality on dense scans is the input-image token budget, not the prompt —
// don't tune this without first confirming MEDIUM/HIGH/ULTRA_HIGH give
// different results.
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

const RESOLUTION_TOKENS: Record<PartMediaResolutionLevel, number> = {
  [PartMediaResolutionLevel.MEDIA_RESOLUTION_UNSPECIFIED]: 0,
  [PartMediaResolutionLevel.MEDIA_RESOLUTION_LOW]: 280,
  [PartMediaResolutionLevel.MEDIA_RESOLUTION_MEDIUM]: 560,
  [PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH]: 1120,
  [PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH]: 2240,
};

// Retry transient failures: 5xx server errors, fetch/network blips, undici
// HeadersTimeout. Don't retry 4xx (malformed request) or 429 (real quota).
function isTransient(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { status?: number; code?: number | string; name?: string; message?: string; cause?: { code?: string; name?: string } };
  if (typeof e.status === 'number' && e.status >= 500 && e.status < 600) return true;
  if (typeof e.code === 'number' && e.code >= 500 && e.code < 600) return true;
  if (e.name === 'AbortError' || e.name === 'TimeoutError') return true;
  const causeCode = e.cause?.code ?? '';
  if (/HEADERS_TIMEOUT|UND_ERR|ECONNRESET|ETIMEDOUT/i.test(String(causeCode))) return true;
  if (typeof e.message === 'string' && /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|UNAVAILABLE/i.test(e.message)) return true;
  return false;
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts - 1) throw err;
      const delaySec = (i + 1) * 10;  // 10s, 20s
      console.warn(`[${label}] transient failure (${(err as Error).message?.slice(0, 120)}). Retrying in ${delaySec}s...`);
      await new Promise((r) => setTimeout(r, delaySec * 1000));
    }
  }
  throw lastErr;
}

function parseResolution(arg: string | undefined): PartMediaResolutionLevel[] {
  const v = (arg ?? 'ULTRA_HIGH').toUpperCase();
  if (v === 'ALL') {
    return [
      PartMediaResolutionLevel.MEDIA_RESOLUTION_MEDIUM,
      PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH,
      PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH,
    ];
  }
  const key = `MEDIA_RESOLUTION_${v}` as keyof typeof PartMediaResolutionLevel;
  const level = PartMediaResolutionLevel[key];
  if (!level || level === PartMediaResolutionLevel.MEDIA_RESOLUTION_UNSPECIFIED) {
    throw new Error(`Invalid resolution "${arg}". Use LOW | MEDIUM | HIGH | ULTRA_HIGH | all.`);
  }
  return [level];
}

async function runOnce(args: {
  ai: GoogleGenAI;
  model: string;
  jpegBuffer: Buffer;
  resolution: PartMediaResolutionLevel;
  outDir: string;
}) {
  const { ai, model, jpegBuffer, resolution, outDir } = args;
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'input.jpg'), jpegBuffer);

  const tokens = RESOLUTION_TOKENS[resolution];
  console.log(`\n[${resolution}] input tokens=${tokens}  → ${outDir}`);

  const imagePart = createPartFromBase64(jpegBuffer.toString('base64'), 'image/jpeg', resolution);

  const t0 = Date.now();
  const response = await withRetry(resolution, () =>
    ai.models.generateContent({
      model,
      contents: [imagePart, PROMPT],
      config: {
        responseModalities: [Modality.IMAGE],
        // 2K output (~140 DPI on a ~370×270mm box face). Default is 1K
        // which looks pixelated when zoomed in Preview — AI Studio web
        // appears to use 2K by default which is why its outputs look
        // crisper than ours did at the same dimensions. 4K is documented
        // for Nano Banana Pro only; the Flash variant may silently drop
        // 4K requests.
        imageConfig: { imageSize: '2K' },
      },
    })
  );
  console.log(`[${resolution}] model ms: ${Date.now() - t0}`);

  const candidates = response.candidates ?? [];
  if (candidates.length === 0) {
    console.error(`[${resolution}] no candidates returned`);
    await fs.writeFile(path.join(outDir, 'response.txt'), JSON.stringify(response, null, 2));
    return;
  }

  const parts = candidates[0].content?.parts ?? [];
  let imageCount = 0;
  const textParts: string[] = [];

  for (const part of parts) {
    const inlineData = (part as { inlineData?: { data?: string; mimeType?: string } }).inlineData;
    const text = (part as { text?: string }).text;
    if (inlineData?.data) {
      const buf = Buffer.from(inlineData.data, 'base64');
      const ext = inlineData.mimeType?.includes('png') ? 'png' : 'jpg';
      const outPath = path.join(outDir, `output-${imageCount}.${ext}`);
      await fs.writeFile(outPath, buf);
      const meta = await sharp(buf).metadata().catch(() => null);
      console.log(`[${resolution}] → ${outPath} (${(buf.length / 1024).toFixed(0)} KB, ${meta?.width}×${meta?.height})`);
      imageCount++;
    } else if (text) {
      textParts.push(text);
    }
  }

  if (textParts.length > 0) {
    await fs.writeFile(path.join(outDir, 'response.txt'), textParts.join('\n\n'));
  }

  if (imageCount === 0) {
    console.warn(`[${resolution}] no image returned by model`);
  }
}

async function main() {
  await loadEnvFile();
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error(
      'Usage: npx tsx scripts/test-gemini-image-enhance.ts <imagePath> [resolution] [model]'
    );
    console.error('  resolution: LOW | MEDIUM | HIGH | ULTRA_HIGH | all   (default: ULTRA_HIGH)');
    process.exit(1);
  }
  const [imagePath, resolutionArg, modelArg] = args;
  const model = modelArg ?? 'gemini-3.1-flash-image-preview';
  const resolutions = parseResolution(resolutionArg);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/-\d+Z$/, 'Z');
  const baseDir = path.join('tmp', 'image-enhance', stamp);
  console.log(`output dir: ${baseDir}`);
  console.log(`model: ${model}`);
  console.log(`resolutions: ${resolutions.join(', ')}`);

  // The Gemini image-input pipeline tokenizes the buffer it receives. The
  // hard cap on detail is the media_resolution token budget — not the raw
  // pixel count — so there's no point sending more than ~2048 on the long
  // edge. We keep the same downscale for every resolution run so the
  // A/B comparison only varies the token budget.
  const sourceBuffer = await fs.readFile(imagePath);
  const downscaled = await sharp(sourceBuffer)
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();
  const inputMeta = await sharp(downscaled).metadata();
  console.log(`input: ${inputMeta.width}×${inputMeta.height}px, ${(downscaled.length / 1024).toFixed(0)} KB`);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (const resolution of resolutions) {
    const subdir = resolution.replace(/^MEDIA_RESOLUTION_/, '').toLowerCase();
    await runOnce({
      ai,
      model,
      jpegBuffer: downscaled,
      resolution,
      outDir: path.join(baseDir, subdir),
    });
  }

  console.log(`\ndone. compare ${baseDir}/<resolution>/output-0.* across runs.`);
}

main().catch((err) => {
  console.error('script failed:', err);
  process.exit(1);
});
