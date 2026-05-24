# ModScribe

ModScribe is a semi-automatic subreddit wiki maintenance assistant for Reddit communities. It watches subreddit activity, identifies recurring topics and high-signal posts, clusters related material, and generates reviewable Reddit Markdown drafts for public wiki pages.

The core product rule is simple: automate discovery and drafting, but keep publication under moderator control.

## What ModScribe should do

- Scan top, recent, hot, and manually nominated subreddit content.
- Categorize posts and comments into likely wiki topics.
- Cluster repeated questions, glossary terms, rules clarifications, timelines, resource lists, and context explainers.
- Generate editable Reddit Markdown drafts.
- Preserve source links for moderator auditing.
- Suggest updates to existing wiki pages instead of rewriting pages blindly.
- Queue drafts for moderator review before publishing.
- Fall back to copyable Markdown if native wiki publishing is unavailable or unreliable.

## Access model

Published wiki pages should remain readable by normal subreddit users according to subreddit wiki settings. ModScribe's internal dashboard, automation settings, draft queue, source analysis, and publish controls are moderator-only.

## Development posture

This repository started from Reddit's Devvit Vibe Coding Template, which includes Devvit, Vite, React, Hono, tRPC, Tailwind, and TypeScript.

Build the app in stages:

1. Manual nomination and draft generation.
2. Knowledge Inbox for scanned candidates.
3. Scheduled scanning and lightweight post/comment watchers.
4. Topic clustering and existing-page update suggestions.
5. Native wiki publishing behind explicit moderator approval.

## Non-goals for the first version

- Silent auto-publishing.
- Full-subreddit scraping without limits.
- Treating jokes, speculation, or accusations as verified fact.
- Exposing unpublished draft analysis to normal users.
- Depending on wiki publishing as the only useful output path.

## Development commands

Make sure Node 22 is installed.

```bash
npm install
npm run dev
npm run build
npm run type-check
```

Useful Devvit commands from the template:

```bash
npm run login
npm run deploy
npm run launch
```

## Documentation

Start with:

- [`AGENT_CONTEXT.md`](AGENT_CONTEXT.md)
- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/DEVVIT_IMPLEMENTATION_NOTES.md`](docs/DEVVIT_IMPLEMENTATION_NOTES.md)
