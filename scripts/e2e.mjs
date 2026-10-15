// npm run test:e2e [-- --no-build]
// Drives the built app in headless Chromium (fake microphone, mocked Gemini network) and checks real user flows.
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { preview } from 'vite'
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { nativeStub } from './native-stub.mjs'

const root = new URL('..', import.meta.url).pathname
if (!process.argv.includes('--no-build')) execSync('npx vite build', { cwd: root, stdio: 'pipe' })
const server = await preview({ root, preview: { port: 4175, strictPort: true }, build: { outDir: 'dist' } })
const URL_ = 'http://localhost:4175'
const exe = chromiumPath()
const browser = await chromium.launch({ executablePath: exe, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const TRANSCRIPT = 'I am worried about my presentation tomorrow and my chest feels tight'
const STRUCTURED = { situation: 'Presentation tomorrow', thought: 'I will mess it up and everyone will notice', emotions: [{ name: 'anxious', intensity: 80 }, { name: 'bogus', intensity: 5 }],
  internalBehaviour: 'Tight chest', externalBehaviour: '', alternateThought: '', distortions: ['catastrophizing', 'not-a-trap'], tags: ['work', 'nope'] }

/** Fresh browser context + page with error capture and a mocked Gemini API. */
const calls = (p, plugin, method) => p.evaluate(([a, b]) => window.__native.filter(c => c.plugin === a && (!b || c.method === b)), [plugin, method])

async function open(seed, { native = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone', 'notifications'], acceptDownloads: true })
  const gemini = { calls: [], mode: 'ok' }
  await ctx.route('https://generativelanguage.googleapis.com/**', async route => {
    const req = route.request(), url = req.url(), body = req.postData() ?? ''
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    gemini.calls.push({ url, headers: req.headers(), body })
    const json = (obj, status = 200) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(obj) })
    const text = t => json({ candidates: [{ content: { parts: [{ text: t }] } }] })
    if (gemini.mode === 'quota') return json({ error: { message: 'quota' } }, 429)
    if (url.includes('/models?')) return json({ models: [{ name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] }] })
    if (body.includes('single word OK')) return text('OK')
    if (body.includes('inline_data')) return text(TRANSCRIPT)
    if (body.includes('fill in a CBT thought record')) return text('```json\n' + JSON.stringify(STRUCTURED) + '\n```')
    if (body.includes('CBT-informed helper')) return text(JSON.stringify({ distortions: ['mind reading'], reframes: ['I have prepared and can cope with a wobble.', 'Most people are focused on themselves, not me.', 'One slip would not ruin the whole talk.'], crisis: false }))
    return json({ error: { message: 'unexpected request' } }, 400)
  })
  if (native) await ctx.addInitScript(nativeStub)
  if (seed) await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); for (const [a, b] of Object.entries(v)) localStorage.setItem(a, JSON.stringify(b)) } }, ['seed', seed])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()) })
  await page.goto(URL_); await page.waitForSelector('.topbar')
  opened.push(page)
  return { ctx, page, errors, gemini }
}
const done = async ({ ctx, errors }) => { await ctx.close(); assert.deepEqual(errors, [], 'unexpected browser errors') }
const tab = (p, name) => p.click(`.tab >> text=${name}`)
const idbKeys = p => p.evaluate(() => new Promise(res => { const r = indexedDB.open('brainpal-media'); r.onerror = () => res([]); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('blobs')) return res([]); const q = db.transaction('blobs').objectStore('blobs').getAllKeys(); q.onsuccess = () => res(q.result) } }))
const reload = async p => { await p.reload(); await p.waitForSelector('.topbar') }

async function newEntry(p, { mood = 3, emotion, thought } = {}) {
  await p.click('.fab'); await p.click('.sheet .btn.primary >> text=Today')
  await p.click(`.faces button >> nth=${5 - mood}`)
  if (emotion) await p.click(`.ig >> text=${emotion}`)
  if (thought) await p.fill('textarea[placeholder="What went through your mind?"]', thought)
}
const save = async p => { await p.click('button:has-text("Save")'); await p.waitForSelector('.celebrate'); await p.click('.celebrate .btn'); await p.waitForSelector('.topbar') }
async function connectAi(p) {
  await tab(p, 'More'); await p.click('.li >> text=AI helper')
  await p.click('[role=switch]'); await p.fill('input[type=password]', 'TEST-KEY')
  await p.click('text=Save & test'); await p.waitForSelector('text=/Connected — using/')
  await p.click('[aria-label=Back]'); await tab(p, 'Entries')
}
async function record(p, secs = 1.6) {
  await p.click('text=● Record'); await p.waitForSelector('.rec-live'); await p.waitForTimeout(secs * 1000); await p.click('button:has-text("Stop")'); await p.waitForSelector('audio')
}

