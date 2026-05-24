# ModScribe — Living Wiki (Master Plan)

## Changelog

**2026-05-24:** Supersedes the Phase 1 “Manual Nomination MVP” plan (nominate → copy-only). The codebase now includes AI generation, wiki publish, and install settings. This document defines the **living wiki** roadmap: categorize-first Desk UI, Archive disposition, encyclopedia articles, watch-mode ingest, and autonomy dial.

**Interactive UX reference:** `canvases/modscribe-ux-prototype.canvas.tsx` (Cursor Canvas)

**After each shippable slice:** `npm run build && devvit upload` (playtest on `r/modscribe_dev`)

---

## Product vision

ModScribe maintains a **morphing, taxonomy-driven subreddit wiki** — not a stack of post summaries.

| Principle | Meaning |
|-----------|---------|
| **Articles, not threads** | Many posts/comments feed **one encyclopedia page** (MediaWiki-style: lead, sections, see also, references). |
| **Categorize before write** | Assign taxonomy path + target article before generation. |
| **Desk, not Queue/Drafts tabs** | Desktop/tablet: one surface (inbox list + categorize + preview). Mobile: mod-queue **swipes** (Archive left, Draft right). Inbox default = no action. |
| **Archive** | Clear sources from desk without publishing (off-topic, duplicate elsewhere, spam, not encyclopedia material). Searchable **Archive** tab, separate from **Wiki**. |
| **Watch mode (primary)** | Ingest posts/comments above **min score** (`devvit.json` `min-score-threshold`); manual **Nominate** remains optional. |
| **Autonomy dial** | Configurable how much the system does without a mod: suggest → auto-categorize → auto-draft → restructure proposals (merge/split). |
| **Living graph** | Background jobs re-score taxonomy, articles, and propose merges/splits as new data arrives. |

---

## Current codebase (baseline)

| Area | Status |
|------|--------|
| API | Hono `/api/inbox`, `/api/drafts`, `/api/settings`, `/api/wiki`; no tRPC |
| AI | OpenAI/Gemini + mock in `generator.ts`; wiki context in prompts |
| Settings | Subreddit install settings + validation; `settingsService.ts` |
| Publish | `publish.ts` + `POST /api/drafts/:id/publish` |
| Types | `SourceSnapshot`, `InboxItem`, `Draft`, `WikiPageContext` |
| UI | Componentized Desk / Wiki / Archive / Settings (`src/client/components/`) |
| Triggers | `onAppInstall`, `onCron` scheduled scan → `ingest` pipeline |
| Automation | `ignored-keywords`, `target-flairs`, `min-score-threshold`, `watch-enabled`, `autonomy-level` |

---

## Implementation phases

### Phase A — Desk UI + component refactor (done in this rollout)

- Navigation: Desk | Wiki | Archive | Settings
- 3-pane desktop Desk; mobile swipe Archive / Draft
- Editorial Archivist tokens (Fraunces + Source Sans 3)
- `AGENTS.md` updated for REST `/api/*`

### Phase B — Archive disposition

- `ArchiveRecord` + Redis + `POST /api/inbox/:id/archive`, `GET /api/archive`

### Phase C — Categorization-first article model

- `WikiArticle`, taxonomy on drafts, encyclopedia generator prompts
- `GET /api/articles`, draft generation accepts `{ taxonomyPath, articleSlug, articleId? }`

### Phase D — Watch-mode ingest

- `ingest.ts` filters by score/keywords/flairs
- Cron trigger + optional manual scan from settings

### Phase E — Autonomy + living graph

- `autonomy-level` install setting + `policy.ts`
- `StructureProposal` CRUD + Wiki tab proposals UI
- Background re-score creates merge/split **proposals** (mods approve)

---

## Verification

- `npm run type-check`
- `npm run test`
- Manual: Desk triage, archive, draft, publish, settings
- `devvit upload` after each phase

---

## Explicitly deferred

- Full Wikipedia infobox templates / rich media pipeline
- Auto-publish with zero mod review (unless dial explicitly allows)
- Off-platform wiki hosting
