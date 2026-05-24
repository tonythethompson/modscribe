import { describe, expect, it } from 'vitest';
import { normalizeWikiSlug, subredditWikiUrl } from './wikiNav.js';

describe('wikiNav', () => {
  it('builds Reddit wiki URLs', () => {
    expect(subredditWikiUrl('testsub', 'faq/getting-started')).toBe(
      'https://www.reddit.com/r/testsub/wiki/faq/getting-started'
    );
  });

  it('normalizes slugs', () => {
    expect(normalizeWikiSlug('/faq/page/')).toBe('faq/page');
  });
});
