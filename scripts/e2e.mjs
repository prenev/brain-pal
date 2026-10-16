// npm run test:e2e [-- --no-build]
// Drives the built app in headless Chromium (fake microphone, mocked Gemini network) and checks real user flows.
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { preview } from 'vite'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { nativeStub } from './native-stub.mjs'
import { FAMILIES } from '../src/lib/achievements.ts'
const ALL_ACH = FAMILIES.flatMap(f => f.tiers.map(t => `${f.id}-${t.at}`))

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

async function open(seed, { native = false, time = null, onboarding = false, reply = null, coach = false, pro = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone', 'notifications'], acceptDownloads: true })
  if (!onboarding) await ctx.addInitScript(() => { try { localStorage.setItem('bp.onboarded', '1') } catch { /* ignore */ } })   // the first-run screens have their own test
  await ctx.addInitScript(ids => { try { if (!localStorage.getItem('bp.ach.seen')) localStorage.setItem('bp.ach.seen', JSON.stringify(ids)) } catch { /* ignore */ } }, ALL_ACH)   // achievement cards have their own tests; elsewhere they must not interrupt
  if (!coach) await ctx.addInitScript(() => { try { localStorage.setItem('bp.coach.done', '1') } catch { /* ignore */ } })   // Wobbi's corner coach has its own test
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
  if (pro) await ctx.addInitScript(() => { try { localStorage.setItem('bp.pro', JSON.stringify({ active: true, until: 4102444800000, checkedAt: Date.now() })) } catch { /* ignore */ } })   // Pro is tested on its own; everything else runs unlocked
  if (native && pro) await ctx.addInitScript(() => { window.__reply = { ...(window.__reply ?? {}), 'Mindful.proStatus': { active: true, until: 4102444800000 } } })
  if (native && reply) await ctx.addInitScript(r => { window.__reply = { ...(window.__reply ?? {}), ...r } }, reply)
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

const fabMenu = async p => { await tab(p, 'Calendar'); await p.click('.fab') }          // Home has no + button any more; Stats and Calendar still do
const nextStep = p => p.click('.wiz-foot .btn.primary')
const toStep = async (p, n) => { for (let i = 0; i < n; i++) await nextStep(p) }          // feel → happened → thought → (kinder) → finish
const MOOD_NAME = { 5: 'rad', 4: 'good', 3: 'meh', 2: 'bad', 1: 'awful' }
async function newEntry(p, { mood = 3, emotion, thought } = {}) {
  await tab(p, 'Home'); await p.click(`[aria-label="Log mood: ${MOOD_NAME[mood]}"]`); await p.waitForSelector('.wiz-body')      // the mood faces on Home open the entry flow with that mood chosen
  if (emotion) await p.click(`.ig >> text=${emotion}`)
  if (thought) { await toStep(p, 2); await p.fill('textarea[placeholder="What went through your mind?"]', thought) }
}
const save = async p => {
  if (await p.locator('.wiz-foot').count()) { while (!(await p.locator('.wiz-foot .btn.primary:has-text("Save")').count())) await nextStep(p) }
  await p.click('button:has-text("Save")'); await p.waitForSelector('.celebrate'); await p.click('.celebrate .btn.primary'); await p.waitForSelector('.topbar')
}
async function connectAi(p) {
  await tab(p, 'More'); await p.click('.li >> text=AI helper')
  await p.click('[role=switch]'); await p.fill('input[type=password]', 'TEST-KEY')
  await p.click('text=Save & test'); await p.waitForSelector('text=/Connected — using/')
  await p.click('[aria-label=Back]'); await tab(p, 'Home')
}
async function record(p, secs = 1.6) {
  if (await p.locator('button:has-text("Speak instead")').count()) await p.click('button:has-text("Speak instead")')
  await p.click('text=● Record'); await p.waitForSelector('.rec-live'); await p.waitForTimeout(secs * 1000); await p.click('button:has-text("Stop")'); await p.waitForSelector('audio', { state: 'attached' })
}

const opened = []
const tests = []
const test = (name, fn) => tests.push([name, fn])

test('every screen renders without errors', async () => {
  const s = await open()
  for (const t of ['Home', 'Stats', 'Calendar', 'Breathe', 'More']) { await tab(s.page, t); await s.page.waitForTimeout(150) }
  for (const row of ['Worry time', 'AI helper', 'Photo Gallery', 'Reminders', 'Get support', 'Apple Health']) {
    await tab(s.page, 'More')
    if (row === 'Worry time') { await s.page.click('.li >> text=Worry time'); await s.page.waitForSelector('text=Parked'); await s.page.click('[aria-label=Back]'); continue }
    await s.page.click(`.li >> text=${row}`); await s.page.waitForSelector('.title'); await s.page.click('[aria-label=Back]')
  }
  await done(s)
})

test('tab bar: every icon is visible whether selected or not; all five share one line-icon style and size', async () => {
  const s = await open(); const p = s.page
  for (const sel of ['Home', 'More']) {
    await tab(p, sel); await p.waitForTimeout(400)      // let the colour transition between selected / not selected finish
    const icons = await p.$$eval('.tab', tabs => tabs.map(t => {
      const svg = t.querySelector('svg'), r = svg.getBoundingClientRect(), [cr, cg, cb] = getComputedStyle(t).color.match(/\d+/g).map(Number)
      return { label: t.textContent, on: t.classList.contains('on'), w: +svg.getAttribute('width'), light: (cr + cg + cb) / 3, fluent: svg.getAttribute('viewBox') === '0 0 32 32' }
    }))
    assert.equal(icons.length, 5)
    for (const i of icons) {
      assert.ok(i.w >= 20, `${i.label} icon is rendered`)
      assert.ok(i.light > 150 || i.on, `${i.label} icon is light enough to see on the dark bar when not selected`)
    }
    assert.equal(icons.filter(i => i.fluent).length, 0, 'no odd-one-out icon')
    assert.equal(new Set(icons.map(i => Math.round(i.w))).size, 1, 'every tab icon is the same size')
    assert.deepEqual(icons.map(i => i.label), ['Home', 'Stats', 'Calendar', 'Breathe', 'More'])
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
  await s.page.click('.more-today'); await s.page.waitForSelector('text=No entries this month'); await reload(s.page); await s.page.click('.more-today'); await s.page.waitForSelector('text=No entries this month')
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
  await newEntry(s.page, { mood: 1, thought: 'I want to kill myself' })
  await s.page.waitForSelector('text=You don’t have to do this alone')
  await toStep(s.page, 1); await s.page.waitForSelector('textarea[placeholder^="What would you tell"]'); await s.page.waitForSelector('text=You don’t have to do this alone')   // the support card follows them to the next step
  assert.equal(await s.page.locator('text=Suggest reframes').count(), 0)
  assert.ok(!s.gemini.calls.some(c => c.url.includes('generateContent') && c.body.includes('kill myself')), 'crisis text must never be sent to the AI')
  await done(s)
})

test('voice memo: record, play, transcribe by hand, persist across reload, free storage on delete', async () => {
  const s = await open(); const p = s.page
  await newEntry(p, { mood: 3 }); await toStep(p, 1); await record(p)
  assert.ok(await p.evaluate(() => document.querySelector('audio').src.startsWith('blob:')))
  await p.fill('textarea[placeholder^="Type it yourself"]', 'typed transcript')
  await save(p)
  await p.waitForSelector('.entry >> text=Voice memo')
  assert.equal((await idbKeys(p)).filter(k => String(k).startsWith('audio-')).length, 1)
  await reload(p); await p.click('.entry')
  await p.waitForSelector('.entry audio', { state: 'attached' }); await p.waitForSelector('.etranscript >> text=typed transcript')
  const size = await p.evaluate(async () => (await (await fetch(document.querySelector('.entry audio').src)).blob()).size)
  assert.ok(size > 500, `audio blob should survive reload (got ${size} bytes)`)
  p.once('dialog', d => d.accept()); await p.click('text=Delete entry'); await p.waitForTimeout(400)
  assert.equal((await idbKeys(p)).filter(k => String(k).startsWith('audio-')).length, 0)
  await done(s)
})

test('voice memo: cancel discards, and AI controls stay hidden until enabled', async () => {
  const s = await open(); const p = s.page
  await newEntry(p, { mood: 3 }); await toStep(p, 1); await p.click('button:has-text("Speak instead")')
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
  await newEntry(p, { mood: 2 }); await toStep(p, 1); await record(p)
  await p.click('button:has-text("Transcribe")'); await p.waitForFunction(t => document.querySelector('textarea[placeholder^="Tap"]')?.value === t || [...document.querySelectorAll('textarea')].some(x => x.value === t), TRANSCRIPT)
  assert.ok(s.gemini.calls.some(c => c.body.includes('"mime_type":"audio/wav"')), 'audio is converted to WAV before upload')
  await p.click('button:has-text("Fill my thought record")'); await p.waitForSelector('text=Filled in from your memo')
  await p.click('.wiz-foot [aria-label=Back]'); await p.waitForSelector('.ig')                       // feel step
  assert.equal(await p.locator('.ig.on').count(), 1, 'only allow-listed emotions are applied (bogus dropped)')
  await toStep(p, 2)                                                                                // thought step
  assert.equal(await p.inputValue('textarea[placeholder="What went through your mind?"]'), STRUCTURED.thought)
  assert.equal(await p.locator('.chip.on >> text=catastrophizing').count(), 1)
  await toStep(p, 1)                                                                                // kinder step (there is a thought now)
  await p.click('button:has-text("Suggest reframes")'); await p.waitForSelector('.reframe-card')
  assert.equal(await p.locator('.reframe-card').count(), 3)
  await p.click('.reframe-card >> nth=0')
  assert.match(await p.inputValue('textarea[placeholder^="What would you tell"]'), /I have prepared/)
  await toStep(p, 1); assert.equal(await p.locator('.ig.on').count(), 1, 'allow-listed tag applied, bogus tag dropped')
  await save(p)
  await p.click('.entry'); await p.waitForSelector('.etranscript >> text=presentation tomorrow')
  // a memo saved without a transcript can be transcribed afterwards
  await newEntry(p, { mood: 3 }); await toStep(p, 1); await record(p); await save(p)
  await p.click('.more-today')       // Home shows only the latest entry of the day; the full list is one tap away
  await p.locator('.overlay .entry >> text=Voice memo').first().click()
  await p.click('.overlay .entry button:has-text("Transcribe")')
  await p.waitForSelector('.overlay .entry button:has-text("Transcrib")', { state: 'detached' })   // done only when THIS entry got its transcript
  for (const e of await p.locator('.overlay .entry').all()) if (!(await e.locator('.etranscript').count())) await e.click()      // expand the other one too
  assert.equal(await p.locator('.overlay .entry .etranscript').count(), 2, 'both transcripts visible before reload')
  await reload(p); await p.click('.more-today'); await p.click('.overlay .entry >> nth=0'); await p.waitForSelector('.overlay .etranscript')
  await p.click('.overlay .entry >> nth=1'); assert.equal(await p.locator('.overlay .entry .etranscript').count(), 2, 'both transcripts survive a reload')
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
    await fabMenu(p); await p.click('.sheet-item >> text=Park a worry'); await p.fill('textarea', w); await p.click('button:has-text("Park it")'); await p.waitForSelector('text=Parked.')
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
  const at = middayToday(), now = at.toISOString()   // pinned: a run that crosses midnight must not move "today" under the test
  const s = await open({ 'bp.sessions': [{ id: 'b1', createdAt: now, pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }, cycles: 6, durationSec: 100, completed: true }] }, { time: at }); const p = s.page
  assert.equal(await p.locator('text=Daily goals').count(), 0, 'there is no separate goals card: anchors are the daily goals')
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

  assert.equal(await p.locator('text=Daily goals').count(), 0, 'still no simple goals card')
  const box = l => p.locator(`[role=checkbox][aria-label="${l}"]`)
  await p.waitForSelector('[aria-label="1 of 4 done"]')
  assert.equal(await box('Slow breathing').getAttribute('aria-checked'), 'true'); assert.equal(await box('Slow breathing').isDisabled(), true, 'auto-ticked by today’s breathing session')
  await box('Walk 10 minutes').click(); await p.waitForSelector('[aria-label="2 of 4 done"]')
  await reload(p); await p.waitForSelector('[aria-label="2 of 4 done"]')
  await box('Walk 10 minutes').click(); await p.waitForSelector('[aria-label="1 of 4 done"]')
  await box('Walk 10 minutes').click(); await box('Call a friend').click()
  await box('Get some sunlight').click()
  await p.waitForSelector('.celebrate >> text=Every anchor done!'); await p.click('.celebrate .btn.primary'); await p.waitForSelector('[aria-label="4 of 4 done"]')
  await p.waitForSelector('text=1 day with every anchor done')
  const mini = p.locator('.anchors-mini'); await mini.waitFor(); assert.equal(await p.locator('.anchor-rows').count(), 0, 'all done: the card shrinks to one slim line')
  assert.ok((await mini.boundingBox()).height < 70, 'compact'); assert.equal(await p.locator('.anchors.all-done').count(), 0, 'no green all-done highlight')
  assert.match(await mini.evaluate(e => getComputedStyle(e).boxShadow), /^none$|rgba?\(0, 0, 0/, 'no green glow')
  await mini.click(); await p.waitForSelector('.anchor-rows'); await p.click('button:has-text("Collapse")'); await p.waitForSelector('.anchors-mini')

  await tab(p, 'More'); await p.waitForSelector('.li:has-text("Daily anchors") >> text=4/5')
  await p.click('.li >> text=Daily anchors'); await p.waitForSelector('.anchor-edit li')
  await done(s)
})


test('emotion and tag lists start short, learn what you use, and "More" / search reveal the rest', async () => {
  const mk = (i, emo) => ({ id: 'e' + i, createdAt: new Date(Date.now() - i * 864e5).toISOString(), mood: 3, situation: '', thought: 'x', emotions: [{ name: emo, intensity: 50 }], internalBehaviour: '', externalBehaviour: '', alternateThought: '', outcomeIntensity: null, tags: ['money'], distortions: [], photos: [] })
  const s = await open({ 'bp.thoughts': [mk(1, 'bored'), mk(2, 'bored'), mk(3, 'bored')] }); const p = s.page
  await p.click('[aria-label="Log mood: meh"]')
  await p.waitForSelector('.wiz-body')
  const ig = p.locator('.ig')
  assert.equal(await ig.count(), 6); assert.equal(await ig.first().innerText().then(t => t.trim().toLowerCase()), 'bored', 'your most-used emotion leads')
  assert.equal(await p.locator('.ig:has-text("anxious")').count(), 1, 'sensible starters are still there')
  await p.click('text=/More emotions \\(\\d+\\)/'); assert.equal(await ig.count(), 19)
  await p.click('text=Show fewer'); assert.equal(await ig.count(), 6)
  await toStep(p, 3); await p.waitForSelector('text=Add your own')                                  // feel → happened → thought → finish: tags live on the last step
  assert.equal(await ig.count(), 6); assert.equal(await ig.first().innerText().then(t => t.trim().toLowerCase()), 'money')
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
  await p.click('.celebrate .btn.primary'); await p.waitForSelector('.topbar')
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
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Summary")'); await p.click('.seg[aria-label="Summary range"] >> text=This week')
  const card = p.locator('.summary')
  await card.locator('text=You showed up on 3 of 7 days and wrote 3 entries.').waitFor()
  assert.match(await card.innerText(), /Feelings that came up most: happy and anxious\./); assert.match(await card.innerText(), /1 calming session \(2 minutes\), and your anxiety dropped by 3 points/)
  await p.click('[role=tab]:has-text("Today")'); await card.locator('text=You showed up on 1 of 1 day and wrote 1 entry.').waitFor()
  await p.click('[role=tab]:has-text("This month")'); await card.locator('text=of 30 days').waitFor()
  await p.click('[role=tab]:has-text("This week")'); await p.click('button:has-text("Share")')
  const shared = await p.evaluate(() => window.__shared); assert.match(shared.text, /^My week\n/); assert.match(shared.text, /• You showed up on 3 of 7 days/); assert.match(shared.text, /not medical advice/)
  await done(s)
  const quiet = await open(); await tab(quiet.page, 'Stats'); await quiet.page.click('[role=tab]:has-text("Summary")'); await quiet.page.click('.seg[aria-label="Summary range"] >> text=This week')
  await quiet.page.waitForSelector('text=Nothing logged this week — that’s okay'); await done(quiet)
})


const openJournal = async p => { await tab(p, 'Home'); await p.click('.tool >> text=Journal'); await p.click('[aria-label="New journal entry"]'); await p.waitForSelector('[aria-label="Journal entry"]') }
const saveJournalEntry = async p => { await p.click('button:has-text("Save")'); await p.waitForSelector('.celebrate >> text=Saved to your journal'); await p.click('.celebrate .btn.primary'); await p.waitForSelector('.topbar'); if (await p.locator('.overlay [aria-label=Back]').count()) await p.click('.overlay [aria-label=Back]') }   // saving from the Journal list drops you back on the list: leave it

test('journal: write, list, search, filter, edit, delete — and it persists', async () => {
  const s = await open(); const p = s.page
  await openJournal(p)
  await p.fill('[aria-label="Title"]', 'Quiet morning'); await p.fill('[aria-label="Journal entry"]', 'Walked by the river and felt lighter.')
  await p.waitForSelector('text=7 words'); await p.click('[aria-label=Mood]'); await p.click('[aria-label="Mood: good"]'); await p.click('[aria-label=Tags]'); await p.click('.chip:has-text("health")')
  await saveJournalEntry(p)
  await openJournal(p); await p.fill('[aria-label="Journal entry"]', 'Deadline stress is building.'); await p.click('[aria-label=Tags]'); await p.click('.chip:has-text("work")'); await saveJournalEntry(p)

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
  await p.click('.jentry:has-text("Deadline")'); await p.click('[aria-label="Delete entry"]')
  await p.waitForFunction(() => document.querySelectorAll('.jentry').length === 1)
  await done(s)
})

test('journal editor: topic chips change each time, the formatting bar edits the selection, preview shows it rendered, a voice note can be added and played', async () => {
  const s = await open(); const p = s.page
  await openJournal(p); await p.waitForSelector('.topic-row .chip')
  const topics = async () => (await p.locator('.topic-row .chip').allInnerTexts()).filter(Boolean)       // (the shuffle button has no text)
  const first = await topics(); await p.click('[aria-label="More topic ideas"]')
  const second = await topics(); assert.equal(first.filter(t => second.includes(t)).length, 0, 'the shuffle shows different topics')
  await p.click('.topic-row .chip >> nth=0'); assert.equal(await p.locator('.topic-row').count(), 0)
  await p.waitForFunction(() => { const a = document.querySelector('[aria-label="Journal entry"]'); return a.selectionStart === a.value.length })      // the chip puts the cursor at the end on the next frame: wait for it, or it can overwrite the selection below
  await p.fill('[aria-label="Journal entry"]', 'plain text'); await p.evaluate(() => { const a = document.querySelector('[aria-label="Journal entry"]'); a.focus(); a.setSelectionRange(0, 5) })
  await p.click('[aria-label=Bold]'); assert.equal(await p.inputValue('[aria-label="Journal entry"]'), '**plain** text')
  await p.click('[aria-label="Bulleted list"]'); assert.equal(await p.inputValue('[aria-label="Journal entry"]'), '- **plain** text')
  await p.fill('[aria-label="Journal entry"]', '# Big\n\nsome *soft* words\n- one\n- two')
  await p.click('[aria-label=Preview]'); await p.waitForSelector('.notes-preview h3 >> text=Big'); assert.equal(await p.locator('.notes-preview em').innerText(), 'soft'); assert.equal(await p.locator('.notes-preview li').count(), 2)
  assert.equal(await p.locator('.fmt-bar').count(), 0, 'no formatting bar while previewing'); await p.click('[aria-label="Back to writing"]')
  await p.click('[aria-label="Voice note"]'); await p.waitForSelector('button:has-text("● Record")'); await record(p, 1.2)
  await saveJournalEntry(p)
  await p.click('.tool >> text=Journal'); await p.waitForSelector('.jentry [aria-label="Has a voice note"]'); assert.match(await p.locator('.jentry').innerText(), /Big some soft words one two/, 'list preview shows words, not markers')
  await p.click('.jentry'); await p.waitForSelector('.notes-voice .player'); assert.equal(await p.locator('.notes-voice audio').count(), 1)
  assert.equal((await idbKeys(p)).filter(k => String(k).startsWith('jaudio-')).length, 1, 'the audio is stored on the device')
  p.once('dialog', d => d.accept()); await p.click('[aria-label="Delete entry"]'); await p.waitForTimeout(400)
  assert.equal((await idbKeys(p)).filter(k => String(k).startsWith('jaudio-')).length, 0, 'deleting the entry frees its audio')
  await done(s)
})

test('breathe: step 1 only lists the rhythms; tapping one opens step 2 (box length / own pace, how long, vibration + tones already on) and back returns', async () => {
  const s = await open(null, { native: true }); const p = s.page
  await tab(p, 'Breathe'); await p.waitForSelector('.techs')
  assert.deepEqual(await p.$$eval('.tech b', els => els.map(e => e.textContent)), ['Calm 4-6', 'Coherent', 'Box', '4-7-8', 'Your own pace'])
  assert.equal(await p.locator('.tech svg.wave path').count(), 5, 'each rhythm draws its own wave')
  for (const sel of ['.seg[aria-label="Session length"]', '[role=switch][aria-label="Vibration"]', 'button:has-text("Start ·")']) assert.equal(await p.locator(sel).count(), 0, `${sel} is on the next screen, not the list`)
  await p.click('.tech >> text=Coherent'); await p.waitForSelector('text=5.5 breaths a minute'); assert.equal(await p.locator('.techs').count(), 0, 'the list steps aside')
  assert.equal(await p.getAttribute('[role=switch][aria-label="Vibration"]', 'aria-checked'), 'true', 'vibration starts on'); assert.equal(await p.getAttribute('[role=switch][aria-label="Soft tones"]', 'aria-checked'), 'true', 'tones start on')
  await p.click('[aria-label="Back to breathing styles"]'); await p.waitForSelector('.techs')
  await p.click('.tech >> text=Box'); await p.click('.seg[aria-label="Box length"] >> text=5 sec'); await p.waitForSelector('text=5 · 5 · 5 · 5 s')
  await p.click('[aria-label="Back to breathing styles"]'); await p.waitForSelector('.tech:has-text("Box") >> text=5 · 5 · 5 · 5')
  await p.click('.tech >> text=Your own pace'); await p.click('[aria-label="Longer breathe out"]'); await p.click('[aria-label="Longer breathe out"]'); await p.waitForSelector('text=5 · 6 s')
  await p.click('[role=switch][aria-label="Soft tones"]'); assert.equal(await p.getAttribute('[role=switch][aria-label="Soft tones"]', 'aria-checked'), 'false', 'they can switch it off')
  await p.click('.seg[aria-label="Session length"] >> text=3 min'); await p.waitForSelector('button:has-text("Start · 3 min")')
  await p.click('button:has-text("Start · 3 min")'); await p.waitForSelector('.breath-scene'); await p.waitForSelector('.breath-round >> text=/Round 1 of 16/')   // 3 min of 5+6 s breaths
  await p.waitForSelector('.breath-bar >> text=Muted')
  await p.click('button:has-text("End session")'); await p.waitForSelector('.techs')
  await done(s)
})

test('voice memo playback: the first play switches the iPhone audio session to playback (loudspeaker) and a stalled first play restarts itself', async () => {
  const s = await open(null, { native: true }); const p = s.page
  await newEntry(p, { mood: 3 }); await toStep(p, 1); await record(p, 1.2); await save(p)
  await p.click('.more-today'); await p.click('.overlay .entry'); await p.waitForSelector('.overlay .player')
  await p.evaluate(() => { const a = document.querySelector('.overlay audio'); window.__plays = 0; a.play = function () { window.__plays++; if (window.__plays === 1) { Object.defineProperty(a, 'paused', { get: () => false, configurable: true }); return Promise.resolve() } delete a.paused; return Promise.resolve() }; a.pause = () => {} })
  await p.click('.overlay [aria-label=Play]')
  await p.waitForFunction(() => window.__native.some(c => c.method === 'audioSession' && c.options.mode === 'playback'))
  await p.waitForFunction(() => window.__plays >= 2, null, { timeout: 4000 })               // nothing played within 0.7 s: it retried, like the second tap does
  await done(s)
})

test('journal: draft survives leaving, blank saves are refused, and text is only ever text', async () => {
  const s = await open(); const p = s.page
  await openJournal(p); await p.click('button:has-text("Save")'); await p.waitForSelector('[role=alert]:has-text("Write a few words first")')
  assert.equal(await p.locator('.celebrate').count(), 0)
  await p.waitForSelector('.topic-row .chip'); await p.click('.topic-row .chip >> nth=0'); assert.ok((await p.inputValue('[aria-label="Journal entry"]')).length > 5, 'a topic chip starts the page')
  assert.equal(await p.locator('.topic-row').count(), 0, 'chips step aside once there is text')
  await p.fill('[aria-label="Journal entry"]', '<img src=x onerror="window.__pwned=1"> half a thought'); await p.waitForTimeout(700)
  await reload(p); await openJournal(p)
  await p.waitForSelector('text=Picked up where you left off'); assert.match(await p.inputValue('[aria-label="Journal entry"]'), /half a thought/)
  await saveJournalEntry(p)
  await openJournal(p); assert.equal(await p.inputValue('[aria-label="Journal entry"]'), '', 'draft is cleared once saved'); await p.click('.notes-back'); await p.click('.overlay .topbar [aria-label=Back]')
  await tab(p, 'More'); await p.click('.li >> text=Journal')
  assert.equal(await p.locator('.jentry img').count(), 0); assert.equal(await p.evaluate(() => window.__pwned), undefined)
  assert.match(await p.locator('.jentry').innerText(), /<img src=x/, 'shown literally')
  await done(s)
})

test('journal: crisis wording shows support, corrupted journal data is ignored, and a "write one line" anchor ticks itself', async () => {
  const bad = await open({ 'bp.journal': 'garbage' }); await bad.page.waitForSelector('.topbar'); await done(bad)

  const s = await open(); const p = s.page
  await p.click('text=Choose your daily anchors'); await p.click('.sheet .chip >> text=Write one line'); await p.click('button:has-text("Done")')
  assert.equal(await p.locator('[role=checkbox][aria-label="Write one line"]').getAttribute('aria-checked'), 'false')
  await openJournal(p); await p.fill('[aria-label="Journal entry"]', 'I want to end my life')
  await p.waitForSelector('[role=alert] >> text=You don’t have to do this alone')
  await p.fill('[aria-label="Journal entry"]', 'Feeling a bit better now.'); await saveJournalEntry(p)
  await p.waitForSelector('.anchors-mini'); await p.click('.anchors-mini'); await p.waitForSelector('[role=checkbox][aria-label="Write one line"][aria-checked="true"]')   // the only anchor is done, so the card is collapsed until opened
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")'); await p.waitForSelector('[aria-label="Journaling: level 1"]')
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Summary")'); await p.waitForSelector('text=You wrote 1 journal entry.')
  await done(s)
})


const plan = (id, text, n = 0) => ({ id, createdAt: ago(n), text: 'worry ' + id, status: 'actionable', action: text, reviewedAt: ago(n) })
const todayEntry = () => rec('today', 0)

const middayToday = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d }
test('small step: pick a step from your worry plan, settle, focus (pause is free), finish — it counts everywhere', async () => {
  const s = await open({ 'bp.thoughts': [todayEntry()], 'bp.worries': [plan('w1', 'Email the landlord'), plan('w2', 'Book the dentist', 1)], 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }, { time: middayToday() }); const p = s.page
    await p.waitForSelector('.tile-step >> text=A small step is waiting: Email the landlord')   // newest plan first
  await p.click('.tile-step'); await p.waitForSelector('[aria-label="One small step"]')
  assert.equal(await p.locator('.step-choice').count(), 2); await p.click('.step-choice:has-text("Email the landlord")')
  await p.click('[role=radio]:has-text("5 min")'); await p.click('button:has-text("Start")')
  await p.waitForSelector('button:has-text("Skip — start now")'); await p.click('button:has-text("Skip — start now")')   // the minute of calm is optional
  const clock = p.locator('[role=timer]'); await clock.waitFor(); assert.match(await clock.innerText(), /0[45]:[0-5]\d/)
  await p.clock.fastForward('02:00'); await p.waitForFunction(() => /0[23]:[0-5]\d/.test(document.querySelector('[role=timer]').textContent))
  await p.click('.overlay button:has-text("Pause")'); await p.waitForSelector('text=Paused — take as long as you need.')
  const frozen = await clock.innerText(); await p.clock.fastForward('30:00'); assert.equal(await clock.innerText(), frozen, 'a paused timer does not move, however long you wait')
  await p.click('button:has-text("Resume")'); await p.clock.fastForward('04:00')
  await p.waitForSelector('text=Done — nice.'); assert.match(await p.locator('[aria-label="One small step"] .card').innerText(), /“Email the landlord”/)
  await p.click('button:has-text("Close")')
  await p.waitForSelector('.tile-step >> text=Book the dentist'); assert.equal(await p.locator('.tile-step >> text=Email the landlord').count(), 0, 'a finished step leaves the list')
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")'); await p.waitForSelector('[aria-label="Small steps: level 1"]')
  await p.click('[role=tab]:has-text("Summary")'); await p.waitForSelector('text=/You finished 1 small step \\(\\d+ minutes? of focus\\)\\./')
  await done(s)
})

test('small step: stopping early is neutral and never counts as finished; your own step works', async () => {
  const s = await open({ 'bp.thoughts': [todayEntry()], 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }); const p = s.page
  assert.equal(await p.locator('.tile-step').count(), 0, 'nothing is suggested without a plan')
  await fabMenu(p); await p.click('.sheet-item >> text=Start a small step'); await p.waitForSelector('.chip:has-text("Write one sentence")')
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
  const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`   // local day (the UTC date is wrong near midnight)
  const s = await open({ 'bp.sleep.manual': [{ date: today, start: Date.now() - 8 * HR, end: Date.now(), asleepMin: 450, inBedMin: 450, awakeMin: 0, deepMin: 0, remMin: 0, coreMin: 0, unspecifiedMin: 450, efficiency: null, source: 'manual', quality: null }], 'bp.levels.seen': { calming: 9, reframing: 9, worry: 9, consistency: 9 } }); const p = s.page
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Summary")'); await p.waitForSelector('text=You slept 7h 30m on average (1 night with sleep data).')
  await done(s)
})


const seenAll = { 'bp.levels.seen': { calming: 99, reframing: 99, worry: 99, consistency: 99 } }
const noon = n => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(12, 0, 0, 0); return d.toISOString() }
const entriesOn = (day, count) => Array.from({ length: count }, (_, i) => rec(`c${day}-${i}`, 0, { createdAt: new Date(new Date(noon(day)).getTime() + i * 60_000).toISOString() }))

const manyDays = (from, to, n) => Array.from({ length: to - from + 1 }, (_, i) => entriesOn(from + i, n)).flat()
const coinsPage = async p => { await tab(p, 'More'); await p.click('.li >> text=Coins & shop'); await p.waitForSelector('.shop-head') }
const shopTab = (p, name) => p.click(`.shop-cats .chip:has-text("${name}")`)
const getIt = async (p, name, label) => { await p.click(`.shop-card:has-text("${name}") button.primary`); await p.waitForSelector('.confirm-buy'); await p.click(`.confirm-buy button.primary:has-text("${label}")`) }

test('coins: derived from your own activity with daily caps, shown in More and the shop', async () => {
  const s = await open({ 'bp.thoughts': [...entriesOn(0, 4), ...entriesOn(1, 3), ...entriesOn(2, 3)] }); const p = s.page   // 4 today (cap 2), 3 yesterday, 3 the day before
  await tab(p, 'More'); await p.waitForSelector('.li:has-text("Coins & shop") >> text=58')   // 3 days x 6 (cap) + 10 first check-in + 20 ten check-ins + 10 three-day streak
  await p.click('.li >> text=Coins & shop'); await p.waitForSelector('[aria-label="58 coins"]')
  await p.waitForSelector('text=+36 earned today.'); assert.match(await p.locator('.card:has-text("Recently")').innerText(), /Today: .*Check-ins/)
  assert.match(await p.locator('.card:has-text("Recently")').innerText(), /Warming up/, 'achievement coins are listed by name')
  assert.equal(await p.locator('.card:has-text("How you earn them")').count(), 1)
  await done(s)
  const fresh = await open({ 'bp.purchases': 'garbage', 'bp.theme': 7, 'bp.equip': 'x' }); await tab(fresh.page, 'More'); await fresh.page.waitForSelector('.li:has-text("Coins & shop") >> text=0'); await done(fresh)
})

test('shop: buy a colour (confirm first), it applies and persists, switch back for free; what you can’t afford says how far away it is', async () => {
  const s = await open({ 'bp.thoughts': [...entriesOn(0, 2), ...manyDays(1, 11, 2)] }); const p = s.page      // 142 coins
  const accent = () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase())
  assert.equal(await accent(), '#35d07f')
  await coinsPage(p); await p.waitForSelector('[aria-label="142 coins"]'); await shopTab(p, 'Colours')
  assert.equal(await p.locator('.shop-card').count(), 8, 'eight colours')
  await p.click('.shop-card:has-text("Ocean") button.primary'); await p.waitForSelector('.confirm-buy >> text=142 coins now · 60 for this · 82 left'); await p.click('.confirm-buy >> text=Not now')
  assert.equal(await accent(), '#35d07f', 'cancelling buys nothing'); await p.waitForSelector('[aria-label="142 coins"]')
  await getIt(p, 'Ocean', 'Get it · 60 coins')
  await p.waitForSelector('text=Ocean is yours and switched on.'); await p.waitForSelector('[aria-label="92 coins"]'); assert.equal(await accent(), '#4aa8ff')   // 142 - 60, +10 for the first-find achievement
  await p.waitForSelector('.shop-card:has-text("Ocean") button:has-text("In use")')
  await shopTab(p, 'Card styles'); await p.waitForSelector('.shop-card:has-text("Galaxy") button.primary >> text=308 more'); await p.click('.shop-card:has-text("Galaxy") button.primary')
  await p.waitForSelector('.confirm-buy >> text=You need 308 more coins.'); assert.equal(await p.locator('.confirm-buy button.primary').isDisabled(), true); await p.click('.confirm-buy >> text=Not now')
  await reload(p); assert.equal(await accent(), '#4aa8ff', 'the colour persists')
  await coinsPage(p); await shopTab(p, 'Colours'); await p.click('.shop-card:has-text("Ocean") button:has-text("In use")'); assert.equal(await accent(), '#35d07f')
  await p.click('.shop-card:has-text("Ocean") button:has-text("Use")'); assert.equal(await accent(), '#4aa8ff', 'owned, so switching back and forth is free')
  assert.equal(await p.locator('[aria-label="92 coins"]').count(), 1)
  await done(s)
  // a colour in storage that you never bought does nothing
  const t = await open({ 'bp.theme': 'theme-berry' }); assert.equal(await t.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase()), '#35d07f'); await done(t)
  // colours bought in an older version (cheaper then) are still yours
  const old = await open({ 'bp.purchases': [{ id: 'o1', itemId: 'theme-sunset', at: '2026-09-01T10:00:00.000Z', cost: 40 }], 'bp.theme': 'theme-sunset' }); assert.equal(await old.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase()), '#ffa63d'); await done(old)
})

test('shop: Wobbi’s wardrobe — try an outfit on, buy it, it is worn everywhere, take it off, it persists; unowned or wrong-slot pieces in storage are ignored', async () => {
  const s = await open({ 'bp.thoughts': [...entriesOn(0, 2), ...manyDays(1, 11, 2)] }); const p = s.page      // 142 coins
  const worn = () => p.locator('.pal svg .acc').count()
  assert.equal(await worn(), 0, 'nothing worn at first')
  await coinsPage(p); await p.waitForSelector('[aria-label="142 coins"]')
  assert.equal(await p.locator('.shop-card').count(), 17, 'seventeen outfit pieces')
  assert.equal((await p.locator('.shop-card .rarity').allInnerTexts()).filter(t => /^legendary$/i.test(t)).length, 2)
  await p.click('.shop-card:has-text("Cosy beanie") >> text=Try on'); await p.waitForSelector('.tryon >> text=Trying on Cosy beanie'); await p.waitForSelector('.shop-head .acc-beanie')
  assert.equal(await p.locator('.shop-card:has-text("Cosy beanie") .acc-beanie').count(), 1, 'the card shows the piece on Wobbi')
  await p.click('[aria-label="Stop trying on"]'); assert.equal(await p.locator('.shop-head .acc-beanie').count(), 0, 'trying on costs nothing and stops')
  await getIt(p, 'Cosy beanie', 'Get it · 60 coins'); await p.waitForSelector('[aria-label="92 coins"]'); await p.waitForSelector('.shop-head .acc-beanie')
  await p.click('.shop-card:has-text("Cosy beanie") button:has-text("Take off")'); assert.equal(await p.locator('.shop-head .acc-beanie').count(), 0)
  await p.click('.shop-card:has-text("Cosy beanie") button:has-text("Wear")'); await p.waitForSelector('.shop-head .acc-beanie')
  await getIt(p, 'Sporty cap', 'Get it · 60 coins'); await p.waitForSelector('.shop-head .acc-beanie')   // the hat slot is taken, so the second hat is owned but not put on
  assert.equal(await p.locator('.shop-head .acc-cap').count(), 0); await p.click('.shop-card:has-text("Sporty cap") button:has-text("Wear")'); await p.waitForSelector('.shop-head .acc-cap'); assert.equal(await p.locator('.shop-head .acc-beanie').count(), 0, 'one hat at a time')
  await p.click('[aria-label=Back]'); await tab(p, 'Home'); await p.waitForSelector('.today')
  assert.ok(await p.locator('.pal svg .acc-cap').count() > 0, 'Wobbi wears it on Home too')
  await reload(p); assert.ok(await p.locator('.pal svg .acc-cap').count() > 0, 'and after a restart')
  await done(s)
  const junk = await open({ 'bp.equip': { outfit: { head: 'crown', face: 'crown' }, card: 'card-galaxy', title: 'title-master' } }); assert.equal(await junk.page.locator('.pal svg .acc').count(), 0, 'not owned: not worn'); await done(junk)
})

test('shop: save up for something (a goal with progress), the title and card style go on share cards', async () => {
  const s = await open({ 'bp.thoughts': [...entriesOn(0, 2), ...manyDays(1, 20, 2)], 'bp.ach.seen': ALL_ACH }); const p = s.page
  await coinsPage(p); await shopTab(p, 'Titles')
  await p.click('.shop-card:has-text("Zen Master") >> text=Save up'); await p.waitForSelector('.goal >> text=Saving for Zen Master'); await p.waitForSelector('.goal >> text=/\\d+ more coins to go\\./')
  await reload(p); await coinsPage(p); await p.waitForSelector('.goal >> text=Saving for Zen Master')
  await shopTab(p, 'Titles'); await getIt(p, 'Calm Captain', 'Get it · 60 coins'); await p.waitForSelector('.shop-card:has-text("Calm Captain") button:has-text("In use")')
  await shopTab(p, 'Card styles'); await getIt(p, 'Aurora', 'Get it · 160 coins'); await p.waitForSelector('.shop-card:has-text("Aurora") button:has-text("In use")')
  await p.click('.seg [role=tab]:has-text("Achievements")'); await p.click('.ach-medal[aria-label^="First check-in"]'); await p.waitForSelector('.share-preview svg')
  const svg = await p.locator('.share-preview').innerHTML(); assert.ok(svg.includes('Calm Captain'), 'the equipped title is on the card'); assert.ok(svg.includes('#123a3a'), 'and the bought card style')
  await done(s)
})

test('achievements: a new one pops up as a shareable card with its coins, once; the Achievements list shows earned and locked ones', async () => {
  const s = await open({ 'bp.ach.seen': [] }); const p = s.page
  await p.click('[aria-label="Log mood: good"]'); await p.click('button:has-text("Just save my mood")'); await p.waitForSelector('.celebrate >> text=Entry saved!'); await p.click('.celebrate .btn.primary')
  await p.waitForSelector('.celebrate >> text=Achievement unlocked!'); await p.waitForSelector('.cel-card svg'); assert.match(await p.locator('.cel-card').innerHTML(), /First check-in/); assert.match(await p.locator('.cel-card').innerHTML(), /BRONZE/)
  await p.waitForSelector('.celebrate >> text=+10 coins')
  await p.click('.celebrate .btn:has-text("Share")'); await p.waitForSelector('.share-preview svg'); assert.equal(await p.locator('.share-preview svg').getAttribute('viewBox'), '0 0 1080 1350'); await p.click('.sheet >> text=Close')
  await p.click('.celebrate .btn.primary'); await p.waitForSelector('.celebrate', { state: 'detached' })
  await reload(p); await p.waitForTimeout(500); assert.equal(await p.locator('.celebrate').count(), 0, 'congratulated once')
  await tab(p, 'More'); await p.waitForSelector('.li:has-text("Achievements") >> text=1'); await p.click('.li >> text=Achievements'); await p.waitForSelector('.ach-sum')
  assert.match(await p.locator('.ach-sum').innerText(), /1\s*\/\s*\d+/); assert.equal(await p.locator('.ach-fam').count(), 12, 'twelve areas: check-ins, reframing, calming, journal, focus, worries, anchors, sleep, streak, showing up, Focus guard, collector')
  await p.click('.ach-medal[aria-label^="First check-in"]'); await p.waitForSelector('.share-preview svg'); await p.click('.sheet >> text=Close')
  await p.click('.ach-medal[aria-label^="Getting to know me"]'); await p.waitForSelector('.sheet >> text=1 of 10 · worth 20 coins'); await p.click('.sheet >> text=Close')
  await done(s)
})

test('shop: a rest day covers a missed day so your streak keeps going', async () => {
  const s = await open({ 'bp.thoughts': [...entriesOn(0, 2), ...manyDays(2, 12, 2)] }); const p = s.page      // nothing yesterday; 142 coins
  await p.waitForSelector('[aria-label="1 day streak"]')
  await coinsPage(p); await p.waitForSelector('[aria-label="142 coins"]'); await shopTab(p, 'Boosts')
  await p.click('.shop-card:has-text("Rest day") button.primary'); await p.waitForSelector('.confirm-buy'); await p.selectOption('[aria-label="Day to cover"]', { label: 'Yesterday' }); await p.click('.confirm-buy button.primary:has-text("Get it · 40 coins")')
  await p.waitForSelector('text=Rest day added'); await p.waitForSelector('[aria-label="102 coins"]')
  await tab(p, 'Home'); await p.waitForSelector('[aria-label="13 day streak"]')
  await reload(p); await p.waitForSelector('[aria-label="13 day streak"]')
  await done(s)
})

test('shop: a treat you name yourself, and a quiet +N when you earn', async () => {
  const s = await open({ 'bp.thoughts': [...manyDays(1, 3, 3), ...manyDays(4, 12, 2)] }); const p = s.page      // 142 coins
  await coinsPage(p); await shopTab(p, 'Boosts'); await p.waitForSelector('[aria-label="142 coins"]')
  await p.click('.shop-card:has-text("My treat") button.primary'); await p.waitForSelector('.confirm-buy'); assert.equal(await p.locator('.confirm-buy button.primary').isDisabled(), true); await p.waitForSelector('.confirm-buy >> text=Name your treat first.')
  await p.fill('input[placeholder^="e.g. A coffee"]', 'A long walk in the sun'); await p.click('.confirm-buy button.primary:has-text("Get it · 30 coins")')
  await p.waitForSelector('text=Treat saved. Go enjoy it!'); await p.waitForSelector('.card:has-text("Your treats") >> text=A long walk in the sun'); await p.waitForSelector('[aria-label="112 coins"]')
  assert.equal(await p.locator('.coin-toast').count(), 0, 'spending never pops a toast')
  await tab(p, 'Home'); await p.click('[aria-label="Log mood: good"]'); await p.click('button:has-text("Just save my mood")'); await p.waitForSelector('.coin-toast >> text=+3 coins')
  await done(s)
  const f = await open(); await f.page.waitForTimeout(600); assert.equal(await f.page.locator('.coin-toast').count(), 0, 'no toast on load'); await done(f)
})

test('coin toast: "+N coins" always goes away by itself, even when your coins change again while it shows', async () => {
  const s = await open(null, { time: new Date('2026-10-16T12:00:00') }); const p = s.page
  await p.click('[aria-label="Log mood: good"]'); await p.click('button:has-text("Just save my mood")'); await p.waitForSelector('.coin-toast >> text=+13 coins'); await p.click('.celebrate .btn.primary')   // 3 for the check-in + 10 for the first-check-in achievement
  p.once('dialog', d => d.accept()); await p.click('.entry'); await p.click('text=Delete entry')      // the entry is deleted, so coins drop while the toast is still showing (this used to cancel its timer)
  await p.waitForFunction(() => !document.querySelector('.entry'))
  await p.clock.runFor(4000)
  assert.equal(await p.locator('.coin-toast').count(), 0, 'the toast must be gone after a few seconds')
  // the 13 coins from the deleted entry are kept (earned coins never vanish), so the next entries only pay out once they go beyond that
  for (const m of ['bad', 'meh']) { await p.click(`[aria-label="Log mood: ${m}"]`); await p.click('button:has-text("Just save my mood")'); await p.click('.celebrate .btn.primary') }
  await p.waitForSelector('.coin-toast >> text=+3 coins'); await p.clock.runFor(4000)
  assert.equal(await p.locator('.coin-toast').count(), 0, 'and the next one too')
  await done(s)
})

test('Wobbi tips: every section has one short tip, dismissing sticks, and More brings them back', async () => {
  const s = await open({ 'bp.thoughts': [rec('t1', 0)], 'bp.journal': [] }); const p = s.page
  const tip = () => p.locator('.pal-tip .bubble').first().innerText()
    assert.equal(await p.locator('.pal-tip').count(), 0, 'Home itself has no tip: Wobbi’s corner coach covers it')
  for (const [t, re] of [['Calendar', /Tap a day/], ['Breathe', /Pick a rhythm/]]) { await tab(p, t); await p.waitForSelector('.pal-tip'); assert.match(await tip(), re, t) }
  await tab(p, 'Stats')
  for (const [v, re] of [['Progress', /Skills grow/], ['Summary', /plain words/], ['Sleep', /sleep and mood|Apple Health/]]) { await p.click(`[role=tab]:has-text("${v}")`); await p.waitForSelector('.pal-tip'); assert.match(await tip(), re, v) }
  await tab(p, 'Home')
  for (const [t, re] of [['.more-today', /month by month/], ['.home-top .tool >> text=Journal', /Only you can read/], ['.coin-pill', /Coins come from/]]) { await p.click(t); await p.waitForSelector('.overlay .pal-tip'); assert.match(await p.locator('.overlay .pal-tip .bubble').first().innerText(), re, t); await p.click('[aria-label=Back]') }
  // dismiss: stays gone after a reload; More brings it back
  await tab(p, 'Calendar'); await p.click('.pal-tip [aria-label="Hide this tip"]'); assert.equal(await p.locator('.pal-tip').count(), 0)
  await reload(p); await tab(p, 'Calendar'); await p.waitForSelector('.cal'); assert.equal(await p.locator('.pal-tip').count(), 0, 'a dismissed tip stays dismissed')
  await tab(p, 'More'); await p.click('button:has-text("Show Wobbi’s tips again")'); await tab(p, 'Calendar'); await p.waitForSelector('.pal-tip >> text=Tap a day')
  await done(s)
})

test('splash: the page paints Wobbi’s app icon + name from index.html before any script runs, and the app shows its own splash (no bare "Loading…")', async () => {
  const html = await (await fetch(URL_)).text()
  assert.match(html, /<div id="root"><div class="boot"[^>]*>\s*<img src="\/icon-192\.png"/); assert.match(html, /<b>Wobbi<\/b>/); assert.doesNotMatch(html, /Loading…/)
  assert.doesNotMatch(readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'), /Loading…/); assert.match(readFileSync(new URL('../src/components/Splash.tsx', import.meta.url), 'utf8'), /Wobbi/)
})

test('SOS is a siren in the action bar (Home, Breathe) and nowhere else in the flow; the daily-goals card is gone; the tools strip starts level with the cards', async () => {
  const s = await open(); const p = s.page
  await p.waitForSelector('.tools-row')
  assert.equal(await p.locator('text=Anxious right now?').count(), 0, 'no "Anxious right now?" card on Home')
  assert.equal(await p.locator('text=Daily goals').count(), 0, 'no daily-goals card: anchors are the daily goals')
  const siren = p.locator('.topbar [aria-label^="Anxious right now"]'); assert.equal(await siren.count(), 1, 'one siren in the Home action bar')
  assert.ok(await siren.evaluate(el => el.getBoundingClientRect().right > window.innerWidth - 30), 'at the right end of the bar')
  const left = sel => p.$eval(sel, el => Math.round(el.getBoundingClientRect().left))
  assert.equal(await left('.tools-row .tool'), await left('.anchor-empty, .anchors'), 'the first tool tile lines up with the card below it')
  await siren.click(); await p.waitForSelector('input[aria-label="Anxiety right now, 0 to 10"]'); await p.click('[aria-label=Close]')
  await tab(p, 'Breathe')
  assert.equal(await p.locator('.topbar [aria-label^="Anxious right now"]').count(), 1, 'the siren is in the Breathe action bar too'); assert.equal(await p.locator('text=Anxious right now?').count(), 0, 'and the big card is gone')
  await done(s)
})

test('Wobbi’s corner coach: first visit only, three bubbles in the bottom-right, skippable, never again; More can bring it back', async () => {
  const s = await open(null, { coach: true }); const p = s.page
  await p.waitForSelector('.coach'); assert.match(await p.locator('.coach').innerText(), /red SOS siren/)
  const box = await p.$eval('.coach', el => { const r = el.getBoundingClientRect(); return { right: r.right, top: r.top, w: innerWidth, h: innerHeight } })
  assert.ok(box.right > box.w - 20 && box.top > box.h * 0.4, `bubble + Wobbi sit in the bottom-right corner ${JSON.stringify(box)}`)
  assert.ok(await p.locator('.coach .pal svg').count(), 'Wobbi is there')
  await p.click('.coach button:has-text("Next")'); await p.waitForSelector('.coach >> text=tap a face')
  await p.click('.coach button:has-text("Next")'); await p.waitForSelector('.coach >> text=Swipe the row of tools')
  await p.click('.coach button:has-text("Next")'); await p.waitForSelector('.coach >> text=red siren'); await p.click('.coach button:has-text("Got it")')
  assert.equal(await p.locator('.coach').count(), 0)
  await reload(p); await p.waitForSelector('.topbar'); assert.equal(await p.locator('.coach').count(), 0, 'once only')
  await tab(p, 'Calendar'); assert.equal(await p.locator('.coach').count(), 0, 'and only on Home')
  await tab(p, 'More'); await p.click('button:has-text("Show Wobbi’s tips again")'); await tab(p, 'Home'); await p.waitForSelector('.coach')
  await p.click('.coach button:has-text("Skip")'); assert.equal(await p.locator('.coach').count(), 0)
  await done(s)
})

const lockOf = p => p.locator('.pro-lock')
test('Pro (web): advanced analytics shows a friendly lock (everything else is free), the paywall says Pro lives in the iPhone app, and safety is never locked', async () => {
  const s = await open(null, { pro: false }); const p = s.page
  assert.equal(await p.locator('[aria-label^="Anxious right now"]').count(), 1, 'SOS is always there')
  await p.click('.guard-tile'); await p.waitForSelector('text=Blocking apps is part of the iPhone app'); assert.equal(await p.locator('.pro-lock').count(), 0, 'Focus guard is free for now'); await p.click('[aria-label=Back]')
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")'); await p.waitForSelector('.pro-lock'); assert.match(await lockOf(p).innerText(), /Advanced analytics/)
  await p.click('.pro-lock button:has-text("Unlock with Pro")'); await p.waitForSelector('[aria-label="Wobbi Pro"]')
  assert.match(await p.locator('[aria-label="Wobbi Pro"]').innerText(), /Pro is part of the iPhone app/); assert.equal(await p.locator('button:has-text("Subscribe"), button:has-text("Start free trial")').count(), 0, 'no purchase button on the web')
  await p.click('[aria-label="Wobbi Pro"] [aria-label=Close]')
  // always free: breathing, SOS flow, export, support
  await tab(p, 'Breathe'); await p.waitForSelector('.techs'); await p.click('[aria-label^="Anxious right now"]'); await p.waitForSelector('input[aria-label="Anxiety right now, 0 to 10"]'); await p.click('[aria-label=Close]')
  await tab(p, 'More'); for (const r of ['Export data', 'Get support']) assert.equal(await p.locator(`.li:has-text("${r}")`).count(), 1, `${r} stays free`)
  await done(s)
})

test('Pro (iPhone): only advanced analytics is gated, the paywall shows price, trial, disclosure and links; buying unlocks; cancelling and restoring behave', async () => {
  const s = await open({ 'bp.anchors': ['a', 'b', 'c'].map((l, i) => ({ id: l, label: 'Anchor ' + l, order: i })), 'bp.thoughts': [rec('t', 0)] }, { native: true, pro: false, time: new Date('2026-10-16T12:00:00') }); const p = s.page
  // free: levels, Today summary, sleep, Focus guard, all five anchors, sync; locked (advanced analytics): proof cards and the week/month summaries
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")'); await p.waitForSelector('h2:has-text("Your skills")'); await p.waitForSelector('.pro-lock'); assert.match(await lockOf(p).innerText(), /Advanced analytics/)
  await p.click('[role=tab]:has-text("Summary")'); await p.waitForSelector('.summary'); await p.click('.seg[aria-label="Summary range"] >> text=This week'); await p.waitForSelector('.pro-lock'); assert.equal(await p.locator('.summary').count(), 0)
  await p.click('.seg[aria-label="Summary range"] >> text=Today'); await p.waitForSelector('.summary')
  await p.click('[role=tab]:has-text("Sleep")'); await p.waitForSelector('text=Apple Health'); assert.equal(await p.locator('.pro-lock').count(), 0, 'sleep is free')
  await tab(p, 'Home'); await p.click('text=Edit'); await p.waitForSelector('text=Ideas'); assert.equal(await p.locator('.pro-lock').count(), 0, 'a 4th and 5th anchor are free'); await p.click('button:has-text("Done")')
  await tab(p, 'More')
  // paywall
  await p.click('.li >> text=Wobbi Pro'); await p.waitForSelector('[aria-label="Wobbi Pro"]')
  const wall = p.locator('[aria-label="Wobbi Pro"]'); const txt = await wall.innerText()
  assert.match(txt, /7-day free trial, then \$4\.99 per month/); assert.match(txt, /auto-renewing subscription/); assert.match(txt, /cancel at least 24 hours/); assert.match(txt, /Always free, for everyone/); assert.match(txt, /SOS siren/)
  assert.ok(await wall.locator('a:has-text("Terms of Service")').count() && await wall.locator('a:has-text("Privacy Policy")').count() && await wall.locator('a:has-text("standard EULA")').count(), 'terms, privacy and EULA links are on the paywall')
  assert.equal(await wall.locator('button:has-text("Restore purchases")').count(), 1); assert.equal(await wall.locator('button:has-text("Start free trial")').count(), 1)
  await wall.locator('button:has-text("Restore purchases")').click(); await wall.locator('text=No active Pro subscription').waitFor()
  await wall.locator('button:has-text("Start free trial")').click(); await p.waitForFunction(() => window.__native.some(c => c.method === 'proPurchase'))      // stub says cancelled: nothing changes
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('bp.pro') ?? 'null')?.active ?? false), false, 'cancelling does not unlock')
  await p.evaluate(() => { window.__reply = { ...window.__reply, 'Mindful.proPurchase': { status: 'purchased', active: true, until: Date.now() + 30 * 864e5 } } })
  await wall.locator('button:has-text("Start free trial")').click(); await p.waitForSelector('text=You’re Pro. Thank you!'); await p.click('button:has-text("Continue")')
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('bp.pro')).active), true)
  await p.click('.tab >> text=Stats'); await p.click('[role=tab]:has-text("Progress")'); await p.waitForFunction(() => !document.querySelector('.pro-lock'))
  await done(s)
})

test('Pro (iPhone): an ended subscription locks again (the store is the authority), and being offline never locks you out early', async () => {
  const s = await open(null, { native: true, pro: false, reply: { 'Mindful.proStatus': { active: false } } }); const p = s.page
  await p.evaluate(() => localStorage.setItem('bp.pro', JSON.stringify({ active: true, until: Date.now() + 864e5, checkedAt: Date.now() })))
  await reload(p); await p.waitForFunction(() => JSON.parse(localStorage.getItem('bp.pro')).active === false)                 // the App Store says it ended
  await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")'); await p.waitForSelector('.pro-lock'); await done(s)
  const t = await open(null, { native: true, pro: false, reply: { 'Mindful.proStatus': { __reject: 'OFFLINE', message: 'no network' } } }); const q = t.page
  await q.evaluate(() => localStorage.setItem('bp.pro', JSON.stringify({ active: true, until: Date.now() + 864e5, checkedAt: Date.now() })))
  await reload(q); await tab(q, 'Stats'); await q.click('[role=tab]:has-text("Progress")'); await q.waitForSelector('h2:has-text("Your skills")'); assert.equal(await q.locator('.pro-lock').count(), 0, 'cached Pro survives an unreachable store')
  await done(t)
})

test('offline first: the app needs no account; sign-in is optional and you can walk away from it', async () => {
  const A = await openCloud({ signedIn: false }); const a = A.page
  await a.click('button:has-text("Not now — keep using it offline")'); await tab(a, 'Home'); await a.waitForSelector('[aria-label="Log mood: good"]')
  await a.click('[aria-label="Log mood: good"]'); await a.click('button:has-text("Just save my mood")'); await a.click('.celebrate .btn.primary'); await a.waitForSelector('.entry'); await tab(a, 'More')
  assert.equal(await a.locator('.li:has-text("Sync across devices")').count(), 1); assert.equal(await a.locator('.li:has-text("Storage") .val').innerText(), 'This device')
  assert.equal(await a.locator('button:has-text("Sign out")').count(), 0, 'nothing to sign out of')
  await done(A)
  const B = await openCloud({ signedIn: false, pro: false, gotoLogin: false }); const b = B.page            // sync is free for now: no Pro needed to reach the sign-in form
  await tab(b, 'More'); assert.equal(await b.locator('.li:has-text("Sync across devices") .val').innerText(), 'Off'); await b.click('.li >> text=Sync across devices')
  await b.waitForSelector('form.card'); assert.equal(await b.locator('[aria-label="Wobbi Pro"]').count(), 0, 'no paywall in front of sync')
  await done(B)
})

test('What’s new: shown once after an update (not on a fresh install), reachable from More; no scroll bars; no streak box', async () => {
  const fresh = await open(); await fresh.page.waitForSelector('.topbar'); assert.equal(await fresh.page.locator('[aria-label="What’s new"]').count(), 0, 'fresh install: first-run covers it')
  assert.equal(await fresh.page.evaluate(() => localStorage.getItem('bp.seenVersion')), '1.0.0')
  assert.equal(await fresh.page.evaluate(() => getComputedStyle(document.documentElement, '::-webkit-scrollbar').display), 'none', 'an app, not a website: no scroll bars')
  await tab(fresh.page, 'Stats'); assert.equal(await fresh.page.locator('.chain .total').count(), 0, 'the streak box is gone from Days in a Row')
  await tab(fresh.page, 'More'); await fresh.page.click('.li >> text=What’s new'); await fresh.page.waitForSelector('[aria-label="What’s new"] >> text=Meet Wobbi'); await fresh.page.click('button:has-text("Got it")'); await done(fresh)
  const upd = await open(); await upd.page.evaluate(() => localStorage.setItem('bp.seenVersion', '0.9.0')); await reload(upd.page)
  await upd.page.waitForSelector('[aria-label="What’s new"]'); assert.match(await upd.page.locator('[aria-label="What’s new"]').innerText(), /Focus guard/)
  await upd.page.click('button:has-text("Got it")'); assert.equal(await upd.page.evaluate(() => localStorage.getItem('bp.seenVersion')), '1.0.0')
  await reload(upd.page); await upd.page.waitForSelector('.topbar'); assert.equal(await upd.page.locator('[aria-label="What’s new"]').count(), 0, 'once only')
  await done(upd)
})

test('layout: calendar days stay in a straight grid with mood faces, and reminder times fit inside their card', async () => {
  const s = await open({ 'bp.thoughts': [rec('c1', 1), rec('c2', 0, { mood: 2 })] }, { native: true }); const p = s.page
  await tab(p, 'Calendar'); await p.waitForSelector('.cal .cell')
  const geo = await p.$$eval('.cal .cell', cells => cells.map(c => { const r = c.getBoundingClientRect(), b = c.querySelector('.bub').getBoundingClientRect(); return { top: Math.round(r.top), w: Math.round(b.width), h: Math.round(b.height) } }))
  const rows = new Map(); geo.forEach(g => rows.set(g.top, (rows.get(g.top) ?? 0) + 1))
  assert.ok([...rows.values()].every(n => n === 7), `every row has exactly 7 aligned days (rows: ${[...rows.values()]})`)
  assert.equal(new Set(geo.map(g => g.w)).size, 1, 'a day with a mood face (and today) is the same size as an empty day'); assert.equal(new Set(geo.map(g => g.h)).size, 1)
  await tab(p, 'More'); await p.click('.li >> text=Reminders'); await p.waitForSelector('[role=switch][aria-label="Morning breathe"]')
  await p.click('[role=switch][aria-label="Morning breathe"]'); await p.waitForSelector('input[type=time]')
  const fit = await p.$eval('input[type=time]', el => { const i = el.getBoundingClientRect(), c = el.closest('.card').getBoundingClientRect(); return { inside: i.right <= c.right + 0.5 && i.left >= c.left - 0.5, i: [i.left, i.right], c: [c.left, c.right] } })
  assert.ok(fit.inside, `time field stays inside its card ${JSON.stringify(fit)}`)
  await done(s)
})

/* ---------- accounts (Supabase fully mocked: no network, no real project) ---------- */
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const JWT = `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: 'u1', role: 'authenticated', aud: 'authenticated', exp: 4102444800 })}.sig`
const USER = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'a@b.co', app_metadata: {}, user_metadata: { name: 'Ada' }, created_at: '2026-01-01T00:00:00Z' }
const SESSION = { access_token: JWT, refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: USER }

const DOC_KINDS = ['journal', 'anchor', 'anchor_check', 'focus', 'manual_night', 'purchase', 'rituals', 'theme']
/** A fake `user_docs` table shared by every "device" that is given the same object. It enforces the same rules as the real table. */
const fakeAccount = () => ({ rows: new Map(), down: false, posts: 0, delay: 0 })
async function openCloud({ providers = { email: true, google: true, apple: true }, native = false, reply, signedIn = false, account = null, seed = null, pro = true, gotoLogin = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const seen = { token: [], authorize: [] }
  await ctx.route('http://127.0.0.1:9/**', async route => {
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
      if (account.delay) await new Promise(r => setTimeout(r, account.delay))            // a slow network: lets a test edit while a sync is in flight
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
    if (pro) await ctx.addInitScript(() => { window.__reply = { ...(window.__reply ?? {}), 'Mindful.proStatus': { active: true, until: 4102444800000 } } })
    if (reply) await ctx.addInitScript(r => { window.__reply = { ...(window.__reply ?? {}), ...r } }, reply)
  }
  await ctx.addInitScript(() => { try { localStorage.setItem('bp.onboarded', '1'); localStorage.setItem('bp.coach.done', '1') } catch { /* ignore */ } })
  if (pro) await ctx.addInitScript(() => { try { localStorage.setItem('bp.pro', JSON.stringify({ active: true, until: 4102444800000, checkedAt: Date.now() })) } catch { /* ignore */ } })
  if (signedIn) await ctx.addInitScript(sess => { if (!localStorage.getItem('sb-127-auth-token')) localStorage.setItem('sb-127-auth-token', JSON.stringify(sess)) }, SESSION)
  if (seed) await ctx.addInitScript(v => { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); for (const [a, b] of Object.entries(v)) localStorage.setItem(a, JSON.stringify(b)) } }, seed)
  const page = await ctx.newPage(); const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()) })
  await page.goto('http://localhost:4177'); await page.waitForSelector('.topbar')
  if (!signedIn && gotoLogin) { await page.click('.tab >> text=More'); await page.click('.li >> text=Sync across devices'); await page.waitForSelector('form.card') }   // offline first: the account is optional and opened on purpose
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
    for (const [i, pg] of opened.entries()) {   // failure evidence for every open page: screenshot + visible text
      if (pg.isClosed()) continue
      mkdirSync(new URL('../test-results/', import.meta.url), { recursive: true })
      const f = name.replace(/\W+/g, '-').slice(0, 50) + (opened.length > 1 ? `-${i}` : '')
      await pg.screenshot({ path: new URL(`../test-results/${f}.png`, import.meta.url).pathname }).catch(() => {})
      console.log(`    page ${i} text:`, JSON.stringify((await pg.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 1200)))
    }
  }
  opened.length = 0
}
await browser.close(); await server.close(); await cloudServer.close()
console.log(failed ? `\n${failed} of ${selected.length} e2e tests FAILED` : `\nAll ${selected.length} e2e tests passed`)
process.exit(failed ? 1 : 0)
