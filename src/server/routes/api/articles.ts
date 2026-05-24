import { Hono } from 'hono';
import type { WikiArticle } from '../../../shared/types.js';
import { getArticle, getArticleBySlug, listArticles } from '../../core/db.js';

export const articlesRouter = new Hono();

/** GET /api/articles */
articlesRouter.get('/', async (c) => {
  const articles = await listArticles();
  return c.json<WikiArticle[]>(articles);
});

/** GET /api/articles/by-slug/:slug */
articlesRouter.get('/by-slug/:slug', async (c) => {
  const slug = decodeURIComponent(c.req.param('slug'));
  const article = await getArticleBySlug(slug);
  if (!article) return c.json({ error: 'Article not found' }, 404);
  return c.json<WikiArticle>(article);
});

/** GET /api/articles/:id */
articlesRouter.get('/:id', async (c) => {
  const article = await getArticle(c.req.param('id'));
  if (!article) return c.json({ error: 'Article not found' }, 404);
  return c.json<WikiArticle>(article);
});
