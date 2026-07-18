import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
const ctxA = await browser.createBrowserContext()
const ctxB = await browser.createBrowserContext()
const pageA = await ctxA.newPage()
const pageB = await ctxB.newPage()
const errs = []
pageA.on('console', (m) => { if (m.type() === 'error') errs.push('A:' + m.text()) })
pageB.on('console', (m) => { if (m.type() === 'error') errs.push('B:' + m.text()) })
const email = `u${Date.now()}@example.com`
const pw = 'password123'

const go = async (p, view) => {
  await p.goto('http://localhost:4184/', { waitUntil: 'networkidle0' })
  await p.waitForSelector('text/Dashboard')
  if (view) await p.evaluate((v) => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === v)?.click(), view)
  await new Promise((r) => setTimeout(r, 500))
}
const goSettings = (p) => go(p, 'Settings')
const countOf = (p) => p.evaluate(() => document.body.innerText.match(/(\d+) of (\d+) habits/)?.[0])

await goSettings(pageA)
await pageA.type('input[type=email]', email)
await pageA.type('input[type=password]', pw)
await pageA.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Sign up/.test(b.innerText))?.click())
await pageA.waitForFunction(() => /Sync now/.test(document.body.innerText), { timeout: 9000 }).catch(() => {})
const aLoggedIn = await pageA.evaluate(() => /Sync now/.test(document.body.innerText))

// toggle on Dashboard
await go(pageA, 'Dashboard')
await pageA.evaluate(() => [...document.querySelectorAll('li button')].find((b) => /Workout/.test(b.innerText))?.click())
await new Promise((r) => setTimeout(r, 600))
const aCount = await countOf(pageA)

// back to settings, wait for sync
await goSettings(pageA)
await pageA.waitForFunction(() => /Synced/.test(document.body.innerText), { timeout: 9000 }).catch(() => {})
const aSynced = await pageA.evaluate(() => /Synced/.test(document.body.innerText))

// reload A, confirm still logged in
await pageA.reload({ waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1500))
await goSettings(pageA)
const aPersist = await pageA.evaluate(() => /Sync now/.test(document.body.innerText))

// B logs in, pulls, then check Dashboard count
await goSettings(pageB)
await pageB.type('input[type=email]', email)
await pageB.type('input[type=password]', pw)
await pageB.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Log in/.test(b.innerText))?.click())
await pageB.waitForFunction(() => /Synced/.test(document.body.innerText), { timeout: 9000 }).catch(() => {})
const bLoggedIn = await pageB.evaluate(() => /Sync now/.test(document.body.innerText))
const bNeedsKey = await pageB.evaluate(() => /Import your sync key/.test(document.body.innerText))
await go(pageB, 'Dashboard')
await new Promise((r) => setTimeout(r, 3000))
const bCount = await countOf(pageB)

console.log('A signed up + logged in:', aLoggedIn)
console.log('A Dashboard count after local toggle:', aCount)
console.log('A sync status shows "Synced":', aSynced)
console.log('A session persists after reload:', aPersist)
console.log('B logged in via pull:', bLoggedIn)
console.log('B needsSyncKey (decrypt failed):', bNeedsKey)
console.log('B Dashboard count == A (cross-device pull):', bCount === aCount, `(A=${aCount}, B=${bCount})`)
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none')
await browser.close()
