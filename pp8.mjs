import puppeteer from 'puppeteer-core'
import { createRequire } from 'module'
// better-sqlite3 lives in the server's node_modules; resolve it from the server dir.
const require = createRequire('/home/dinosaur/lifelog/server/index.js')
const Database = require('better-sqlite3')
const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
const ctx = await browser.createBrowserContext()
const page = await ctx.newPage()
const errs = []
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))

const email = `r${Date.now()}@example.com`
const pw = 'password123'

const goSettings = async (p) => {
  await p.goto('http://localhost:4184/', { waitUntil: 'networkidle0' })
  await p.waitForSelector('text/Dashboard')
  await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Settings')?.click())
  await new Promise((r) => setTimeout(r, 500))
}
const countOf = (p) => p.evaluate(() => document.body.innerText.match(/(\d+) of (\d+) habits/)?.[0])
const waitSynced = (p) => p.evaluate(() => /Synced/.test(document.body.innerText))

// 1) Sign up, confirm logged in + synced
await goSettings(page)
await page.type('input[type=email]', email)
await page.type('input[type=password]', pw)
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Sign up/.test(b.innerText))?.click())
await page.waitForFunction(() => /Sync now/.test(document.body.innerText), { timeout: 9000 }).catch(() => {})
const loggedIn = await page.evaluate(() => /Sync now/.test(document.body.innerText))

// 2) Toggle a habit, confirm push ("Synced")
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Dashboard')?.click())
await new Promise((r) => setTimeout(r, 400))
await page.evaluate(() => [...document.querySelectorAll('li button')].find((b) => /Workout/.test(b.innerText))?.click())
await new Promise((r) => setTimeout(r, 600))
await goSettings(page)
await page.waitForFunction(() => /Synced/.test(document.body.innerText), { timeout: 9000 }).catch(() => {})
const syncedBefore = await waitSynced(page)

// 3) Force-expire the access token in the SERVER DB (simulates 60-min expiry)
const db = new Database('./server/data/lifelog.db')
db.prepare("UPDATE users SET token_expires = 0 WHERE email = ?").run(email)
console.log('forced token expiry for', email)

// 4) Make another change -> the client must hit 401, transparently refresh, and still sync
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Dashboard')?.click())
await new Promise((r) => setTimeout(r, 400))
await page.evaluate(() => [...document.querySelectorAll('li button')].find((b) => /Meditat/.test(b.innerText))?.click())
await new Promise((r) => setTimeout(r, 600))
await goSettings(page)
await page.waitForFunction(() => /Synced/.test(document.body.innerText), { timeout: 9000 }).catch(() => {})
const syncedAfter = await waitSynced(page)
const stillLoggedIn = await page.evaluate(() => /Sync now/.test(document.body.innerText))

console.log('logged in:', loggedIn)
console.log('synced before expiry:', syncedBefore)
console.log('synced AFTER forced expiry (refresh worked):', syncedAfter)
console.log('still logged in after refresh (no logout):', stillLoggedIn)
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none')
await browser.close()
