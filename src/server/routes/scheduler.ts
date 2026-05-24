import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { runDiscoverScan } from '../core/discover.js';
import { getAutomationSettings } from '../core/settingsService.js';

export const scheduler = new Hono();

/** Recurring discover backfill (see devvit.json scheduler.cron). */
scheduler.post('/discover-scan', async (c) => {
  const settings = await getAutomationSettings();
  if (!settings.discoverEnabled || !settings.discoverScheduleEnabled) {
    return c.json<TaskResponse>({ status: 'ignored' }, 200);
  }

  try {
    const result = await runDiscoverScan('cron', { force: false });
    if (result.ok) {
      console.log(
        `[scheduler] discover-scan: examined=${result.examined} added=${result.added} skipped=${result.skipped}`
      );
    } else {
      console.log(`[scheduler] discover-scan skipped: ${result.error}`);
    }
  } catch (err) {
    console.error('[scheduler] discover-scan', err);
  }

  return c.json<TaskResponse>({ status: 'ok' }, 200);
});
