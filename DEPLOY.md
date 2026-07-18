# Deploy — Vercel (serverless) + Neon Postgres

Lifelog is a Vite SPA fronted by Vercel, with the Express sync backend running as a single
Vercel serverless Function (`api/index.js`) and a **Neon** serverless Postgres database.
Frontend and API are served from the **same origin**, so no CORS is needed.

Total cost: **$0** (Vercel Hobby + Neon Free).

## 1. Database — create a Neon project
1. Sign up at [neon.tech](https://neon.tech) (no credit card).
2. Create a project. In the dashboard, copy the **connection string** (looks like
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`).
3. That's your `DATABASE_URL`. The app creates its tables automatically on first run.

## 2. Deploy to Vercel
**Option A — Git (recommended, auto-deploys on push)**
1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** your `lifelog` repo. Vercel auto-detects Vite.
3. Set **Environment Variables** (Settings → Environment Variables), all scopes:
   - `DATABASE_URL` = the Neon connection string
   - `TRUST_PROXY` = `1`
   - `CORS_ORIGIN` = your domain, e.g. `https://lifelog.vercel.app` (optional; same-origin works without it)
   - `ACCESS_TTL_MIN` = `60`, `REFRESH_TTL_DAYS` = `30` (defaults; optional)
   - Optional: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, SMTP_*
4. **Deploy**. After build, open the URL, sign up.

**Option B — Vercel CLI**
```bash
vercel link          # connect to the existing lifelog project
vercel env add DATABASE_URL   # paste the Neon string when prompted
vercel env add TRUST_PROXY 1
vercel --prod
```

## 3. Custom domain (optional)
- In Vercel: Project → Settings → Domains → add your domain.
- The app derives `APP_URL` / `PUBLIC_URL` from `VERCEL_URL` automatically. If you need OAuth
  with a custom domain, also set `PUBLIC_URL` and `APP_URL` to `https://yourdomain.com`.
- Set `CORS_ORIGIN` to your domain if you ever call the API cross-origin.

## 4. Local development
You need a Postgres URL (the Neon free DB works locally too):
```bash
cp .env.example .env        # set DATABASE_URL to your Neon connection string
npm run dev                 # frontend on :5173
npm run start               # backend function-equivalent on :8787 (serves SPA too if STATIC_DIR set)
# or test the exact serverless shape:
vercel dev
```
The backend reads `DATABASE_URL` and creates tables on first request.

## 5. How it's wired
- `vercel.json` rewrites `/api/*` to the `api/` function and serves `index.html` for all other
  routes (SPA). Vercel's CDN serves the built SPA; the function only handles `/api/*`.
- `api/index.js` exports the Express `app` from `server/index.js`.
- `server/index.js` uses `@neondatabase/serverless` (async SQL), a Postgres-backed rate limiter
  (in-memory stores don't survive serverless), and an httpOnly cookie for OAuth PKCE state
  (process memory doesn't survive serverless).
- `app.listen` is skipped on Vercel (`VERCEL` env is set); it only listens for local/dev.

## Security notes
- TLS is provided by Vercel. The API is same-origin; `CORS_ORIGIN` is an extra lock.
- `TRUST_PROXY=1` so rate limits key off the real client IP.
- Habits are E2E-encrypted: the database stores only ciphertext; tokens are hashed at rest and
  short-lived (60-min access / 30-day refresh, rotated on use).
- Do **not** expose `vite dev` publicly (its esbuild advisory). Use the Vercel deployment.
- Optional: put Cloudflare in front for free WAF/DDoS.
