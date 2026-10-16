// npm run store:screens → store/screenshots/{6.9-inch,6.5-inch}/NN-name.png
// Real app screens (local mode, simulated iPhone shell, neutral demo data) framed with a short caption, at the exact sizes App Store Connect asks for.
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { preview } from 'vite'
import { execSync } from 'node:child_process'
import { nativeStub } from './native-stub.mjs'
import { readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const out = join(root, 'store', 'screenshots')
rmSync(out, { recursive: true, force: true })
const SIZES = { '6.9-inch': [1320, 2868], '6.5-inch': [1284, 2778] }   // iPhone 16/17 Pro Max · iPhone 11 Pro Max / XS Max (Apple scales these for the other iPhone sizes)
for (const k of Object.keys(SIZES)) mkdirSync(join(out, k), { recursive: true })

execSync('npx vite build', { cwd: root, stdio: 'pipe', env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' } })
const srv = await preview({ root, preview: { port: 4175, strictPort: true }, build: { outDir: 'dist' } })
const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })

const day = (ago, h = 9) => { const d = new Date(); d.setDate(d.getDate() - ago); d.setHours(h, 10, 0, 0); return d.toISOString() }
const T = (id, ago, mood, emo, inten, tags, text, extra = {}) => ({ id, createdAt: day(ago, 9 + (id.length % 8)), mood, situation: '', thought: text, emotions: [{ name: emo, intensity: inten }], internalBehaviour: '', externalBehaviour: '', alternateThought: '', outcomeIntensity: null, tags, distortions: [], photos: [], ...extra })
const thoughts = [
  T('a', 0, 4, 'calm', 30, ['work'], 'Prepared my notes the night before — it helped', { alternateThought: 'A wobble is okay; I can keep going' }),
  T('b', 1, 3, 'anxious', 70, ['work'], 'Worried the presentation will go badly', { distortions: ['fortune telling'], alternateThought: 'I have prepared, and one slip would not ruin it', outcomeIntensity: 35 }),
  T('c', 2, 4, 'happy', 25, ['friends'], 'Good walk and a chat with a friend'),
  T('d', 3, 2, 'stressed', 75, ['sleep'], 'Slept badly, everything feels heavier'),
  T('e', 4, 5, 'grateful', 20, ['family'], 'Slow Sunday with family'),
  T('f', 6, 4, 'relaxed', 20, ['home'], 'Quiet evening, breathing helped'),
  T('g', 7, 3, 'worried', 55, ['money'], 'Thinking about next month’s bills'),
  T('h', 9, 5, 'proud', 15, ['work'], 'Finished the thing I had been putting off'),
  T('i', 11, 4, 'calm', 20, ['friends'], 'Coffee with a friend'),
  T('j', 13, 3, 'tired', 40, ['sleep'], 'Long day'),
]
const sessions = [0, 1, 2, 3, 5, 6, 8].map((ago, i) => ({ id: 's' + i, createdAt: day(ago, 20), pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }, cycles: 6, durationSec: 384, completed: true, kind: i % 3 ? 'breathing' : 'grounding', anxietyBefore: 7, anxietyAfter: 4 }))
const worries = [['Rent is due on Friday', 'actionable', 'Pay on Thursday morning'], ['The meeting next week', 'open', null], ['What if the flight is delayed', 'let-go', null]]
  .map(([text, status, action], i) => ({ id: 'w' + i, createdAt: day(0, 8 + i), text, status, action, reviewedAt: status === 'open' ? null : day(0, 12) }))
const journal = [{ id: 'j1', createdAt: day(0, 8), updatedAt: day(0, 8), title: 'Small wins', body: 'Three good things today: a slow breakfast, a message from a friend, and finishing early.', mood: 4, tags: ['gratitude'] }]
const anchors = ['Slow breathing', 'Walk 10 minutes', 'Write one line', 'Call a friend', 'Get some sunlight'].map((label, i) => ({ id: 'n' + i, label, emoji: ['wind', 'walk', 'notebook', 'phone', 'sun'][i], link: i === 0 ? 'breathing' : i === 2 ? 'journal' : null, createdAt: day(20) }))

