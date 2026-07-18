import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

const PORT = Number(process.env.PORT) || 8787
const VERCEL_URL = process.env.VERCEL_URL
// On Vercel derive the origin from VERCEL_URL (or a custom PUBLIC_URL); locally fall back to localhost.
const BASE = process.env.PUBLIC_URL || (VERCEL_URL ? `https://${VERCEL_URL}` : `http://localhost:${PORT}`)
const APP_URL = process.env.APP_URL || BASE
const ACCESS_TTL_MS = (Number(process.env.ACCESS_TTL_MIN) || 60) * 60_000
const REFRESH_TTL_MS = (Number(process.env.REFRESH_TTL_DAYS) || 30) * 86_400_000
const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

// --- Postgres (Neon serverless driver). Module-singleton; reused across warm invocations.
const DATABASE_URL = process.env.DATABASE_URL
const sql = DATABASE_URL ? neon(DATABASE_URL) : null
if (!DATABASE_URL) console.error('[startup] DATABASE_URL is not set — API will not work until it is provided.')

async function initSchema() {
  if (!sql) return
  // The Neon HTTP driver rejects multiple statements per query, so run them separately.
  await sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    provider TEXT NOT NULL DEFAULT 'password',
    provider_id TEXT,
    salt TEXT,
    hash TEXT,
    token_hash TEXT,
    token_expires BIGINT,
    refresh_hash TEXT,
    refresh_expires BIGINT,
    verified INTEGER NOT NULL DEFAULT 1,
    verify_token TEXT
  )`
  await sql`CREATE TABLE IF NOT EXISTS sync (
    user_id TEXT PRIMARY KEY,
    snapshot TEXT,
    updated_at BIGINT
  )`
  await sql`CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at BIGINT NOT NULL
  )`
}
if (sql) {
  initSchema().catch((e) => console.error('[startup] DB schema init failed:', e))
}

const app = express()
// Behind Vercel (or any proxy): trust X-Forwarded-For so the rate limiter keys off the real IP.
if (process.env.TRUST_PROXY === '1' || process.env.VERCEL) app.set('trust proxy', 1)

// Allow the app's own origin(s) by default (same-origin module scripts send an Origin header),
// plus any explicitly configured CORS_ORIGIN (for cross-origin setups / custom domains).
const ALLOWED = new Set(
  [process.env.CORS_ORIGIN, BASE, APP_URL]
    .filter(Boolean)
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter(Boolean)
)
app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin requests may still send an Origin header (module scripts fetch in CORS mode);
      // allow them, and any explicitly allowed origin.
      const allow = !origin || ALLOWED.has(origin)
      cb(allow ? null : new Error('Not allowed by CORS'), allow)
    },
  })
)
app.use((err, _req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'Origin not allowed' })
  next(err)
})
app.use(helmet())
app.use(express.json({ limit: '5mb' }))

// On Vercel the function is invoked as a Web Handler (Fluid compute), so the
// Express response is driven in-memory. Override res.end to buffer the body
// and signal completion; the native end would try to write to a socket that
// does not exist in this context. Only applied on Vercel — locally the real
// ServerResponse is used.
if (process.env.VERCEL) {
  app.use((_req, res, next) => {
    res.__chunks = []
    res.end = function (chunk, encoding) {
      if (chunk) {
        res.__chunks.push(
          typeof chunk === 'string' ? Buffer.from(chunk, encoding || 'utf8') : Buffer.from(chunk)
        )
      }
      res.emit('finish')
      res.emit('close')
      return res
    }
    next()
  })
}

// Wrap async handlers so Express 4 forwards rejections to the error handler.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// ---------- Postgres-backed rate limiter (in-memory store doesn't survive serverless) ----------
class PgStore {
  constructor(windowMs) {
    this.windowMs = windowMs
  }
  async increment(key) {
    const now = Date.now()
    const resetAt = now + this.windowMs
    const rows = await sql`
      INSERT INTO rate_limits (key, count, reset_at) VALUES (${key}, 1, ${resetAt})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= ${now} THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= ${now} THEN ${resetAt} ELSE rate_limits.reset_at END
      RETURNING count, reset_at`
    const r = rows[0]
    return { totalHits: Number(r.count), resetTime: new Date(Number(r.reset_at)) }
  }
  async decrement(key) {
    await sql`UPDATE rate_limits SET count = GREATEST(count - 1, 0) WHERE key = ${key}`
  }
  async resetKey(key) {
    await sql`DELETE FROM rate_limits WHERE key = ${key}`
  }
}
const loginLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false, store: new PgStore(60_000) })
const signupLimiter = rateLimit({ windowMs: 60_000, max: 5, standardHeaders: true, legacyHeaders: false, store: new PgStore(60_000) })

// ---------- crypto helpers ----------
const sha256 = (s) => createHash('sha256').update(s).digest('hex')
function hashPassword(pw, salt = randomBytes(16).toString('base64')) {
  const hash = scryptSync(pw, salt, 64).toString('hex')
  return { salt, hash }
}
function verifyPassword(pw, salt, hash) {
  const candidate = scryptSync(pw, salt, 64).toString('hex')
  return timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'))
}
const newId = () => `u_${randomBytes(8).toString('hex')}`
const newToken = () => randomBytes(32).toString('hex')
const publicUser = (u) => ({ id: u.id, email: u.email, provider: u.provider })

async function issueTokens(user) {
  const accessRaw = newToken()
  const refreshRaw = newToken()
  await sql`
    UPDATE users SET token_hash = ${sha256(accessRaw)}, token_expires = ${Date.now() + ACCESS_TTL_MS}::bigint,
      refresh_hash = ${sha256(refreshRaw)}, refresh_expires = ${Date.now() + REFRESH_TTL_MS}::bigint
    WHERE id = ${user.id}`
  return { accessToken: accessRaw, refreshToken: refreshRaw }
}

const auth = ah(async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const rows = await sql`SELECT * FROM users WHERE token_hash = ${sha256(token)} AND token_expires > ${Date.now()}::bigint`
  if (!rows.length) return res.status(401).json({ error: 'Unauthorized' })
  req.user = rows[0]
  next()
})

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

async function sendVerifyEmail(email, token) {
  if (!SMTP_CONFIGURED) {
    console.log(`[dev] verify link for ${email}: ${BASE}/api/auth/verify?token=${token}`)
    return
  }
  try {
    const nodemailer = (await import('nodemailer')).default
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Verify your Lifelog account',
      text: `Verify your account: ${BASE}/api/auth/verify?token=${token}`,
    })
  } catch (e) {
    console.error('Failed to send verification email', e)
  }
}

// ---------- auth endpoints ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/auth/providers', (_req, res) =>
  res.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  })
)

app.post('/api/auth/signup', signupLimiter, ah(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!isEmail(email)) return res.status(400).json({ error: 'Valid email required.' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`
  if (existing.length) {
    hashPassword('dummy') // constant-time work to avoid timing disclosure
    return res.status(400).json({ error: 'Unable to create account.' }) // generic, no enumeration
  }
  const { salt, hash } = hashPassword(password)
  const id = newId()
  const verified = SMTP_CONFIGURED ? 0 : 1
  const verifyToken = verified ? null : newToken()
  await sql`INSERT INTO users (id, email, provider, salt, hash, verified, verify_token)
    VALUES (${id}, ${email}, 'password', ${salt}, ${hash}, ${verified}, ${verifyToken})`
  const user = (await sql`SELECT * FROM users WHERE id = ${id}`)[0]
  const tokens = await issueTokens(user)
  if (verifyToken) sendVerifyEmail(email, verifyToken)
  res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user: publicUser(user), salt })
}))

