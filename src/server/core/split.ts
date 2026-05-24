import type { SourceSnapshot, SplitPlanSegment, StructureProposal, WikiArticle } from '../../shared/types.js';
import {
  deleteArticleSlugMapping,
  getArticle,
  saveArticle,
} from './db.js';
import { loadPriorSourceSnapshots } from './sources.js';
import { normalizeWikiSlug } from './wiki.js';

const MIN_SOURCES_FOR_CHUNK_SPLIT = 8;
const SOURCES_PER_CHUNK = 4;

function slugifyTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
    .replace(/^-|-$/g, '');
}

function headingTitle(line: string): string {
  return line.replace(/^#+\s*/, '').trim() || 'Section';
}

function segmentHaystack(segment: SplitPlanSegment): string {
  return `${segment.title}\n${segment.markdown}`.toLowerCase();
}

function snapshotHaystack(snapshot: SourceSnapshot): string {
  return `${snapshot.title ?? ''}\n${snapshot.body}`.toLowerCase();
}

/** Score how well a source belongs in a segment (keyword overlap). */
export function scoreSourceForSegment(
  segment: SplitPlanSegment,
  snapshot: SourceSnapshot
): number {
  const haystack = segmentHaystack(segment);
  const text = snapshotHaystack(snapshot);
  let score = 0;

  const titleWords = (snapshot.title ?? '')
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  for (const word of titleWords) {
    if (haystack.includes(word)) score += 3;
  }

  const bodyWords = text.split(/\W+/).filter((w) => w.length > 4);
  const seen = new Set<string>();
  for (const word of bodyWords) {
    if (seen.has(word)) continue;
    seen.add(word);
    if (haystack.includes(word)) score += 1;
  }

  if (segment.title.toLowerCase().includes(snapshot.authorName.toLowerCase())) {
    score += 1;
  }

  return score;
}

/**
 * Assign parent article sources to split segments (heading splits start with none).
 */
export function assignSourcesToSplitPlan(
  segments: SplitPlanSegment[],
  sourceIds: string[],
  snapshots: SourceSnapshot[]
): SplitPlanSegment[] {
  if (segments.length === 0 || sourceIds.length === 0) {
    return segments;
  }

  const allAssigned = segments.every((s) => s.sourceIds.length > 0);
  if (allAssigned) {
    return segments;
  }

  const snapshotById = new Map(snapshots.map((s) => [s.id, s]));
  const next = segments.map((s) => ({ ...s, sourceIds: [...s.sourceIds] }));

  for (const sourceId of sourceIds) {
    const snapshot = snapshotById.get(sourceId);
    let bestIndex = 0;
    let bestScore = -1;

    for (let i = 0; i < next.length; i += 1) {
      const segment = next[i];
      if (!segment) continue;
      const score = snapshot ? scoreSourceForSegment(segment, snapshot) : 0;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const target = next[bestIndex];
    if (target && !target.sourceIds.includes(sourceId)) {
      target.sourceIds.push(sourceId);
    }
  }

  for (const segment of next) {
    if (segment.sourceIds.length === 0 && sourceIds.length > 0) {
      segment.sourceIds.push(sourceIds[0] ?? '');
    }
  }

  return next;
}

export async function finalizeSplitPlan(
  article: WikiArticle,
  plan: SplitPlanSegment[]
): Promise<SplitPlanSegment[]> {
  const needsAssignment =
    article.sourceIds.length > 0 && plan.some((s) => s.sourceIds.length === 0);
  if (!needsAssignment) {
    return plan;
  }

  const snapshots = await loadPriorSourceSnapshots(article.sourceIds, '');
  return assignSourcesToSplitPlan(plan, article.sourceIds, snapshots);
}

/**
 * Build split segments from ## headings, or chunk sources when an article is very large.
 */
export function buildSplitPlanFromArticle(article: WikiArticle): SplitPlanSegment[] | null {
  const md = article.publicMarkdown.trim();
  if (md.includes('\n## ')) {
    const parts = md.split(/\n(?=## )/);
    if (parts.length >= 2) {
      const segments: SplitPlanSegment[] = [];
      for (const part of parts) {
        const lines = part.trim().split('\n');
        const first = lines[0] ?? '';
        const title =
          first.startsWith('#') ? headingTitle(first) : article.title;
        const body = first.startsWith('#') ? lines.slice(1).join('\n').trim() : part.trim();
        const markdown = first.startsWith('#')
          ? `## ${headingTitle(first)}\n\n${body}`.trim()
          : part.trim();
        if (!markdown) continue;
        segments.push({
          title,
          taxonomyPath: article.taxonomyPath,
          sourceIds: [],
          markdown,
        });
      }
      if (segments.length >= 2) {
        return segments;
      }
    }
  }

  if (article.sourceIds.length >= MIN_SOURCES_FOR_CHUNK_SPLIT) {
    const segments: SplitPlanSegment[] = [];
    for (let i = 0; i < article.sourceIds.length; i += SOURCES_PER_CHUNK) {
      const chunk = article.sourceIds.slice(i, i + SOURCES_PER_CHUNK);
      const index = Math.floor(i / SOURCES_PER_CHUNK) + 1;
      segments.push({
        title: `${article.title} (part ${index})`,
        taxonomyPath: article.taxonomyPath,
        sourceIds: chunk,
        markdown: md
          ? `<!-- Split from "${article.title}" — sources ${chunk.join(', ')} -->\n\n${md}`
          : `<!-- Split from "${article.title}" — sources ${chunk.join(', ')} -->`,
      });
    }
    return segments.length >= 2 ? segments : null;
  }

  return null;
}

export async function executeSplitProposal(
  proposal: StructureProposal
): Promise<{ created: WikiArticle[]; archivedId: string } | null> {
  if (proposal.kind !== 'split' || proposal.articleIds.length !== 1) {
    return null;
  }

  const sourceId = proposal.articleIds[0];
  if (!sourceId) return null;

  const source = await getArticle(sourceId);
  if (!source || source.status !== 'active') {
    return null;
  }

  let plan =
    proposal.splitPlan && proposal.splitPlan.length >= 2
      ? proposal.splitPlan
      : buildSplitPlanFromArticle(source);

  if (!plan || plan.length < 2) {
    return null;
  }

  plan = await finalizeSplitPlan(source, plan);

  const now = Date.now();
  const created: WikiArticle[] = [];
  const usedSlugs = new Set<string>();

  for (const segment of plan) {
    let slug = slugifyTitle(segment.title) || `split-${now}`;
    let suffix = 1;
    while (usedSlugs.has(slug)) {
      slug = `${slugifyTitle(segment.title) || 'split'}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);
    slug = normalizeWikiSlug(slug);

    const article: WikiArticle = {
      id: `article-${slug}-${now}-${created.length}`,
      title: segment.title,
      slug,
      taxonomyPath: segment.taxonomyPath || source.taxonomyPath,
      publicMarkdown: segment.markdown.trim(),
      sourceIds: [...new Set(segment.sourceIds.filter(Boolean))],
      status: 'active',
      updatedAt: now,
    };
    await saveArticle(article);
    created.push(article);
  }

  await deleteArticleSlugMapping(source.slug);
  await saveArticle({
    ...source,
    status: 'archived',
    updatedAt: now,
  });

  return { created, archivedId: source.id };
}
