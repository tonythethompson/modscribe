import type { AutonomyLevel, InboxItem, SourceSnapshot, WikiArticle } from '../../shared/types.js';
import { DEFAULT_TAXONOMY } from '../../shared/constants.js';

export function parseAutonomyLevel(value: unknown): AutonomyLevel {
  if (value === 'categorize' || value === 'draft' || value === 'restructure') {
    return value;
  }
  return 'suggest';
}

export function autonomyRank(level: AutonomyLevel): number {
  const order: AutonomyLevel[] = ['suggest', 'categorize', 'draft', 'restructure'];
  return order.indexOf(level);
}

export function shouldAutoCategorize(level: AutonomyLevel): boolean {
  return autonomyRank(level) >= autonomyRank('categorize');
}

export function shouldAutoDraft(level: AutonomyLevel): boolean {
  return autonomyRank(level) >= autonomyRank('draft');
}

export function shouldProposeRestructure(level: AutonomyLevel): boolean {
  return level === 'restructure';
}

/** Heuristic category suggestion from source text (no LLM). */
export function suggestTaxonomyPath(snapshot: SourceSnapshot): string {
  const text = `${snapshot.title ?? ''} ${snapshot.body}`.toLowerCase();
  if (/\b(spam|promo|advertis)/.test(text)) {
    return 'Community policy › Spam & self-promotion';
  }
  if (/\b(duplicate|repost|crosspost)/.test(text)) {
    return 'Community policy › Duplicate content';
  }
  if (/\b(faq|frequently asked)/.test(text)) {
    return 'Guides & resources › FAQ';
  }
  if (/\b(guide|how to|tutorial|getting started)/.test(text)) {
    return 'Guides & resources › Getting started';
  }
  if (/\b(rule|policy|moderat)/.test(text)) {
    return 'Community policy';
  }
  return DEFAULT_TAXONOMY[DEFAULT_TAXONOMY.length - 1] ?? 'Uncategorized';
}

export function applySuggestedCategory(item: InboxItem, level: AutonomyLevel): InboxItem {
  if (!shouldAutoCategorize(level)) return item;
  if (item.suggestedCategory) return item;
  return { ...item, suggestedCategory: suggestTaxonomyPath(item.snapshot) };
}

/** When exactly one active article shares the suggested taxonomy, pre-link it. */
export function applySuggestedArticle(
  item: InboxItem,
  articles: WikiArticle[]
): InboxItem {
  if (item.suggestedArticleId) return item;
  const path = item.suggestedCategory;
  if (!path) return item;

  const matches = findMergeCandidates(articles, path);
  const sole = matches[0];
  if (matches.length === 1 && sole) {
    return { ...item, suggestedArticleId: sole.id };
  }
  return item;
}

/** Find articles in the same taxonomy bucket for merge proposals. */
export function findMergeCandidates(
  articles: WikiArticle[],
  taxonomyPath: string
): WikiArticle[] {
  return articles.filter(
    (a) => a.status === 'active' && a.taxonomyPath === taxonomyPath
  );
}
