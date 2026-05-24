import { Hono } from 'hono';
import { loadWikiPageContext, normalizeWikiSlug } from '../../core/wiki.js';
import type { WikiPageContext } from '../../../shared/types.js';

export const wikiRouter = new Hono();

/** GET /api/wiki/:slug — load current wiki page context for a slug */
wikiRouter.get('/:slug', async (c) => {
  const slug = normalizeWikiSlug(c.req.param('slug'));
  if (!slug) {
    return c.json({ error: 'Slug is required' }, 400);
  }
  const context = await loadWikiPageContext(slug);
  return c.json<WikiPageContext>(context);
});
