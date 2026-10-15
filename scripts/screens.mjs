// npm run screens  ->  builds the app, drives every screen, writes screenshots/*.png + screenshots/_all.png
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { preview } from 'vite'
import { execSync } from 'node:child_process'
import { nativeStub } from './native-stub.mjs'
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const out = join(root, 'screenshots')
rmSync(out, { recursive: true, force: true }); mkdirSync(out)
const sh = (cmd, env = {}) => execSync(cmd, { cwd: root, stdio: 'pipe', env: { ...process.env, ...env } })

sh('npx vite build', { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' })   // local mode, whatever .env says
sh('npx vite build --outDir node_modules/.dist-auth', { VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'x' })
const local = await preview({ root, preview: { port: 4173, strictPort: true }, build: { outDir: 'dist' } })
const cloud = await preview({ root, preview: { port: 4174, strictPort: true }, build: { outDir: 'node_modules/.dist-auth' } })

const exe = chromiumPath()
const browser = await chromium.launch({ executablePath: exe, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const errors = []
const names = []

const photo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fa869"/><stop offset="1" stop-color="#5e6ad2"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="280" cy="120" r="50" fill="#ffd36b"/></svg>')
const rows = [
  [0, 3, 'anxious', 70, ['work'], ['catastrophizing', 'mind reading'], 'Everyone will notice I messed up the demo'],
  [1, 2, 'stressed', 80, ['work'], ['fortune telling'], 'I will never catch up on this work'],
  [3, 4, 'happy', 40, ['social'], [], 'Good walk and a chat with a friend'],
  [4, 1, 'afraid', 65, ['sleep'], ['catastrophizing'], 'What if I never sleep properly again'],
  [5, 5, 'grateful', 30, ['family'], [], 'Slept well and finished the project'],
  [8, 2, 'overwhelmed', 75, ['sleep'], ['all-or-nothing'], 'I never finish anything'],
  [9, 4, 'relaxed', 20, ['social'], [], 'Quiet evening, breathing exercise helped']]
const thoughts = rows.map(([ago, mood, emo, inten, tags, distortions, text], i) => {
  const d = new Date(); d.setDate(d.getDate() - ago); d.setHours(i % 2 ? 22 : 9 + i, 10)
  return { id: 's' + i, createdAt: d.toISOString(), mood, situation: i === 0 ? 'Team presentation' : '', thought: text,
    emotions: [{ name: emo, intensity: inten }], internalBehaviour: i === 0 ? 'Tight chest, racing heart' : '', externalBehaviour: i === 0 ? 'Spoke quickly, skipped slides' : '',
    alternateThought: i % 2 === 0 ? 'I prepared well and can handle a wobble' : '', outcomeIntensity: i % 2 === 0 ? 35 : null, tags, distortions, photos: i === 2 ? [photo, photo] : [] }
})
const sessions = [[0, 8, 4, 'breathing'], [1, 7, 3, 'grounding'], [2, 6, 5, 'breathing'], [4, null, null, 'breathing']].map(([ago, b, a, kind], i) => {
  const d = new Date(); d.setDate(d.getDate() - ago)
  return { id: 'b' + i, createdAt: d.toISOString(), pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }, cycles: 6, durationSec: 384, completed: true, kind, anxietyBefore: b, anxietyAfter: a }
})

const worries = [['Rent is due on Friday', 'actionable', 'Pay on Thursday morning'], ['My friend seemed upset yesterday', 'let-go', null], ['What if the flight is delayed', 'let-go', null], ['Presentation next week', 'open', null], ['I forgot to reply to Sam', 'open', null]]
  .map(([text, status, action], i) => ({ id: 'w' + i, createdAt: new Date(Date.now() - (5 - i) * 3600e3).toISOString(), text, status, action, reviewedAt: status === 'open' ? null : new Date().toISOString() }))

/** Canned Gemini responses so AI screens can be captured without a key. */
async function mockGemini(ctx) {
  await ctx.route('https://generativelanguage.googleapis.com/**', async route => {
    const req = route.request(), body = req.postData() ?? '', cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const json = o => route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(o) })
    const text = t => json({ candidates: [{ content: { parts: [{ text: t }] } }] })
    if (req.url().includes('/models?')) return json({ models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }] })
    if (body.includes('single word OK')) return text('OK')
    if (body.includes('inline_data')) return text('I am really worried about my presentation tomorrow. My chest feels tight and I keep thinking everyone will notice if I mess up.')
    if (body.includes('fill in a CBT thought record')) return text(JSON.stringify({ situation: 'Presentation tomorrow', thought: 'Everyone will notice if I mess up', emotions: [{ name: 'anxious', intensity: 80 }], internalBehaviour: 'Tight chest', externalBehaviour: '', alternateThought: '', distortions: ['catastrophizing', 'mind reading'], tags: ['work'] }))
    return text(JSON.stringify({ distortions: ['mind reading'], reframes: ['I have prepared well and can handle a wobble.', 'Most people are focused on themselves, not on me.', 'One slip would not ruin the whole talk.'], crisis: false }))
  })
}

