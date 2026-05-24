# ModScribe Product Spec

## One-line description

ModScribe turns useful subreddit activity into structured, reviewable, public-facing Reddit wiki documentation.

## Problem

Subreddits accumulate knowledge in threads, comments, repeated questions, inside terminology, moderation explanations, and recurring disputes. That knowledge is hard to preserve. Search is weak, old threads decay, and moderators repeatedly explain the same context.

Manual wiki maintenance works, but it is slow and easy to neglect. Fully automatic wiki updates are risky because subreddit discussion includes jokes, sarcasm, speculation, drama, outdated information, and accusations.

## Product thesis

The right system is semi-automatic:

- Let automation discover and organize candidate knowledge.
- Let AI draft wiki-ready Markdown.
- Let moderators decide what becomes public community documentation.

## Primary users

- Subreddit moderators who maintain public wikis, FAQs, rules pages, timelines, or glossary pages.
- Communities with recurring questions, repeated controversies, terminology, drama context, or onboarding friction.

## Secondary users

- Normal subreddit users who read the final public wiki pages.

## Core workflows

### 1. Manual nomination

A moderator nominates a post or comment thread for wiki treatment. ModScribe captures source links, stores a source snapshot, suggests a category, and creates a draft or inbox item.

### 2. Knowledge Inbox

ModScribe scans configured content sources and adds strong candidates to a reviewable inbox. Mods can approve, reject, ignore, merge, or draft from each item.

### 3. Draft generation

The app generates Reddit Markdown drafts for:

- FAQ entries
- Glossary entries
- Rules clarifications
- Recurring-topic explainers
- Drama/context explainers
- Timelines
- Resource lists
- Start-here guides
- Common misconceptions pages

### 4. Existing page update suggestions

When a candidate relates to an existing wiki page, ModScribe should suggest a diff or incremental update rather than replacing the whole page.

### 5. Publishing

If native wiki APIs are available and reliable, mods can publish after explicit confirmation. If not, mods can save the draft and copy public Markdown for manual wiki updates.

## Access model

- Public wiki pages follow subreddit wiki visibility settings.
- Internal app workflows are moderator-only.
- Drafts, settings, source analysis, and review notes are not visible to normal users.

## Automation rules

ModScribe may automatically:

- Watch new posts/comments.
- Periodically scan top/recent/hot content.
- Score candidates.
- Categorize and cluster topics.
- Suggest drafts or updates.

ModScribe must not automatically:

- Publish new pages.
- Overwrite existing pages.
- Expose internal notes.
- Treat speculation as fact.

## Quality rules

Generated public pages should:

- Use Reddit Markdown.
- Preserve source links.
- Avoid usernames by default.
- Mark uncertainty clearly.
- Separate sourced claims from community interpretation.
- Keep moderator review notes out of public output unless explicitly included.
- Prefer neutral summaries over argumentative framing.

## Minimum viable version

- Moderator can nominate a post.
- App stores a source snapshot.
- App creates a draft wiki page from the source.
- Moderator can edit, save, and copy Markdown.
- README and docs make the app direction clear.

## Next useful version

- Knowledge Inbox.
- Scheduled scan rules.
- Candidate scoring.
- Topic categories.
- Saved drafts dashboard.
- Copy public Markdown vs copy draft with review notes.

## Later version

- Topic clustering.
- Existing-page diff suggestions.
- Native wiki publishing.
- Published history.
- Stronger source auditing.
- Mod notifications for high-confidence candidates.
