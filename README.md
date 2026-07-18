# Lifelog

> **Lifelog isn't designed to motivate you. It's designed to show you the truth about your consistency.**

Track consistency. Build momentum.

Lifelog is a premium, local-first habit tracker. It isn't a calendar, a task manager, or a Notion replacement — it exists to make long-term consistency beautiful, measurable, and effortless.

## Principles

- **One purpose** — everything revolves around habits.
- **Minimal** — few pages, few buttons, fast interactions.
- **Beautiful** — glass cards, soft shadows, spacious layouts (inspired by Linear, Arc, Apple Health, GitHub, Raycast).
- **Fast** — daily check-in under 30 seconds, instant interactions, offline first.
- **Private** — your data lives in your browser (IndexedDB) by default. Optional cloud sync (self-hosted) is end-to-end under your control; nothing leaves your machine unless you sign in. No ads. No tracking.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. Your data is seeded with demo habits on first run and saved to IndexedDB in your browser.

## Navigation

- **Dashboard** — today's completion, overall consistency, current streak, this month, today's habits, quick reflection.
- **Habits** — per-habit grids (week / month / quarter / year), completion stats, add / edit / delete, slide-over details.
- **Analytics** — _coming soon_.
- **Settings** — themes, week start, categories, export / import / reset.

## Tech

React 18 · TypeScript · Vite · Tailwind CSS · Zustand (persisted to `localStorage`).

Theming is driven entirely by CSS variables on `<html data-theme>`, so adding new themes (Forest, Ocean, Rain, Coffee, Sakura, Future) is a matter of one variable block each.

## Roadmap

Shipped:

- 8 themes (Dark, Light, Forest, Ocean, Rain, Coffee, Sakura, Future)
- Analytics: daily/weekly/monthly trends, year overview, GitHub-style heatmap, category breakdown, automatic insights
- Richer habit details: weekly/monthly graphs, year heatmap, journal notes
- **IndexedDB** storage (replaces localStorage) via a swappable persist adapter
- **PWA**: web manifest + service worker for offline use
- **Notifications**: configurable daily reminder (fires while the app is open)
- **Advanced filters**: category filter on the Habits view
- Export / import / reset, week-start, categories
- **Cloud sync & accounts** (self-hosted) — sign up / log in, last-write-wins snapshot sync, auto-push on change, pull-on-login for new devices, offline-first (local always works; sync when connected)

Needs a backend (not in this build):

- AI-powered natural-language insights (the current insights are a local heuristic engine; an LLM call can be dropped in behind the same `insights()` seam)

## Cloud sync (optional)

Sync is powered by a small self-hosted Node server in `server/`. The app works fully offline without it.

Start the server:

```bash
cd server
npm install
node index.js            # or: npm run dev  (node --watch)
# listens on http://localhost:8787
```

Point the app at it (dev / preview):

```bash
# .env (or shell)
VITE_API_URL=http://localhost:8787
npm run dev
```

In the app, open **Settings → Sync & account** to sign up or log in. Your entire local snapshot is
encrypted in the browser (AES-GCM) and synced with **last-write-wins** semantics. A new device pulls the
server copy on first login. See `SECURITY.md` for the full security model.

### Configuration (env)

| Var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | Server port |
| `CORS_ORIGIN` | dev origins | Comma-separated allowed frontend origins (set to your app's origin in prod) |
| `PUBLIC_URL` | `http://localhost:8787` | Public base URL the server reports (used for OAuth redirects) |
| `APP_URL` | `http://localhost:5173` | Frontend origin OAuth redirects back to |
| `ACCESS_TTL_MIN` | `60` | Access-token lifetime (minutes) |
| `REFRESH_TTL_DAYS` | `30` | Refresh-token lifetime (days) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Enable "Continue with Google" |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | Enable "Continue with GitHub" |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_FROM` | — | Enable email verification |

### Production notes

- **TLS**: the server is plain HTTP by default — put it behind a reverse proxy (nginx/Caddy) with HTTPS.
- **CORS**: set `CORS_ORIGIN` to your frontend's origin(s); unknown origins get `403`.
- **E2E**: for password accounts the key is derived from your password, so sync works across devices
  without the server seeing it. For Google/GitHub accounts a random device-bound key is used — export it
  from an existing device (Settings → Export sync key) and import it on a new one.
- **Do not expose `vite dev`** to untrusted networks (dev-server advisory in its `esbuild` dependency);
  use `vite preview` or a static host for production.

> No password reset yet. Sync is single-writer LWW by snapshot (no per-field merge of concurrent offline edits).
