# Lifelog — Cloud Sync Integration: Remaining Work & PRD

## Current state (as of pause)
- Frontend (React + TS + Vite + Tailwind + Zustand) is complete through v2: 8 themes, Dashboard, Habits, Analytics, Settings, IndexedDB persistence, PWA, notifications, category filters.
- Real backend built: `server/index.js` (Express + scrypt auth + last-write-wins snapshot sync on `:8787`). API verified directly (signup/login/logout, 401/409, GET/PUT LWW).
- Client wiring done: `src/lib/api.ts`, `src/types.ts` (added `updatedAt`), `src/store.ts` (auth + sync actions + auto-push subscriber), `src/components/settings/Settings.tsx` (real account/sync UI).
- Build + lint are clean (`npm run build` exit 0, `npm run lint` clean).
- Fix applied: LWW pull-on-login now prefers the server when the device has *never synced* (`lastSyncedAt == null`), fixing the "fresh device seeds a newer timestamp" bug. `logout` no longer clears `lastSyncedAt`.

## What is NOT yet verified / done
1. **End-to-end browser sync test (in progress).** A puppeteer test (`pp7.mjs`) exists but the first run had measurement bugs (read counts on the wrong page). A corrected version is written but **not yet run**. It must prove:
   - Device A signs up, toggles a habit, auto-pushes, shows "Synced".
   - A's session survives reload (token in IndexedDB).
   - Device B logs in with same account and its Dashboard reflects A's data (cross-device pull).
   - Zero console errors.
2. **Final git commit** of the backend + client-sync changes (currently uncommitted; initial commit `9f3281f` predates sync).
3. **README / run instructions** for the server (`npm install` + `node index.js` on `:8787`, `VITE_API_URL`) — optional but recommended.
4. **Edge cases not yet handled:** logout-then-login on same device keeps `lastSyncedAt` (good) but local edits made after logout could be clobbered on re-login (acceptable for v1, document it). No email verification, no password reset, no multi-device concurrent-edit merge (LWW only).

## PRD / Prompt to finish the task
> You are continuing the "Lifelog" habit tracker. The frontend and a real Express sync backend already exist at `/home/dinosaur/lifelog`.
> The goal is to **verify and finalize cloud sync** end-to-end, then commit.
>
> Steps:
> 1. Ensure backend is running: `cd /home/dinosaur/lifelog/server && node index.js` (port 8787).
> 2. Build + preview the frontend: `cd /home/dinosaur/lifelog && npm run build && npm run preview -- --port 4184`.
> 3. Run the existing browser test `pp7.mjs` (uses `puppeteer-core` + `/opt/google/chrome/chrome`, headless). It signs up on context A, toggles a habit, reloads (checks session persists), then logs in on context B and compares the Dashboard "X of Y habits" count to prove the pull worked. Fix any bugs it surfaces (test or app). Expect: A logged in = true, session persists = true, B logged in = true, counts equal, no console errors.
> 4. If the test fails on the app side, fix `src/store.ts` (`_pullThenPush`, auto-push subscriber), `src/lib/api.ts`, or `src/components/settings/Settings.tsx`. Rebuild and rerun.
> 5. Confirm `npm run lint` is clean.
> 6. Update README with: how to run the server (`server/` — `npm install`, `node index.js`), set `VITE_API_URL` for non-localhost, and the LWW sync model.
> 7. Commit all backend + client-sync changes to git with a clear message (e.g. "Add cloud sync: auth + last-write-wins snapshot sync"). Do NOT commit `server/data/` or `node_modules/`.
>
> Constraints: keep the LWW snapshot strategy; don't introduce a new state library; keep IndexedDB as the local store; no backend framework beyond Express already used.

## Files of interest
- `src/lib/api.ts`, `src/store.ts`, `src/types.ts`, `src/components/settings/Settings.tsx`
- `server/index.js`, `server/package.json`
- `.gitignore` (ignores `server/data/`, `dist/`, `*.tsbuildinfo`)
- `pp7.mjs` (browser sync test)
