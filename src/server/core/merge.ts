import type { StructureProposal, WikiArticle } from '../../shared/types.js';
import {
  deleteArticleSlugMapping,
  getArticle,
  saveArticle,
} from './db.js';

function pickCanonicalArticle(articles: WikiArticle[]): WikiArticle {
  return articles.reduce((best, article) => {
    if (article.sourceIds.length > best.sourceIds.length) {
      return article;
    }
    if (
      article.sourceIds.length === best.sourceIds.length &&
      article.publicMarkdown.length > best.publicMarkdown.length
    ) {
      return article;
    }
    return best;
  });
}

/**
 * Merge proposal targets into one canonical article; archive the rest.
 */
export async function executeMergeProposal(
  proposal: StructureProposal
): Promise<{ canonical: WikiArticle; mergedCount: number } | null> {
  if (proposal.kind !== 'merge' || proposal.articleIds.length < 2) {
    return null;
  }

  const loaded = await Promise.all(proposal.articleIds.map((id) => getArticle(id)));
  const active = loaded.filter(
    (article): article is WikiArticle =>
      article !== null && article.status === 'active'
  );

  if (active.length < 2) {
    return null;
  }

  const canonical = pickCanonicalArticle(active);
  const mergedSourceIds = new Set(canonical.sourceIds);
  const markdownParts: string[] = [];

  if (canonical.publicMarkdown.trim()) {
    markdownParts.push(canonical.publicMarkdown.trim());
  }

  let mergedCount = 0;

  for (const article of active) {
    if (article.id === canonical.id) {
      continue;
    }

    mergedCount += 1;
    for (const sourceId of article.sourceIds) {
      mergedSourceIds.add(sourceId);
    }

    if (article.publicMarkdown.trim()) {
      markdownParts.push(
        `---\n\n<!-- Merged from article "${article.title}" (${article.slug}) -->\n\n${article.publicMarkdown.trim()}`
      );
    }

    await deleteArticleSlugMapping(article.slug);
    await saveArticle({
      ...article,
      status: 'archived',
      updatedAt: Date.now(),
    });
  }

  const merged: WikiArticle = {
    ...canonical,
    sourceIds: [...mergedSourceIds],
    publicMarkdown: markdownParts.join('\n\n'),
    updatedAt: Date.now(),
  };

  await saveArticle(merged);

  return { canonical: merged, mergedCount };
}