const opened = []
const tests = []
const test = (name, fn) => tests.push([name, fn])

test('every screen renders without errors', async () => {
  const s = await open()
  for (const t of ['Entries', 'Stats', 'Calendar', 'Breathe', 'More']) { await tab(s.page, t); await s.page.waitForTimeout(150) }
  for (const row of ['Worry time', 'AI helper', 'Photo Gallery', 'Reminders', 'Get support', 'Apple Health']) {
    await tab(s.page, 'More')
    if (row === 'Worry time') { await s.page.click('.li >> text=Worry time'); await s.page.waitForSelector('text=Parked'); await s.page.click('[aria-label=Back]'); continue }
    await s.page.click(`.li >> text=${row}`); await s.page.waitForSelector('.title'); await s.page.click('[aria-label=Back]')
  }
  await done(s)
})

test('legacy data (no mood / traps / audio / session kind, inline photos) still loads', async () => {
  const legacy = { 'bp.thoughts': [{ id: 'old1', createdAt: new Date().toISOString(), situation: '', thought: 'An old entry', emotions: [{ name: 'sad', intensity: 40 }], internalBehaviour: '', externalBehaviour: '', alternateThought: 'old alt', outcomeIntensity: 20, tags: ['work'], photos: ['data:image/png;base64,' + PNG.toString('base64')] }],
    'bp.sessions': [{ id: 'oldb', createdAt: new Date().toISOString(), pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }, cycles: 6, durationSec: 100, completed: true }] }
  const s = await open(legacy)
  await s.page.waitForSelector('.entry >> text=An old entry')
  await s.page.click('.entry'); assert.equal(await s.page.locator('.photos img').count(), 1)
  for (const t of ['Stats', 'Calendar', 'More']) { await tab(s.page, t); await s.page.waitForTimeout(150) }
  await done(s)
})

test('create, persist, expand and delete an entry', async () => {
  const s = await open()
  await newEntry(s.page, { mood: 2, emotion: 'anxious', thought: 'I will fail the exam' })
  await s.page.click('.chip >> text=catastrophizing'); await s.page.fill('textarea[placeholder="What went through your mind?"]', 'I will fail the exam')
  await save(s.page)
  await s.page.waitForSelector('.entry >> text=I will fail the exam')
  await reload(s.page)
  await s.page.click('.entry'); await s.page.waitForSelector('text=Thinking traps'); assert.ok(await s.page.locator('.entry .chip >> text=catastrophizing').count())
  s.page.once('dialog', d => d.accept()); await s.page.click('text=Delete entry')
  await s.page.waitForSelector('text=No entries this month'); await reload(s.page); await s.page.waitForSelector('text=No entries this month')
  await done(s)
})

test('a mood-only entry saves, and hostile text is rendered as text', async () => {
  const s = await open()
  await newEntry(s.page, { mood: 5 }); await save(s.page); await s.page.waitForSelector('.entry')
  const evil = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>'
  await newEntry(s.page, { mood: 4, thought: evil }); await save(s.page)
  await s.page.waitForSelector('.entry >> text=<img src=x'); await s.page.waitForTimeout(300)
  assert.equal(await s.page.evaluate(() => window.__xss), undefined)
  await done(s)
})

test('crisis wording shows support options and blocks AI suggestions', async () => {
  const s = await open(); await connectAi(s.page)
  await newEntry(s.page, { mood: 1 })
  await s.page.fill('textarea[placeholder="What went through your mind?"]', 'I want to kill myself')
  await s.page.waitForSelector('text=You don’t have to do this alone')
  assert.equal(await s.page.locator('text=Suggest reframes').count(), 0)
  assert.ok(!s.gemini.calls.some(c => c.url.includes('generateContent') && c.body.includes('kill myself')), 'crisis text must never be sent to the AI')
  await done(s)
})

