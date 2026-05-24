import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type { UiResponse } from '@devvit/web/shared';
import { ingestSource, snapshotFromComment, snapshotFromPost } from '../core/ingest.js';

export const menu = new Hono();

menu.post('/nominate', async (c) => {
  try {
    const body = await c.req.json<{ location: string; targetId: string }>();
    const { location, targetId } = body;

    const isPost = location === 'post';
    let snapshot;

    if (isPost) {
      const post = await reddit.getPostById(targetId as `t3_${string}`);
      snapshot = snapshotFromPost({
        id: targetId,
        permalink: post.permalink,
        title: post.title,
        body: post.body ?? '',
        authorName: post.authorName,
        score: post.score,
        createdAt: post.createdAt,
        subredditName: post.subredditName,
        flair: post.flair,
      });
    } else {
      const comment = await reddit.getCommentById(targetId as `t1_${string}`);
      snapshot = snapshotFromComment({
        id: targetId,
        permalink: comment.permalink,
        body: comment.body ?? '',
        authorName: comment.authorName,
        score: comment.score,
        createdAt: comment.createdAt,
        subredditName: comment.subredditName,
      });
    }

    const result = await ingestSource(
      snapshot,
      'nominate',
      context.userId ?? 'unknown'
    );

    if (!result.ok) {
      return c.json<UiResponse>({ showToast: 'Failed to nominate — see logs' }, 400);
    }

    if (result.skipped) {
      return c.json<UiResponse>({ showToast: 'Already on desk or filtered out' }, 200);
    }

    return c.json<UiResponse>({ showToast: '✓ Added to Desk' }, 200);
  } catch (error) {
    console.error(`[menu/nominate] Error: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to nominate — see logs' }, 400);
  }
});
