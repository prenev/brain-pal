// npm run test:e2e [-- --no-build]
// Drives the built app in headless Chromium (fake microphone, mocked Gemini network) and checks real user flows.
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { preview } from 'vite'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { nativeStub } from './native-stub.mjs'

const root = new URL('..', import.meta.url).pathname
// The local-mode suite needs a build without Supabase keys; a developer's .env would otherwise put the app behind the login screen.
const NO_KEYS = { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' }
const envUrl = existsSync(new URL('../.env', import.meta.url)) && readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/^VITE_SUPABASE_URL=(\S+)/m)?.[1]
const distHasKeys = () => !!envUrl && readdirSync(new URL('../dist/assets', import.meta.url)).some(f => f.endsWith('.js') && readFileSync(new URL(`../dist/assets/${f}`, import.meta.url), 'utf8').includes(envUrl))
if (!process.argv.includes('--no-build') || distHasKeys()) execSync('npx vite build', { cwd: root, stdio: 'pipe', env: NO_KEYS })
const CLOUD_DIR = 'node_modules/.dist-cloud'   // same app built "with Supabase" pointing at a dead address; every call is intercepted below
if (!process.argv.includes('--no-build') || !existsSync(new URL(`../${CLOUD_DIR}`, import.meta.url)))
  execSync(`npx vite build --outDir ${CLOUD_DIR}`, { cwd: root, stdio: 'pipe', env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'test-key' } })
