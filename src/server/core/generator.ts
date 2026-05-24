import type { AiProvider, Draft, SourceSnapshot, WikiArticle, WikiPageContext } from '../../shared/types.js';
import { generateStructuredDraft } from './aiClient.js';
import { loadPriorSourceSnapshots } from './sources.js';
import { getAiProvider, getApiKey } from './settingsService.js';
import { loadWikiPageContext, normalizeWikiSlug } from './wiki.js';

type DraftShell = Omit<Draft, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>;

const SYSTEM_PROMPT = `You are ModScribe, a subreddit encyclopedia editor for Reddit moderators.
Your job is to write or update a living wiki ARTICLE — not a recap of a single thread.

Return ONLY valid JSON with these keys:
- title (string) — encyclopedia article title, not clickbait
- slug (string) — lowercase wiki path with hyphens, no leading slash
- publicMarkdown (string) — Reddit-flavored markdown for the PUBLIC wiki page
- moderatorNotes (string) — MOD-ONLY review notes (flags, uncertainty, merge rationale)
- proposedChangeSummary (string) — REQUIRED when an existing Reddit wiki page or in-app article body is non-empty; describe what changed vs what was kept
- uncertainClaims (string array, optional)
- needsModReview (string array, optional)

publicMarkdown structure (encyclopedia, NOT blog/recap):
1. Lead paragraph immediately after the title (# …) with NO heading — neutral third-person overview of the topic for the subreddit.
2. Body sections using ## headings only (Reddit wiki). Prefer: ## Background, ## Details, ## Community notes, ## See also — as appropriate.
3. Do NOT use "## Summary", "## Key points", "## TL;DR", or thread-recap framing.
4. End with ## References — bullet list of markdown links to Reddit sources cited in the article.
5. Optional ## See also — links to related wiki slugs or concepts when taxonomy/context suggests related pages.

When TARGET ARTICLE or EXISTING REDDIT WIKI PAGE content is provided:
- Treat this as merging a new source into an existing article, not replacing the page blindly.
- Keep accurate prior material; integrate new sourced facts; remove only redundant duplication.
- proposedChangeSummary must list substantive edits (added, updated, removed).

Taxonomy path (if provided) informs scope and tone — write for that category, not a generic post summary.

Rules:
- Never invent facts not supported by the source or existing article text.
- Separate uncertain interpretation into moderatorNotes, not publicMarkdown.
- Do not include author usernames in publicMarkdown unless includeAuthor is true.
- Avoid jokes, sarcasm, drama, and meme voice unless the source is explicitly educational.`;

export type GenerateWikiDraftOptions = {
  taxonomyPath?: string;
  article?: WikiArticle | null;
};

/**
 * Generate a wiki draft from a source snapshot.
 * Uses OpenAI/Gemini when configured; falls back to the local template on error.
 */
export async function generateWikiDraft(
  snapshot: SourceSnapshot,
  includeAuthor: boolean,
  subredditName: string,
  options: GenerateWikiDraftOptions = {}
): Promise<DraftShell> {
  const titleSeed =
    snapshot.kind === 'post' && snapshot.title
      ? snapshot.title
      : `Summary: ${snapshot.body.slice(0, 60).trim()}…`;
  const slugSeed = normalizeWikiSlug(
    options.article?.slug ?? slugify(titleSeed)
  );
  const wikiContext = await loadWikiPageContext(slugSeed);

  const provider = await getAiProvider();
  const apiKey = await getApiKey();

  if (provider !== 'mock' && apiKey) {
    try {
      return await generateWithAi(
        snapshot,
        includeAuthor,
        subredditName,
        wikiContext,
        provider,
        apiKey,
        options
      );
    } catch (error) {
      console.error(`[generator] AI provider ${provider} failed, using mock:`, error);
      const mock = generateMockDraft(
        snapshot,
        includeAuthor,
        subredditName,
        wikiContext,
        provider,
        options
      );
      return {
        ...mock,
        moderatorNotes: [
          mock.moderatorNotes,
          '',
          '### Generation fallback',
          '',
          `- AI provider **${provider}** failed; used the local template instead.`,
          `- Error: ${error instanceof Error ? error.message : String(error)}`,
        ].join('\n'),
        generationProvider: 'mock',
      };
    }
  }

  return generateMockDraft(snapshot, includeAuthor, subredditName, wikiContext, 'mock', options);
}

