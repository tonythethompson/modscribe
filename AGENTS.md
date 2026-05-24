You are writing a Devvit web application that will be executed on Reddit.com.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, Vite
- **Backend**: Node.js v22 serverless environment (Devvit), Hono
- **Communication**: REST `/api/*` from the client (`fetch`)
- **Testing**: Vitest

## Layout & Architecture

- `/src/server`: **Backend Code**. This runs in a secure, serverless environment.
  - `index.ts`: Main server entry point (Hono app).
  - `routes/api/`: Public mod API (`inbox`, `drafts`, `archive`, `articles`, `proposals`, `settings`, `wiki`).
  - `core/`: Redis (`db.ts`), ingest (`ingest.ts`), generator (`generator.ts`), settings (`settingsService.ts`).
  - Access `redis`, `reddit`, and `context` here via `@devvit/web/server`.
- `/src/client`: **Frontend Code**. This is executed inside of an iFrame on reddit.com
  - Entrypoints:
    - `game.html`: The main React entry point (Expanded View) — Desk | Wiki | Archive | Settings.
    - `splash.html`: The initial React entry point (Inline View). Keep it fast.
  - `components/`: Desk, Wiki, Archive, Settings UI.
- `/src/shared`: **Shared Code**. Types and constants shared between client and server.

## Data Fetching (REST)

1. **Define route**: Add handlers under `src/server/routes/api/`.
2. **Call in Client**: Use `apiFetch` from `src/client/lib/api.ts`.

## Frontend

### Rules

- Instead of `window.location` or `window.assign`, use `navigateTo` from `@devvit/web/client`

### Limitations

- `window.alert`: Use `showToast` or `showForm` from `@devvit/web/client`
- File downloads: Use clipboard API with `showToast` to confirm
- Geolocation, camera, microphone, and notifications web APIs: No alternatives
- Inline script tags inside of `html` files: Use a script tag and separate js/ts file

## Commands

- `npm run type-check`: Check typescript types
- `npm run lint`: Check the linter
- `npm run test -- my-file-name`: Run tests isolated to a file

## Code Style

- Prefer type aliases over interfaces when writing typescript
- Prefer named exports over default exports
- Never cast typescript types

## Global Rules

- You may find code that references blocks or `@devvit/public-api` while building a feature. Do NOT use this code as this project is configured to use Devvit web only.
- Whenever you add an endpoint for a new menu item action, ensure that you've added the corresponding mapping to `devvit.json` so that it is properly registered

Docs: https://developers.reddit.com/docs/llms.txt.