const server = await preview({ root, preview: { port: 4175, strictPort: true }, build: { outDir: 'dist' } })
const cloudServer = await preview({ root, preview: { port: 4177, strictPort: true }, build: { outDir: CLOUD_DIR } })
const URL_ = 'http://localhost:4175'
const exe = chromiumPath()
const browser = await chromium.launch({ executablePath: exe, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const TRANSCRIPT = 'I am worried about my presentation tomorrow and my chest feels tight'
const STRUCTURED = { situation: 'Presentation tomorrow', thought: 'I will mess it up and everyone will notice', emotions: [{ name: 'anxious', intensity: 80 }, { name: 'bogus', intensity: 5 }],
  internalBehaviour: 'Tight chest', externalBehaviour: '', alternateThought: '', distortions: ['catastrophizing', 'not-a-trap'], tags: ['work', 'nope'] }

/** Fresh browser context + page with error capture and a mocked Gemini API. */
const calls = (p, plugin, method) => p.evaluate(([a, b]) => window.__native.filter(c => c.plugin === a && (!b || c.method === b)), [plugin, method])

async function open(seed, { native = false, time = null, onboarding = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone', 'notifications'], acceptDownloads: true })
  if (!onboarding) await ctx.addInitScript(() => { try { localStorage.setItem('bp.onboarded', '1') } catch { /* ignore */ } })   // the first-run screens have their own test
  if (time) await ctx.clock.install({ time })      // for tests whose outcome depends on the time of day: pin it so they don't flake near midnight
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
  await page.goto(URL_); await page.waitForSelector('.topbar, .onboarding')
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

test('tab bar: every icon is visible whether selected or not; Entries uses the Fluent nib', async () => {
  const s = await open(); const p = s.page
  for (const sel of ['Entries', 'More']) {
    await tab(p, sel)
    const icons = await p.$$eval('.tab', tabs => tabs.map(t => {
      const svg = t.querySelector('svg'), r = svg.getBoundingClientRect(), [cr, cg, cb] = getComputedStyle(t).color.match(/\d+/g).map(Number)
      return { label: t.textContent, on: t.classList.contains('on'), w: r.width, light: (cr + cg + cb) / 3, fluent: svg.getAttribute('viewBox') === '0 0 32 32' }
    }))
    assert.equal(icons.length, 5)
    for (const i of icons) {
      assert.ok(i.w >= 20, `${i.label} icon is rendered`)
      if (!i.fluent) assert.ok(i.light > 150 || i.on, `${i.label} icon is light enough to see on the dark bar when not selected`)
    }
    assert.deepEqual(icons.filter(i => i.fluent).map(i => i.label), ['Entries'])
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

test('daily anchors: choose up to 5, tick, persist, cap, auto-tick from a breathing session, all-done moment', async () => {
  const now = new Date().toISOString()
  const s = await open({ 'bp.sessions': [{ id: 'b1', createdAt: now, pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }, cycles: 6, durationSec: 100, completed: true }] }); const p = s.page
  assert.equal(await p.locator('text=Daily goals').count(), 1, 'the simple goals card shows until anchors are chosen')
  await p.click('text=Choose your daily anchors')
  await p.click('.sheet .chip >> text=Slow breathing'); await p.click('.sheet .chip >> text=Walk 10 minutes')
  await p.fill('input[placeholder="e.g. Call a friend"]', 'Call a friend'); await p.click('button:has-text("Add anchor")')
  assert.equal(await p.locator('.anchor-edit li').count(), 3)
  await p.click('.sheet .chip >> text=Drink water'); await p.click('.sheet .chip >> text=Get some sunlight')
  await p.waitForSelector('text=that’s the maximum')
  assert.equal(await p.locator('.sheet .chip').count(), 0, 'no more ideas offered at the cap'); assert.equal(await p.locator('button:has-text("Add anchor")').count(), 0)
  await p.click('[aria-label="Remove Drink water"]'); assert.equal(await p.locator('.anchor-edit li').count(), 4)
  await p.click('[aria-label="Move Walk 10 minutes up"]')
  assert.equal(await p.locator('.anchor-edit li').first().innerText().then(t => t.includes('Walk 10 minutes')), true, 'reordering works')
  await p.click('button:has-text("Done")')

  assert.equal(await p.locator('text=Daily goals').count(), 0, 'anchors replace the simple goals card')
  const box = l => p.locator(`[role=checkbox][aria-label="${l}"]`)
  await p.waitForSelector('[aria-label="1 of 4 done"]')
  assert.equal(await box('Slow breathing').getAttribute('aria-checked'), 'true'); assert.equal(await box('Slow breathing').isDisabled(), true, 'auto-ticked by today’s breathing session')
  await box('Walk 10 minutes').click(); await p.waitForSelector('[aria-label="2 of 4 done"]')
  await reload(p); await p.waitForSelector('[aria-label="2 of 4 done"]')
  await box('Walk 10 minutes').click(); await p.waitForSelector('[aria-label="1 of 4 done"]')
  await box('Walk 10 minutes').click(); await box('Call a friend').click()
  await box('Get some sunlight').click()
  await p.waitForSelector('.celebrate >> text=Every anchor done!'); await p.click('.celebrate .btn'); await p.waitForSelector('[aria-label="4 of 4 done"]')
  await p.waitForSelector('text=1 day with every anchor done')

  await tab(p, 'More'); await p.waitForSelector('.li:has-text("Daily anchors") >> text=4/5')
  await p.click('.li >> text=Daily anchors'); await p.waitForSelector('.anchor-edit li')
  await done(s)
})


test('Today card: one tap logs a mood (undo / add details), then points at what is left', async () => {
  const s = await open(); const p = s.page
  assert.equal(await p.locator('.entry').count(), 0)
  await p.click('[aria-label="Log mood: bad"]')                       // tap budget: 1 tap from the home screen
  await p.waitForSelector('.toast-row >> text=Mood logged.'); await p.waitForSelector('.entry')
  await p.waitForSelector('text=You’re all set today')
  await p.click('.toast-row >> text=Undo'); await p.waitForFunction(() => !document.querySelector('.entry'))
  await p.waitForSelector('[aria-label="Log mood: bad"]')              // asks again once the entry is undone
  await p.click('[aria-label="Log mood: awful"]'); await p.waitForSelector('.entry')
  await p.click('.toast-row >> text=Add details')                      // swaps the quick entry for the full editor, mood kept
  await p.waitForSelector('text=What’s going on?'); await p.click('button:has-text("Save")'); await p.waitForSelector('.celebrate'); await p.click('.celebrate .btn')
  await p.waitForSelector('.topbar'); assert.equal(await p.locator('.entry').count(), 1, 'quick entry was replaced, not duplicated')
  await reload(p); assert.equal(await p.locator('.entry').count(), 1)
  await done(s)
})

test('Today card follows your anchors and parked worries', async () => {
  const now = new Date().toISOString()
  const s = await open({ 'bp.thoughts': [{ id: 't1', createdAt: now, mood: 4, situation: '', thought: 'ok day', emotions: [], internalBehaviour: '', externalBehaviour: '', alternateThought: '', outcomeIntensity: null, tags: [], distortions: [], photos: [] }],
    'bp.worries': [{ id: 'w1', createdAt: now, text: 'the deadline', status: 'open', action: null, reviewedAt: null }] }); const p = s.page
  await p.waitForSelector('.today >> text=1 parked worry')
  await p.click('.today >> text=1 parked worry'); await p.waitForSelector('text=Start worry time'); await p.click('[aria-label=Back]')
  await p.click('text=Choose your daily anchors'); await p.click('.sheet .chip >> text=Walk 10 minutes'); await p.click('button:has-text("Done")')
  await p.waitForSelector('.today >> text=1 anchor left today')
  await p.click('[role=checkbox][aria-label="Walk 10 minutes"]'); await p.waitForSelector('.today >> text=1 parked worry')
  await done(s)
})

test('emotion and tag lists start short, learn what you use, and "More" / search reveal the rest', async () => {
  const mk = (i, emo) => ({ id: 'e' + i, createdAt: new Date(Date.now() - i * 864e5).toISOString(), mood: 3, situation: '', thought: 'x', emotions: [{ name: emo, intensity: 50 }], internalBehaviour: '', externalBehaviour: '', alternateThought: '', outcomeIntensity: null, tags: ['money'], distortions: [], photos: [] })
  const s = await open({ 'bp.thoughts': [mk(1, 'bored'), mk(2, 'bored'), mk(3, 'bored')] }); const p = s.page
  await p.click('.fab'); await p.click('.sheet .btn.primary >> text=Today'); await p.click('.faces button >> nth=2')
  const emo = p.locator('.card:has(h3:has-text("Emotions")) .ig'), tags = p.locator('.card:has(h3:has-text("Tags")) .ig')
  await p.waitForSelector('.card:has(h3:has-text("Emotions")) .ig'); assert.equal(await emo.count(), 6)
  assert.equal(await emo.first().innerText().then(t => t.trim().toLowerCase()), 'bored', 'your most-used emotion leads')
  assert.equal(await p.locator('.card:has(h3:has-text("Emotions")) .ig:has-text("anxious")').count(), 1, 'sensible starters are still there')
  assert.equal(await tags.count(), 6); assert.equal(await tags.first().innerText().then(t => t.trim().toLowerCase()), 'money')
  await p.click('text=/More emotions \\(\\d+\\)/'); assert.equal(await emo.count(), 19)
  await p.click('text=Show fewer'); assert.equal(await emo.count(), 6)
  await p.fill('.searchbar input', 'sad'); await p.waitForFunction(() => document.querySelectorAll('.card .ig').length > 0)
  assert.ok(await p.locator('.card:has(h3:has-text("Emotions")) .ig:has-text("sad")').count() >= 1, 'search looks through the full list')
  await done(s)
})


const ago = n => new Date(Date.now() - n * 864e5).toISOString()
const rec = (id, n, extra = {}) => ({ id, createdAt: ago(n), mood: 4, situation: '', thought: 'a thought', emotions: [{ name: 'anxious', intensity: 80 }], internalBehaviour: '', externalBehaviour: '', alternateThought: '', outcomeIntensity: null, tags: [], distortions: [], photos: [], ...extra })
const calm = (id, n, b, a) => ({ id, createdAt: ago(n), pattern: { inhale: 4, hold1: 4, exhale: 6, hold2: 0 }, cycles: 6, durationSec: 120, completed: true, kind: 'breathing', anxietyBefore: b, anxietyAfter: a })

test('Progress: skill levels, proof from your own data (with its limits), milestones', async () => {
  const fresh = await open(); await tab(fresh.page, 'Stats'); await fresh.page.click('[role=tab]:has-text("Progress")')
  await fresh.page.waitForSelector('text=Your proof appears here'); assert.equal(await fresh.page.locator('.proof').count(), 0, 'no proof is invented without data')
  assert.equal(await fresh.page.locator('.skill >> text=Not started').count(), 4)
  await done(fresh)

  const s = await open({
    'bp.thoughts': [rec('t1', 1, { alternateThought: 'b1', outcomeIntensity: 40 }), rec('t2', 2, { alternateThought: 'b2', outcomeIntensity: 30 }), rec('t3', 3, { alternateThought: 'b3', outcomeIntensity: 50 }), rec('t4', 4), rec('t5', 5), rec('t6', 6, { alternateThought: 'b6', outcomeIntensity: 20 })],
    'bp.sessions': [calm('s1', 1, 8, 4), calm('s2', 2, 7, 3), calm('s3', 3, 9, 5), calm('s4', 4, 8, 4)],
    'bp.worries': [{ id: 'w1', createdAt: ago(5), text: 'x', status: 'let-go', action: null, reviewedAt: ago(2) }, { id: 'w2', createdAt: ago(5), text: 'y', status: 'let-go', action: null, reviewedAt: ago(1) }, { id: 'w3', createdAt: ago(5), text: 'z', status: 'actionable', action: 'call', reviewedAt: ago(1) }, { id: 'w4', createdAt: ago(5), text: 'q', status: 'open', action: null, reviewedAt: null }],
    'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }); const p = s.page
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")')
  await p.waitForSelector('[aria-label="Reframing: level 2"]')          // 4 balanced thoughts -> level 2 (needs 3)
  await p.waitForSelector('[aria-label="Calming: level 2"]')            // 4 sessions
  await p.waitForSelector('[aria-label="Worry mastery: level 2"]')      // 3 processed worries (the open one doesn't count)
  await p.waitForSelector('[aria-label="Showing up: level 2"]')         // 6 active days
  assert.match(await p.locator('.skill:has-text("Reframing")').innerText(), /3 more thoughts reframed to level 3/)
  const relief = p.locator('.proof:has-text("Relief after calming")')
  assert.match(await relief.innerText(), /4 pts/); assert.match(await relief.innerText(), /After 4 rated sessions, your anxiety dropped by 4 points on average/)
  assert.equal(await relief.locator('[aria-label^="Trend"]').count(), 0, 'one window of data: no before/after trend is claimed')
  assert.match(await p.locator('.proof:has-text("Worries let go")').innerText(), /66\.7%/)
  assert.match(await p.locator('.skill:has-text("Worry mastery")').innerText(), /4 more worries processed to level 3/)
  await p.waitForSelector('.timeline >> text=Wrote your first entry'); await p.waitForSelector('.timeline >> text=Let go of your first worry'); await p.waitForSelector('.timeline >> text=Felt your first drop in anxiety')
  await p.waitForSelector('text=not a medical measure')
  assert.equal(await p.locator('.celebrate').count(), 0, 'levels you have already seen never pop up again')
  await done(s)
})

test('Progress: a real before/after trend appears only with enough data in both windows', async () => {
  const prev = [40, 41, 42, 43, 44].map((n, i) => calm('p' + i, n, 8, 6)), now = [1, 2, 3, 4, 5].map((n, i) => calm('n' + i, n, 8, 4))
  const s = await open({ 'bp.sessions': [...prev, ...now], 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }); const p = s.page
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")')
  const relief = p.locator('.proof:has-text("Relief after calming")')
  await relief.locator('[aria-label="Trend: up"]').waitFor()
  assert.match(await relief.innerText(), /4 points in the last 30 days, versus 2 in the 30 days before \(5 and 5 sessions\)/)
  await done(s)
})

test('level-up moment: celebrates a real rise with the evidence, once, and stays quiet on first run', async () => {
  const seeded = { 'bp.thoughts': [rec('a', 0, { alternateThought: 'x' }), rec('b', 0, { alternateThought: 'y' }), rec('c', 0, { alternateThought: 'z' })], 'bp.levels.seen': { calming: 0, reframing: 1, worry: 0, consistency: 1 } }
  const s = await open(seeded); const p = s.page
  await p.waitForSelector('.celebrate >> text=Reframing → Level 2'); await p.waitForSelector('.celebrate >> text=3 entries')
  await p.click('.celebrate .btn'); await p.waitForSelector('.topbar')
  await reload(p); await p.waitForTimeout(400); assert.equal(await p.locator('.celebrate').count(), 0, 'shown once')
  await done(s)
  const first = await open(); await first.page.waitForTimeout(500)    // brand-new install, nothing to celebrate
  assert.equal(await first.page.locator('.celebrate').count(), 0)
  await newEntry(first.page, { mood: 4, thought: 'first ever' }); await save(first.page)
  await first.page.waitForTimeout(400); assert.equal(await first.page.locator('.celebrate').count(), 0, 'Level 1 is recorded quietly, no second pop-up')
  await done(first)
})

test('Summary: plain-language day / week / month recap you can share', async () => {
  const s = await open({ 'bp.thoughts': [rec('a', 0, { mood: 2 }), rec('b', 1, { mood: 4, emotions: [{ name: 'happy', intensity: 60 }] }), rec('c', 3, { mood: 5, emotions: [{ name: 'happy', intensity: 60 }] })],
    'bp.sessions': [calm('s1', 1, 8, 5)], 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }); const p = s.page
  await p.evaluate(() => { navigator.share = async d => { window.__shared = d } })
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Summary")')
  const card = p.locator('.summary')
  await card.locator('text=You showed up on 3 of 7 days and wrote 3 entries.').waitFor()
  assert.match(await card.innerText(), /Feelings that came up most: happy and anxious\./); assert.match(await card.innerText(), /1 calming session \(2 minutes\), and your anxiety dropped by 3 points/)
  await p.click('[role=tab]:has-text("Today")'); await card.locator('text=You showed up on 1 of 1 day and wrote 1 entry.').waitFor()
  await p.click('[role=tab]:has-text("This month")'); await card.locator('text=of 30 days').waitFor()
  await p.click('[role=tab]:has-text("This week")'); await p.click('button:has-text("Share")')
  const shared = await p.evaluate(() => window.__shared); assert.match(shared.text, /^My week\n/); assert.match(shared.text, /• You showed up on 3 of 7 days/); assert.match(shared.text, /not medical advice/)
  await done(s)
  const quiet = await open(); await tab(quiet.page, 'Stats'); await quiet.page.click('[role=tab]:has-text("Summary")')
  await quiet.page.waitForSelector('text=Nothing logged this week — that’s okay'); await done(quiet)
})


const openJournal = async p => { await p.click('.fab'); await p.click('.sheet-item >> text=Write in journal'); await p.waitForSelector('[aria-label="Journal entry"]') }
const saveJournalEntry = async p => { await p.click('button:has-text("Save")'); await p.waitForSelector('.celebrate >> text=Saved to your journal'); await p.click('.celebrate .btn'); await p.waitForSelector('.topbar') }

test('journal: write, list, search, filter, edit, delete — and it persists', async () => {
  const s = await open(); const p = s.page
  await openJournal(p)
  await p.fill('[aria-label="Title"]', 'Quiet morning'); await p.fill('[aria-label="Journal entry"]', 'Walked by the river and felt lighter.')
  await p.waitForSelector('text=7 words'); await p.click('[aria-label="Mood: good"]'); await p.click('.chip:has-text("health")')
  await saveJournalEntry(p)
  await openJournal(p); await p.fill('[aria-label="Journal entry"]', 'Deadline stress is building.'); await p.click('.chip:has-text("work")'); await saveJournalEntry(p)

  await tab(p, 'More'); await p.waitForSelector('.li:has-text("Journal") >> text=2'); await p.click('.li >> text=Journal')
  assert.equal(await p.locator('.jentry').count(), 2)
  assert.match(await p.locator('.jentry').first().innerText(), /Deadline stress/, 'newest first')
  await p.fill('[aria-label="Search journal"]', 'river'); await p.waitForFunction(() => document.querySelectorAll('.jentry').length === 1)
  assert.match(await p.locator('.jentry').innerText(), /Quiet morning/); await p.fill('[aria-label="Search journal"]', '')
  await p.click('[role=group][aria-label="Filter by tag"] >> text=work'); await p.waitForFunction(() => document.querySelectorAll('.jentry').length === 1)
  assert.match(await p.locator('.jentry').innerText(), /Deadline/); await p.click('[role=group][aria-label="Filter by tag"] >> text=work')
  await reload(p); await tab(p, 'More'); await p.click('.li >> text=Journal'); assert.equal(await p.locator('.jentry').count(), 2, 'persists across reload')

  await p.click('.jentry:has-text("Quiet morning")')                       // edit in place
  await p.waitForSelector('[aria-label="Edit journal entry"]'); assert.equal(await p.inputValue('[aria-label="Title"]'), 'Quiet morning')
  await p.fill('[aria-label="Journal entry"]', 'Walked by the river. Better day than expected.'); await p.click('button:has-text("Save")')
  await p.waitForSelector('.jentry:has-text("Better day than expected")'); assert.equal(await p.locator('.celebrate').count(), 0, 'no celebration for an edit')
  assert.equal(await p.locator('.jentry').count(), 2, 'edited, not duplicated')

  p.once('dialog', d => d.accept())
  await p.click('.jentry:has-text("Deadline")'); await p.click('button:has-text("Delete entry")')
  await p.waitForFunction(() => document.querySelectorAll('.jentry').length === 1)
  await done(s)
})

test('journal: draft survives leaving, blank saves are refused, and text is only ever text', async () => {
  const s = await open(); const p = s.page
  await openJournal(p); await p.click('button:has-text("Save")'); await p.waitForSelector('[role=alert]:has-text("Write a few words first")')
  assert.equal(await p.locator('.celebrate').count(), 0)
  await p.click('text=Need a place to start?'); await p.waitForSelector('[role=note]')                 // today's prompt
  await p.fill('[aria-label="Journal entry"]', '<img src=x onerror="window.__pwned=1"> half a thought'); await p.waitForTimeout(700)
  await reload(p); await openJournal(p)
  await p.waitForSelector('text=Picked up where you left off'); assert.match(await p.inputValue('[aria-label="Journal entry"]'), /half a thought/)
  await p.waitForSelector('[role=note]', { timeout: 2000 })                                              // prompt restored too
  await saveJournalEntry(p)
  await openJournal(p); assert.equal(await p.inputValue('[aria-label="Journal entry"]'), '', 'draft is cleared once saved'); await p.click('[aria-label=Back]')
  await tab(p, 'More'); await p.click('.li >> text=Journal')
  assert.equal(await p.locator('.jentry img').count(), 0); assert.equal(await p.evaluate(() => window.__pwned), undefined)
  assert.match(await p.locator('.jentry').innerText(), /<img src=x/, 'shown literally')
  await done(s)
})

test('journal: crisis wording shows support, corrupted journal data is ignored, and a "write one line" anchor ticks itself', async () => {
  const bad = await open({ 'bp.journal': 'garbage' }); await bad.page.waitForSelector('.topbar'); await done(bad)

  const s = await open(); const p = s.page
  await p.click('text=Choose your daily anchors'); await p.click('.sheet .chip >> text=Write one line'); await p.click('button:has-text("Done")')
  await p.click('[aria-label="Log mood: good"]'); await p.waitForSelector('.toast-row')
  assert.equal(await p.locator('[role=checkbox][aria-label="Write one line"]').getAttribute('aria-checked'), 'false')
  await openJournal(p); await p.fill('[aria-label="Journal entry"]', 'I want to end my life')
  await p.waitForSelector('[role=alert] >> text=You don’t have to do this alone')
  await p.fill('[aria-label="Journal entry"]', 'Feeling a bit better now.'); await saveJournalEntry(p)
  await p.waitForSelector('[role=checkbox][aria-label="Write one line"][aria-checked="true"]')
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")'); await p.waitForSelector('[aria-label="Journaling: level 1"]')
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Summary")'); await p.waitForSelector('text=You wrote 1 journal entry.')
  await done(s)
})


const plan = (id, text, n = 0) => ({ id, createdAt: ago(n), text: 'worry ' + id, status: 'actionable', action: text, reviewedAt: ago(n) })
const todayEntry = () => rec('today', 0)

const middayToday = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d }
test('small step: pick a step from your worry plan, settle, focus (pause is free), finish — it counts everywhere', async () => {
  const s = await open({ 'bp.thoughts': [todayEntry()], 'bp.worries': [plan('w1', 'Email the landlord'), plan('w2', 'Book the dentist', 1)], 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }, { time: middayToday() }); const p = s.page
    await p.waitForSelector('.today >> text=A small step is waiting: Book the dentist'.replace('Book the dentist', 'Email the landlord'))   // newest plan first
  await p.click('.today .linklike'); await p.waitForSelector('[aria-label="One small step"]')
  assert.equal(await p.locator('.step-choice').count(), 2); await p.click('.step-choice:has-text("Email the landlord")')
  await p.click('[role=radio]:has-text("5 min")'); await p.click('button:has-text("Start")')
  await p.waitForSelector('button:has-text("Skip — start now")'); await p.click('button:has-text("Skip — start now")')   // the minute of calm is optional
  const clock = p.locator('[role=timer]'); await clock.waitFor(); assert.match(await clock.innerText(), /0[45]:[0-5]\d/)
  await p.clock.fastForward('02:00'); await p.waitForFunction(() => /0[23]:[0-5]\d/.test(document.querySelector('[role=timer]').textContent))
  await p.click('button:has-text("Pause")'); await p.waitForSelector('text=Paused — take as long as you need.')
  const frozen = await clock.innerText(); await p.clock.fastForward('30:00'); assert.equal(await clock.innerText(), frozen, 'a paused timer does not move, however long you wait')
  await p.click('button:has-text("Resume")'); await p.clock.fastForward('04:00')
  await p.waitForSelector('text=Done — nice.'); assert.match(await p.locator('[aria-label="One small step"] .card').innerText(), /“Email the landlord”/)
  await p.click('button:has-text("Close")')
  await p.waitForSelector('.today >> text=Book the dentist'); assert.equal(await p.locator('.today >> text=Email the landlord').count(), 0, 'a finished step leaves the list')
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")'); await p.waitForSelector('[aria-label="Small steps: level 1"]')
  await p.click('[role=tab]:has-text("Summary")'); await p.waitForSelector('text=/You finished 1 small step \\(\\d+ minutes? of focus\\)\\./')
  await done(s)
})

test('small step: stopping early is neutral and never counts as finished; your own step works', async () => {
  const s = await open({ 'bp.thoughts': [todayEntry()], 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }); const p = s.page
  assert.equal(await p.locator('.today >> text=small step').count(), 0, 'nothing is suggested without a plan')
  await p.click('.fab'); await p.click('.sheet-item >> text=Start a small step'); await p.waitForSelector('.chip:has-text("Write one sentence")')
  assert.equal(await p.isDisabled('button:has-text("Start")'), true, 'needs a step first'); await p.fill('input[placeholder^="e.g. Open"]', 'Open the tax form'); await p.click('button:has-text("Start")')
  await p.click('button:has-text("Skip — start now")'); await p.waitForSelector('[role=timer]'); await p.waitForSelector('h1:has-text("Open the tax form")')
  await p.click('button:has-text("Stop for now")'); await p.waitForSelector('text=That’s okay.'); await p.waitForSelector('text=Starting is the hard part')
  await p.click('button:has-text("Another small step")'); await p.waitForSelector('text=What’s the tiniest next step?'); await p.click('[aria-label=Close]')
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")'); await p.waitForSelector('[aria-label="Calming: level 0"]')
  assert.equal(await p.locator('.skill:has-text("Small steps")').count(), 0, 'an unfinished step earns nothing — and costs nothing')
  await reload(p); assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('bp.focus')).length), 1); assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('bp.focus'))[0].completed), false)
  await done(s)
})


const HR = 3_600_000
/** Ten mornings of Watch-style sleep segments ending at 07:00 (k days ago): alternating 8 h / 5 h nights with deep + REM stages. */
const sleepFixture = () => Array.from({ length: 10 }, (_, k) => {
  const wake = new Date(); wake.setDate(wake.getDate() - k); wake.setHours(7, 0, 0, 0)
  const hours = k % 2 === 0 ? 8 : 5, end = wake.getTime(), start = end - hours * HR, seg = (kind, a, b) => ({ kind, start: a, end: b })
  return [seg('core', start, start + HR), seg('deep', start + HR, start + 2 * HR), seg('core', start + 2 * HR, end - 2.5 * HR), seg('rem', end - 2.5 * HR, end - HR), seg('core', end - HR, end)]
}).flat()
const moodAfterSleep = () => Array.from({ length: 10 }, (_, k) => rec('m' + k, k, { mood: k % 2 === 0 ? 4 : 2, createdAt: (() => { const d = new Date(); d.setDate(d.getDate() - k); d.setHours(12, 0, 0, 0); return d.toISOString() })() }))
const openSleep = async p => { await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Sleep")') }

test('iPhone app: sleep from Apple Health — opt-in, read-only, last night + week + consistency + sleep/mood link', async () => {
  const s = await open({ 'bp.thoughts': moodAfterSleep(), 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }, { native: true }); const p = s.page
  await p.evaluate(segments => { window.__reply = { ...(window.__reply ?? {}), 'Mindful.readSleep': { segments } } }, sleepFixture())
  await openSleep(p)
  await p.waitForSelector('text=Connect Apple Health sleep'); assert.equal((await calls(p, 'Mindful', 'readSleep')).length, 0, 'nothing is read until you opt in')
  assert.match(await p.locator('.card:has-text("Show your sleep")').innerText(), /only sleep/)
  await p.click('button:has-text("Connect Apple Health sleep")')
  await p.waitForSelector('[aria-label="Last night"] >> text=8h 00m')
  assert.equal((await calls(p, 'Mindful', 'requestSleepAuthorization')).length, 1)
  const read = (await calls(p, 'Mindful', 'readSleep'))[0].options; assert.ok(read.to - read.from >= 44 * 864e5 && read.to - read.from <= 46 * 864e5, 'asks for about six weeks')
  const card = p.locator('[aria-label="Last night"]'); const text = await card.innerText()
  assert.match(text, /Apple Health/); assert.match(text, /Deep 1h 00m/); assert.match(text, /REM 1h 30m/); assert.match(text, /Core 5h 30m/)
  assert.equal(await p.locator('.sleep-bars [role=listitem]').count(), 7)
  assert.match(await p.locator('.card:has-text("On average you slept")').innerText(), /On average you slept 6h 43m/, '4 nights of 8 h and 3 of 5 h')
  assert.match(await p.locator('.card:has-text("Your bedtime varies")').innerText(), /varies by about \d+ minutes/)
  assert.match(await p.locator('[aria-label="Sleep and mood"]').innerText(), /tended to be higher/)
  assert.equal(await p.evaluate(() => localStorage.getItem('bp.sleep.health')), '1')

  await reload(p); await openSleep(p); await p.waitForSelector('[aria-label="Last night"] >> text=8h 00m')      // cached, and still connected
  await p.evaluate(() => { window.__reply = { 'Mindful.readSleep': { __reject: 'X', message: 'denied' } } })
  await p.click('button:has-text("Refresh")'); await p.waitForSelector('text=Could not read Apple Health right now.'); await p.waitForSelector('[aria-label="Last night"] >> text=8h 00m')   // keeps what it had
  await p.click('button:has-text("Disconnect")'); await p.waitForSelector('text=Connect Apple Health sleep'); await p.waitForSelector('[aria-label="Last night"] >> text=No sleep logged yet')
  assert.equal(await p.evaluate(() => localStorage.getItem('bp.sleep.health')), null)
  await done(s)
})

test('sleep: log a night by hand (web), it persists, bad times are refused, and measured data wins over a hand-logged night', async () => {
  const s = await open({ 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }); const p = s.page
  await openSleep(p)
  assert.equal(await p.locator('text=Connect Apple Health sleep').count(), 0, 'no Health on the web')
  await p.fill('[aria-label=Bedtime]', '23:30'); await p.fill('[aria-label="Woke up"]', '07:15'); await p.click('[aria-label="Rested: good"]'); await p.click('button:has-text("Save night")')
  await p.waitForSelector('[aria-label="Last night"] >> text=7h 45m'); assert.match(await p.locator('[aria-label="Last night"]').innerText(), /logged by hand/)
  await reload(p); await openSleep(p); await p.waitForSelector('[aria-label="Last night"] >> text=7h 45m')
  await p.fill('[aria-label=Bedtime]', '08:00'); await p.fill('[aria-label="Woke up"]', '07:00'); await p.click('button:has-text("Save night")')
  await p.waitForSelector('text=That doesn’t look like one night'); assert.match(await p.locator('[aria-label="Last night"]').innerText(), /7h 45m/, 'a refused entry changes nothing')
  await p.click('[aria-label^="Delete night"]'); await p.waitForSelector('[aria-label="Last night"] >> text=No sleep logged yet'); await done(s)

  const n = await open({ 'bp.sleep.manual': [], 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }, { native: true }); const q = n.page
  await q.evaluate(segments => { window.__reply = { 'Mindful.readSleep': { segments } } }, sleepFixture())
  await openSleep(q); await q.fill('[aria-label=Bedtime]', '23:00'); await q.fill('[aria-label="Woke up"]', '05:00'); await q.click('button:has-text("Save night")')
  await q.waitForSelector('[aria-label="Last night"] >> text=6h 00m')
  await q.click('button:has-text("Connect Apple Health sleep")'); await q.waitForSelector('[aria-label="Last night"] >> text=8h 00m')
  assert.match(await q.locator('[aria-label="Last night"]').innerText(), /Apple Health/, 'the measured night replaces the hand-logged one for the same morning')
  await done(n)
})

test('sleep shows up in the weekly summary', async () => {
  const s = await open({ 'bp.sleep.manual': [{ date: new Date().toISOString().slice(0, 10), start: Date.now() - 8 * HR, end: Date.now(), asleepMin: 450, inBedMin: 450, awakeMin: 0, deepMin: 0, remMin: 0, coreMin: 0, unspecifiedMin: 450, efficiency: null, source: 'manual', quality: null }], 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }); const p = s.page
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Summary")'); await p.waitForSelector('text=You slept 7h 30m on average (1 night with sleep data).')
  await done(s)
})


const seenAll = { 'bp.levels.seen': { calming: 99, reframing: 99, worry: 99, consistency: 99 } }
const noon = n => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(12, 0, 0, 0); return d.toISOString() }
const entriesOn = (day, count) => Array.from({ length: count }, (_, i) => rec(`c${day}-${i}`, 0, { createdAt: new Date(new Date(noon(day)).getTime() + i * 60_000).toISOString() }))

test('coins: derived from your own activity with daily caps, shown in More and the wallet', async () => {
  const s = await open({ 'bp.thoughts': [...entriesOn(0, 4), ...entriesOn(1, 3), ...entriesOn(2, 3)], ...seenAll }); const p = s.page   // 4 today (cap 3), 3 yesterday, 3 the day before
  await tab(p, 'More'); await p.waitForSelector('.li:has-text("Coins") >> text=55')   // 3 days x 15 (cap) + 10 for the 3-day streak
  await p.click('.li >> text=Coins'); await p.waitForSelector('[aria-label="55 coins"]')
  await p.waitForSelector('text=+25 earned today.'); assert.match(await p.locator('.card:has-text("Recently")').innerText(), /Today: .*Check-ins/)
  assert.match(await p.locator('.card:has-text("Recently")').innerText(), /3-day streak/)
  assert.equal(await p.locator('.card:has-text("How you earn them")').count(), 1)
  await done(s)
  const fresh = await open({ 'bp.purchases': 'garbage', 'bp.theme': 7, ...seenAll }); await tab(fresh.page, 'More'); await fresh.page.waitForSelector('.li:has-text("Coins") >> text=0'); await done(fresh)
})

test('coins: unlock a theme, it applies and persists, you can switch back; what you can’t afford says why', async () => {
  const s = await open({ 'bp.thoughts': [...entriesOn(0, 3), ...entriesOn(1, 3), ...entriesOn(2, 3)], ...seenAll }); const p = s.page
  const accent = () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase())
  assert.equal(await accent(), '#35d07f')
  await tab(p, 'More'); await p.click('.li >> text=Coins')
  assert.equal(await p.locator('.shop-item:has-text("Sunset") button.primary').isDisabled(), false); await p.click('.shop-item:has-text("Ocean") button.primary')
  await p.waitForSelector('text=Ocean unlocked and switched on.'); await p.waitForSelector('[aria-label="15 coins"]'); assert.equal(await accent(), '#4aa8ff')
  await p.waitForSelector('.shop-item:has-text("Ocean") >> text=In use — tap to switch back')
  assert.equal(await p.locator('.shop-item:has-text("Sunset") button.primary').isDisabled(), true); await p.waitForSelector('.shop-item:has-text("Sunset") >> text=You need 25 more coins.')
  assert.equal(await p.locator('.shop-item:has-text("My treat") button.primary').isDisabled(), true)
  await reload(p); assert.equal(await accent(), '#4aa8ff', 'the theme persists')
  await tab(p, 'More'); await p.click('.li >> text=Coins'); await p.click('.shop-item:has-text("Ocean") button:has-text("In use")'); assert.equal(await accent(), '#35d07f')
  await p.waitForSelector('.shop-item:has-text("Ocean") >> text=Use this colour'); await p.click('.shop-item:has-text("Ocean") button:has-text("Use this colour")'); assert.equal(await accent(), '#4aa8ff', 'owned, so switching back and forth is free')
  assert.equal(await p.locator('[aria-label="15 coins"]').count(), 1)
  await done(s)
  // a theme id in storage that you never bought does nothing
  const t = await open({ 'bp.theme': 'theme-berry', ...seenAll }); assert.equal(await t.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase()), '#35d07f'); await done(t)
})

