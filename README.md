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

In the app, open **Settings → Account** to sign up or log in. Your entire local snapshot is synced with **last-write-wins** semantics (the most recently updated device wins). A new device pulls the server copy on first login. CORS is enabled on the server; for production, restrict `CORS_ORIGIN` and serve the app over HTTPS.

> No email verification, password reset, or multi-device concurrent-edit merge yet — sync is single-writer LWW by snapshot.
