import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort, context } from '@devvit/web/server';
import { isCurrentUserModerator } from './core/modGate.js';

import { menu } from './routes/menu.js';
import { triggers } from './routes/triggers.js';
import { inboxRouter } from './routes/api/inbox.js';
import { draftsRouter } from './routes/api/drafts.js';
import { settingsRouter } from './routes/api/settings.js';
import { wikiRouter } from './routes/api/wiki.js';
import { archiveRouter } from './routes/api/archive.js';
import { articlesRouter } from './routes/api/articles.js';
import { proposalsRouter } from './routes/api/proposals.js';
import { discoverRouter } from './routes/api/discover.js';
import { bootstrapRouter } from './routes/api/bootstrap.js';
import { settingsValidateRouter } from './routes/internal/settings.js';
import { scheduler } from './routes/scheduler.js';

const app = new Hono();

// ─── Public /api/ routes (called from client via fetch) ──────────────────────
const api = new Hono();

// ─── Moderator Access Control ────────────────────────────────────────────────
api.use('*', async (c, next) => {
  const { userId, subredditName } = context;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  if (!(await isCurrentUserModerator())) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
});

api.route('/bootstrap', bootstrapRouter);
api.route('/inbox', inboxRouter);
api.route('/drafts', draftsRouter);
api.route('/settings', settingsRouter);
api.route('/wiki', wikiRouter);
api.route('/archive', archiveRouter);
api.route('/articles', articlesRouter);
api.route('/proposals', proposalsRouter);
api.route('/discover', discoverRouter);

// ─── Internal routes (called by Devvit platform) ─────────────────────────────
const internal = new Hono();
internal.route('/menu', menu);
internal.route('/triggers', triggers);
internal.route('/scheduler', scheduler);
internal.route('/settings', settingsValidateRouter);

app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer: createServer,
  port: getServerPort(),
});