const font = readFileSync(join(root, 'node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2')).toString('base64')
const mascot = 'data:image/svg+xml;base64,' + readFileSync(join(root, 'public/icon.svg')).toString('base64')

async function capture(fn) {
  const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, permissions: ['notifications', 'microphone'] })
  await ctx.addInitScript(nativeStub)
  await ctx.addInitScript(([t, s, w, j, a]) => {
    localStorage.setItem('bp.onboarded', '1'); localStorage.setItem('bp.levels.seen', JSON.stringify({ calming: 9, reframing: 9, worry: 9, consistency: 9, journaling: 9, smallsteps: 9 }))
    if (!localStorage.getItem('bp.thoughts')) { localStorage.setItem('bp.thoughts', JSON.stringify(t)); localStorage.setItem('bp.sessions', JSON.stringify(s)); localStorage.setItem('bp.worries', JSON.stringify(w)); localStorage.setItem('bp.journal', JSON.stringify(j)); localStorage.setItem('bp.anchors', JSON.stringify(a)) }
  }, [thoughts, sessions, worries, journal, anchors])
  const p = await ctx.newPage()
  await p.goto('http://localhost:4175'); await p.waitForSelector('.topbar')
  await fn(p); await p.waitForTimeout(500)
  const png = await p.screenshot(); await ctx.close(); return png
}
const tab = (p, n) => p.click(`.tab >> text=${n}`)

const SHOTS = [
  ['01-check-in', 'Check in with one tap', p => p.waitForSelector('.quickmood, .today')],
  ['02-calm', 'Calm your body in minutes', async p => { await tab(p, 'Breathe'); await p.click('text=Start'); await p.waitForTimeout(5200) }],
  ['03-calendar', 'See your month at a glance', p => tab(p, 'Calendar')],
  ['04-worries', 'Park worries, plan one small step', async p => { await tab(p, 'More'); await p.click('.li >> text=Worry time'); await p.waitForTimeout(300) }],
  ['05-progress', 'Proof you’re growing', async p => { await tab(p, 'Stats'); await p.click('[role=tab]:has-text("Progress")') }],
  ['06-journal', 'A private place to write', async p => { await p.click('.home-seg >> text=Journal') }],
]

const frame = (png, caption, [W, H]) => `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:N;src:url(data:font/woff2;base64,${font});font-weight:200 1000}
*{margin:0;box-sizing:border-box}body{width:${W}px;height:${H}px;overflow:hidden;font-family:N,system-ui,sans-serif;color:#fff;
background:radial-gradient(120% 70% at 50% 0%,#2a6a63 0%,#17304f 45%,#0b1424 100%);position:relative}
.top{position:absolute;left:0;right:0;top:${Math.round(H * .045)}px;text-align:center;padding:0 ${Math.round(W * .08)}px}
.mascot{width:${Math.round(W * .12)}px;height:${Math.round(W * .12)}px;border-radius:${Math.round(W * .027)}px;margin-bottom:${Math.round(H * .012)}px}
h1{font-weight:900;font-size:${Math.round(W * .082)}px;line-height:1.08;letter-spacing:-.01em;text-shadow:0 4px 24px rgba(0,0,0,.35)}
.phone{position:absolute;left:50%;transform:translateX(-50%);top:${Math.round(H * .235)}px;width:${Math.round(W * .8)}px;border-radius:${Math.round(W * .07)}px;border:${Math.round(W * .012)}px solid #314a73;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.55)}
.phone img{display:block;width:100%}</style>
<div class=top><img class=mascot src="${mascot}"><h1>${caption}</h1></div><div class=phone><img src="data:image/png;base64,${png.toString('base64')}"></div>`

for (const [name, caption, fn] of SHOTS) {
  const png = await capture(fn)
  for (const [dir, size] of Object.entries(SIZES)) {
    const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 })
    const pg = await ctx.newPage(); await pg.setContent(frame(png, caption, size)); await pg.waitForTimeout(250)
    await pg.screenshot({ path: join(out, dir, `${name}.png`) }); await ctx.close()
  }
  console.log('•', name)
}
await browser.close(); await srv.close()
console.log(`store/screenshots written (${SHOTS.length} × ${Object.keys(SIZES).length})`)