test('voice memo: record, play, transcribe by hand, persist across reload, free storage on delete', async () => {
  const s = await open(); const p = s.page
  await newEntry(p, { mood: 3 }); await record(p)
  assert.ok(await p.evaluate(() => document.querySelector('audio').src.startsWith('blob:')))
  await p.fill('textarea[placeholder^="Type it yourself"]', 'typed transcript')
  await save(p)
  await p.waitForSelector('.entry >> text=Voice memo')
  assert.equal((await idbKeys(p)).filter(k => String(k).startsWith('audio-')).length, 1)
  await reload(p); await p.click('.entry')
  await p.waitForSelector('.entry audio'); await p.waitForSelector('.etranscript >> text=typed transcript')
  const size = await p.evaluate(async () => (await (await fetch(document.querySelector('.entry audio').src)).blob()).size)
  assert.ok(size > 500, `audio blob should survive reload (got ${size} bytes)`)
  p.once('dialog', d => d.accept()); await p.click('text=Delete entry'); await p.waitForTimeout(400)
  assert.equal((await idbKeys(p)).filter(k => String(k).startsWith('audio-')).length, 0)
  await done(s)
})

test('voice memo: cancel discards, and AI controls stay hidden until enabled', async () => {
  const s = await open(); const p = s.page
  await newEntry(p, { mood: 3 })
  await p.click('text=● Record'); await p.waitForSelector('.rec-live'); await p.click('button:has-text("Cancel")')
  await p.waitForSelector('text=● Record'); assert.equal(await p.locator('audio').count(), 0)
  await record(p); assert.equal(await p.locator('button:has-text("Transcribe")').count(), 0)
  await done(s)
})

test('Gemini (mocked): connect, transcribe, fill thought record, reframes, transcribe later', async () => {
  const s = await open(); const p = s.page
  await connectAi(p)
  assert.ok(s.gemini.calls.every(c => c.headers['x-goog-api-key'] === 'TEST-KEY'), 'key must travel in the header only')
  assert.ok(s.gemini.calls.some(c => c.url.includes('gemini-3.5-flash:generateContent')), 'picks the best model that works')
  await newEntry(p, { mood: 2 }); await record(p)
  await p.click('button:has-text("Transcribe")'); await p.waitForFunction(t => document.querySelector('textarea[placeholder^="Tap"]')?.value === t || [...document.querySelectorAll('textarea')].some(x => x.value === t), TRANSCRIPT)
  assert.ok(s.gemini.calls.some(c => c.body.includes('"mime_type":"audio/wav"')), 'audio is converted to WAV before upload')
  await p.click('button:has-text("Fill my thought record")'); await p.waitForSelector('text=Filled in from your memo')
  assert.equal(await p.inputValue('textarea[placeholder="What went through your mind?"]'), STRUCTURED.thought)
  assert.equal(await p.locator('.card:has(h3:has-text("Emotions")) .ig.on').count(), 1, 'only allow-listed emotions are applied (bogus dropped)')
  assert.equal(await p.locator('.card:has(h3:has-text("Tags")) .ig.on').count(), 1, 'allow-listed tag applied, bogus tag dropped')
  assert.equal(await p.locator('.chip.on >> text=catastrophizing').count(), 1)
  await p.click('button:has-text("Suggest reframes")'); await p.waitForSelector('.reframe-card')
  assert.equal(await p.locator('.reframe-card').count(), 3)
  await p.click('.reframe-card >> nth=0')
  assert.match(await p.inputValue('textarea[placeholder^="What would you tell"]'), /I have prepared/)
  await save(p)
  await p.click('.entry'); await p.waitForSelector('.etranscript >> text=presentation tomorrow')
  // a memo saved without a transcript can be transcribed afterwards
  await newEntry(p, { mood: 3 }); await record(p); await save(p)
  await p.locator('.entry >> text=Voice memo').first().click()
  await p.click('.entry button:has-text("Transcribe")')
  await p.waitForSelector('.entry button:has-text("Transcrib")', { state: 'detached' })   // done only when THIS entry got its transcript
  assert.equal(await p.locator('.entry .etranscript').count(), 2, 'both transcripts visible before reload')
  await reload(p); await p.click('.entry >> nth=0'); await p.waitForSelector('.entry:nth-of-type(1) .etranscript, .etranscript')
  await p.click('.entry >> nth=1'); assert.equal(await p.locator('.entry .etranscript').count(), 2, 'both transcripts survive a reload')
  await done(s)
})