test('coins: a rest day covers a missed day so your streak keeps going (bought in the shop)', async () => {
  const s = await open({ 'bp.thoughts': [...entriesOn(0, 3), ...entriesOn(2, 3), ...entriesOn(3, 3)], ...seenAll }); const p = s.page      // nothing yesterday
  await p.waitForSelector('[aria-label="1 day streak"]')
  await tab(p, 'More'); await p.click('.li >> text=Coins'); await p.waitForSelector('[aria-label="45 coins"]')
  await p.selectOption('[aria-label="Day to cover"]', { label: 'Yesterday' }); await p.click('.shop-item:has-text("Rest day") button.primary')
  await p.waitForSelector('text=Rest day added'); await p.waitForSelector('[aria-label="25 coins"]')       // -30, and +10 for the 3-day streak it creates
  await p.waitForSelector('.shop-item:has-text("Rest day") >> text=You need 5 more coins.'); assert.equal(await p.locator('.shop-item:has-text("Rest day") button.primary').isDisabled(), true, 'not enough coins left for another')
  await tab(p, 'Entries'); await p.waitForSelector('[aria-label="4 day streak"]')
  await reload(p); await p.waitForSelector('[aria-label="4 day streak"]')
  await done(s)
})

test('coins: a treat you name yourself, and a quiet +N when you earn', async () => {
  const s = await open({ 'bp.thoughts': [...entriesOn(1, 3), ...entriesOn(2, 3), ...entriesOn(3, 3)], ...seenAll }); const p = s.page  // 45 + 10 (3-day streak) = 55
  await tab(p, 'More'); await p.click('.li >> text=Coins')
  assert.equal(await p.locator('.shop-item:has-text("My treat") button.primary').isDisabled(), true); await p.waitForSelector('.shop-item:has-text("My treat") >> text=Name your treat first.')
  await p.fill('input[placeholder^="e.g. A coffee"]', 'A long walk in the sun'); await p.click('.shop-item:has-text("My treat") button.primary')
  await p.waitForSelector('text=Treat saved. Go enjoy it!'); await p.waitForSelector('.card:has-text("Your treats") >> text=A long walk in the sun'); await p.waitForSelector('[aria-label="30 coins"]')
  assert.equal(await p.locator('.coin-toast').count(), 0, 'spending never pops a toast')
  await tab(p, 'Entries'); await p.click('[aria-label="Log mood: good"]'); await p.waitForSelector('.coin-toast >> text=+5 coins')
  await done(s)
  const f = await open(seenAll); await f.page.waitForTimeout(600); assert.equal(await f.page.locator('.coin-toast').count(), 0, 'no toast on load'); await done(f)
})


