# ModScribe Roadmap

## Phase 0: Repository orientation

Goal: replace generic template framing with ModScribe-specific context.

- [x] Replace template README.
- [x] Add product spec.
- [x] Add architecture notes.
- [x] Add agent context.
- [ ] Verify Devvit config against current schema.
- [ ] Confirm local build and type-check commands.

## Phase 1: Manual nomination MVP

Goal: prove the basic value loop without background automation.

User story: As a moderator, I can nominate a post or comment thread and get an editable wiki draft.

Deliverables:

- Moderator-only menu action on posts/comments.
- Source snapshot model.
- Basic draft model.
- Save draft flow.
- Copy public Reddit Markdown.
- Copy draft with moderator notes.
- Simple dashboard list of saved drafts.

Acceptance criteria:

- A moderator can nominate a Reddit item.
- The app stores a permalink and bounded source excerpt.
- The app produces a draft in the expected wiki format.
- The moderator can edit and save the draft.
- The moderator can copy Markdown without relying on native wiki publishing.

## Phase 2: Knowledge Inbox

Goal: start organizing candidate knowledge before generating pages.

Deliverables:

- InboxItem model.
- Knowledge Inbox dashboard.
- Candidate statuses: pending, approved, rejected, ignored, drafted, published.
- Category suggestions.
- Source quality notes.
- Manual merge/duplicate/ignore controls.

Acceptance criteria:

- Mods can review candidate items before creating drafts.
- Mods can reject or ignore noisy candidates.
- Candidates preserve source links.

## Phase 3: Scheduled scanning

Goal: add semi-automatic discovery.

Deliverables:

- Automation settings screen.
- Scheduled scan job.
- Top/recent/hot scan modes if available.
- Flair, keyword, score, and comment thresholds.
- Scan cursor / last scan tracking.
- Rate-limited batch processing.

Acceptance criteria:

- Mods can configure scan thresholds.
- The app adds high-signal candidates to Knowledge Inbox.
- The app does not generate or publish pages for every scanned item.

## Phase 4: Topic clustering

Goal: connect repeated discussion into durable wiki topics.

Deliverables:

- TopicCluster model.
- Cluster index.
- Merge/split/rename cluster controls.
- Related candidates view.
- Suggested page title and slug.

Acceptance criteria:

- Similar candidates can be grouped into a topic.
- Mods can override bad clusters.
- Drafts can be generated from a cluster instead of one source.

## Phase 5: Existing page update suggestions

Goal: maintain pages over time instead of only creating new ones.

Deliverables:

- Existing wiki page lookup if available.
- Proposed additions/removals.
- Diff-style review UI.
- Source-backed change notes.
- Published history records.

Acceptance criteria:

- App can suggest an incremental update to an existing page.
- Mods can inspect sources before approving.
- Existing pages are not overwritten blindly.

## Phase 6: Native wiki publishing

Goal: publish directly only where Devvit/wiki APIs support it reliably.

Deliverables:

- WikiPublisher adapter.
- Capability check.
- Fetch existing page.
- Create/update page.
- Confirmation modal before publish.
- Fallback copy/paste path.

Acceptance criteria:

- Publishing is unavailable unless capability checks pass.
- Mods must explicitly confirm page creation or overwrite.
- Failed publishing preserves the draft and source data.

## Phase 7: Higher-quality automation

Goal: improve signal without giving up mod control.

Deliverables:

- Better scoring model.
- Stronger duplicate detection.
- Mod notifications for high-confidence candidates.
- Candidate decay / archival.
- Review load controls.
- Metrics dashboard.

Acceptance criteria:

- Automation helps mods notice useful knowledge without overwhelming them.
- Mods can tune the system toward their subreddit culture.
