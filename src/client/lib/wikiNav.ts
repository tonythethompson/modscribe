import { navigateTo } from '@devvit/web/client';

/** Normalize slug for Reddit wiki paths (matches server `normalizeWikiSlug`). */
export const normalizeWikiSlug = (raw: string): string =>
  raw
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/');

export const subredditWikiUrl = (subredditName: string, slug: string): string => {
  const page = normalizeWikiSlug(slug);
  if (!page) return `https://www.reddit.com/r/${subredditName}/wiki/`;
  return `https://www.reddit.com/r/${subredditName}/wiki/${page}`;
};

/** Open subreddit wiki in Reddit (iframe-safe; `window.open` is blocked in Devvit web). */
export const openSubredditWiki = (subredditName: string, slug: string): void => {
  const url = subredditWikiUrl(subredditName, slug);
  try {
    navigateTo(url);
  } catch (err) {
    console.error('[wikiNav]', err);
  }
};
