import { redis } from '@devvit/web/server';
import type {
  ArchiveRecord,
  DiscoverScanResult,
  Draft,
  InboxItem,
  StructureProposal,
  WikiArticle,
} from '../../shared/types.js';

const INBOX_KEY = (id: string) => `modscribe:inbox:${id}`;
const INBOX_INDEX = 'modscribe:inbox:index';

const DRAFT_KEY = (id: string) => `modscribe:draft:${id}`;
const DRAFT_SOURCE_KEY = (sourceId: string) => `modscribe:draft:source:${sourceId}`;
const DRAFT_INDEX = 'modscribe:draft:index';

const ARCHIVE_KEY = (id: string) => `modscribe:archive:${id}`;
const ARCHIVE_INDEX = 'modscribe:archive:index';

const ARTICLE_KEY = (id: string) => `modscribe:article:${id}`;
const ARTICLE_INDEX = 'modscribe:article:index';
const ARTICLE_SLUG_KEY = (slug: string) => `modscribe:article:slug:${slug}`;

const PROPOSAL_KEY = (id: string) => `modscribe:proposal:${id}`;
const PROPOSAL_INDEX = 'modscribe:proposal:index';

const INGESTED_KEY = (id: string) => `modscribe:ingested:${id}`;

// ─── InboxItem CRUD ──────────────────────────────────────────────────────────

export async function saveNominee(item: InboxItem): Promise<void> {
  await redis.set(INBOX_KEY(item.id), JSON.stringify(item));
  await redis.zAdd(INBOX_INDEX, { score: item.nominatedAt, member: item.id });
}

export async function getNominee(id: string): Promise<InboxItem | null> {
  const raw = await redis.get(INBOX_KEY(id));
  if (!raw) return null;
  return JSON.parse(raw) as InboxItem;
}

const parseJsonRows = <T>(raws: (string | null)[]): T[] =>
  raws
    .filter((raw): raw is string => raw !== null)
    .map((raw) => JSON.parse(raw) as T);

export async function listNominees(): Promise<InboxItem[]> {
  const results = await redis.zRange(INBOX_INDEX, 0, -1, { reverse: true, by: 'rank' });
  if (!results.length) return [];

  const keys = results.map((r) => INBOX_KEY(r.member));
  const raws = await redis.mGet(keys);
  return parseJsonRows<InboxItem>(raws);
}

export async function deleteNominee(id: string): Promise<void> {
  await redis.del(INBOX_KEY(id));
  await redis.zRem(INBOX_INDEX, [id]);
}

// ─── Draft CRUD ──────────────────────────────────────────────────────────────

export async function saveDraft(draft: Draft): Promise<void> {
  await redis.set(DRAFT_KEY(draft.id), JSON.stringify(draft));
  await redis.zAdd(DRAFT_INDEX, { score: draft.updatedAt, member: draft.id });
  if (draft.sourceId) {
    await redis.set(DRAFT_SOURCE_KEY(draft.sourceId), draft.id);
  }
}

export async function getDraft(id: string): Promise<Draft | null> {
  const raw = await redis.get(DRAFT_KEY(id));
  if (!raw) return null;
  return JSON.parse(raw) as Draft;
}

export async function getDraftBySourceId(sourceId: string): Promise<Draft | null> {
  const draftId = await redis.get(DRAFT_SOURCE_KEY(sourceId));
  if (draftId) {
    const draft = await getDraft(draftId);
    if (draft) return draft;
  }
  const drafts = await listDrafts();
  return drafts.find((d) => d.sourceId === sourceId) ?? null;
}

export async function listDrafts(): Promise<Draft[]> {
  const results = await redis.zRange(DRAFT_INDEX, 0, -1, { reverse: true, by: 'rank' });
  if (!results.length) return [];

  const keys = results.map((r) => DRAFT_KEY(r.member));
  const raws = await redis.mGet(keys);
  return parseJsonRows<Draft>(raws);
}

export async function deleteDraft(id: string): Promise<void> {
  await redis.del(DRAFT_KEY(id));
  await redis.zRem(DRAFT_INDEX, [id]);
}

// ─── Archive CRUD ────────────────────────────────────────────────────────────

export async function saveArchiveRecord(record: ArchiveRecord): Promise<void> {
  await redis.set(ARCHIVE_KEY(record.id), JSON.stringify(record));
  await redis.zAdd(ARCHIVE_INDEX, { score: record.archivedAt, member: record.id });
}