app.post('/api/auth/login', loginLimiter, ah(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const rows = await sql`SELECT * FROM users WHERE email = ${email}`
  const user = rows[0]
  if (!user || user.provider !== 'password' || !verifyPassword(password, user.salt, user.hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }
  if (SMTP_CONFIGURED && !user.verified) return res.status(403).json({ error: 'Please verify your email.' })
  const tokens = await issueTokens(user)
  res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user: publicUser(user), salt: user.salt })
}))

app.post('/api/auth/refresh', ah(async (req, res) => {
  const refreshToken = String(req.body?.refreshToken || '')
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required.' })
  const rows = await sql`SELECT * FROM users WHERE refresh_hash = ${sha256(refreshToken)} AND refresh_expires > ${Date.now()}::bigint`
  if (!rows.length) return res.status(401).json({ error: 'Invalid refresh token.' })
  const tokens = await issueTokens(rows[0]) // rotate both
  res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken })
}))

app.post('/api/auth/logout', auth, ah(async (req, res) => {
  await sql`UPDATE users SET token_hash = NULL, token_expires = NULL, refresh_hash = NULL, refresh_expires = NULL WHERE id = ${req.user.id}`
  res.json({ ok: true })
}))

app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }))

app.get('/api/auth/verify', ah(async (req, res) => {
  const token = String(req.query.token || '')
  const rows = await sql`SELECT * FROM users WHERE verify_token = ${token}`
  if (!rows.length) return res.status(400).json({ error: 'Invalid or expired link.' })
  await sql`UPDATE users SET verified = 1, verify_token = NULL WHERE id = ${rows[0].id}`
  res.json({ ok: true })
}))