async function session(base, seed, fn, { native = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['notifications', 'microphone'] })
  await mockGemini(ctx)
  await ctx.route('http://127.0.0.1:9/auth/v1/settings', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ external: { email: true, google: true, apple: true } }) }))
  if (native) await ctx.addInitScript(nativeStub)
  if (seed) await ctx.addInitScript(([t, s, w]) => { if (!localStorage.getItem('bp.thoughts')) { localStorage.setItem('bp.thoughts', JSON.stringify(t)); localStorage.setItem('bp.sessions', JSON.stringify(s)); localStorage.setItem('bp.worries', JSON.stringify(w)) } }, [thoughts, sessions, worries])
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
  await p.locator('h3:has-text("Anxiety Insights")').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -80)); await snap('stats-anxiety-insights')
  await p.locator('h3:has-text("Worry Box")').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -80)); await snap('stats-worry-box')
  await p.evaluate(() => window.scrollTo(0, 99999)); await snap('stats-bottom')
  await p.click('.tab >> text=Calendar'); await p.evaluate(() => window.scrollTo(0, 0)); await snap('calendar')
  await p.click('.cell:not(.off) .bub:has(svg) >> nth=-1'); await p.evaluate(() => window.scrollTo(0, 700)); await snap('calendar-day')
  await p.click('.tab >> text=Breathe'); await snap('breathe')
  await p.click('.seg >> text=Calm 4-6'); await snap('breathe-calm-preset')
  await p.click('text=Start'); await p.waitForTimeout(5200); await snap('breathe-running'); await p.click('text=End session')
  // SOS flow
  await p.click('.sos-card'); await snap('sos-rate')
  await p.click('text=Need more support right now?'); await p.evaluate(() => document.querySelector('.overlay').scrollTo(0, 99999)); await snap('sos-support'); await p.click('text=Hide support options')
  await p.fill('input[type=range]', '8'); await p.click('text=Continue'); await snap('sos-choose')
  await p.click('.tool >> text=Ground yourself'); await snap('sos-grounding')
  for (let i = 0; i < 5; i++) await p.click('text=I noticed one'); await p.waitForTimeout(700); await p.click('text=Skip this step'); await p.waitForTimeout(200); await snap('sos-grounding-step2')
  for (let i = 0; i < 2; i++) { await p.click('text=Skip this step') } await p.click('text=Finish'); await snap('sos-after-rate')
  await p.fill('input[type=range]', '4'); await p.click('text=Save'); await snap('sos-result')
  await p.click('text=Done')
  await p.click('.sos-card'); await p.click('text=Continue'); await p.click('.tool >> text=Slow breathing'); await p.waitForTimeout(5200); await snap('sos-breathing')
  await p.click('text=End session'); await p.click('text=Save'); await p.click('text=Done')
  await p.click('.tab >> text=More'); await snap('more')
  await p.click('.li >> text=Worry time'); await snap('worry-time')
  await p.click('text=Start worry time'); await snap('worry-review-ask')
  await p.click('text=Yes — I can take a step'); await p.fill('textarea', 'Reply to Sam tonight'); await snap('worry-review-plan')
  await p.click('text=Save plan'); await p.click('text=it’s out of my control'); await snap('worry-review-done'); await p.click('button:has-text("Done")'); await p.click('[aria-label=Back]')
  await p.click('.li >> text=AI helper'); await snap('ai-settings'); await p.click('[aria-label=Back]')
  await p.click('text=Photo Gallery'); await snap('gallery'); await p.click('[aria-label=Back]')
  await p.click('text=Reminders'); await p.click('[role=switch]'); await p.waitForTimeout(500); await snap('reminders'); await p.click('[aria-label=Back]')
  await p.click('.li >> text=Apple Health'); await snap('apple-health'); await p.click('[aria-label=Back]')
  await p.click('.li >> text=Get support'); await snap('support'); await p.click('[aria-label=Back]')
  await p.click('.fab'); await snap('new-entry-menu')
  await p.click('.sheet-item >> text=Park a worry'); await p.fill('textarea', 'What if I forget my notes?'); await snap('park-worry'); await p.click('.sheet-wrap', { position: { x: 5, y: 5 } })
  await p.click('.fab'); await p.click('.btn.primary >> text=Today'); await snap('mood-picker')
  await p.click('.datelink'); await snap('mood-picker-date'); await p.click('.datelink')
  await p.click('.faces button >> nth=3'); await p.click('.ig >> text=anxious'); await p.click('.ig >> text=stressed'); await snap('editor-emotions')
  await p.evaluate(() => document.querySelector('.overlay').scrollTo(0, 99999)); await p.locator('text=Thinking traps').scrollIntoViewIfNeeded(); await p.click('.chip >> text=catastrophizing'); await p.click('.chip >> text=mind reading'); await snap('editor-thinking-traps')
  await p.locator('text=Questions that help').scrollIntoViewIfNeeded(); await p.click('.qbtn >> nth=1'); await p.evaluate(() => document.querySelector('.overlay').scrollBy(0, 200)); await snap('editor-reframe-questions')
  await p.locator('h3:has-text("Voice memo")').scrollIntoViewIfNeeded(); await p.click('text=● Record'); await p.waitForSelector('.rec-live'); await p.waitForTimeout(1600); await snap('voice-recording')
  await p.click('button:has-text("Stop")'); await p.waitForSelector('audio'); await p.fill('textarea[placeholder^="Type it yourself"]', 'Talked it through: the demo went fine in the end.'); await snap('voice-recorded')
  await p.click('text=Save'); await p.waitForSelector('.celebrate'); await p.waitForTimeout(900); await snap('celebrate')
  await p.click('.celebrate .btn'); await snap('entries-after-save')
  await p.locator('.entry:has-text("Voice memo")').first().click(); await snap('entry-with-voice-memo')
})

