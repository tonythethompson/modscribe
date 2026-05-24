import { context, reddit } from '@devvit/web/server';
import type { AutomationSettings, DiscoverScanResult } from '../../shared/types.js';
import { clampDiscoverLimit } from './discoverSettings.js';
import { getLastDiscoverScan, saveLastDiscoverScan } from './db.js';
import {
  ingestSource,
  maybeAutoDraft,
  snapshotFromPost,
} from './ingest.js';
import { getAutomationSettings } from './settingsService.js';

type ListedPost = Awaited<
  ReturnType<ReturnType<typeof reddit.getTopPosts>['all']>
>[number];

function isEligibleDiscoverPost(post: ListedPost): boolean {
  if (post.isRemoved() || post.isSpam()) {
    return false;
  }
  return true;
}

async function fetchDiscoverPosts(
  settings: AutomationSettings,
  subredditName: string
): Promise<ListedPost[]> {
  const limit = clampDiscoverLimit(settings.discoverLimit);
  const base = { subredditName, limit };

  switch (settings.discoverListing) {
    case 'hot':
      return reddit.getHotPosts(base).all();
    case 'best':
      return reddit.getBestPosts(base).all();
    case 'new':
      return reddit.getNewPosts(base).all();
    case 'top':
    default:
      return reddit
        .getTopPosts({
          ...base,
          timeframe: settings.discoverTimeframe,
        })
        .all();
  }
}

/**
 * Scan an existing subreddit listing and add posts that pass automation filters to the Desk.
 */
export async function runDiscoverScan(
  ranBy: string,
  options: { force?: boolean } = {}
): Promise<DiscoverScanResult | { ok: false; error: string }> {
  const settings = await getAutomationSettings();
  if (!settings.discoverEnabled && !options.force) {
    return { ok: false, error: 'discover_disabled' };
  }

  const subredditName = context.subredditName;
  if (!subredditName) {
    return { ok: false, error: 'no_subreddit' };
  }

  let posts: ListedPost[];
  try {
    posts = await fetchDiscoverPosts(settings, subredditName);
  } catch (err) {
    console.error('[discover] fetch listing', err);
    return { ok: false, error: 'fetch_failed' };
  }

  let added = 0;
  let skipped = 0;

  for (const post of posts) {
    if (!isEligibleDiscoverPost(post)) {
      skipped += 1;
      continue;
    }

    const snapshot = snapshotFromPost({
      id: post.id,
      permalink: post.permalink,
      title: post.title,
      body: post.body ?? '',
      authorName: post.authorName,
      score: post.score,
      createdAt: post.createdAt,
      subredditName: post.subredditName,
      flair: post.flair,
    });

    const result = await ingestSource(snapshot, 'discover', ranBy, {
      allowDiscoverWhenDisabled: options.force === true,
    });
    if (!result.ok) {
      skipped += 1;
      continue;
    }
    if (result.skipped) {
      skipped += 1;
      continue;
    }
    if ('item' in result) {
      added += 1;
      await maybeAutoDraft(result.item);
    }
  }

  const ranAt = Date.now();
  const summary: DiscoverScanResult = {
    ok: true,
    examined: posts.length,
    added,
    skipped,
    listing: settings.discoverListing,
    timeframe:
      settings.discoverListing === 'top' ? settings.discoverTimeframe : undefined,
    ranAt,
  };

  await saveLastDiscoverScan(summary, ranBy);
  return summary;
}

export async function getDiscoverScanStatus(): Promise<{
  lastScan: DiscoverScanResult | null;
  lastRanBy: string | null;
}> {
  const row = await getLastDiscoverScan();
  if (!row) {
    return { lastScan: null, lastRanBy: null };
  }
  return { lastScan: row.result, lastRanBy: row.ranBy };
}