async function generateWithAi(
  snapshot: SourceSnapshot,
  includeAuthor: boolean,
  subredditName: string,
  wikiContext: WikiPageContext,
  provider: AiProvider,
  apiKey: string,
  options: GenerateWikiDraftOptions
): Promise<DraftShell> {
  const sourceUrl = `https://reddit.com${snapshot.permalink}`;
  const userPrompt = await buildUserPrompt(
    snapshot,
    includeAuthor,
    subredditName,
    wikiContext,
    sourceUrl,
    options
  );

  const llm = await generateStructuredDraft({
    provider,
    apiKey,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
  });

  const slug = normalizeWikiSlug(llm.slug || wikiContext.slug);
  const publicMarkdown = ensureSourceSection(llm.publicMarkdown, snapshot, sourceUrl, includeAuthor);

  return {
    title: llm.title.trim(),
    slug,
    status: 'draft',
    publicMarkdown,
    moderatorNotes: llm.moderatorNotes.trim(),
    sourceId: snapshot.id,
    includeAuthor,
    wikiContext: wikiContext.exists
      ? wikiContext
      : { slug, exists: false },
    generationProvider: provider,
    proposedChangeSummary: llm.proposedChangeSummary?.trim() || undefined,
  };
}

async function buildUserPrompt(
  snapshot: SourceSnapshot,
  includeAuthor: boolean,
  subredditName: string,
  wikiContext: WikiPageContext,
  sourceUrl: string,
  options: GenerateWikiDraftOptions
): Promise<string> {
  const article = options.article;
  const priorSnapshots =
    article && article.sourceIds.length > 0
      ? await loadPriorSourceSnapshots(article.sourceIds, snapshot.id)
      : [];

  const lines = [
    'TASK: Produce encyclopedia article markdown that may merge the NEW SOURCE below into the target article/wiki context. Output JSON only.',
    '',
    `Subreddit: r/${subredditName}`,
    `Taxonomy path: ${options.taxonomyPath ?? 'Uncategorized'}`,
    `Target slug: ${article?.slug ?? wikiContext.slug}`,
    `includeAuthor in public output: ${includeAuthor}`,
    '',
    '--- NEW SOURCE (this nomination) ---',
    `Kind: ${snapshot.kind}`,
    `Permalink: ${sourceUrl}`,
    `Score: ${snapshot.score}`,
    `Created: ${new Date(snapshot.createdAt).toISOString()}`,
    `Title: ${snapshot.title ?? '(no title — comment)'}`,
    '',
    snapshot.body,
    '',
    '--- TARGET ARTICLE (in-app living wiki) ---',
    article
      ? [
          `Title: ${article.title}`,
          `Slug: ${article.slug}`,
          `Prior sources attached: ${article.sourceIds.length}`,
          `Status: ${article.status}`,
          '',
          article.publicMarkdown || '(empty body — first revision for this article)',
        ].join('\n')
      : '(no in-app article yet — create first revision for this slug/taxonomy)',
    '',
  ];

  if (priorSnapshots.length > 0) {
    lines.push('--- PRIOR SOURCES (already linked to this article) ---');
    lines.push(
      'Synthesize these with the NEW SOURCE; deduplicate overlapping facts; keep all distinct sourced details.'
    );
    lines.push('');
    for (const [index, prior] of priorSnapshots.entries()) {
      const priorUrl = `https://reddit.com${prior.permalink}`;
      lines.push(`### Prior source ${index + 1}`);
      lines.push(`Kind: ${prior.kind}`);
      lines.push(`Permalink: ${priorUrl}`);
      lines.push(`Score: ${prior.score}`);
      lines.push(`Title: ${prior.title ?? '(no title)'}`);
      lines.push('');
      lines.push(prior.body);
      lines.push('');
    }
  }

  lines.push('--- EXISTING REDDIT WIKI PAGE (published) ---');
  lines.push(
    wikiContext.exists
      ? `Slug: ${wikiContext.slug}\n\n${wikiContext.currentContent ?? '(empty)'}`
      : `No published page at "${wikiContext.slug}" — publishing will create it.`
  );
  return lines.join('\n');
}