// ---------- sync endpoints (LWW) ----------
app.get('/api/sync', auth, ah(async (req, res) => {
  const rows = await sql`SELECT snapshot, updated_at FROM sync WHERE user_id = ${req.user.id}`
  if (!rows.length) return res.json({ snapshot: null, updatedAt: 0 })
  const row = rows[0]
  res.json({ snapshot: row.snapshot || null, updatedAt: Number(row.updated_at) || 0 })
}))

app.put('/api/sync', auth, ah(async (req, res) => {
  const { snapshot, updatedAt } = req.body || {}
  if (snapshot === undefined || typeof updatedAt !== 'number') {
    return res.status(400).json({ error: 'snapshot and updatedAt required.' })
  }
  const existing = await sql`SELECT updated_at FROM sync WHERE user_id = ${req.user.id}`
  if (existing.length && Number(existing[0].updated_at) > updatedAt) {
    return res.status(409).json({ error: 'Newer version exists on server.', updatedAt: Number(existing[0].updated_at) })
  }
  await sql`
    INSERT INTO sync (user_id, snapshot, updated_at) VALUES (${req.user.id}, ${String(snapshot)}, ${updatedAt}::bigint)
    ON CONFLICT (user_id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = EXCLUDED.updated_at`
  res.json({ ok: true, updatedAt })
}))

// ---------- OAuth (Google + GitHub, env-gated) ----------
function providerConfig(p) {
  if (p === 'google' && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      type: 'oidc',
      authURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      userInfoURL: 'https://openidconnect.googleapis.com/v1/userinfo',
      scope: 'openid email',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }
  if (p === 'github' && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    return {
      type: 'oauth2',
      authURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      userInfoURL: 'https://api.github.com/user',
      emailsURL: 'https://api.github.com/user/emails',
      scope: 'read:user user:email',
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }
  }
  return null
}
function pkce() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}
async function fetchEmail(cfg, accessToken) {
  if (cfg.type === 'oidc') {
    const r = await fetch(cfg.userInfoURL, { headers: { Authorization: `Bearer ${accessToken}` } })
    const j = await r.json()
    return j.email || null
  }
  const r = await fetch(cfg.userInfoURL, { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'lifelog' } })
  const j = await r.json()
  if (j.email) return j.email
  const e = await fetch(cfg.emailsURL, { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'lifelog' } })
  const list = await e.json()
  const primary = list.find((x) => x.primary && x.verified) || list.find((x) => x.verified)
  return primary?.email || null
}
async function findOrCreateOAuthUser(provider, email) {
  let rows = await sql`SELECT * FROM users WHERE provider = ${provider} AND email = ${email}`
  if (rows.length) return rows[0]
  rows = await sql`SELECT * FROM users WHERE email = ${email}`
  if (rows.length) {
    await sql`UPDATE users SET provider = ${provider}, provider_id = ${email} WHERE id = ${rows[0].id}`
    return (await sql`SELECT * FROM users WHERE id = ${rows[0].id}`)[0]
  }
  const id = newId()
  await sql`INSERT INTO users (id, email, provider, provider_id, verified) VALUES (${id}, ${email}, ${provider}, ${email}, 1)`
  return (await sql`SELECT * FROM users WHERE id = ${id}`)[0]
}