test('Gemini (mocked): rate limit and bad key give friendly messages, nothing crashes', async () => {
  const s = await open(); const p = s.page
  await tab(p, 'More'); await p.click('.li >> text=AI helper'); await p.click('[role=switch]'); await p.fill('input[type=password]', 'K')
  s.gemini.mode = 'quota'; await p.click('text=Save & test'); await p.waitForSelector('text=/Free-tier limit reached|None of the available/')
  s.gemini.mode = 'ok'; await p.click('text=Save & test'); await p.waitForSelector('text=/Connected/')
  await p.click('text=Remove key'); assert.equal(await p.evaluate(() => localStorage.getItem('bp.gemini.key')), null)
  await done(s)
})

test('worry time: park, let go, make a plan, persist, stats', async () => {
  const s = await open(); const p = s.page
  for (const w of ['Rent is due', 'My friend seems upset']) {
    await p.click('.fab'); await p.click('.sheet-item >> text=Park a worry'); await p.fill('textarea', w); await p.click('button:has-text("Park it")'); await p.waitForSelector('text=Parked.')
    await p.click('.sheet-wrap', { position: { x: 5, y: 5 } })
  }
  await tab(p, 'More'); await p.waitForSelector('.li >> text=2 parked'); await p.click('.li >> text=Worry time')
  await p.waitForSelector('text=Parked (2)'); await p.click('text=Start worry time')
  await p.waitForSelector('text=Rent is due'); await p.click('text=Yes — I can take a step'); await p.fill('textarea', 'Pay on Friday'); await p.click('text=Save plan')
  await p.waitForSelector('text=My friend seems upset'); await p.click('text=it’s out of my control')
  await p.waitForSelector('text=Worry time complete'); await p.click('button:has-text("Done")')
  await p.waitForSelector('text=Next step: Pay on Friday')
  await reload(p); await tab(p, 'Stats'); await p.waitForSelector('h3:has-text("Worry Box")')
  assert.match(await p.locator('.card:has(h3:has-text("Worry Box"))').innerText(), /1\s*let go/i)
  await done(s)
})

test('SOS flow records relief and Stats reflects it; breathing session logs', async () => {
  const s = await open(); const p = s.page
  await p.click('.sos-card'); await p.fill('input[type=range]', '8'); await p.click('text=Continue'); await p.click('.tool >> text=Slow breathing')
  await p.waitForTimeout(11000); await p.click('text=End session')
  await p.fill('input[type=range]', '3'); await p.click('button:has-text("Save")'); await p.waitForSelector('text=Down 5 points')
  await p.click('button:has-text("Done")'); await tab(p, 'Stats')
  await p.waitForSelector('text=/−5/'); await reload(p)
  await done(s)
})

test('photos attach, persist and show in the gallery', async () => {
  const s = await open(); const p = s.page
  await newEntry(p, { mood: 4 })
  await p.setInputFiles('label:has-text("From Gallery") input', { name: 'a.png', mimeType: 'image/png', buffer: PNG })
  await p.waitForSelector('.photos img'); await save(p)
  await reload(p); await tab(p, 'More'); await p.click('.li >> text=Photo Gallery'); await p.waitForSelector('.gallery img')
  assert.ok(await p.evaluate(async () => (await (await fetch(document.querySelector('.gallery img').src)).blob()).size) > 0)
  await done(s)
})

test('export downloads valid JSON without media blobs', async () => {
  const s = await open(); const p = s.page
  await newEntry(p, { mood: 3, thought: 'export me' }); await save(p)
  await tab(p, 'More'); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.li >> text=Export data')])
  const data = JSON.parse(readFileSync(await dl.path(), 'utf8'))
  assert.equal(data.thoughts.length, 1); assert.equal(data.thoughts[0].thought, 'export me'); assert.ok(!('photos' in data.thoughts[0])); assert.ok(Array.isArray(data.worries))
  await done(s)
})

test('iPhone app mode: boots without a service worker, styles the status bar, never crashes on missing plugins', async () => {
  const s = await open(null, { native: true }); const p = s.page
  assert.equal(await p.evaluate(() => window.Capacitor.getPlatform()), 'ios')
  assert.equal((await p.evaluate(() => navigator.serviceWorker.getRegistrations())).length, 0, 'no service worker inside the app')
  await p.waitForFunction(() => window.__native.some(c => c.plugin === 'StatusBar' && c.method === 'setStyle'))
  assert.equal((await calls(p, 'StatusBar', 'setStyle'))[0].options.style, 'DARK')
  for (const t of ['Entries', 'Stats', 'Calendar', 'Breathe', 'More']) await tab(p, t)
  await done(s)
})

