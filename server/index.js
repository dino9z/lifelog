import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DB_FILE = join(DATA_DIR, 'lifelog.db')

const PORT = Number(process.env.PORT) || 8787
const BASE = process.env.PUBLIC_URL || `http://localhost:${PORT}`
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const ACCESS_TTL_MS = (Number(process.env.ACCESS_TTL_MIN) || 60) * 60_000
const REFRESH_TTL_MS = (Number(process.env.REFRESH_TTL_DAYS) || 30) * 86_400_000
const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
const db = new Database(DB_FILE)
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    provider TEXT NOT NULL DEFAULT 'password',
    provider_id TEXT,
    salt TEXT,
    hash TEXT,
    token_hash TEXT,
    token_expires INTEGER,
    refresh_hash TEXT,
    refresh_expires INTEGER,
    verified INTEGER NOT NULL DEFAULT 1,
    verify_token TEXT
  );
  CREATE TABLE IF NOT EXISTS sync (
    user_id TEXT PRIMARY KEY,
    snapshot TEXT,
    updated_at INTEGER
  );
`)

const app = express()
// Enable when the server sits behind a reverse proxy (nginx/Caddy/Traefik) so the
// rate limiter keys off the real client IP from X-Forwarded-For instead of the proxy's.
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)

const ALLOWED = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173,http://localhost:4184,http://localhost:8787')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
app.use(
  cors({
    origin: (origin, cb) => {
      const allow = !origin || ALLOWED.includes(origin)
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

const loginLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false })
const signupLimiter = rateLimit({ windowMs: 60_000, max: 5, standardHeaders: true, legacyHeaders: false })

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

function issueTokens(user) {
  const accessRaw = newToken()
  const refreshRaw = newToken()
  db.prepare(
    'UPDATE users SET token_hash=?, token_expires=?, refresh_hash=?, refresh_expires=? WHERE id=?'
  ).run(sha256(accessRaw), Date.now() + ACCESS_TTL_MS, sha256(refreshRaw), Date.now() + REFRESH_TTL_MS, user.id)
  return { accessToken: accessRaw, refreshToken: refreshRaw }
}

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const user = db
    .prepare('SELECT * FROM users WHERE token_hash=? AND token_expires>?')
    .get(sha256(token), Date.now())
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  req.user = user
  next()
}

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

app.post('/api/auth/signup', signupLimiter, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!isEmail(email)) return res.status(400).json({ error: 'Valid email required.' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email)
  if (existing) {
    hashPassword('dummy') // constant-time work to avoid timing disclosure
    return res.status(400).json({ error: 'Unable to create account.' }) // generic, no enumeration
  }
  const { salt, hash } = hashPassword(password)
  const id = newId()
  const verified = SMTP_CONFIGURED ? 0 : 1
  const verifyToken = verified ? null : newToken()
  db.prepare(
    'INSERT INTO users (id,email,provider,salt,hash,verified,verify_token) VALUES (?,?,?,?,?,?,?)'
  ).run(id, email, 'password', salt, hash, verified, verifyToken)
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id)
  const tokens = issueTokens(user)
  if (verifyToken) sendVerifyEmail(email, verifyToken)
  res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user: publicUser(user), salt })
})

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email)
  if (!user || user.provider !== 'password' || !verifyPassword(password, user.salt, user.hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }
  if (SMTP_CONFIGURED && !user.verified) return res.status(403).json({ error: 'Please verify your email.' })
  const tokens = issueTokens(user)
  res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user: publicUser(user), salt: user.salt })
})

app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = String(req.body?.refreshToken || '')
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required.' })
  const user = db
    .prepare('SELECT * FROM users WHERE refresh_hash=? AND refresh_expires>?')
    .get(sha256(refreshToken), Date.now())
  if (!user) return res.status(401).json({ error: 'Invalid refresh token.' })
  const tokens = issueTokens(user) // rotate both
  res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken })
})

app.post('/api/auth/logout', auth, (req, res) => {
  db.prepare('UPDATE users SET token_hash=NULL, token_expires=NULL, refresh_hash=NULL, refresh_expires=NULL WHERE id=?').run(
    req.user.id
  )
  res.json({ ok: true })
})

app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }))

app.get('/api/auth/verify', (req, res) => {
  const token = String(req.query.token || '')
  const user = db.prepare('SELECT * FROM users WHERE verify_token=?').get(token)
  if (!user) return res.status(400).json({ error: 'Invalid or expired link.' })
  db.prepare('UPDATE users SET verified=1, verify_token=NULL WHERE id=?').run(user.id)
  res.json({ ok: true })
})

// ---------- sync endpoints (LWW) ----------
app.get('/api/sync', auth, (req, res) => {
  const row = db.prepare('SELECT snapshot, updated_at FROM sync WHERE user_id=?').get(req.user.id)
  if (!row) return res.json({ snapshot: null, updatedAt: 0 })
  res.json({ snapshot: row.snapshot || null, updatedAt: row.updated_at || 0 })
})

app.put('/api/sync', auth, (req, res) => {
  const { snapshot, updatedAt } = req.body || {}
  if (snapshot === undefined || typeof updatedAt !== 'number') {
    return res.status(400).json({ error: 'snapshot and updatedAt required.' })
  }
  const existing = db.prepare('SELECT updated_at FROM sync WHERE user_id=?').get(req.user.id)
  if (existing && (existing.updated_at || 0) > updatedAt) {
    return res.status(409).json({ error: 'Newer version exists on server.', updatedAt: existing.updated_at })
  }
  db.prepare(
    'INSERT INTO sync (user_id, snapshot, updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET snapshot=excluded.snapshot, updated_at=excluded.updated_at'
  ).run(req.user.id, String(snapshot), updatedAt)
  res.json({ ok: true, updatedAt })
})

// ---------- OAuth (Google + GitHub, env-gated) ----------
const oauthSessions = new Map()
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
function findOrCreateOAuthUser(provider, email) {
  let user = db.prepare('SELECT * FROM users WHERE provider=? AND email=?').get(provider, email)
  if (user) return user
  const byEmail = db.prepare('SELECT * FROM users WHERE email=?').get(email)
  if (byEmail) {
    db.prepare('UPDATE users SET provider=?, provider_id=? WHERE id=?').run(provider, email, byEmail.id)
    return db.prepare('SELECT * FROM users WHERE id=?').get(byEmail.id)
  }
  const id = newId()
  db.prepare(
    'INSERT INTO users (id,email,provider,provider_id,verified) VALUES (?,?,?,?,1)'
  ).run(id, email, provider, email)
  return db.prepare('SELECT * FROM users WHERE id=?').get(id)
}

app.get('/api/auth/:provider', (req, res) => {
  const cfg = providerConfig(req.params.provider)
  if (!cfg) return res.status(404).json({ error: 'Provider not configured' })
  const { verifier, challenge } = pkce()
  const state = randomBytes(16).toString('base64url')
  oauthSessions.set(state, { provider: req.params.provider, verifier, expires: Date.now() + 600_000 })
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

app.get('/api/auth/:provider/callback', async (req, res) => {
  try {
    const { code, state } = req.query
    const sess = oauthSessions.get(state)
    oauthSessions.delete(state)
    if (!sess || sess.provider !== req.params.provider || !sess.verifier || sess.expires < Date.now()) {
      return res.status(400).send('Invalid or expired OAuth session')
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
    const user = findOrCreateOAuthUser(req.params.provider, email)
    const tokens = issueTokens(user)
    res.redirect(`${APP_URL}/auth-callback#accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`)
  } catch (e) {
    console.error('OAuth error', e)
    res.status(500).send('OAuth error')
  }
})

// Optional: serve the built SPA from the same process so a single TLS reverse proxy
// can front the whole app. Set STATIC_DIR if your layout differs.
const STATIC_DIR = process.env.STATIC_DIR || join(__dirname, '..', 'dist')
if (existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(join(STATIC_DIR, 'index.html'))
  })
}

app.listen(PORT, () => console.log(`Lifelog sync server on ${BASE}`))
