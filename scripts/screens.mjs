// npm run screens  ->  builds the app, drives every screen, writes screenshots/*.png + screenshots/_all.png
import { chromium } from 'playwright-core'
import { preview } from 'vite'
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const out = join(root, 'screenshots')
rmSync(out, { recursive: true, force: true }); mkdirSync(out)
const sh = (cmd, env = {}) => execSync(cmd, { cwd: root, stdio: 'pipe', env: { ...process.env, ...env } })

sh('npx vite build')
sh('npx vite build --outDir node_modules/.dist-auth', { VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'x', VITE_OAUTH_PROVIDERS: 'google,apple' })
const local = await preview({ root, preview: { port: 4173, strictPort: true }, build: { outDir: 'dist' } })
const cloud = await preview({ root, preview: { port: 4174, strictPort: true }, build: { outDir: 'node_modules/.dist-auth' } })

const exe = process.env.CHROMIUM_PATH || readdirSync('/opt/pw-browsers').filter(d => d.startsWith('chromium-')).map(d => `/opt/pw-browsers/${d}/chrome-linux/chrome`)[0]
const browser = await chromium.launch({ executablePath: exe })
const errors = []
const names = []

const photo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fa869"/><stop offset="1" stop-color="#5e6ad2"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="280" cy="120" r="50" fill="#ffd36b"/></svg>')
const thoughts = [[0, 3, 'anxious', 'Everyone will notice I messed up the demo'], [1, 2, 'stressed', 'I will never catch up on this work'], [3, 4, 'happy', 'Good walk and a chat with a friend'],
  [4, 1, 'angry', 'They ignored my message on purpose'], [5, 5, 'grateful', 'Slept well and finished the project'], [8, 2, 'sad', 'I never finish anything'], [9, 4, 'relaxed', 'Quiet evening, breathing exercise helped']]
  .map(([ago, mood, emo, text], i) => {
    const d = new Date(); d.setDate(d.getDate() - ago); d.setHours(9 + i * 2 % 12, 10)
    return { id: 's' + i, createdAt: d.toISOString(), mood, situation: i === 0 ? 'Team presentation' : '', thought: text,
      emotions: [{ name: emo, intensity: 70 }], internalBehaviour: i === 0 ? 'Tight chest, racing heart' : '', externalBehaviour: i === 0 ? 'Spoke quickly, skipped slides' : '',
      alternateThought: i % 2 === 0 ? 'I prepared well and can handle a wobble' : '', outcomeIntensity: i % 2 === 0 ? 35 : null, tags: ['work'], photos: i === 2 ? [photo, photo] : [] }
  })
const sessions = [0, 1, 2, 4].map((ago, i) => { const d = new Date(); d.setDate(d.getDate() - ago); return { id: 'b' + i, createdAt: d.toISOString(), pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }, cycles: 6, durationSec: 384, completed: true } })

async function session(base, seed, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['notifications'] })
  if (seed) await ctx.addInitScript(([t, s]) => { if (!localStorage.getItem('bp.thoughts')) { localStorage.setItem('bp.thoughts', JSON.stringify(t)); localStorage.setItem('bp.sessions', JSON.stringify(s)) } }, [thoughts, sessions])
  const p = await ctx.newPage()
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text()) && errors.push(m.text()))
  await p.goto(base); await p.waitForSelector('.topbar, form')
  const snap = async n => { await p.waitForTimeout(350); await p.screenshot({ path: join(out, `${String(names.length + 1).padStart(2, '0')}-${n}.png`) }); names.push(n) }
  await fn(p, snap); await ctx.close()
}

await session('http://localhost:4173', true, async (p, snap) => {
  await snap('entries')
  await p.click('[aria-label=Search]'); await p.fill('.searchbar input', 'work'); await snap('entries-search'); await p.click('[aria-label=Search]')
  await p.click('.entry >> nth=0'); await snap('entry-expanded')
  await p.click('.tab >> text=Stats'); await p.evaluate(() => window.scrollTo(0, 0)); await snap('stats')
  await p.evaluate(() => window.scrollTo(0, 99999)); await snap('stats-bottom')
  await p.click('.tab >> text=Calendar'); await p.evaluate(() => window.scrollTo(0, 0)); await snap('calendar')
  await p.click('.cell:not(.off) .bub:has(svg) >> nth=-1'); await p.evaluate(() => window.scrollTo(0, 700)); await snap('calendar-day')
  await p.click('.tab >> text=Breathe'); await snap('breathe')
  await p.click('text=Start'); await p.waitForTimeout(5200); await snap('breathe-running'); await p.click('text=End session')
  await p.click('.tab >> text=More'); await snap('more')
  await p.click('text=Photo Gallery'); await snap('gallery'); await p.click('[aria-label=Back]')
  await p.click('text=Reminders'); await p.click('[role=switch]'); await p.waitForTimeout(500); await snap('reminders'); await p.click('[aria-label=Back]')
  await p.click('.li >> text=Apple Health'); await snap('apple-health'); await p.click('[aria-label=Back]')
  await p.click('.fab'); await snap('new-entry-menu')
  await p.click('.btn.primary >> text=Today'); await snap('mood-picker')
  await p.click('.datelink'); await snap('mood-picker-date'); await p.click('.datelink')
  await p.click('.faces button >> nth=3'); await p.click('.ig >> text=anxious'); await p.click('.ig >> text=stressed'); await snap('editor-emotions')
  await p.evaluate(() => document.querySelector('.overlay').scrollTo(0, 99999)); await snap('editor-thought-record')
})

await session('http://localhost:4174', false, async (p, snap) => {
  await snap('login-signin')
  await p.click('text=Create an account'); await snap('login-signup')
  await p.click('text=Back to sign in'); await p.click('text=Forgot password?'); await snap('login-forgot')
})

await local.close(); await cloud.close(); await browser.close()

// contact sheet
const files = readdirSync(out).filter(f => f.endsWith('.png')).sort()
const html = `<body style="margin:0;background:#111;font:14px -apple-system,sans-serif;color:#ccc"><div style="display:grid;grid-template-columns:repeat(6,390px);gap:16px;padding:16px">${files.map(f =>
  `<figure style="margin:0"><img style="width:390px;border-radius:18px" src="data:image/png;base64,${readFileSync(join(out, f)).toString('base64')}"><figcaption style="padding:6px 2px">${f.replace(/^\d+-|\.png$/g, '')}</figcaption></figure>`).join('')}</div>`
const b2 = await chromium.launch({ executablePath: exe }); const pg = await b2.newPage({ viewport: { width: 2500, height: 800 } })
await pg.setContent(html); await pg.screenshot({ path: join(out, '_all.png'), fullPage: true }); await b2.close()
console.log(`${files.length} screens -> screenshots/`); if (errors.length) { console.log('PAGE ERRORS:', errors); process.exitCode = 1 }
