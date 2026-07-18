import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
const ctxA = await browser.createBrowserContext()
const ctxB = await browser.createBrowserContext()
const pageA = await ctxA.newPage()
const pageB = await ctxB.newPage()
const errs = []
pageA.on('console', (m) => { if (m.type() === 'error') errs.push('A:' + m.text()) })
pageB.on('console', (m) => { if (m.type() === 'error') errs.push('B:' + m.text()) })
// SAME-ORIGIN (Plan B): the Node server serves both the SPA and /api on :8787.
const ORIGIN = 'http://localhost:8787'
const email = `p${Date.now()}@example.com`
const pw = 'password123'

const go = async (p, view) => {
  await p.goto(ORIGIN + '/', { waitUntil: 'networkidle0' })
  await p.waitForSelector('text/Dashboard')
  if (view) await p.evaluate((v) => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === v)?.click(), view)
  await new Promise((r) => setTimeout(r, 400))
}
const goSettings = (p) => go(p, 'Settings')
const countOf = (p) => p.evaluate(() => document.body.innerText.match(/(\d+) of (\d+) habits/)?.[0])

// A signs up on same origin
await goSettings(pageA)
await pageA.type('input[type=email]', email)
await pageA.type('input[type=password]', pw)
await pageA.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Sign up/.test(b.innerText))?.click())
await pageA.waitForFunction(() => /Sync now/.test(document.body.innerText), { timeout: 9000 }).catch(() => {})
const aLoggedIn = await pageA.evaluate(() => /Sync now/.test(document.body.innerText))

await go(pageA, 'Dashboard')
await pageA.evaluate(() => [...document.querySelectorAll('li button')].find((b) => /Workout/.test(b.innerText))?.click())
await new Promise((r) => setTimeout(r, 500))
const aCount = await countOf(pageA)
await goSettings(pageA)
await pageA.waitForFunction(() => /Synced/.test(document.body.innerText), { timeout: 9000 }).catch(() => {})
await pageA.reload({ waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 900))
await goSettings(pageA)
const aPersist = await pageA.evaluate(() => /Sync now/.test(document.body.innerText))

// B logs in on same origin, pulls A's encrypted data
await goSettings(pageB)
await pageB.type('input[type=email]', email)
await pageB.type('input[type=password]', pw)
await pageB.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Log in/.test(b.innerText))?.click())
await pageB.waitForFunction(() => /Synced/.test(document.body.innerText), { timeout: 9000 }).catch(() => {})
const bLoggedIn = await pageB.evaluate(() => /Sync now/.test(document.body.innerText))
await go(pageB, 'Dashboard')
const bCount = await countOf(pageB)

console.log('SAME-ORIGIN (Plan B) mode')
console.log('A signed up + logged in:', aLoggedIn)
console.log('A count after toggle:', aCount)
console.log('A session persists after reload:', aPersist)
console.log('B logged in via pull:', bLoggedIn)
console.log('B count == A (cross-device pull):', bCount === aCount, `(A=${aCount}, B=${bCount})`)
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none')
await browser.close()
