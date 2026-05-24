import { context } from '@devvit/web/server';
import { Hono } from 'hono';
import type {
  ArchiveRecord,
  ArchiveRequest,
  Draft,
  DraftGenerateRequest,
  InboxItem,
} from '../../../shared/types.js';
import {
  deleteNominee,
  getNominee,
  listNominees,
  saveArchiveRecord,
  saveDraft,
  saveNominee,
} from '../../core/db.js';
import { attachSourceToArticle, resolveArticleForDraft } from '../../core/articles.js';
import { generateWikiDraft } from '../../core/generator.js';
import { trimInboxForList } from '../../core/trimPayload.js';

export const inboxRouter = new Hono();

/** GET /api/inbox/meta */
inboxRouter.get('/meta', async (c) => {
  const items = await listNominees();
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  return c.json({
    subredditName: context.subredditName,
    pendingCount,
  });
});

/** GET /api/inbox */
inboxRouter.get('/', async (c) => {
  const items = await listNominees();
  return c.json<InboxItem[]>(items.map(trimInboxForList));
});

/** PATCH /api/inbox/:id — save desk categorization hints */
inboxRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const item = await getNominee(id);
  if (!item) {
    return c.json({ error: 'Nominee not found' }, 404);
  }

  let body: {
    suggestedCategory?: string;
    suggestedArticleId?: string | null;
  } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid body' }, 400);
  }

  const updated: InboxItem = {
    ...item,
    ...(body.suggestedCategory !== undefined
      ? { suggestedCategory: body.suggestedCategory }
      : {}),
    ...(body.suggestedArticleId !== undefined
      ? {
          suggestedArticleId:
            body.suggestedArticleId === null || body.suggestedArticleId === ''
              ? undefined
              : body.suggestedArticleId,
        }
      : {}),
  };

  await saveNominee(updated);
  return c.json<InboxItem>(updated);
});

/** DELETE /api/inbox/:id — legacy reject */
inboxRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await deleteNominee(id);
  return c.json({ ok: true });
});

/** POST /api/inbox/:id/archive */
inboxRouter.post('/:id/archive', async (c) => {
  const id = c.req.param('id');
  const item = await getNominee(id);
  if (!item) {
    return c.json({ error: 'Nominee not found' }, 404);
  }

  let body: ArchiveRequest = { reason: 'other' };
  try {
    body = await c.req.json<ArchiveRequest>();
  } catch {
    // optional body
  }

  const record: ArchiveRecord = {
    id: item.id,
    snapshot: item.snapshot,
    reason: body.reason ?? 'other',
    note: body.note,
    archivedAt: Date.now(),
    archivedBy: context.userId ?? 'unknown',
  };

  await saveArchiveRecord(record);
  await deleteNominee(id);

  return c.json<ArchiveRecord>(record, 201);
});

/** POST /api/inbox/:id/draft */
inboxRouter.post('/:id/draft', async (c) => {
  const id = c.req.param('id');
  const item = await getNominee(id);

  if (!item) {
    return c.json({ error: 'Nominee not found' }, 404);
  }

  let reqBody: DraftGenerateRequest = {};
  try {
    reqBody = await c.req.json<DraftGenerateRequest>();
  } catch {
    // empty body ok
  }

  const includeAuthor = !!reqBody.includeAuthor;
  const titleSeed =
    item.snapshot.kind === 'post' && item.snapshot.title
      ? item.snapshot.title
      : `Summary: ${item.snapshot.body.slice(0, 60).trim()}…`;

  const draftRequest: DraftGenerateRequest = {
    ...reqBody,
    articleId: reqBody.articleId ?? item.suggestedArticleId,
  };

  const resolved = await resolveArticleForDraft(draftRequest, titleSeed);
  const subredditName = context.subredditName ?? item.snapshot.subredditName;

  const shell = await generateWikiDraft(item.snapshot, includeAuthor, subredditName, {
    taxonomyPath: resolved.taxonomyPath,
    article: resolved.article,
  });

  const now = Date.now();
  const draftId = `${shell.slug}-${now}`;

  const draft: Draft = {
    ...shell,
    id: draftId,
    status: 'draft',
    slug: resolved.slug,
    taxonomyPath: resolved.taxonomyPath,
    articleId: resolved.article?.id,
    createdAt: now,
    updatedAt: now,
  };

  await saveDraft(draft);

  if (resolved.article) {
    await attachSourceToArticle(resolved.article.id, item.id, draft.publicMarkdown);
  }

  await saveNominee({
    ...item,
    status: 'drafted',
    suggestedCategory: resolved.taxonomyPath,
    suggestedArticleId: resolved.article?.id,
  });

  return c.json<Draft>(draft, 201);
});
