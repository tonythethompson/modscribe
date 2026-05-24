import { context, reddit } from '@devvit/web/server';
import type { Draft, PublishDraftResult } from '../../shared/types.js';
import { loadWikiPageContext, normalizeWikiSlug, wikiPageUrl } from './wiki.js';

const PUBLISH_REASON = 'Published via ModScribe after moderator review';

/**
 * Create or update a subreddit wiki page from an approved draft.
 * Never called without an explicit moderator action in the API layer.
 */
export async function publishDraftToWiki(draft: Draft): Promise<PublishDraftResult> {
  const subredditName = context.subredditName;
  if (!subredditName) {
    throw new Error('Missing subreddit context');
  }

  const slug = normalizeWikiSlug(draft.slug);
  if (!slug) {
    throw new Error('Wiki slug is required');
  }

  const content = draft.publicMarkdown.trim();
  if (!content) {
    throw new Error('Public markdown is empty');
  }

  const live = await loadWikiPageContext(slug);

  if (live.exists) {
    await reddit.updateWikiPage({
      subredditName,
      page: slug,
      content,
      reason: PUBLISH_REASON,
    });
    return {
      action: 'updated',
      slug,
      wikiUrl: wikiPageUrl(subredditName, slug),
    };
  }

  await reddit.createWikiPage({
    subredditName,
    page: slug,
    content,
    reason: PUBLISH_REASON,
  });

  return {
    action: 'created',
    slug,
    wikiUrl: wikiPageUrl(subredditName, slug),
  };
}
