# Devvit Implementation Notes

These notes capture the parts of ModScribe most likely to become fragile if implemented from stale template assumptions.

## Validate the current Devvit config

Before adding features, confirm the local `devvit.json` matches the current Devvit schema and the template's expected structure.

Check:

- app name
- server entrypoint
- client/webview configuration
- Reddit API permission scope
- Redis permission
- scheduler configuration
- trigger configuration
- menu action locations
- moderator-only restrictions

Do not copy older examples directly without checking them against the current template.

## Permissions

ModScribe likely needs:

- Redis for internal state.
- Reddit API access for reading posts/comments and moderator-restricted surfaces.
- Moderator-only menu actions for nomination, dashboard, scans, and settings.
- Optional wiki create/update permissions if current Devvit APIs support native wiki publishing.

The app should still work without wiki publishing by saving drafts and exposing copyable Markdown.

## Storage strategy

Avoid one giant JSON blob per collection. Store individual records under stable keys and keep indexes for listing.

Example:

```text
modscribe:inbox:{itemId}
modscribe:inbox:index
modscribe:draft:{draftId}
modscribe:draft:index
```

This makes it easier to update one item, paginate dashboards, avoid large writes, and recover from partial failures.

## Trigger strategy

Post/comment triggers should be cheap and conservative.

Use triggers for:

- capture candidate seeds
- apply simple keyword/flair exclusions
- store permalink and excerpt
- mark candidate for later scoring

Do not use triggers for:

- full scans
- comment-tree ingestion
- expensive AI generation
- wiki publishing

## Scheduler strategy

Use scheduled jobs for heavier work:

- scan configured windows
- update candidate score/comment counts
- fetch bounded context
- cluster similar items
- promote high-signal candidates to Knowledge Inbox

Scheduled jobs should track last scan timestamps and process bounded batches.

## Source snapshots

Every draft should include source snapshots. A snapshot should include:

- Reddit thing ID
- kind: post or comment
- permalink
- title if present
- bounded excerpt
- captured timestamp
- content hash
- whether usernames were included

This protects the audit trail if the source is later edited, deleted, or removed.

## Draft output split

Keep two outputs:

1. Public Markdown: safe for the wiki page.
2. Moderator Review Notes: private notes about uncertainty, weak sourcing, ambiguity, cleanup needs, and generation decisions.

Public Markdown should not include moderator notes by default.

## Publishing strategy

Implement wiki publishing through a replaceable adapter.

The adapter should support:

- capability check
- fetch existing page
- create page
- update page
- safe failure behavior

If publishing is not supported, the UI should show copy/paste instructions and keep the draft saved.

## Safety defaults

- No silent auto-publish.
- No silent overwrite.
- No unlimited scans.
- No usernames in public output by default.
- No private mod data in public pages.
- No allegations/speculation presented as fact.
- No dependence on native wiki publishing for MVP usefulness.

## Suggested first code tasks

1. Rename template UI/app copy to ModScribe.
2. Add domain types under a shared types module.
3. Add Redis storage helpers.
4. Add manual post/comment nomination menu action.
5. Add draft save/list/copy flow.
6. Add Knowledge Inbox.
7. Add scheduled scans after the manual path works.
