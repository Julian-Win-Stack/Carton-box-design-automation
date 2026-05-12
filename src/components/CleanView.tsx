'use client';

import { useState } from 'react';

interface Props {
  design: {
    id: number;
    original_filename: string;
    cleaned_path: string | null;
  };
}

export default function CleanView({ design }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cache-buster so the <img> reloads after a successful clean.
  const [cleanedVersion, setCleanedVersion] = useState(
    design.cleaned_path ? Date.now() : 0
  );

  const hasCleaned = cleanedVersion > 0;
  const cleanedSrc = hasCleaned
    ? `/api/designs/${design.id}/cleaned?v=${cleanedVersion}`
    : null;

  async function handleClean() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/designs/${design.id}/clean`, { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? `Request failed: ${res.status}`);
        return;
      }
      setCleanedVersion(Date.now());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{design.original_filename}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClean}
            disabled={busy}
            className="rounded bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Cleaning…' : hasCleaned ? 'Re-clean' : 'Clean'}
          </button>
          {hasCleaned && cleanedSrc && (
            <a
              href={cleanedSrc}
              download={`design-${design.id}-cleaned.png`}
              className="rounded border border-gray-600 px-4 py-2 text-sm font-medium hover:bg-gray-800"
            >
              Download PNG
            </a>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <figure className="flex flex-col gap-2">
          <figcaption className="text-xs uppercase tracking-wide text-gray-400">
            Original scan
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/designs/${design.id}/image`}
            alt="Original scan"
            className="w-full rounded border border-gray-800 bg-white"
          />
        </figure>

        <figure className="flex flex-col gap-2">
          <figcaption className="text-xs uppercase tracking-wide text-gray-400">
            Cleaned
          </figcaption>
          {hasCleaned && cleanedSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cleanedSrc}
              alt="Cleaned design"
              className="w-full rounded border border-gray-800 bg-white"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded border border-dashed border-gray-700 text-sm text-gray-500">
              {busy
                ? 'Calling Nano Banana — this takes a few seconds…'
                : 'Click Clean to run the cleanup pass.'}
            </div>
          )}
        </figure>
      </div>
    </main>
  );
}