await session('http://localhost:4173', true, async (p, snap) => {   // AI helper (Gemini mocked)
  await p.click('.tab >> text=More'); await p.click('.li >> text=AI helper'); await p.click('[role=switch]'); await p.fill('input[type=password]', 'demo-key')
  await p.click('text=Save & test'); await p.waitForSelector('text=/Connected/'); await snap('ai-connected'); await p.click('[aria-label=Back]')
  await p.click('.tab >> text=Entries'); await p.click('.fab'); await p.click('.sheet .btn.primary >> text=Today'); await p.click('.faces button >> nth=3')
  await p.locator('h3:has-text("Voice memo")').scrollIntoViewIfNeeded(); await p.click('text=● Record'); await p.waitForSelector('.rec-live'); await p.waitForTimeout(1600); await p.click('button:has-text("Stop")'); await p.waitForSelector('audio')
  await p.click('button:has-text("Transcribe")'); await p.waitForFunction(() => [...document.querySelectorAll('textarea')].some(x => x.value.startsWith('I am really worried'))); await snap('ai-transcribed')
  await p.click('button:has-text("Fill my thought record")'); await p.waitForSelector('text=Filled in from your memo'); await snap('ai-filled')
  await p.click('button:has-text("Suggest reframes")'); await p.waitForSelector('.reframe-card'); await p.locator('.reframe-card').first().scrollIntoViewIfNeeded(); await snap('ai-reframes')
})

await session('http://localhost:4173', true, async (p, snap) => {   // iPhone app (native bridge simulated)
  await p.click('.tab >> text=More'); await p.click('.li >> text=Apple Health'); await snap('iphone-apple-health')
  await p.click('[role=switch]'); await p.waitForSelector('text=Connected.'); await p.click('text=Save past sessions'); await p.waitForTimeout(300); await snap('iphone-apple-health-connected')
  await p.click('[aria-label=Back]'); await p.click('.li >> text=Reminders'); await snap('iphone-rituals')
  await p.click('[role=switch][aria-label="Morning breathe"]'); await p.click('[role=switch][aria-label="Evening breathe"]'); await p.waitForSelector('input[aria-label="Evening breathe time"]'); await snap('iphone-rituals-on')
}, { native: true })