const until = async (fn, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return; await new Promise(r => setTimeout(r, 100)) } throw new Error(`timed out waiting for: ${fn}`) }
const hasDoc = (acct, kind) => [...acct.rows.keys()].some(k => k.startsWith(kind + '|'))
const bodyOf = (acct, kind) => [...acct.rows.values()].find(r => r.kind === kind && !r.deleted)?.data?.body
const moreRoot = async p => { await tab(p, 'More'); if (await p.locator('.topbar [aria-label=Back]').count()) await p.click('.topbar [aria-label=Back]') }
const syncNowUi = async p => { await moreRoot(p); await p.click('.li >> text=Account'); await p.click('button:has-text("Sync now")'); await p.waitForSelector('[aria-label="Sync status"] >> text=/Everything is saved|Couldn’t reach/') }
const openJournalList = async p => { await moreRoot(p); await p.click('.li >> text=Journal') }

test('cloud sync: what you write on one device appears on another; edits and deletes follow', async () => {
  const account = fakeAccount()
  const A = await openCloud({ signedIn: true, account, seed: seenAll }); const a = A.page
  await openJournal(a); await a.fill('[aria-label=Title]', 'From my phone'); await a.fill('[aria-label="Journal entry"]', 'Written on device A'); await saveJournalEntry(a)
  await a.click('text=Choose your daily anchors'); await a.click('.sheet .chip >> text=Drink water'); await a.click('button:has-text("Done")')
  await until(() => hasDoc(account, 'journal') && hasDoc(account, 'anchor'))
  assert.ok(account.rows.has('rituals|all'), 'settings sync too')
  for (const r of account.rows.values()) assert.equal(r.deleted, r.data === null, 'the shape the real table accepts')

  const B = await openCloud({ signedIn: true, account, seed: seenAll }); const b = B.page      // a second device, empty
  await tab(b, 'More'); await b.waitForSelector('.li:has-text("Journal") >> text=1')
  await b.click('.li >> text=Journal'); await b.waitForSelector('.jentry:has-text("Written on device A")'); await b.click('[aria-label=Back]')
  await tab(b, 'Entries'); await b.waitForSelector('[role=checkbox][aria-label="Drink water"]')

  await openJournalList(a); await a.click('.jentry'); await a.fill('[aria-label="Journal entry"]', 'Edited on device A'); await a.click('button:has-text("Save")')
  await until(() => bodyOf(account, 'journal') === 'Edited on device A')
  await syncNowUi(b); await b.click('[aria-label=Back]'); await b.click('.li >> text=Journal'); await b.waitForSelector('.jentry:has-text("Edited on device A")')
  assert.equal(await b.locator('.jentry').count(), 1, 'edited, not duplicated')

  a.once('dialog', d => d.accept()); await a.click('.jentry'); await a.click('button:has-text("Delete entry")')
  await until(() => [...account.rows.values()].some(r => r.kind === 'journal' && r.deleted))
  await syncNowUi(b); await b.click('[aria-label=Back]'); await b.click('.li >> text=Journal'); await b.waitForSelector('text=Nothing here yet')
  await done(A); await done(B)
})

