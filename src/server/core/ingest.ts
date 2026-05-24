import { context } from '@devvit/web/server';
import type { AutomationSettings, InboxItem, IngestSource, SourceSnapshot } from '../../shared/types.js';
import {
  getNominee,
  getProposal,
  markIngested,
  saveNominee,
  saveDraft,
  wasIngested,
  listArticles,
  saveProposal,
} from './db.js';
import { getAutomationSettings } from './settingsService.js';
import {
  applySuggestedArticle,
  applySuggestedCategory,
  findMergeCandidates,
  shouldProposeRestructure,
} from './policy.js';
import { buildSplitPlanFromArticle, finalizeSplitPlan } from './split.js';
import { generateWikiDraft } from './generator.js';

export function passesAutomationFilters(
  snapshot: SourceSnapshot,
  settings: AutomationSettings
): boolean {
  if (snapshot.score < settings.minScoreThreshold) {
    return false;
  }

  const haystack = `${snapshot.title ?? ''} ${snapshot.body}`.toLowerCase();
  for (const kw of settings.ignoredKeywords) {
    if (kw.length > 0 && haystack.includes(kw.toLowerCase())) {
      return false;
    }
  }

  if (settings.targetFlairs.length > 0 && snapshot.kind === 'post') {
    const flair = snapshot.flair?.trim() ?? '';
    if (!flair) return false;
    const match = settings.targetFlairs.some(
      (t) => t.toLowerCase() === flair.toLowerCase()
    );
    if (!match) return false;
  }

  return true;
}

export type IngestResult =
  | { ok: true; item: InboxItem; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

/**
 * Add a source to the desk if watch filters pass and it is not already present.
 */
export async function ingestSource(
  snapshot: SourceSnapshot,
  source: IngestSource,
  nominatedBy: string,
  options: { allowDiscoverWhenDisabled?: boolean } = {}
): Promise<IngestResult> {
  const settings = await getAutomationSettings();

  if (source === 'watch' && !settings.watchEnabled) {
    return { ok: true, skipped: true, reason: 'watch_disabled' };
  }

  if (
    source === 'discover' &&
    !settings.discoverEnabled &&
    !options.allowDiscoverWhenDisabled
  ) {
    return { ok: true, skipped: true, reason: 'discover_disabled' };
  }

  if (await wasIngested(snapshot.id)) {
    const existing = await getNominee(snapshot.id);
    if (existing) {
      return { ok: true, skipped: true, reason: 'already_ingested' };
    }
  }

  if (
    (source === 'watch' || source === 'discover') &&
    !passesAutomationFilters(snapshot, settings)
  ) {
    return { ok: true, skipped: true, reason: 'filters' };
  }

  const existing = await getNominee(snapshot.id);
  if (existing) {
    return { ok: true, item: existing };
  }

  let item: InboxItem = {
    id: snapshot.id,
    snapshot,
    status: 'pending',
    nominatedAt: Date.now(),
    nominatedBy,
    ingestedBy: source,
  };

  item = applySuggestedCategory(item, settings.autonomyLevel);
  const articles = await listArticles();
  item = applySuggestedArticle(item, articles);
  await saveNominee(item);
  await markIngested(snapshot.id);

  if (shouldProposeRestructure(settings.autonomyLevel)) {
    if (item.suggestedCategory) {
      await maybeCreateMergeProposal(item.suggestedCategory);
    }
    await maybeCreateSplitProposals();
  }

  return { ok: true, item };
}

async function maybeCreateMergeProposal(taxonomyPath: string): Promise<void> {
  const articles = await listArticles();
  const candidates = findMergeCandidates(articles, taxonomyPath);
  if (candidates.length < 2) return;

  const id = `merge-${taxonomyPath.replace(/\s+/g, '-').slice(0, 40)}`;
  const existing = await getProposal(id);
  if (existing?.status === 'pending') return;

  await saveProposal({
    id,
    kind: 'merge',
    articleIds: candidates.slice(0, 3).map((a) => a.id),
    rationale: `Multiple active articles share taxonomy "${taxonomyPath}". Consider merging overlapping coverage.`,
    status: 'pending',
    createdAt: Date.now(),
  });
}

async function maybeCreateSplitProposals(): Promise<void> {
  const articles = await listArticles();
  const active = articles.filter((a) => a.status === 'active');

  for (const article of active) {
    const rawPlan = buildSplitPlanFromArticle(article);
    if (!rawPlan || rawPlan.length < 2) continue;

    const plan = await finalizeSplitPlan(article, rawPlan);

    const id = `split-${article.id}`;
    const existing = await getProposal(id);
    if (existing?.status === 'pending') continue;

    await saveProposal({
      id,
      kind: 'split',
      articleIds: [article.id],
      splitPlan: plan,
      rationale: `Article "${article.title}" has ${plan.length} logical sections or ${article.sourceIds.length} sources — consider splitting into focused pages.`,
      status: 'pending',
      createdAt: Date.now(),
    });
  }
}

/** Run autonomy draft pipeline when level is `draft` or higher. */
export async function maybeAutoDraft(item: InboxItem): Promise<void> {
  const settings = await getAutomationSettings();
  if (settings.autonomyLevel !== 'draft') return;
  if (item.status !== 'pending') return;

  const subredditName = context.subredditName ?? item.snapshot.subredditName;
  const taxonomyPath = item.suggestedCategory ?? 'Uncategorized';
  const shell = await generateWikiDraft(
    item.snapshot,
    false,
    subredditName,
    { taxonomyPath }
  );
  const now = Date.now();
  const draft = {
    ...shell,
    id: `${shell.slug}-${now}`,
    status: 'draft' as const,
    createdAt: now,
    updatedAt: now,
    taxonomyPath,
  };
  await saveDraft(draft);
  await saveNominee({ ...item, status: 'drafted' });
}

export function snapshotFromPost(post: {
  id: string;
  permalink: string;
  title?: string;
  body?: string;
  authorName: string;
  score: number;
  createdAt: Date;
  subredditName: string;
  flair?: { text?: string };
}): SourceSnapshot {
  return {
    id: post.id,
    kind: 'post',
    permalink: post.permalink,
    title: post.title,
    body: post.body ?? '',
    authorName: post.authorName,
    score: post.score,
    createdAt: post.createdAt.getTime(),
    subredditName: post.subredditName,
    flair: post.flair?.text,
  };
}

export function snapshotFromComment(comment: {
  id: string;
  permalink: string;
  body?: string;
  authorName: string;
  score: number;
  createdAt: Date;
  subredditName: string;
}): SourceSnapshot {
  return {
    id: comment.id,
    kind: 'comment',
    permalink: comment.permalink,
    body: comment.body ?? '',
    authorName: comment.authorName,
    score: comment.score,
    createdAt: comment.createdAt.getTime(),
    subredditName: comment.subredditName,
  };
}
