import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SourceSnapshot, StructureProposal, WikiArticle } from '../../shared/types.js';
import {
  assignSourcesToSplitPlan,
  buildSplitPlanFromArticle,
  executeSplitProposal,
  scoreSourceForSegment,
} from './split.js';

vi.mock('./db.js', () => ({
  getArticle: vi.fn(),
  saveArticle: vi.fn(),
  deleteArticleSlugMapping: vi.fn(),
}));

vi.mock('./sources.js', () => ({
  loadPriorSourceSnapshots: vi.fn(),
}));

import { deleteArticleSlugMapping, getArticle, saveArticle } from './db.js';
import { loadPriorSourceSnapshots } from './sources.js';

const baseArticle: WikiArticle = {
  id: 'article-faq',
  title: 'FAQ',
  slug: 'faq',
  taxonomyPath: 'Guides & resources › FAQ',
  publicMarkdown: '## Getting started\n\nStart here.\n\n## Rules\n\nFollow rules.',
  sourceIds: ['t3_a', 't3_b', 't3_c'],
  status: 'active',
  updatedAt: 1,
};

const snapshots: SourceSnapshot[] = [
  {
    id: 't3_a',
    kind: 'post',
    permalink: '/a',
    title: 'Getting started thread',
    body: 'welcome newcomers',
    authorName: 'mod',
    score: 10,
    createdAt: 1,
    subredditName: 'test',
  },
  {
    id: 't3_b',
    kind: 'post',
    permalink: '/b',
    title: 'Rules clarification',
    body: 'follow the rules',
    authorName: 'mod',
    score: 8,
    createdAt: 2,
    subredditName: 'test',
  },
];

describe('buildSplitPlanFromArticle', () => {
  it('splits on level-2 headings', () => {
    const plan = buildSplitPlanFromArticle(baseArticle);
    expect(plan).not.toBeNull();
    expect(plan?.length).toBe(2);
    expect(plan?.[0]?.title).toBe('Getting started');
    expect(plan?.[1]?.title).toBe('Rules');
  });

  it('chunks many sources when markdown is not sectioned', () => {
    const manySources: WikiArticle = {
      ...baseArticle,
      publicMarkdown: 'Single block',
      sourceIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
    };
    const plan = buildSplitPlanFromArticle(manySources);
    expect(plan?.length).toBeGreaterThanOrEqual(2);
    expect(plan?.[0]?.sourceIds.length).toBeLessThanOrEqual(4);
  });
});

describe('assignSourcesToSplitPlan', () => {
  it('maps sources to best-matching sections', () => {
    const plan = buildSplitPlanFromArticle(baseArticle);
    expect(plan).not.toBeNull();
    const assigned = assignSourcesToSplitPlan(plan ?? [], baseArticle.sourceIds, [
      ...snapshots,
      {
        id: 't3_c',
        kind: 'comment',
        permalink: '/c',
        body: 'misc',
        authorName: 'user',
        score: 1,
        createdAt: 3,
        subredditName: 'test',
      },
    ]);

    const gettingStarted = assigned.find((s) => s.title === 'Getting started');
    const rules = assigned.find((s) => s.title === 'Rules');

    expect(gettingStarted?.sourceIds).toContain('t3_a');
    expect(rules?.sourceIds).toContain('t3_b');
    expect(
      scoreSourceForSegment(gettingStarted!, snapshots[0]!)
    ).toBeGreaterThan(
      scoreSourceForSegment(rules!, snapshots[0]!)
    );
  });
});

describe('executeSplitProposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadPriorSourceSnapshots).mockResolvedValue(snapshots);
  });

  it('creates child articles with sources and archives the parent', async () => {
    vi.mocked(getArticle).mockResolvedValue(baseArticle);

    const proposal: StructureProposal = {
      id: 'split-article-faq',
      kind: 'split',
      articleIds: ['article-faq'],
      rationale: 'Too broad',
      status: 'pending',
      createdAt: Date.now(),
    };

    const result = await executeSplitProposal(proposal);
    expect(result).not.toBeNull();
    expect(result?.created.length).toBe(2);
    expect(result?.archivedId).toBe('article-faq');

    const withSources = result?.created.filter((a) => a.sourceIds.length > 0);
    expect(withSources?.length).toBeGreaterThan(0);

    expect(saveArticle).toHaveBeenCalled();
    expect(deleteArticleSlugMapping).toHaveBeenCalledWith('faq');
  });
});
