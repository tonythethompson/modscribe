import { describe, expect, it } from 'vitest';
import { hasLiveRedditWiki, hasLiveRedditWikiForArticle, hasLiveRedditWikiForDraft } from './wikiLink.js';

describe('wikiLink', () => {
  it('is live when published to reddit', () => {
    expect(hasLiveRedditWiki({ redditWikiPublishedAt: 1 })).toBe(true);
    expect(hasLiveRedditWiki({ publishedAt: 1 })).toBe(true);
    expect(hasLiveRedditWiki({ wikiContext: { slug: 'faq', exists: true } })).toBe(true);
  });

  it('is not live for in-app-only articles', () => {
    expect(
      hasLiveRedditWikiForArticle({
        id: 'a1',
        title: 'T',
        slug: 'faq',
        taxonomyPath: 'FAQ',
        sourceIds: [],
        status: 'active',
        updatedAt: 1,
      })
    ).toBe(false);
  });

  it('is not live for unpublished drafts', () => {
    expect(
      hasLiveRedditWikiForDraft({
        wikiContext: { slug: 'faq', exists: false },
      })
    ).toBe(false);
  });
});