await session('http://localhost:4173', true, async (p, snap) => {   // daily anchors
  await p.click('text=Choose your daily anchors'); await snap('anchors-picker')
  for (const l of ['Slow breathing', 'Walk 10 minutes', 'Get some sunlight', 'Drink water']) await p.click(`.sheet .chip >> text=${l}`)
  await snap('anchors-manage'); await p.click('button:has-text("Done")'); await snap('anchors-home')
  await p.click('[role=checkbox][aria-label="Walk 10 minutes"]'); await p.click('[role=checkbox][aria-label="Drink water"]'); await snap('anchors-progress')
  await p.click('.tab >> text=More'); await p.click('.li >> text=Daily anchors'); await snap('anchors-more')
})

await session('http://localhost:4173', true, async (p, snap) => {   // progress + summaries
  await p.click('.tab >> text=Stats'); await p.click('[role=tab]:has-text("Progress")'); await snap('progress')
  await p.locator('h2:has-text("Proof")').scrollIntoViewIfNeeded(); await snap('progress-proof')
  await p.click('[role=tab]:has-text("Summary")'); await snap('summary-week')
  await p.click('[role=tab]:has-text("Today")'); await snap('summary-today')
})

await session('http://localhost:4173', true, async (p, snap) => {   // journal
  await p.click('.fab'); await p.click('.sheet-item >> text=Write in journal'); await p.waitForSelector('[aria-label="Journal entry"]'); await snap('journal-editor-empty')
  await p.click('text=Need a place to start?'); await p.fill('[aria-label="Title"]', 'A slower morning')
  await p.fill('[aria-label="Journal entry"]', 'Woke up before the alarm. Made tea, sat by the window and just watched the street for ten minutes. Nothing special, but my shoulders dropped for the first time this week.')
  await p.click('[aria-label="Mood: good"]'); await p.click('.chip:has-text("health")'); await snap('journal-editor')
  await p.click('button:has-text("Save")'); await p.waitForSelector('.celebrate'); await snap('journal-saved'); await p.click('.celebrate .btn')
  await p.click('.tab >> text=More'); await p.click('.li >> text=Journal'); await snap('journal-list')
})

await session('http://localhost:4173', true, async (p, snap) => {   // one small step
  await p.clock.install()
  await p.click('.fab'); await p.click('.sheet-item >> text=Start a small step'); await snap('step-choose')
  await p.click('.chip:has-text("Write one sentence")'); await p.click('button:has-text("Start")'); await p.waitForSelector('.orb'); await snap('step-calm')
  await p.click('button:has-text("Skip — start now")'); await p.waitForSelector('[role=timer]'); await p.clock.fastForward('01:30'); await snap('step-focus')
  await p.clock.fastForward('04:00'); await p.waitForSelector('text=Done — nice.'); await snap('step-done')
})

await session('http://localhost:4173', true, async (p, snap) => {   // sleep (Apple Watch data via Health, simulated)
  const H = 3600000
  const segs = Array.from({ length: 10 }, (_, k) => {
    const wake = new Date(); wake.setDate(wake.getDate() - k); wake.setHours(7, 0, 0, 0)
    const hours = [8, 6.5, 7.5, 5.5, 7, 8, 6, 7.5, 6.5, 7][k], end = wake.getTime(), start = end - hours * H, sg = (kind, a, b) => ({ kind, start: a, end: b })
    return [sg('core', start, start + H), sg('deep', start + H, start + 2 * H), sg('core', start + 2 * H, end - 2.5 * H), sg('rem', end - 2.5 * H, end - H), sg('core', end - H, end)]
  }).flat()
  await p.evaluate(segments => { window.__reply = { 'Mindful.readSleep': { segments } } }, segs)
  await p.click('.tab >> text=Stats'); await p.click('[role=tab]:has-text("Sleep")'); await snap('sleep-connect')
  await p.click('button:has-text("Connect Apple Health sleep")'); await p.waitForSelector('[aria-label="Last night"] >> text=8h'); await snap('sleep')
  await p.locator('[aria-label="Sleep and mood"]').scrollIntoViewIfNeeded(); await snap('sleep-mood')
}, { native: true })

await session('http://localhost:4174', false, async (p, snap) => {
  await p.waitForSelector('button:has-text("Continue with Apple")')
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
