import type { InboxItem, WikiArticle } from '../../shared/types.js';

const LIST_BODY_MAX = 280;

const trimText = (text: string, max: number): string => {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
};

/** Smaller inbox rows for list/bootstrap (full body stays in Redis for draft generation). */
export const trimInboxForList = (item: InboxItem): InboxItem => ({
  ...item,
  snapshot: {
    ...item.snapshot,
    body: trimText(item.snapshot.body, LIST_BODY_MAX),
  },
});

/** Article picker rows without full wiki markdown bodies. */
export const toArticleSummary = (
  article: WikiArticle
): Omit<WikiArticle, 'publicMarkdown'> & { publicMarkdown?: never } => {
  const { publicMarkdown: _omit, ...summary } = article;
  return summary;
};
