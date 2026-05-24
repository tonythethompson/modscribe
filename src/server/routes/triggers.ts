import { context, reddit } from '@devvit/web/server';
import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnCommentCreateRequest,
  OnPostSubmitRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import {
  ingestSource,
  maybeAutoDraft,
  snapshotFromComment,
  snapshotFromPost,
} from '../core/ingest.js';
import { runDiscoverScan } from '../core/discover.js';
import { getAutomationSettings } from '../core/settingsService.js';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log(`[triggers] ModScribe installed on r/${context.subredditName} (${input.type})`);

  const settings = await getAutomationSettings();
  if (settings.discoverEnabled && settings.discoverOnInstall) {
    try {
      const scan = await runDiscoverScan('install', { force: false });
      if (scan.ok) {
        console.log(
          `[triggers] discover on install: examined=${scan.examined} added=${scan.added}`
        );
      }
    } catch (err) {
      console.error('[triggers] discover on install', err);
    }
  }

  return c.json<TriggerResponse>(
    {
      status: 'success',
      message: `ModScribe installed on r/${context.subredditName}`,
    },
    200
  );
});

triggers.post('/on-post-submit', async (c) => {
  const settings = await getAutomationSettings();
  if (!settings.watchEnabled) {
    return c.json<TriggerResponse>({ status: 'success', message: 'watch_disabled' });
  }

  const input = await c.req.json<OnPostSubmitRequest>();
  const postId = input.post?.id;
  if (!postId) {
    return c.json<TriggerResponse>({ status: 'success', message: 'no_post' });
  }

  try {
    const post = await reddit.getPostById(postId as `t3_${string}`);
    const snapshot = snapshotFromPost({
      id: postId,
      permalink: post.permalink,
      title: post.title,
      body: post.body ?? '',
      authorName: post.authorName,
      score: post.score,
      createdAt: post.createdAt,
      subredditName: post.subredditName,
      flair: post.flair,
    });

    const result = await ingestSource(snapshot, 'watch', 'watch');
    if (result.ok && !result.skipped && 'item' in result) {
      await maybeAutoDraft(result.item);
    }
  } catch (err) {
    console.error('[triggers] on-post-submit', err);
  }

  return c.json<TriggerResponse>({ status: 'success', message: 'ingested' });
});

triggers.post('/on-comment-create', async (c) => {
  const settings = await getAutomationSettings();
  if (!settings.watchEnabled) {
    return c.json<TriggerResponse>({ status: 'success', message: 'watch_disabled' });
  }

  const input = await c.req.json<OnCommentCreateRequest>();
  const commentId = input.comment?.id;
  if (!commentId) {
    return c.json<TriggerResponse>({ status: 'success', message: 'no_comment' });
  }

  try {
    const comment = await reddit.getCommentById(commentId as `t1_${string}`);
    const snapshot = snapshotFromComment({
      id: commentId,
      permalink: comment.permalink,
      body: comment.body ?? '',
      authorName: comment.authorName,
      score: comment.score,
      createdAt: comment.createdAt,
      subredditName: comment.subredditName,
    });

    const result = await ingestSource(snapshot, 'watch', 'watch');
    if (result.ok && !result.skipped && 'item' in result) {
      await maybeAutoDraft(result.item);
    }
  } catch (err) {
    console.error('[triggers] on-comment-create', err);
  }

  return c.json<TriggerResponse>({ status: 'success', message: 'ingested' });
});
