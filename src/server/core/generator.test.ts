import { describe, expect, it, vi } from 'vitest';
import type { SourceSnapshot } from '../../shared/types.js';
import { generateWikiDraft } from './generator.js';

vi.mock('./settingsService.js', () => ({
  getAiProvider: vi.fn(async () => 'mock'),
  getApiKey: vi.fn(async () => undefined),
}));

vi.mock('./wiki.js', () => ({
  loadWikiPageContext: vi.fn(async (slug: string) => ({ slug, exists: false })),
  normalizeWikiSlug: (raw: string) => raw.trim().replace(/^\/+/, '').replace(/\/+$/, ''),
}));

const sampleSnapshot: SourceSnapshot = {
  id: 't3_abc123',
  kind: 'post',
  permalink: '/r/test/comments/abc123/guide_post/',
  title: 'Community guide to onboarding',
  body: 'Welcome! Read the rules first. Then check the wiki for FAQs about posting.',
  authorName: 'example_user',
  score: 42,
  createdAt: Date.now(),
  subredditName: 'test',
};

describe('generateWikiDraft', () => {
  it('returns mock draft with wiki context fields', async () => {
    const draft = await generateWikiDraft(sampleSnapshot, false, 'test');

    expect(draft.title).toContain('Community guide');
    expect(draft.slug.length).toBeGreaterThan(0);
    expect(draft.publicMarkdown).toContain('## References');
    expect(draft.moderatorNotes).toContain('Moderator Review Notes');
    expect(draft.wikiContext.slug).toBe(draft.slug);
    expect(draft.generationProvider).toBe('mock');
    expect(draft.publicMarkdown).not.toContain('example_user');
  });

  it('includes author in public markdown when requested', async () => {
    const draft = await generateWikiDraft(sampleSnapshot, true, 'test');
    expect(draft.publicMarkdown).toContain('u/example_user');
    expect(draft.includeAuthor).toBe(true);
  });
});
