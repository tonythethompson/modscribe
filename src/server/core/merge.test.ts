import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { StructureProposal, WikiArticle } from '../../shared/types.js';

const saveArticle = vi.fn();
const deleteArticleSlugMapping = vi.fn();
const getArticle = vi.fn();

vi.mock('./db.js', () => ({
  getArticle: (...args: unknown[]) => getArticle(...args),
  saveArticle: (...args: unknown[]) => saveArticle(...args),
  deleteArticleSlugMapping: (...args: unknown[]) => deleteArticleSlugMapping(...args),
}));

import { executeMergeProposal } from './merge.js';

const articleA: WikiArticle = {
  id: 'a1',
  title: 'FAQ',
  slug: 'faq',
  taxonomyPath: 'Guides › FAQ',
  publicMarkdown: '# FAQ\n\nLead.',
  sourceIds: ['t3_1'],
  status: 'active',
  updatedAt: 1,
};

const articleB: WikiArticle = {
  id: 'a2',
  title: 'FAQ duplicate',
  slug: 'faq-dup',
  taxonomyPath: 'Guides › FAQ',
  publicMarkdown: '## Extra\n\nMore detail.',
  sourceIds: ['t3_1', 't3_2'],
  status: 'active',
  updatedAt: 2,
};

describe('executeMergeProposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getArticle.mockImplementation(async (id: string) => {
      if (id === 'a1') return articleA;
      if (id === 'a2') return articleB;
      return null;
    });
  });

  it('merges articles into canonical and archives others', async () => {
    const proposal: StructureProposal = {
      id: 'p1',
      kind: 'merge',
      articleIds: ['a1', 'a2'],
      rationale: 'test',
      status: 'pending',
      createdAt: Date.now(),
    };

    const result = await executeMergeProposal(proposal);
    expect(result).not.toBeNull();
    expect(result?.mergedCount).toBe(1);
    expect(saveArticle).toHaveBeenCalledTimes(2);
    expect(deleteArticleSlugMapping).toHaveBeenCalledWith('faq');

    const canonicalSave = saveArticle.mock.calls.find(
      (call) => call[0].id === 'a2' && call[0].status === 'active'
    );
    expect(canonicalSave).toBeDefined();
    expect(canonicalSave?.[0].sourceIds).toContain('t3_1');
    expect(canonicalSave?.[0].sourceIds).toContain('t3_2');
  });
});
