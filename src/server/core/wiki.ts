import { context, reddit } from '@devvit/web/server';
import type { WikiPageContext } from '../../shared/types.js';

const WIKI_CONTENT_MAX = 12_000;

/** Normalize user input into a Reddit wiki page path (no leading/trailing slashes). */
export function normalizeWikiSlug(raw: string): string {
  return raw
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/');
}

/**
 * Load existing wiki page content for diff-aware drafting.
 * Returns exists: false when the page is missing or inaccessible.
 */
export async function loadWikiPageContext(slug: string): Promise<WikiPageContext> {
  const page = normalizeWikiSlug(slug);
  const subredditName = context.subredditName;

  if (!page || !subredditName) {
    return { slug: page, exists: false };
  }

  try {
    const wikiPage = await reddit.getWikiPage(subredditName, page);
    const content = wikiPage.content ?? '';
    return {
      slug: page,
      exists: true,
      currentContent:
        content.length > WIKI_CONTENT_MAX
          ? `${content.slice(0, WIKI_CONTENT_MAX)}\n\n… *(truncated for ModScribe preview)*`
          : content,
    };
  } catch (error) {
    console.warn(`[wiki] Could not load r/${subredditName}/wiki/${page}:`, error);
    return { slug: page, exists: false };
  }
}

export function wikiPageUrl(subredditName: string, slug: string): string {
  const page = normalizeWikiSlug(slug);
  return `https://www.reddit.com/r/${subredditName}/wiki/${page}`;
}
