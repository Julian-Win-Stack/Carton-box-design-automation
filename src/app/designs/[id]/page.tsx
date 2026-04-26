import { notFound } from 'next/navigation';
import db from '@/lib/db';

interface Props {
  params: { id: string };
}

interface Design {
  id: number;
  original_filename: string;
  created_at: string;
}

export default function DesignPage({ params }: Props) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const design = db
    .prepare('SELECT id, original_filename, created_at FROM designs WHERE id = ?')
    .get(id) as Design | undefined;

  if (!design) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-lg font-medium">{design.original_filename}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/designs/${design.id}/image`}
        alt={design.original_filename}
        className="max-w-2xl w-full rounded"
      />
      <p className="text-sm text-gray-400">{design.created_at}</p>
    </main>
  );
}