test('iPhone app mode: breathing uses the Taptic Engine and keeps the screen awake', async () => {
  const s = await open(null, { native: true }); const p = s.page
  await tab(p, 'Breathe'); await p.click('.seg >> text=Calm 4-6'); await p.click('button:has-text("Start")')
  await p.waitForFunction(() => window.__native.filter(c => c.plugin === 'Haptics' && c.method === 'impact').length >= 4, null, { timeout: 8000 })
  const impacts = (await calls(p, 'Haptics', 'impact')).slice(0, 4).map(c => c.options.style)
  assert.deepEqual(impacts, ['LIGHT', 'MEDIUM', 'MEDIUM', 'HEAVY'], 'inhale swells light → heavy')
  assert.equal((await calls(p, 'Mindful', 'keepAwake'))[0].options.enabled, true)
  await p.click('button:has-text("End session")')
  await p.waitForFunction(() => window.__native.filter(c => c.method === 'keepAwake').at(-1)?.options.enabled === false)
  await done(s)
})

test('iPhone app mode: Apple Health saves mindful minutes (only when connected, never twice)', async () => {
  const s = await open(null, { native: true }); const p = s.page
  await tab(p, 'More'); assert.match(await p.locator('.li:has-text("Apple Health")').innerText(), /Off/)
  await p.click('.li >> text=Apple Health'); await p.waitForSelector('text=Mindful Minutes')
  // a session before connecting is NOT written
  await p.click('[aria-label=Back]'); await tab(p, 'Breathe'); await p.click('button:has-text("Start")'); await p.waitForTimeout(10500); await p.click('button:has-text("End session")')
  await p.waitForSelector('text=Nice work'); assert.equal((await calls(p, 'Mindful', 'saveSession')).length, 0)
  // connect
  await tab(p, 'More'); await p.click('.li >> text=Apple Health'); await p.click('[role=switch]'); await p.waitForSelector('text=Connected.')
  assert.equal((await calls(p, 'Mindful', 'requestAuthorization')).length, 1)
  // backfill saves the earlier session once, then reports nothing left
  await p.click('text=Save past sessions'); await p.waitForSelector('text=Saved 1 past session')
  const first = (await calls(p, 'Mindful', 'saveSession'))[0].options
  assert.ok(first.end > first.start && Math.abs((first.end - first.start) / 1000 - 10) < 3, 'start/end span the session')
  await p.click('text=Save past sessions'); await p.waitForSelector('text=Everything is already saved'); assert.equal((await calls(p, 'Mindful', 'saveSession')).length, 1)
  // a new session is written automatically
  await p.click('[aria-label=Back]'); await tab(p, 'Breathe'); await p.click('button:has-text("Start")'); await p.waitForTimeout(10500); await p.click('button:has-text("End session")')
  await p.waitForFunction(() => window.__native.filter(c => c.method === 'saveSession').length === 2)
  // switch off: later sessions are not written
  await tab(p, 'More'); await p.click('.li >> text=Apple Health'); await p.click('[role=switch]')
  await p.click('[aria-label=Back]'); await tab(p, 'Breathe'); await p.click('button:has-text("Start")'); await p.waitForTimeout(10500); await p.click('button:has-text("End session")'); await p.waitForTimeout(500)
  assert.equal((await calls(p, 'Mindful', 'saveSession')).length, 2)
  await reload(p); await tab(p, 'More'); assert.match(await p.locator('.li:has-text("Apple Health")').innerText(), /Off/)
  await done(s)
})

