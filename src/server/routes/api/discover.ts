import { context } from '@devvit/web/server';
import { Hono } from 'hono';
import { getDiscoverScanStatus, runDiscoverScan } from '../../core/discover.js';
import type { DiscoverScanResult } from '../../../shared/types.js';

export const discoverRouter = new Hono();

/** GET /api/discover/status — last scan summary */
discoverRouter.get('/status', async (c) => {
  const status = await getDiscoverScanStatus();
  return c.json(status);
});

/** POST /api/discover/run — scan top/hot/best posts into the desk */
discoverRouter.post('/run', async (c) => {
  const ranBy = context.userId ?? 'mod';
  const result = await runDiscoverScan(ranBy, { force: true });

  if (!result.ok) {
    const message =
      result.error === 'discover_disabled'
        ? 'Enable “Discover existing posts” in install settings first'
        : result.error === 'fetch_failed'
          ? 'Could not load subreddit listing'
          : 'Discover scan failed';
    return c.json({ error: message, code: result.error }, 400);
  }

  return c.json<DiscoverScanResult>(result);
});
