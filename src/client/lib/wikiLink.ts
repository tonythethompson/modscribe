import type { WikiArticleSummary, WikiPageContext } from '../../shared/types.js';

/** True when opening r/subreddit/wiki/{slug} should show real content, not a Reddit stub. */
export const hasLiveRedditWiki = (opts: {
  wikiContext?: WikiPageContext | null;
  publishedAt?: number;
  redditWikiPublishedAt?: number;
}): boolean => {
  if (opts.redditWikiPublishedAt != null && opts.redditWikiPublishedAt > 0) return true;
  if (opts.publishedAt != null && opts.publishedAt > 0) return true;
  return opts.wikiContext?.exists === true;
};

export const hasLiveRedditWikiForArticle = (article: WikiArticleSummary): boolean => {
  const opts: Parameters<typeof hasLiveRedditWiki>[0] = {};
  if (article.redditWikiPublishedAt != null) {
    opts.redditWikiPublishedAt = article.redditWikiPublishedAt;
  }
  return hasLiveRedditWiki(opts);
};

export const hasLiveRedditWikiForDraft = (draft: {
  wikiContext: WikiPageContext;
  publishedAt?: number;
}): boolean => {
  const opts: Parameters<typeof hasLiveRedditWiki>[0] = { wikiContext: draft.wikiContext };
  if (draft.publishedAt != null) opts.publishedAt = draft.publishedAt;
  return hasLiveRedditWiki(opts);
};