test('cloud sync: offline changes wait safely and sync later; the later edit wins a conflict', async () => {
  const account = fakeAccount()
  const A = await openCloud({ signedIn: true, account, seed: seenAll }), B = await openCloud({ signedIn: true, account, seed: seenAll }); const a = A.page, b = B.page
  await openJournal(a); await a.fill('[aria-label="Journal entry"]', 'first draft'); await saveJournalEntry(a)
  await until(() => bodyOf(account, 'journal') === 'first draft')
  await syncNowUi(b); await b.click('[aria-label=Back]'); await b.click('.li >> text=Journal'); await b.waitForSelector('.jentry:has-text("first draft")')

  account.down = true                                                                  // device A loses its connection
  await openJournalList(a); await a.click('.jentry'); await a.fill('[aria-label="Journal entry"]', 'A edit while offline'); await a.click('button:has-text("Save")')
  await moreRoot(a); await a.click('.li >> text=Account')
  await a.waitForSelector('[aria-label="Sync status"] >> text=/safe on this device/', { timeout: 15000 })
  assert.equal(bodyOf(account, 'journal'), 'first draft', 'nothing reached the server')
  await a.click('[aria-label=Back]'); await a.click('.li >> text=Journal'); await a.waitForSelector('.jentry:has-text("A edit while offline")')   // still there, still works
  account.down = false; await syncNowUi(a)
  await until(() => bodyOf(account, 'journal') === 'A edit while offline')

  await b.waitForTimeout(30)                                                           // B edits later, from its older copy
  await b.click('[aria-label=Back]'); await b.click('.li >> text=Journal'); await b.click('.jentry'); await b.fill('[aria-label="Journal entry"]', 'B edit, made later'); await b.click('button:has-text("Save")')
  await syncNowUi(b); await until(() => bodyOf(account, 'journal') === 'B edit, made later')
  await syncNowUi(a); await a.click('[aria-label=Back]'); await a.click('.li >> text=Journal'); await a.waitForSelector('.jentry:has-text("B edit, made later")')
  assert.equal(await a.locator('.jentry').count(), 1, 'one entry on both, the later edit won')
  await done(A); await done(B)
})