function generateMockDraft(
  snapshot: SourceSnapshot,
  includeAuthor: boolean,
  subredditName: string,
  wikiContext: WikiPageContext,
  provider: AiProvider,
  options: GenerateWikiDraftOptions
): DraftShell {
  const isPost = snapshot.kind === 'post';
  const title =
    isPost && snapshot.title
      ? snapshot.title
      : options.article?.title ?? `Topic: ${snapshot.body.slice(0, 60).trim()}…`;
  const slug = wikiContext.slug || normalizeWikiSlug(slugify(title));
  const sourceUrl = `https://reddit.com${snapshot.permalink}`;
  const authorCredit = includeAuthor ? `\n*Originally posted by u/${snapshot.authorName}*\n` : '';

  const changeBlock = wikiContext.exists
    ? [
        '## Proposed changes to existing wiki',
        '',
        '- This draft was generated from a nominated post/comment.',
        '- Review the public markdown below against the current page before publishing.',
        wikiContext.currentContent
          ? `- Current page length: ~${wikiContext.currentContent.length} characters (preview stored in wiki context).`
          : '',
        '',
      ]
    : ['## New wiki page', '', 'No existing page was found at this slug. Publishing will create a new page.', ''];

  const taxonomyNote = options.taxonomyPath
    ? `*Category: ${options.taxonomyPath}*`
    : '';

  const publicMarkdown = [
    `# ${title}`,
    '',
    [authorCredit.trim(), taxonomyNote].filter(Boolean).join('\n'),
    '',
    wrapParagraph(snapshot.body, 500),
    '',
    '## Background',
    '',
    wrapParagraph(snapshot.body, 700),
    '',
    '## Details',
    '',
    extractDetailBullets(snapshot.body),
    '',
    '## See also',
    '',
    '- *(Add links to related wiki pages as the taxonomy grows.)*',
    '',
    '## References',
    '',
    `- [${snapshot.kind === 'post' ? 'Source post' : 'Source comment'}](${sourceUrl}) — score ${snapshot.score}`,
    '',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n');

  const moderatorNotes = [
    '## Moderator Review Notes',
    '',
    ...changeBlock,
    `- **Source kind:** ${snapshot.kind}`,
    `- **Author:** u/${snapshot.authorName}`,
    `- **Score at nomination:** ${snapshot.score}`,
    `- **Subreddit:** r/${subredditName}`,
    `- **Content created:** ${new Date(snapshot.createdAt).toUTCString()}`,
    `- **Wiki slug:** ${slug}`,
    `- **Existing wiki page:** ${wikiContext.exists ? 'yes' : 'no'}`,
    '',
    '### Automatic Flags',
    '',
    ...buildFlags(snapshot),
    '',
    '> Review the public markdown above and edit before publishing to the subreddit wiki.',
  ].join('\n');

  return {
    title,
    slug,
    status: 'draft',
    publicMarkdown,
    moderatorNotes,
    sourceId: snapshot.id,
    includeAuthor,
    wikiContext,
    generationProvider: provider,
    proposedChangeSummary: wikiContext.exists
      ? 'Template draft — replace with AI provider for a detailed change summary.'
      : undefined,
  };
}

function ensureSourceSection(
  markdown: string,
  snapshot: SourceSnapshot,
  sourceUrl: string,
  includeAuthor: boolean
): string {
  let body = markdown.trim();
  if (includeAuthor && !body.includes(snapshot.authorName)) {
    body = `*Originally posted by u/${snapshot.authorName}*\n\n${body}`;
  }
  if (!/##\s+References/i.test(body) && !/##\s+Source/i.test(body)) {
    body = `${body}\n\n## References\n\n- [Original ${snapshot.kind}](${sourceUrl}) — Score: ${snapshot.score} | r/${snapshot.subredditName}`;
  }
  return body;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '');
}

function wrapParagraph(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}

/** Encyclopedia-style detail bullets (not "key points" recap headings). */
function extractDetailBullets(body: string): string {
  const sentences = body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 5);

  if (!sentences.length) return '- *(Insufficient sourced detail in this nomination.)*';
  return sentences.map((s) => `- ${s}`).join('\n');
}

function buildFlags(snapshot: SourceSnapshot): string[] {
  const flags: string[] = [];

  if (snapshot.score < 5) {
    flags.push('- ⚠️ Low score — verify content quality before publishing');
  }
  if (snapshot.body.length < 100) {
    flags.push('- ⚠️ Short content — consider expanding or rejecting');
  }
  if (/https?:\/\//.test(snapshot.body)) {
    flags.push('- 🔗 Contains external links — verify they are safe and relevant');
  }
  if (!flags.length) {
    flags.push('- ✅ No flags raised by automatic review');
  }

  return flags;
}
