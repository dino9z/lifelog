import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
const BASE = 'http://localhost:8787'
const email = `r${Date.now()}@example.com`
const pw = 'password123'

const su = await fetch(`${BASE}/api/auth/signup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw }) }).then((r) => r.json())
console.log('signup ok:', !!su.token)
const userId = su.user.id
const access = su.token
const refresh = su.refreshToken

const s1 = await fetch(`${BASE}/api/sync`, { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${access}` }, body: JSON.stringify({ snapshot: 'x', updatedAt: Date.now() }) }).then((r) => r.json())
console.log('sync with valid token ok:', s1.ok === true)

// Force-expire the access token in the DB (simulates a short TTL elapsing).
await sql`UPDATE users SET token_expires = 0 WHERE id = ${userId}`

const s2 = await fetch(`${BASE}/api/sync`, { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${access}` }, body: JSON.stringify({ snapshot: 'y', updatedAt: Date.now() }) })
console.log('expired token rejected (401):', s2.status === 401)

const rf = await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: refresh }) }).then((r) => r.json())
console.log('refresh issued new tokens:', !!rf.token)

const s3 = await fetch(`${BASE}/api/sync`, { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${rf.token}` }, body: JSON.stringify({ snapshot: 'z', updatedAt: Date.now() }) }).then((r) => r.json())
console.log('sync with refreshed token ok:', s3.ok === true)
