# ModScribe Architecture

## High-level shape

ModScribe should be built as a Devvit Web app with a React client, a Hono/tRPC server layer, Redis-backed state, and optional native Reddit wiki publishing.

```text
Reddit surfaces
  -> moderator menu actions
  -> post/comment triggers
  -> scheduled scan jobs
  -> server handlers
  -> Redis storage
  -> review dashboard
  -> copy Markdown or publish to wiki
```

## Core modules

### Client

The client should provide moderator-facing screens:

- Dashboard
- Knowledge Inbox
- Draft Review
- Automation Settings
- Saved Drafts
- Published History

The client should not expose drafts or settings to normal users.

### Server

The server owns app logic:

- Source capture
- Candidate scoring
- Category suggestion
- Topic clustering
- Draft generation orchestration
- Storage access
- Wiki publishing adapter
- Error handling and permission checks

### Storage

Use Redis for app state. Prefer per-item records plus index keys over large serialized arrays.

Suggested keys:

```text
modscribe:settings
modscribe:inbox:{itemId}
modscribe:inbox:index
modscribe:cluster:{clusterId}
modscribe:cluster:index
modscribe:draft:{draftId}
modscribe:draft:index
modscribe:history:{publishId}
modscribe:last_scan:{scanType}
modscribe:ignored_topics
```

## Domain objects

### AutomationSettings

Controls scan behavior: frequency, windows, score thresholds, flairs, keywords, comment inclusion, removed/deleted filtering, and notifications.

### SourceSnapshot

Captures the Reddit item used for a draft:

- thing ID
- kind: post or comment
- permalink
- title
- bounded excerpt
- captured timestamp
- content hash
- whether author/usernames were included

### InboxItem

A candidate source item awaiting moderator decision.

### TopicCluster

A group of related inbox items that likely belong to the same wiki topic.

### Draft

A generated wiki draft with public Markdown, moderator notes, sources, status, and target slug.

### PublishRecord

An audit record for published wiki changes.

## Automation design

### Triggers

Post/comment triggers should be lightweight. They should capture candidate seeds and apply cheap filters only. They should not perform expensive clustering or draft generation.

Good trigger work:

- capture ID/permalink/title/body excerpt
- apply exclusion filters
- store as candidate seed
- update last-seen metadata

Bad trigger work:

- full subreddit scans
- heavy comment ingestion
- draft generation for every post
- publishing

### Scheduled scans

Scheduled scans should do the heavier work:

- re-check score and comment growth
- pull recent/top candidates within configured limits
- gather bounded comment context
- score candidates
- cluster topics
- promote strong candidates to Knowledge Inbox

## Draft generation pipeline

```text
sources -> source snapshots -> candidate summary -> category -> public Markdown -> moderator notes -> draft record
```

Generated drafts should separate:

- sourced claims
- uncertain claims
- community interpretation
- speculation or allegations
- items needing moderator review

## Wiki publishing adapter

The wiki layer should be replaceable:

```text
interface WikiPublisher {
  canPublish(): Promise<boolean>;
  fetchPage(slug: string): Promise<WikiPage | null>;
  publishPage(input: PublishInput): Promise<PublishResult>;
}
```

If native wiki APIs are unavailable, `canPublish` should return false and the UI should expose copyable Markdown.

## Failure behavior

ModScribe should fail safely:

- If Reddit API access fails, keep saved drafts.
- If wiki publishing fails, preserve copyable Markdown.
- If scanning hits limits, store partial scan metadata and continue later.
- If AI generation is unavailable, keep Knowledge Inbox candidates for manual drafting.
- If source content disappears, retain the stored source snapshot and permalink.

## Security and privacy

- Treat all unpublished app data as moderator-only.
- Never expose source analysis to normal users.
- Do not include usernames in public output by default.
- Do not export subreddit data outside the app unless the user explicitly wires a provider and understands the implications.

## Build priority

The first implementation should prove the loop:

```text
nominate source -> store snapshot -> generate draft -> edit/review -> copy Markdown
```

Everything else should layer on top of that loop.
