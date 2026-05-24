import { Hono } from 'hono';
import type { ArchiveReason, ArchiveRecord } from '../../../shared/types.js';
import { searchArchiveRecords } from '../../core/archiveSearch.js';

export const archiveRouter = new Hono();

const ARCHIVE_REASONS: ArchiveReason[] = [
  'off_topic',
  'duplicate',
  'spam',
  'not_wiki',
  'other',
];

function parseArchiveReason(value: string | undefined): ArchiveReason | undefined {
  if (!value) return undefined;
  return ARCHIVE_REASONS.includes(value as ArchiveReason)
    ? (value as ArchiveReason)
    : undefined;
}

/** GET /api/archive — list or search archived sources (?q= &reason=) */
archiveRouter.get('/', async (c) => {
  const q = c.req.query('q');
  const reason = parseArchiveReason(c.req.query('reason'));
  const records = await searchArchiveRecords({ q, reason });
  return c.json<ArchiveRecord[]>(records);
});