test('cloud sync: data that predates sync is pushed on first sign-in; sign-out clears this device (and warns about unsynced changes)', async () => {
  const account = fakeAccount()
  const entry = { id: 'old-j', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), title: 'Older entry', body: 'written before sync existed', mood: null, tags: [], prompt: null }
  const A = await openCloud({ signedIn: true, account, seed: { ...seenAll, 'bp.journal': [entry], 'bp.purchases': [{ id: 'p-old', itemId: 'treat', at: new Date().toISOString(), cost: 25, note: 'tea' }] } }); const a = A.page
  await until(() => hasDoc(account, 'journal') && hasDoc(account, 'purchase')); assert.equal(account.rows.get('journal|old-j').data.title, 'Older entry')

  account.down = true; await openJournal(a); await a.fill('[aria-label="Journal entry"]', 'not synced yet'); await saveJournalEntry(a)
  await moreRoot(a); await a.click('.li >> text=Account'); await a.waitForSelector('[aria-label="Sync status"] >> text=/safe on this device/', { timeout: 15000 })
  let message = ''; a.once('dialog', d => { message = d.message(); d.dismiss() }); await a.click('button:has-text("Sign out")')
  await until(() => message !== ''); assert.match(message, /haven’t been saved|hasn’t been saved/); await a.waitForSelector('.topbar')
  assert.ok(await a.evaluate(() => (JSON.parse(localStorage.getItem('bp.journal') ?? '[]')).length) >= 2, 'declining keeps your data on the device')

  account.down = false; await a.click('[aria-label="Sync status"] >> button:has-text("Sync now")'); await a.waitForSelector('[aria-label="Sync status"] >> text=Everything is saved')
  await a.click('button:has-text("Sign out")'); await a.waitForSelector('form.card')
  for (const k of ['bp.journal', 'bp.purchases', 'bp.sync.meta', 'bp.anchors', 'bp.rituals']) assert.equal(await a.evaluate(key => localStorage.getItem(key), k), null, `${k} is cleared on sign-out`)
  assert.equal(await a.evaluate(() => document.documentElement.style.getPropertyValue('--accent')), '', 'theme reset')
  await done(A)
})


test('first run: three skippable screens, picks your first anchors, and never shows to someone who already uses the app', async () => {
  const s = await open(null, { onboarding: true }); const p = s.page
  await p.waitForSelector('[aria-label="Welcome to Brain Pal"]'); await p.waitForSelector('text=A calm place to check in'); assert.match(await p.locator('.onboarding').innerText(), /self-help tool, not medical care/)
  await p.click('button:has-text("Next")'); await p.waitForSelector('text=Your data stays yours'); assert.match(await p.locator('.onboarding').innerText(), /No ads, no tracking/)
  await p.click('button:has-text("Next")'); await p.waitForSelector('text=Pick up to three daily anchors')
  for (const l of ['Slow breathing', 'Walk 10 minutes', 'Get some sunlight', 'Write one line']) await p.click(`.onboarding .chip:has-text("${l}")`)
  assert.equal(await p.locator('.onboarding .chip.on').count(), 3, 'at most three')
  await p.click('button:has-text("Start")'); await p.waitForSelector('.topbar'); await p.waitForSelector('[role=checkbox][aria-label="Slow breathing"]')
  assert.equal(await p.locator('[role=checkbox]').count(), 3); assert.equal(await p.evaluate(() => !!localStorage.getItem('bp.onboarded')), true)
  await reload(p); assert.equal(await p.locator('.onboarding').count(), 0, 'shown once')
  await done(s)
  const skip = await open(null, { onboarding: true }); await skip.page.waitForSelector('.onboarding'); await skip.page.click('button:has-text("Skip")'); await skip.page.waitForSelector('.topbar')
  assert.equal(await skip.page.locator('[role=checkbox]').count(), 0, 'skipping adds nothing'); await done(skip)
  const existing = await open({ 'bp.thoughts': [rec('t', 1)] }, { onboarding: true }); await existing.page.waitForSelector('.topbar'); assert.equal(await existing.page.locator('.onboarding').count(), 0, 'people with data never see it')
  assert.equal(await existing.page.evaluate(() => !!localStorage.getItem('bp.onboarded')), true); await done(existing)
})

test('reduced motion: no entrance animations or long transitions', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const page = await ctx.newPage()
  await ctx.addInitScript(() => localStorage.setItem('bp.onboarded', '1')); await page.goto(URL_); await page.waitForSelector('.topbar')
  await page.click('.fab'); await page.waitForSelector('.sheet')
  const ms = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('.sheet')); return [parseFloat(cs.animationDuration) * (cs.animationDuration.endsWith('ms') ? 1 : 1000), parseFloat(getComputedStyle(document.querySelector('.fab')).transitionDuration) * 1000] })
  assert.ok(ms[0] < 5 && ms[1] < 5, `animations/transitions are effectively off: ${ms}`)
  await ctx.close()
  const normal = await browser.newContext({ viewport: { width: 390, height: 844 } }); const q = await normal.newPage()
  await normal.addInitScript(() => localStorage.setItem('bp.onboarded', '1')); await q.goto(URL_); await q.waitForSelector('.topbar'); await q.click('.fab'); await q.waitForSelector('.sheet')
  assert.ok(await q.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.sheet')).animationDuration) > 0.1), 'still animated by default'); await normal.close()
})


test('tap targets: every control is big enough to hit (>= 24 px, primary controls >= 44 px)', async () => {
  const s = await open({ 'bp.thoughts': [rec('t', 0)], 'bp.worries': [plan('w1', 'Email the landlord')] }); const p = s.page
  const small = []
  const scan = async label => small.push(...await p.evaluate(label => [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=checkbox], [role=switch], [role=tab], [role=radio]')].filter(el => {
    const r = el.getBoundingClientRect(), st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && r.bottom > 0 && r.top < innerHeight
  }).map(el => {
    const r = el.getBoundingClientRect(), primary = el.matches('.btn, .tab, .fab, .quickmood button, .anchor-item, .li, [role=tab], [role=switch]')
    const min = primary ? 44 : 24, w = Math.round(r.width), h = Math.round(r.height)
    return (el.matches('[role=switch]') ? h < 28 : (primary ? h < min : Math.min(w, h) < min)) || (!el.matches('[role=switch], input, textarea, select, .chip, .linkbtn') && Math.max(w, h) < 24) ? `${label}: ${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}" ${w}x${h}` : null
  }).filter(Boolean), label))
  await scan('Entries'); for (const t of ['Stats', 'Calendar', 'Breathe', 'More']) { await tab(p, t); await p.waitForTimeout(120); await scan(t) }
  await p.click('.fab'); await p.waitForSelector('.sheet'); await scan('menu'); await p.click('.sheet-wrap', { position: { x: 5, y: 5 } })
  await newEntry(p, { mood: 3 }); await scan('editor')
  if (small.length) console.log('    too small:\n      ' + [...new Set(small)].join('\n      '))
  assert.deepEqual([...new Set(small)], [], 'controls that are too small to tap comfortably')
  await done(s)
})