test('iPhone app mode: reminders are scheduled on-device and skip today once you have checked in', async () => {
  const s = await open(null, { native: true }); const p = s.page
  const lateHour = new Date().getHours() < 22 ? 23 : null   // only meaningful if today's reminder time hasn't passed yet
  await tab(p, 'More'); await p.click('.li >> text=Reminders')
  if (lateHour) await p.selectOption('select', String(lateHour))
  await p.click('[role=switch]'); await p.waitForSelector('text=Reminder set for')
  assert.equal((await calls(p, 'LocalNotifications', 'requestPermissions')).length, 1)
  const batch = async () => (await calls(p, 'LocalNotifications', 'schedule')).at(-1).options.notifications
  await p.waitForFunction(() => window.__native.some(c => c.method === 'schedule'))
  const before = await batch()
  assert.ok(before.length >= 13 && before.length <= 14); assert.deepEqual(before.map(n => n.id), before.map((_, i) => 7000 + i))
  assert.equal(before[0].title, 'How are you feeling?')
  if (lateHour) {
    assert.equal(before.length, 14, 'today is included before checking in')
    await p.click('[aria-label=Back]'); await tab(p, 'Entries'); await newEntry(p, { mood: 3 }); await save(p)
    await p.waitForFunction(() => window.__native.filter(c => c.method === 'schedule').length >= 2)
    const after = await batch()
    assert.equal(after.length, 13, 'today dropped after checking in'); assert.match(after[0].title, /streak/i)
  }
  await tab(p, 'More'); await p.click('.li >> text=Reminders'); await p.click('[role=switch]')
  await p.waitForFunction(() => window.__native.some(c => c.method === 'cancel'))
  await reload(p); await tab(p, 'More'); assert.match(await p.locator('.li:has-text("Reminders")').innerText(), /Off/)
  await done(s)
})

test('in a normal browser nothing talks to native code and Apple Health explains itself', async () => {
  const s = await open(); const p = s.page
  assert.equal(await p.evaluate(() => window.__native), undefined)
  await tab(p, 'More'); assert.match(await p.locator('.li:has-text("Apple Health")').innerText(), /iPhone app/)
  await p.click('.li >> text=Apple Health'); await p.waitForSelector('text=part of the iPhone app'); assert.equal(await p.locator('[role=switch]').count(), 0)
  await done(s)
})

test('works offline after first load (PWA)', async () => {
  const s = await open(); const p = s.page
  await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1500); await reload(p)
  await s.ctx.setOffline(true); await reload(p); await p.waitForSelector('.topbar')
  await newEntry(p, { mood: 3, thought: 'written offline' }); await save(p); await p.waitForSelector('.entry >> text=written offline')
  await s.ctx.setOffline(false); await done(s)
})

test('every interactive control has an accessible name', async () => {
  const s = await open(); const p = s.page; const bad = []
  const scan = async label => bad.push(...(await p.evaluate(l => [...document.querySelectorAll('button, a[href], input, select, textarea')].filter(el => {
    if (el.hidden || el.type === 'hidden' || el.closest('[hidden]')) return false
    const n = el.getAttribute('aria-label') || el.innerText || el.title || el.labels?.[0]?.innerText || el.placeholder || ''
    return !n.trim()
  }).map(el => `${l}: ${el.outerHTML.slice(0, 90)}`), label)))
  for (const t of ['Entries', 'Stats', 'Calendar', 'Breathe', 'More']) { await tab(p, t); await p.waitForTimeout(100); await scan(t) }
  await newEntry(p, { mood: 3 }); await scan('editor')
  assert.deepEqual(bad, [], 'controls without an accessible name')
  await done(s)
})

const grep = process.argv.find(a => a.startsWith('--grep='))?.slice(7).toLowerCase()
const selected = grep ? tests.filter(([n]) => n.toLowerCase().includes(grep)) : tests
let failed = 0
for (const [name, fn] of selected) {
  const t0 = Date.now()
  try { await fn(); console.log(`✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`) }
  catch (e) {
    failed++; console.log(`✗ ${name}\n    ${String(e.message ?? e).split('\n').slice(0, 6).join('\n    ')}`)
    const pg = opened.at(-1)   // failure evidence: screenshot + visible text
    if (pg && !pg.isClosed()) {
      mkdirSync(new URL('../test-results/', import.meta.url), { recursive: true })
      const f = name.replace(/\W+/g, '-').slice(0, 50)
      await pg.screenshot({ path: new URL(`../test-results/${f}.png`, import.meta.url).pathname }).catch(() => {})
      console.log('    page text:', JSON.stringify((await pg.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 1500)))
    }
  }
  opened.length = 0
}
await browser.close(); await server.close()
console.log(failed ? `\n${failed} of ${selected.length} e2e tests FAILED` : `\nAll ${selected.length} e2e tests passed`)
process.exit(failed ? 1 : 0)
