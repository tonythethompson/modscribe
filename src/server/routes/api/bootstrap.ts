import { context } from '@devvit/web/server';
import { Hono } from 'hono';
import { listArticles, listNominees } from '../../core/db.js';
import { toArticleSummary, trimInboxForList } from '../../core/trimPayload.js';
import type { DeskBootstrap } from '../../../shared/types.js';

export const bootstrapRouter = new Hono();

/** GET /api/bootstrap — desk data in one request */
bootstrapRouter.get('/', async (c) => {
  const [inbox, articles] = await Promise.all([listNominees(), listArticles()]);
  const pendingCount = inbox.filter((i) => i.status === 'pending').length;

  const payload: DeskBootstrap = {
    subredditName: context.subredditName ?? 'modscribe',
    pendingCount,
    inbox: inbox.map(trimInboxForList),
    articles: articles.filter((a) => a.status === 'active').map(toArticleSummary),
  };

  return c.json(payload);
});