test('SOS flow records relief and Stats reflects it; breathing session logs', async () => {
  const s = await open(); const p = s.page
  // support options are one tap away from the very first SOS screen, and don't disturb the flow
  await p.click('.sos-card'); await p.click('text=Need more support right now?'); await p.waitForSelector('text=You don’t have to do this alone'); await p.waitForSelector('a[href="tel:988"]')
  await p.click('text=Hide support options'); await p.click('[aria-label=Close]')
  await p.click('.sos-card'); await p.fill('input[type=range]', '8'); await p.click('text=Continue'); await p.click('.tool >> text=Slow breathing')
  await p.waitForTimeout(11000); await p.click('text=End session')
  await p.fill('input[type=range]', '3'); await p.click('button:has-text("Save")'); await p.waitForSelector('text=Down 5 points')
  await p.click('button:has-text("One small step")'); await p.waitForSelector('text=What’s the tiniest next step?'); await p.click('[aria-label="One small step"] [aria-label=Close]'); await p.waitForSelector('text=Down 5 points')   // offered after relief, result kept
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
  const raw = await calls(p, 'Haptics', 'impact'), t0 = raw[0].at
  const impacts = raw.slice(0, 4).map(c => c.options.style)
  assert.deepEqual(impacts, ['LIGHT', 'MEDIUM', 'MEDIUM', 'HEAVY'], 'inhale swells light → heavy; calls: ' + JSON.stringify(raw.map(c => [c.options.style, c.at - t0])))
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

const scheduled = p => p.evaluate(() => {
  const last = window.__native.filter(c => c.plugin === 'LocalNotifications' && c.method === 'schedule').at(-1)
  return last ? last.options.notifications.map(n => ({ id: n.id, h: new Date(n.schedule.at).getHours(), m: new Date(n.schedule.at).getMinutes(), dow: new Date(n.schedule.at).getDay(), route: n.extra && n.extra.route, title: n.title, day: new Date(n.schedule.at).toDateString() })) : null
})
// notifications still to come from one daily ritual at h:m, from the browser's own clock
const remainingToday = (p, h, m) => p.evaluate(([h, m]) => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() < h * 60 + m ? 1 : 0 }, [h, m])

test('iPhone app: rituals — breathe at 07:00 and at night are scheduled on-device, adjustable, and quiet once done', async () => {
  const s = await open(null, { native: true }); const p = s.page
  await tab(p, 'More'); await p.waitForSelector('.li:has-text("Reminders") >> text=Off'); await p.click('.li >> text=Reminders')
  for (const l of ['Morning breathe', 'Evening breathe', 'Daily check-in', 'Anchors nudge']) await p.waitForSelector(`[role=switch][aria-label="${l}"]`)
  assert.equal(await p.locator('input[type=time]').count(), 0, 'times only show for rituals you turn on')

  await p.click('[role=switch][aria-label="Morning breathe"]')
  assert.equal((await calls(p, 'LocalNotifications', 'requestPermissions')).length, 1)
  await p.waitForFunction(() => window.__native.some(c => c.method === 'schedule'))
  const todayMorning = await remainingToday(p, 7, 0)
  let batch = await scheduled(p)
  assert.equal(batch.length, 13 + todayMorning); assert.ok(batch.every(n => n.h === 7 && n.m === 0 && n.route === 'breathe' && n.title === 'A slow minute'))
  assert.ok(batch.every(n => n.id >= 8000 && n.id < 8020), 'morning ritual ids live in their own block'); assert.equal(new Set(batch.map(n => n.id)).size, batch.length)

  await p.click('[role=switch][aria-label="Evening breathe"]'); await p.waitForFunction(() => window.__native.filter(c => c.method === 'schedule').length >= 2)
  const todayEvening = await remainingToday(p, 21, 30)
  batch = await scheduled(p)
  assert.equal(batch.length, 13 + todayMorning + 13 + todayEvening); assert.ok(batch.some(n => n.h === 21 && n.m === 30))
  assert.deepEqual(batch.map(n => n.id).filter(id => id >= 8020 && id < 8040).length, 13 + todayEvening)

  await p.fill('input[aria-label="Morning breathe time"]', '07:45'); await p.waitForFunction(() => window.__native.filter(c => c.method === 'schedule').length >= 3)
  batch = await scheduled(p); assert.ok(batch.filter(n => n.id < 8020).every(n => n.h === 7 && n.m === 45)); assert.ok(batch.filter(n => n.id >= 8020).every(n => n.h === 21 && n.m === 30), 'other rituals are untouched')
  await p.click('[role=group][aria-label="Morning breathe days"] >> [aria-label=Saturday]'); await p.click('[role=group][aria-label="Morning breathe days"] >> [aria-label=Sunday]')
  await p.waitForFunction(() => window.__native.filter(c => c.method === 'schedule').length >= 5)
  batch = await scheduled(p); assert.ok(batch.filter(n => n.id < 8020).every(n => ![0, 6].includes(n.dow)), 'weekdays only now')
  // can't switch every day off
  for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) await p.click(`[role=group][aria-label="Morning breathe days"] >> [aria-label=${d}]`)
  assert.equal(await p.locator('[role=group][aria-label="Morning breathe days"] [aria-pressed=true]').count(), 1, 'at least one day stays on')

  await reload(p); await tab(p, 'More'); await p.waitForSelector('.li:has-text("Reminders") >> text=2 on')      // persisted
  await p.click('.li >> text=Reminders'); assert.equal(await p.inputValue('input[aria-label="Morning breathe time"]'), '07:45')
  await p.click('[role=switch][aria-label="Morning breathe"]'); await p.click('[role=switch][aria-label="Evening breathe"]')
  await p.waitForFunction(() => window.__native.filter(c => c.method === 'cancel').length >= 3)
  await done(s)
})

test('iPhone app: a ritual is skipped for today once you have done it (check-in, evening breathe) — but not the others', async () => {
  const afternoon = new Date(); afternoon.setHours(14, 0, 0, 0)                       // an afternoon session today -> the evening ritual is redundant, the morning one is not
  const every = [0, 1, 2, 3, 4, 5, 6]
  const s = await open({ 'bp.thoughts': [rec('t', 0)], 'bp.sessions': [{ ...calm('s', 0, 6, 3), createdAt: afternoon.toISOString() }],
    'bp.rituals': [{ id: 'anchors', hour: 23, minute: 56, days: every, enabled: true }, { id: 'evening-breathe', hour: 23, minute: 58, days: every, enabled: true }, { id: 'checkin', hour: 23, minute: 59, days: every, enabled: true }] }, { native: true, time: (() => { const t = new Date(); t.setHours(10, 0, 0, 0); return t })() }); const p = s.page
  await p.waitForFunction(() => window.__native.some(c => c.method === 'schedule'))
  const batch = await scheduled(p), slot = i => batch.filter(n => n.id >= 8000 + i * 20 && n.id < 8020 + i * 20)
  // slots follow the default order: morning 0, evening 1, check-in 2, anchors 3
  assert.equal(slot(3).length, 14, 'anchors nudge: the anchors aren’t all done, so tonight’s still stands')
  assert.equal(slot(1).length, 13, 'evening breathe: you already breathed this afternoon, today is skipped'); assert.equal(slot(2).length, 13, 'check-in: you already checked in, today is skipped')
  assert.notEqual(slot(1)[0].day, slot(3)[0].day, 'the skipped ritual starts tomorrow')
  await done(s)
})

test('iPhone app: tapping a reminder opens the matching tool; unknown targets are ignored', async () => {
  const s = await open(null, { native: true }); const p = s.page
  const fire = route => p.evaluate(r => window.__fire('LocalNotifications', 'localNotificationActionPerformed', { notification: { extra: { route: r } } }), route)
  await fire('breathe'); await p.waitForSelector('.tab[aria-current=true]:has-text("Breathe")')
  await fire('checkin'); await p.waitForSelector('.tab[aria-current=true]:has-text("Entries")')
  await fire('journal'); await p.waitForSelector('[aria-label="Journal entry"]'); await p.click('[aria-label=Back]')
  await fire('https://evil.example'); await fire('<script>'); await p.waitForTimeout(300)
  assert.equal(await p.locator('[aria-label="Journal entry"]').count(), 0); assert.equal(await p.locator('.tab[aria-current=true]:has-text("Entries")').count(), 1, 'unknown routes do nothing')
  await done(s)
})