export async function getArchiveRecord(id: string): Promise<ArchiveRecord | null> {
  const raw = await redis.get(ARCHIVE_KEY(id));
  if (!raw) return null;
  return JSON.parse(raw) as ArchiveRecord;
}

export async function listArchiveRecords(): Promise<ArchiveRecord[]> {
  const results = await redis.zRange(ARCHIVE_INDEX, 0, -1, { reverse: true, by: 'rank' });
  if (!results.length) return [];

  const keys = results.map((r) => ARCHIVE_KEY(r.member));
  const raws = await redis.mGet(keys);
  return parseJsonRows<ArchiveRecord>(raws);
}

// ─── WikiArticle CRUD ──────────────────────────────────────────────────────

export async function saveArticle(article: WikiArticle): Promise<void> {
  await redis.set(ARTICLE_KEY(article.id), JSON.stringify(article));
  await redis.set(ARTICLE_SLUG_KEY(article.slug), article.id);
  await redis.zAdd(ARTICLE_INDEX, { score: article.updatedAt, member: article.id });
}

export async function getArticle(id: string): Promise<WikiArticle | null> {
  const raw = await redis.get(ARTICLE_KEY(id));
  if (!raw) return null;
  return JSON.parse(raw) as WikiArticle;
}

export async function getArticleBySlug(slug: string): Promise<WikiArticle | null> {
  const id = await redis.get(ARTICLE_SLUG_KEY(slug));
  if (!id) return null;
  return getArticle(id);
}

export async function deleteArticleSlugMapping(slug: string): Promise<void> {
  await redis.del(ARTICLE_SLUG_KEY(slug));
}

export async function listArticles(): Promise<WikiArticle[]> {
  const results = await redis.zRange(ARTICLE_INDEX, 0, -1, { reverse: true, by: 'rank' });
  if (!results.length) return [];

  const keys = results.map((r) => ARTICLE_KEY(r.member));
  const raws = await redis.mGet(keys);
  return parseJsonRows<WikiArticle>(raws);
}

// ─── Structure proposals ─────────────────────────────────────────────────────

export async function saveProposal(proposal: StructureProposal): Promise<void> {
  await redis.set(PROPOSAL_KEY(proposal.id), JSON.stringify(proposal));
  await redis.zAdd(PROPOSAL_INDEX, { score: proposal.createdAt, member: proposal.id });
}

export async function listProposals(): Promise<StructureProposal[]> {
  const results = await redis.zRange(PROPOSAL_INDEX, 0, -1, { reverse: true, by: 'rank' });
  if (!results.length) return [];

  const keys = results.map((r) => PROPOSAL_KEY(r.member));
  const raws = await redis.mGet(keys);
  return parseJsonRows<StructureProposal>(raws);
}

export async function getProposal(id: string): Promise<StructureProposal | null> {
  const raw = await redis.get(PROPOSAL_KEY(id));
  if (!raw) return null;
  return JSON.parse(raw) as StructureProposal;
}

export async function deleteProposal(id: string): Promise<void> {
  await redis.del(PROPOSAL_KEY(id));
  await redis.zRem(PROPOSAL_INDEX, [id]);
}

// ─── Ingest deduplication ────────────────────────────────────────────────────

export async function markIngested(sourceId: string): Promise<void> {
  await redis.set(INGESTED_KEY(sourceId), '1');
}

export async function wasIngested(sourceId: string): Promise<boolean> {
  const v = await redis.get(INGESTED_KEY(sourceId));
  return v === '1';
}

// ─── Discover scan metadata ──────────────────────────────────────────────────

const LAST_DISCOVER_SCAN_KEY = 'modscribe:last_discover_scan';

export async function saveLastDiscoverScan(
  result: DiscoverScanResult,
  ranBy: string
): Promise<void> {
  await redis.set(
    LAST_DISCOVER_SCAN_KEY,
    JSON.stringify({ result, ranBy })
  );
}

export async function getLastDiscoverScan(): Promise<{
  result: DiscoverScanResult;
  ranBy: string;
} | null> {
  const raw = await redis.get(LAST_DISCOVER_SCAN_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as { result: DiscoverScanResult; ranBy: string };
}
