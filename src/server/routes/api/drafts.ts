import { Hono } from 'hono';
import type { Draft, PublishDraftResult } from '../../../shared/types.js';
import { deleteDraft, getDraft, getDraftBySourceId, listDrafts, saveDraft } from '../../core/db.js';
import { publishDraftToWiki } from '../../core/publish.js';
import { loadWikiPageContext } from '../../core/wiki.js';

export const draftsRouter = new Hono();

/** GET /api/drafts — list all drafts, newest-updated first */
draftsRouter.get('/', async (c) => {
  const drafts = await listDrafts();
  return c.json<Draft[]>(drafts);
});

/** GET /api/drafts/by-source/:sourceId — draft for a desk item (reddit post/comment id) */
draftsRouter.get('/by-source/:sourceId', async (c) => {
  const sourceId = c.req.param('sourceId');
  const draft = await getDraftBySourceId(sourceId);
  if (!draft) return c.json({ error: 'Draft not found' }, 404);
  return c.json<Draft>(draft);
});

/** GET /api/drafts/:id — fetch a single draft */
draftsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const draft = await getDraft(id);
  if (!draft) return c.json({ error: 'Draft not found' }, 404);
  return c.json<Draft>(draft);
});

/**
 * PUT /api/drafts/:id — update a draft's editable fields.
 * Accepts: { title?, slug?, publicMarkdown?, moderatorNotes?, includeAuthor? }
 */
draftsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await getDraft(id);
  if (!existing) return c.json({ error: 'Draft not found' }, 404);

  const body = await c.req.json<
    Partial<
      Pick<
        Draft,
        | 'title'
        | 'slug'
        | 'publicMarkdown'
        | 'moderatorNotes'
        | 'includeAuthor'
        | 'status'
        | 'proposedChangeSummary'
      >
    >
  >();

  const updated: Draft = {
    ...existing,
    ...body,
    id: existing.id, // never allow id to change
    sourceId: existing.sourceId, // never allow sourceId to change
    createdAt: existing.createdAt, // preserve original creation time
    updatedAt: Date.now(),
  };

  await saveDraft(updated);
  return c.json<Draft>(updated);
});

/** DELETE /api/drafts/:id — delete a draft */
draftsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await deleteDraft(id);
  return c.json({ ok: true });
});

/**
 * POST /api/drafts/:id/publish — publish draft to subreddit wiki after explicit mod confirmation.
 * Body: { confirmed: true }
 */
draftsRouter.post('/:id/publish', async (c) => {
  const id = c.req.param('id');
  const existing = await getDraft(id);
  if (!existing) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  let confirmed = false;
  try {
    const body = await c.req.json<{ confirmed?: boolean }>();
    confirmed = body.confirmed === true;
  } catch {
    confirmed = false;
  }

  if (!confirmed) {
    return c.json({ error: 'Publishing requires confirmed: true' }, 400);
  }

  try {
    const result = await publishDraftToWiki(existing);
    const wikiContext = await loadWikiPageContext(result.slug);
    const updated: Draft = {
      ...existing,
      slug: result.slug,
      wikiContext,
      status: 'archived',
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveDraft(updated);
    return c.json<{ draft: Draft; publish: PublishDraftResult }>({
      draft: updated,
      publish: result,
    });
  } catch (error) {
    console.error(`[drafts/publish] ${id}:`, error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to publish to wiki',
      },
      500
    );
  }
});