test('iPhone app: an existing daily reminder carries over as the check-in ritual', async () => {
  const s = await open({ 'bp.reminder': { enabled: true, hour: 9 } }, { native: true }); const p = s.page
  await tab(p, 'More'); await p.waitForSelector('.li:has-text("Reminders") >> text=1 on'); await p.click('.li >> text=Reminders')
  assert.equal(await p.getAttribute('[role=switch][aria-label="Daily check-in"]', 'aria-checked'), 'true'); assert.equal(await p.inputValue('input[aria-label="Daily check-in time"]'), '09:00')
  assert.equal(await p.getAttribute('[role=switch][aria-label="Morning breathe"]', 'aria-checked'), 'false')
  await p.waitForFunction(() => window.__native.some(c => c.method === 'schedule')); const batch = await scheduled(p)
  assert.ok(batch.every(n => n.h === 9 && n.route === 'checkin'))
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

/* ---------- accounts (Supabase fully mocked: no network, no real project) ---------- */
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const JWT = `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: 'u1', role: 'authenticated', aud: 'authenticated', exp: 4102444800 })}.sig`
const USER = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'a@b.co', app_metadata: {}, user_metadata: { name: 'Ada' }, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: JWT, refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: USER }

const DOC_KINDS = ['journal', 'anchor', 'anchor_check', 'focus', 'manual_night', 'purchase', 'rituals', 'theme']
/** A fake `user_docs` table shared by every "device" that is given the same object. It enforces the same rules as the real table. */
const fakeAccount = () => ({ rows: new Map(), down: false, posts: 0 })
async function openCloud({ providers = { email: true, google: true, apple: true }, native = false, reply, signedIn = false, account = null, seed = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const seen = { token: [], authorize: [] }
  await ctx.route('http://127.0.0.1:9/**', route => {
    const req = route.request(), url = new URL(req.url())
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    const json = (o, status = 200) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(o) })
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.pathname === '/auth/v1/settings') return json({ external: providers, disable_signup: false, mailer_autoconfirm: true })
    if (url.pathname === '/auth/v1/authorize') { seen.authorize.push(url.searchParams); return route.fulfill({ status: 200, headers: cors, contentType: 'text/html', body: 'provider page' }) }
    if (url.pathname === '/auth/v1/token') { seen.token.push({ grant: url.searchParams.get('grant_type'), body: JSON.parse(req.postData() ?? '{}') }); return json(SESSION) }
    if (url.pathname === '/auth/v1/user') return json(USER)
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: cors })
    if (url.pathname === '/rest/v1/user_docs' && account) {
      if (account.down) return route.abort('failed')
      if (req.method() === 'GET') return json([...account.rows.values()])
      if (req.method() === 'POST') {
        const rows = JSON.parse(req.postData() ?? '[]'); account.posts++
        for (const r of rows) {                       // mirror the table's CHECK constraints
          if (!DOC_KINDS.includes(r.kind) || !r.id || r.id.length > 100 || r.deleted !== (r.data === null) || (r.data !== null && JSON.stringify(r.data).length >= 32768) || r.user_id !== USER.id)
            return json({ code: '23514', message: 'violates check constraint' }, 400)
        }
        for (const r of rows) account.rows.set(`${r.kind}|${r.id}`, r)
        return route.fulfill({ status: 201, headers: cors, contentType: 'application/json', body: '' })
      }
    }
    if (url.pathname.startsWith('/rest/v1/')) return json([])
    return json({})
  })
  if (native) {
    await ctx.addInitScript(nativeStub)
    if (reply) await ctx.addInitScript(r => { window.__reply = r }, reply)
  }
  await ctx.addInitScript(() => { try { localStorage.setItem('bp.onboarded', '1') } catch { /* ignore */ } })
  if (signedIn) await ctx.addInitScript(sess => { if (!localStorage.getItem('sb-127-auth-token')) localStorage.setItem('sb-127-auth-token', JSON.stringify(sess)) }, SESSION)
  if (seed) await ctx.addInitScript(v => { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); for (const [a, b] of Object.entries(v)) localStorage.setItem(a, JSON.stringify(b)) } }, seed)
  const page = await ctx.newPage(); const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()) })
  await page.goto('http://localhost:4177'); await page.waitForSelector(signedIn ? '.topbar' : 'form.card')
  opened.push(page)
  return { ctx, page, errors, seen }
}

test('sign-in screen only offers Google / Apple when Supabase has them switched on', async () => {
  const both = await openCloud(); const p = both.page
  await p.waitForSelector('button:has-text("Continue with Google")'); await p.waitForSelector('button:has-text("Continue with Apple")')
  await p.click('text=Forgot password?'); assert.equal(await p.locator('button:has-text("Continue with")').count(), 2)   // offered on every form except password recovery
  await done(both)
  const none = await openCloud({ providers: { email: true } })
  await none.page.waitForTimeout(500)
  assert.equal(await none.page.locator('button:has-text("Continue with")').count(), 0)
  await done(none)
  const broken = await openCloud({ providers: null })   // malformed settings (external: null)
  await broken.page.waitForTimeout(500); assert.equal(await broken.page.locator('button:has-text("Continue with")').count(), 0)
  await done(broken)
})

test('web: Continue with Google starts a PKCE OAuth redirect back to this site', async () => {
  const s = await openCloud(); const p = s.page
  await p.click('button:has-text("Continue with Google")')
  await p.waitForFunction(() => location.href.includes('/auth/v1/authorize'))
  const q = s.seen.authorize.at(-1)
  assert.equal(q.get('provider'), 'google'); assert.equal(q.get('redirect_to'), 'http://localhost:4177')
  assert.ok(q.get('code_challenge'), 'PKCE challenge present'); assert.equal(q.get('code_challenge_method'), 's256')
  await done(s)
})

test('iPhone app: Google uses the system sign-in sheet and finishes with the one-time code', async () => {
  const s = await openCloud({ native: true, reply: { 'Mindful.webAuth': { url: 'brainpal://auth?code=CODE123' } } }); const p = s.page
  await p.click('button:has-text("Continue with Google")')
  await p.waitForSelector('.topbar')   // signed in -> the app shell replaces the login card
  const web = (await calls(p, 'Mindful', 'webAuth'))[0]
  assert.equal(web.options.callbackScheme, 'brainpal')
  const u = new URL(web.options.url)
  assert.equal(u.searchParams.get('provider'), 'google'); assert.equal(u.searchParams.get('redirect_to'), 'brainpal://auth'); assert.ok(u.searchParams.get('code_challenge'))
  assert.equal(s.seen.token.length, 1); assert.equal(s.seen.token[0].grant, 'pkce'); assert.equal(s.seen.token[0].body.auth_code, 'CODE123'); assert.ok(s.seen.token[0].body.code_verifier)
  await done(s)
})

test('iPhone app: Sign in with Apple exchanges the identity token (with the raw nonce) and stays signed in', async () => {
  const s = await openCloud({ native: true, reply: { 'Mindful.appleSignIn': { idToken: 'APPLE.ID.TOKEN', nonce: 'RAWNONCE', givenName: 'Ada', familyName: 'Lovelace' } } }); const p = s.page
  await p.click('button:has-text("Continue with Apple")')
  await p.waitForSelector('.topbar')
  assert.equal(s.seen.token.length, 1); assert.equal(s.seen.token[0].grant, 'id_token')
  assert.deepEqual([s.seen.token[0].body.provider, s.seen.token[0].body.id_token, s.seen.token[0].body.nonce], ['apple', 'APPLE.ID.TOKEN', 'RAWNONCE'])
  await done(s)
})

test('iPhone app: cancelling the sign-in sheet is silent; a failed one explains itself', async () => {
  const c = await openCloud({ native: true, reply: { 'Mindful.webAuth': { __reject: 'CANCELLED' }, 'Mindful.appleSignIn': { __reject: 'X', message: 'The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1000.)' } } }); const p = c.page
  await p.click('button:has-text("Continue with Google")')
  await p.waitForSelector('button:has-text("Continue with Google"):not([disabled])')
  assert.equal(await p.locator('[role=alert]').count(), 0, 'cancel shows no error')
  await p.click('button:has-text("Continue with Apple")')
  await p.waitForSelector('[role=alert]:has-text("isn’t enabled in this build")')
  assert.equal(c.seen.token.length, 0)
  await done(c)
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
await browser.close(); await server.close(); await cloudServer.close()
console.log(failed ? `\n${failed} of ${selected.length} e2e tests FAILED` : `\nAll ${selected.length} e2e tests passed`)
process.exit(failed ? 1 : 0)
