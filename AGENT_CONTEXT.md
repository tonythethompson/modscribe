# Agent Context: ModScribe

## Product identity

ModScribe is a Reddit Devvit app for semi-automatic subreddit wiki maintenance. It helps moderators discover useful subreddit knowledge, cluster recurring topics, draft Reddit Markdown wiki pages, and queue updates for review.

The app should behave like a knowledge maintenance tool, not a one-shot summarizer.

## Core principle

Automate discovery, scoring, categorization, clustering, and drafting. Do not silently publish or overwrite public wiki pages. Publication requires explicit moderator approval.

## Access model

- Normal users may read final published wiki pages if subreddit wiki settings allow it.
- Moderators control generation, review, editing, saving, publishing, and automation settings.
- Drafts, review notes, source analysis, logs, and settings are moderator-only.
- Default output is public-facing wiki Markdown, not private mod notes.

## Recommended build order

1. Replace template surfaces with ModScribe naming and navigation.
2. Add shared domain types for settings, inbox items, clusters, drafts, source snapshots, and publish records.
3. Add storage helpers using per-item Redis keys plus indexes rather than giant JSON arrays.
4. Add a manual nomination path from post/comment menu actions.
5. Add a Knowledge Inbox dashboard.
6. Add draft generation from selected sources.
7. Add saved drafts and copyable Markdown.
8. Add scheduled scans for recent/top content.
9. Add clustering and existing-page update suggestions.
10. Add native wiki publishing only if current Devvit APIs support it reliably.

## Important product constraints

- No silent auto-publish.
- No unlimited scraping.
- No private moderation data in public output.
- No usernames in public wiki pages by default.
- No treating jokes, speculation, allegations, or sarcasm as fact.
- Preserve source links and source snapshots for auditability.
- Prefer diffs and incremental updates over full page rewrites.
- The app must remain useful even if native wiki publishing is unavailable.

## Devvit implementation posture

Validate Devvit APIs against current documentation before coding. Older examples may use stale config shapes. Pay special attention to:

- devvit.json schema and required fields.
- Reddit API permission scope.
- Redis capabilities and size limits.
- Scheduler configuration.
- Menu action locations and moderator-only restrictions.
- Trigger payload shapes.
- Whether wiki create/update APIs are available in the current runtime.

## Data model direction

Avoid storing all state as giant serialized arrays. Prefer per-item keys and indexes:

- `modscribe:settings`
- `modscribe:inbox:{itemId}`
- `modscribe:inbox:index`
- `modscribe:cluster:{clusterId}`
- `modscribe:cluster:index`
- `modscribe:draft:{draftId}`
- `modscribe:draft:index`
- `modscribe:history:{publishId}`
- `modscribe:last_scan:{scanType}`
- `modscribe:ignored_topics`

## Source snapshot requirement

Generated drafts should store the source permalink and a bounded text excerpt/hash captured at draft time. This protects auditability if the original Reddit item is edited, deleted, or removed later.

## Tone of generated wiki pages

Public pages should be neutral, concise, sourced, and clear. They should explain what the community needs to know without laundering unresolved arguments into official fact.
