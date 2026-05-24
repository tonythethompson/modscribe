import type { DraftGenerateRequest, TaxonomyPath, WikiArticle } from '../../shared/types.js';
import { getArticle, getArticleBySlug, saveArticle } from './db.js';
import { normalizeWikiSlug } from './wiki.js';

function slugifySeed(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '');
}

export type ResolvedArticle = {
  article: WikiArticle | null;
  slug: string;
  taxonomyPath: TaxonomyPath;
};

/** Resolve target wiki article for categorize-first draft generation. */
export async function resolveArticleForDraft(
  body: DraftGenerateRequest,
  titleSeed: string
): Promise<ResolvedArticle> {
  const taxonomyPath = body.taxonomyPath?.trim() || 'Uncategorized';

  if (body.articleId) {
    const existing = await getArticle(body.articleId);
    if (existing) {
      return { article: existing, slug: existing.slug, taxonomyPath: existing.taxonomyPath };
    }
  }

  const slug = normalizeWikiSlug(
    body.articleSlug?.trim() || slugifySeed(body.title?.trim() || titleSeed)
  );

  const bySlug = await getArticleBySlug(slug);
  if (bySlug) {
    return { article: bySlug, slug: bySlug.slug, taxonomyPath: bySlug.taxonomyPath };
  }

  const now = Date.now();
  const article: WikiArticle = {
    id: `article-${slug}-${now}`,
    title: body.title?.trim() || titleSeed,
    slug,
    taxonomyPath,
    publicMarkdown: '',
    sourceIds: [],
    status: 'active',
    updatedAt: now,
  };
  await saveArticle(article);
  return { article, slug, taxonomyPath };
}

export async function attachSourceToArticle(
  articleId: string,
  sourceId: string,
  publicMarkdown: string
): Promise<void> {
  const article = await getArticle(articleId);
  if (!article) return;

  const sourceIds = article.sourceIds.includes(sourceId)
    ? article.sourceIds
    : [...article.sourceIds, sourceId];

  await saveArticle({
    ...article,
    sourceIds,
    publicMarkdown: publicMarkdown || article.publicMarkdown,
    updatedAt: Date.now(),
  });
}
