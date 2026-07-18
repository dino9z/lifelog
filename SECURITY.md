# Lifelog — Security

Lifelog is a local-first habit tracker with an **optional** self-hosted sync server. The app is fully
functional offline; the server is only contacted when you sign in. This document describes the security
model of the sync backend (`server/`) and the client auth/sync code (`src/lib/api.ts`, `src/store.ts`,
`src/lib/crypto.ts`).

## Threat model

- **Server compromise / curious admin**: the server stores your habits only as **encrypted blobs**. It
  cannot read their contents (see E2E encryption below).
- **Network attacker (MITM)**: all API traffic is over HTTPS (Vercel provides TLS; for self-hosting, put the server behind a TLS proxy).
  Tokens travel in the `Authorization: Bearer` header; a leaked token is short-lived (see tokens).
- **Malicious website**: CORS is restricted to an allowlist; an arbitrary site cannot call the API on a
  user's behalf. OAuth uses `state` + PKCE to prevent CSRF.
- **Brute force**: login/signup are rate-limited per IP.

## Authentication

- **Passwords**: hashed with **scrypt** (`scryptSync`, 64-byte output) + per-user random salt. Never stored plaintext.
- **Tokens**: two tokens are issued on login/signup:
  - **Access token** — short-lived (default **60 min**, `ACCESS_TTL_MIN`), used for all API calls.
  - **Refresh token** — long-lived (default **30 days**, `REFRESH_TTL_DAYS`), used only to mint a new
    access token via `POST /api/auth/refresh` (which rotates both tokens).
  - Both tokens are stored **hashed (SHA-256)** on the server; a database dump yields nothing usable.
    On `401`, the client transparently refreshes once and retries; a failed refresh logs the user out.
- **Rate limiting**: `express-rate-limit` — 10 login attempts / min / IP, 5 signups / min / IP (HTTP 429).
- **No account enumeration**: a duplicate signup returns a generic `400 "Unable to create account."`
  (with a constant-time dummy hash) instead of disclosing that the email exists. Login is always generic.
- **Logout**: revokes both tokens on the server.

## CORS

The server only accepts requests from origins listed in `CORS_ORIGIN` (comma-separated). Development
origins (`localhost:5173/4173/4184/8787`) are allowed by default. A disallowed origin gets `403`.
Set `CORS_ORIGIN` to your frontend's origin(s) in production.

## End-to-end encryption (E2E)

Your snapshot is encrypted **in the browser** before it leaves the device (AES-GCM, 256-bit, random IV).
The server stores only the ciphertext.

- **Password accounts**: the key is derived from your password + the server salt using **PBKDF2**
  (100k iterations, SHA-256). The same password on any device derives the same key, so sync works
  across your devices without the server ever seeing the key or your password.
- **Social / OAuth accounts** (no password): a random device-bound key is generated and stored on the
  device. To use your account on a new device, **export the sync key** from a device that already has
  it (Settings → Export sync key) and **import** it on the new one (Settings → Import your sync key).
- Keys live in the browser's IndexedDB (device-local). This makes the server blind to your data; it
  does **not** protect against a compromised device.

> The server cannot reset a forgotten password and recover your data — by design, it never has the key.

## Transport security (TLS)

The server speaks plain HTTP by default. **Deploy it behind TLS** — Vercel provides this automatically, or
for self-hosting put it behind a reverse proxy (nginx/Caddy) / tunnel before exposing it to untrusted
networks. Set `APP_URL` to your frontend's HTTPS origin so OAuth redirects land correctly.

## Social login (OAuth)

Optional, env-gated. Set the relevant credentials to enable the buttons in Settings:

| Provider | Env vars |
| --- | --- |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |

Flow: `GET /api/auth/<provider>` → provider consent → `GET /api/auth/<provider>/callback` exchanges the
code (server-side, with **PKCE** + `state`) → finds-or-creates a local account linked by email → issues
our own access + refresh tokens and redirects back to `${APP_URL}/auth-callback#accessToken=…`. No
provider tokens are stored.

## Email verification

When `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS` are set, signup requires verifying the email
(`/api/auth/verify?token=…`) before login is allowed. When unset, accounts are usable immediately and a
verification link is logged to the server console for local dev.

## Known / dev-only issues

- The **Vite dev server** (not `vite preview` / production builds) depends on `esbuild`, which has a
  dev-server advisory (a website can query the dev server). **Do not expose `vite dev` to untrusted
  networks.** Production builds and `vite preview` are not affected.
- LWW sync is single-writer by snapshot timestamp; concurrent edits on two offline devices resolve by
  last-write-wins (no per-field merge).

## Deploying (Vercel + Neon)

Lifelog is designed for **Vercel (serverless) + Neon Postgres** — see `DEPLOY.md` for the full runbook.
Summary:

- The Vite SPA and the Express API run on the **same origin** (Vercel), so no CORS is needed.
- `vercel.json` rewrites `/api/*` to the `api/` serverless function; all other routes serve `index.html`.
- `api/index.js` exports the Express app from `server/index.js`. The app uses `@neondatabase/serverless`
  (async SQL) and **does not** `listen` on Vercel (the `VERCEL` env disables it).
- The database is **Neon serverless Postgres** (`DATABASE_URL`). Tables are created automatically on first
  run. Neon's free tier is permanent and scale-to-zero.
- **TLS is provided by Vercel.** Set `TRUST_PROXY=1` (Vercel sets this automatically via the `VERCEL` env)
  so the rate limiter keys off `X-Forwarded-For`.
- Serverless caveats handled: the rate limiter is **Postgres-backed** (in-memory stores don't survive
  invocations), and OAuth PKCE state lives in a short-lived **httpOnly cookie** (not process memory).

Free hosting: **Vercel Hobby + Neon Free = $0**. Local dev uses a Neon connection string too
(`DATABASE_URL` in `.env`). Do **not** expose `vite dev` publicly (its esbuild dev-server advisory).


## Reporting

This is a personal/self-hosted project. For sensitive issues, rotate your sync credentials and wipe
`server/data/` on the server.
