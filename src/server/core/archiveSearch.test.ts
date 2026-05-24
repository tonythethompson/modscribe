import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ArchiveRecord } from '../../shared/types.js';
import { searchArchiveRecords } from './archiveSearch.js';

vi.mock('./db.js', () => ({
  listArchiveRecords: vi.fn(),
}));

import { listArchiveRecords } from './db.js';

const sample: ArchiveRecord[] = [
  {
    id: 't3_one',
    snapshot: {
      id: 't3_one',
      kind: 'post',
      permalink: '/r/test/1',
      title: 'Getting started guide',
      body: 'Welcome newcomers',
      authorName: 'mod_a',
      score: 10,
      createdAt: 1,
      subredditName: 'test',
    },
    reason: 'not_wiki',
    archivedAt: 100,
    archivedBy: 'mod',
  },
  {
    id: 't3_two',
    snapshot: {
      id: 't3_two',
      kind: 'post',
      permalink: '/r/test/2',
      title: 'Spam link',
      body: 'buy now',
      authorName: 'spammer',
      score: 1,
      createdAt: 2,
      subredditName: 'test',
    },
    reason: 'spam',
    archivedAt: 200,
    archivedBy: 'mod',
  },
];

describe('searchArchiveRecords', () => {
  beforeEach(() => {
    vi.mocked(listArchiveRecords).mockResolvedValue(sample);
  });

  it('filters by query', async () => {
    const results = await searchArchiveRecords({ q: 'guide' });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('t3_one');
  });

  it('filters by reason', async () => {
    const results = await searchArchiveRecords({ reason: 'spam' });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('t3_two');
  });
});
