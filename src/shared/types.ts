/**
 * Shared types for ModScribe — used by both client and server.
 * Never import server-only modules here.
 */

/** AI provider configured in subreddit app settings. */
export type AiProvider = 'mock' | 'openai' | 'gemini';

/** How a source entered the desk. */
export type IngestSource = 'watch' | 'nominate' | 'mod' | 'discover';

/** Subreddit listing used for backfill / discover scans (posts only). */
export type DiscoverListing = 'top' | 'hot' | 'best' | 'new';

/** Time window for `top` (and controversial) listing scans. */
export type DiscoverTimeframe = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

/** Taxonomy path, e.g. "Guides & resources › FAQ". */
export type TaxonomyPath = string;

/** Autonomy dial — how much automation runs without a mod. */
export type AutonomyLevel = 'suggest' | 'categorize' | 'draft' | 'restructure';

export type ArchiveReason = 'off_topic' | 'duplicate' | 'spam' | 'not_wiki' | 'other';

/** A snapshot of a Reddit post or comment at nomination time. */
export type SourceSnapshot = {
  id: string;
  kind: 'post' | 'comment';
  permalink: string;
  title?: string;
  body: string;
  authorName: string;
  score: number;
  createdAt: number;
  subredditName: string;
  flair?: string;
};

/** A nominated post or comment awaiting review on the Desk. */
export type InboxItem = {
  id: string;
  snapshot: SourceSnapshot;
  status: 'pending' | 'drafted' | 'rejected';
  nominatedAt: number;
  nominatedBy: string;
  ingestedBy?: IngestSource;
  suggestedCategory?: TaxonomyPath;
  suggestedArticleId?: string;
};

/** Cleared from desk without wiki publish. */
export type ArchiveRecord = {
  id: string;
  snapshot: SourceSnapshot;
  reason: ArchiveReason;
  note?: string;
  archivedAt: number;
  archivedBy: string;
};

/** Living wiki article — many sources can contribute. */
export type WikiArticle = {
  id: string;
  title: string;
  slug: string;
  taxonomyPath: TaxonomyPath;
  publicMarkdown: string;
  sourceIds: string[];
  status: 'active' | 'archived';
  updatedAt: number;
};

export type StructureProposalKind = 'merge' | 'split';

/** One child article produced by approving a split proposal. */
export type SplitPlanSegment = {
  title: string;
  taxonomyPath: TaxonomyPath;
  sourceIds: string[];
  markdown: string;
};

export type StructureProposal = {
  id: string;
  kind: StructureProposalKind;
  articleIds: string[];
  rationale: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  /** Required for split proposals — segments to create from the source article. */
  splitPlan?: SplitPlanSegment[];
};

/** Context about an existing subreddit wiki page (mod-only fields). */
export type WikiPageContext = {
  slug: string;
  exists: boolean;
  currentContent?: string;
};

/** A wiki draft generated from a SourceSnapshot (revision toward an article). */
export type Draft = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'archived';
  publicMarkdown: string;
  moderatorNotes: string;
  sourceId: string;
  includeAuthor: boolean;
  wikiContext: WikiPageContext;
  generationProvider: AiProvider;
  proposedChangeSummary?: string;
  taxonomyPath?: TaxonomyPath;
  articleId?: string;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
};

/** App-wide automation settings (from Devvit installation settings). */
export type AutomationSettings = {
  ignoredKeywords: string[];
  targetFlairs: string[];
  minScoreThreshold: number;
  watchEnabled: boolean;
  discoverEnabled: boolean;
  discoverListing: DiscoverListing;
  discoverTimeframe: DiscoverTimeframe;
  discoverLimit: number;
  discoverOnInstall: boolean;
  discoverScheduleEnabled: boolean;
  autonomyLevel: AutonomyLevel;
};

/** Mod-dashboard overrides (Redis) layered on install settings. */
export type RuntimeSettingsOverrides = {
  watchEnabled?: boolean;
  discoverEnabled?: boolean;
  discoverScheduleEnabled?: boolean;
};

/** PATCH /api/settings */
export type SettingsPatchRequest = {
  watchEnabled?: boolean;
  discoverEnabled?: boolean;
  discoverScheduleEnabled?: boolean;
};

/** Result of scanning existing subreddit posts into the desk. */
export type DiscoverScanResult = {
  ok: true;
  examined: number;
  added: number;
  skipped: number;
  listing: DiscoverListing;
  timeframe?: DiscoverTimeframe;
  ranAt: number;
};

/** Settings exposed to the mod dashboard (never includes raw API key). */
export type ModScribeSettings = AutomationSettings & {
  aiProvider: AiProvider;
  apiKeyConfigured: boolean;
  /** True when dashboard toggles override install settings (Redis). */
  hasDashboardOverrides: boolean;
};

/** Result of a live API key / provider connectivity check. */
export type VerifyCredentialsResult = {
  ok: boolean;
  message: string;
};

export type PublishDraftResult = {
  action: 'created' | 'updated';
  slug: string;
  wikiUrl: string;
};

/** Body for POST /api/inbox/:id/draft */
export type DraftGenerateRequest = {
  includeAuthor?: boolean;
  taxonomyPath?: TaxonomyPath;
  articleSlug?: string;
  articleId?: string;
  title?: string;
};

/** Body for POST /api/inbox/:id/archive */
export type ArchiveRequest = {
  reason: ArchiveReason;
  note?: string;
};

/** Article row for desk picker / bootstrap (no full markdown body). */
export type WikiArticleSummary = Omit<WikiArticle, 'publicMarkdown'>;

/** One round-trip desk load (GET /api/bootstrap). */
export type DeskBootstrap = {
  subredditName: string;
  pendingCount: number;
  inbox: InboxItem[];
  articles: WikiArticleSummary[];
};

/** GET /api/inbox/meta */
export type InboxMeta = {
  subredditName: string;
  pendingCount: number;
};
