import { notFound } from 'next/navigation';
import db from '@/lib/db';
import CleanView from '@/components/CleanView';

interface Props {
  params: { id: string };
}

interface Design {
  id: number;
  original_filename: string;
  storage_path: string;
  cleaned_path: string | null;
}

export default function DesignPage({ params }: Props) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const design = db
    .prepare(
      'SELECT id, original_filename, storage_path, cleaned_path FROM designs WHERE id = ?'
    )
    .get(id) as Design | undefined;

  if (!design) notFound();

  return (
    <CleanView
      design={{
        id: design.id,
        original_filename: design.original_filename,
        cleaned_path: design.cleaned_path,
      }}
    />
  );
}