function getCookie(req, name) {
  const c = req.headers.cookie
  if (!c) return null
  const found = c
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + '='))
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null
}

// On serverless, OAuth PKCE/state cannot live in process memory (separate invocations).
// Persist it in a short-lived httpOnly cookie instead.
app.get('/api/auth/:provider', (req, res) => {
  const cfg = providerConfig(req.params.provider)
  if (!cfg) return res.status(404).json({ error: 'Provider not configured' })
  const { verifier, challenge } = pkce()
  const state = randomBytes(16).toString('base64url')
  const cookieName = `oauth_${state}`
  res.cookie(cookieName, JSON.stringify({ provider: req.params.provider, verifier }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: !!process.env.VERCEL,
    maxAge: 600_000,
    path: '/',
  })
  const url = new URL(cfg.authURL)
  url.searchParams.set('client_id', cfg.clientId)
  url.searchParams.set('redirect_uri', `${BASE}/api/auth/${req.params.provider}/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', cfg.scope)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  if (cfg.type === 'oidc') url.searchParams.set('prompt', 'select_account')
  res.redirect(url.toString())
})

app.get('/api/auth/:provider/callback', ah(async (req, res) => {
  const { code, state } = req.query
  const cookieName = `oauth_${state}`
  const raw = getCookie(req, cookieName)
  res.clearCookie(cookieName, { path: '/' })
  if (!raw) return res.status(400).send('Invalid or expired OAuth session')
  let sess
  try {
    sess = JSON.parse(raw)
  } catch {
    return res.status(400).send('Invalid OAuth session')
  }
  if (!sess || sess.provider !== req.params.provider || !sess.verifier) {
    return res.status(400).send('Invalid OAuth session')
  }
  const cfg = providerConfig(req.params.provider)
  if (!cfg) return res.status(404).send('Provider not configured')
  const tokenRes = await fetch(cfg.tokenURL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: `${BASE}/api/auth/${req.params.provider}/callback`,
      code_verifier: sess.verifier,
    }),
  })
  const tokenJson = await tokenRes.json()
  const accessToken = tokenJson.access_token
  if (!accessToken) return res.status(400).send('OAuth token exchange failed')
  const email = (await fetchEmail(cfg, accessToken))?.toLowerCase()
  if (!email) return res.status(400).send('Could not retrieve email from provider')
  const user = await findOrCreateOAuthUser(req.params.provider, email)
  const tokens = await issueTokens(user)
  res.redirect(`${APP_URL}/auth-callback#accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`)
}))

// Optional: serve the built SPA from the same process (local/dev or a self-hosted container).
// On Vercel this is skipped — Vercel's CDN serves the SPA and only /api/* reaches this function.
const STATIC_DIR = process.env.STATIC_DIR
if (STATIC_DIR) {
  const { existsSync } = await import('node:fs')
  if (existsSync(STATIC_DIR)) app.use(express.static(STATIC_DIR))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(STATIC_DIR + '/index.html')
  })
}

// On Vercel the platform imports this module and routes requests to `app`; do not listen.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Lifelog sync server on ${BASE}`))
}

export default app
