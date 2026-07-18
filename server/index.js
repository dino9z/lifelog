import express from 'express'
import cors from 'cors'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const USERS_FILE = join(DATA_DIR, 'users.json')
const SYNC_DIR = join(DATA_DIR, 'sync')

const PORT = Number(process.env.PORT) || 8787
const app = express()
app.use(cors())
app.use(express.json({ limit: '25mb' }))

function ensureStore() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(SYNC_DIR)) mkdirSync(SYNC_DIR, { recursive: true })
  if (!existsSync(USERS_FILE)) writeFileSync(USERS_FILE, '[]')
}
ensureStore()

const readUsers = () => JSON.parse(readFileSync(USERS_FILE, 'utf8'))
const writeUsers = (users) => writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
const syncFile = (id) => join(SYNC_DIR, `${id}.json`)

function hashPassword(pw, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(pw, salt, 64).toString('hex')
  return { salt, hash }
}
function verifyPassword(pw, salt, hash) {
  const candidate = scryptSync(pw, salt, 64).toString('hex')
  return timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'))
}
const newToken = () => randomBytes(32).toString('hex')
const publicUser = (u) => ({ id: u.id, email: u.email })

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const user = readUsers().find((u) => u.token === token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  req.user = user
  next()
}

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/signup', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!isEmail(email)) return res.status(400).json({ error: 'Valid email required.' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  const users = readUsers()
  if (users.some((u) => u.email === email)) return res.status(409).json({ error: 'Account already exists.' })
  const { salt, hash } = hashPassword(password)
  const user = { id: `u_${randomBytes(8).toString('hex')}`, email, salt, hash, token: newToken() }
  users.push(user)
  writeUsers(users)
  res.json({ token: user.token, user: publicUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const user = readUsers().find((u) => u.email === email)
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }
  user.token = newToken()
  writeUsers(readUsers().map((u) => (u.id === user.id ? user : u)))
  res.json({ token: user.token, user: publicUser(user) })
})

app.post('/api/auth/logout', auth, (req, res) => {
  const users = readUsers()
  const u = users.find((x) => x.id === req.user.id)
  if (u) u.token = null
  writeUsers(users)
  res.json({ ok: true })
})

app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }))

app.get('/api/sync', auth, (req, res) => {
  const file = syncFile(req.user.id)
  if (!existsSync(file)) return res.json({ snapshot: null, updatedAt: 0 })
  const data = JSON.parse(readFileSync(file, 'utf8'))
  res.json({ snapshot: data.snapshot, updatedAt: data.updatedAt || 0 })
})

app.put('/api/sync', auth, (req, res) => {
  const { snapshot, updatedAt } = req.body || {}
  if (!snapshot || typeof updatedAt !== 'number') {
    return res.status(400).json({ error: 'snapshot and updatedAt required.' })
  }
  const file = syncFile(req.user.id)
  const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  // Last-write-wins: only accept if the incoming change is at least as recent.
  if (existing && (existing.updatedAt || 0) > updatedAt) {
    return res.status(409).json({ error: 'Newer version exists on server.', updatedAt: existing.updatedAt })
  }
  writeFileSync(file, JSON.stringify({ snapshot, updatedAt }, null, 2))
  res.json({ ok: true, updatedAt })
})

app.listen(PORT, () => console.log(`Lifelog sync server on http://localhost:${PORT}`))
