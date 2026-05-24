import type { ArchiveReason, ArchiveRecord } from '../../shared/types.js';
import { listArchiveRecords } from './db.js';

export type ArchiveSearchOptions = {
  q?: string;
  reason?: ArchiveReason;
  limit?: number;
};

function matchesQuery(record: ArchiveRecord, q: string): boolean {
  const needle = q.toLowerCase();
  const haystack = [
    record.snapshot.title ?? '',
    record.snapshot.body,
    record.snapshot.authorName,
    record.snapshot.permalink,
    record.note ?? '',
  ]
    .join('\n')
    .toLowerCase();
  return haystack.includes(needle);
}

/** Filter archived sources by text and optional reason (in-memory over index). */
export async function searchArchiveRecords(
  options: ArchiveSearchOptions = {}
): Promise<ArchiveRecord[]> {
  const records = await listArchiveRecords();
  let filtered = records;

  if (options.reason) {
    filtered = filtered.filter((r) => r.reason === options.reason);
  }

  const q = options.q?.trim();
  if (q) {
    filtered = filtered.filter((r) => matchesQuery(r, q));
  }

  const limit = options.limit ?? 200;
  return filtered.slice(0, limit);
}
