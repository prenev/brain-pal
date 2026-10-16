import assert from 'node:assert/strict'
import { buildSnapshot, wobbiLine, normalizeActions, planActions, MAX_WIDGET_ANCHORS, MAX_MOODS_PER_DRAIN, WIDGET_VERSION } from '../src/lib/widgetData.ts'
import { pickPrompt } from '../src/lib/journal.ts'

const now = new Date(2026, 9, 16, 15, 0)          // Fri 16 Oct 2026, 15:00 local
const at = (d, h = 10) => new Date(2026, 9, d, h, 0).toISOString()
const empty = { now, thoughts: [], streak: { current: 0, activeToday: false }, anchors: [], worriesOpen: 0, nights: [], coins: 0, focus: { block: false, apps: 0, goal: 4, blocks: [] }, sessions: [], journal: [] }

/* empty: a valid snapshot that still says something friendly */
let s = buildSnapshot(empty)
assert.equal(s.v, WIDGET_VERSION); assert.equal(s.day, '2026-10-16'); assert.equal(s.hasData, false)
assert.equal(s.week.length, 7); assert.equal(s.week[6].day, '2026-10-16'); assert.equal(s.week[0].day, '2026-10-10')
assert.deepEqual(s.week.map(d => d.letter), ['S', 'S', 'M', 'T', 'W', 'T', 'F'])
assert.equal(s.todayMood, null); assert.deepEqual(s.sleep, { lastMin: null, avgMin: null })
assert.equal(s.prompt, pickPrompt('2026-10-16').text)
assert.equal(s.wobbi.pose, 'wave'); assert.ok(s.wobbi.text.length > 5)
assert.doesNotThrow(() => JSON.stringify(s))

/* moods: the day shows the latest mood logged, not an average; out-of-week entries are ignored */
s = buildSnapshot({ ...empty, thoughts: [{ createdAt: at(16, 9), mood: 2 }, { createdAt: at(16, 14), mood: 4 }, { createdAt: at(12), mood: 3 }, { createdAt: at(1), mood: 1 }], streak: { current: 1, activeToday: true } })
assert.equal(s.todayMood, 4, 'latest of the day wins')
assert.equal(s.week[6].mood, 4); assert.equal(s.week[2].mood, 3); assert.equal(s.week[3].mood, null)
assert.equal(s.hasData, true)

/* anchors: capped to what fits, state passed through */
const anchors = Array.from({ length: 7 }, (_, n) => ({ anchor: { id: 'a' + n, label: 'A' + n, emoji: 'walk' }, done: n < 2, auto: n === 1, manual: n === 0 }))
s = buildSnapshot({ ...empty, anchors })
assert.equal(s.anchors.length, MAX_WIDGET_ANCHORS); assert.deepEqual(s.anchors[1], { id: 'a1', label: 'A1', emoji: 'walk', done: true, auto: true })

/* sleep: last night only if it is recent; average leaves last night out */
const nights = [{ date: '2026-10-16', asleepMin: 440 }, { date: '2026-10-15', asleepMin: 400 }, { date: '2026-10-14', asleepMin: 380 }, { date: '2026-09-01', asleepMin: 100 }]
s = buildSnapshot({ ...empty, nights })
assert.equal(s.sleep.lastMin, 440); assert.equal(s.sleep.avgMin, 390, 'old nights and last night are excluded from the average')
assert.equal(s.week[6].sleepMin, 440); assert.equal(s.week[5].sleepMin, 400)
assert.equal(buildSnapshot({ ...empty, nights: [{ date: '2026-10-10', asleepMin: 400 }] }).sleep.lastMin, null, 'a week-old night is not "last night"')

/* focus (in the old guard slot): finished pomodoro blocks today + minutes, the goal, a 7-day count; other focus sessions don't count */
const blk = (d, sec, step = 'Pomodoro', completed = true) => ({ createdAt: at(d), actualSec: sec, completed, step })
s = buildSnapshot({ ...empty, focus: { block: true, apps: 3, goal: 4, blocks: [blk(16, 1500), blk(16, 1500, 'Pomodoro · Report'), blk(16, 600, 'Pomodoro', false), blk(16, 300, 'Open the tax form'), blk(14, 1500), blk(2, 1500)] } })
assert.deepEqual(s.guard, { enabled: true, apps: 3, challenges: 2, reps: 4, minutes: 50, week: [0, 0, 0, 0, 1, 0, 2] })
assert.equal(buildSnapshot({ ...empty, focus: { block: true, apps: 0, goal: 4, blocks: [] } }).guard.enabled, false, 'blocking with no apps chosen is off')

/* Wobbi's line follows the data, in priority order */
const line = over => buildSnapshot({ ...empty, ...over }).wobbi
assert.equal(line({ thoughts: [{ createdAt: at(16), mood: 3 }], anchors: anchors.slice(0, 2).map(a => ({ ...a, done: true })), streak: { current: 5, activeToday: true } }).pose, 'celebrate', 'all anchors done beats everything')
assert.match(line({ thoughts: [{ createdAt: at(16), mood: 3 }], streak: { current: 5, activeToday: true } }).text, /^5 days in a row/)
assert.match(line({ thoughts: [at(11), at(13), at(15)].map(c => ({ createdAt: c, mood: 3 })), streak: { current: 1, activeToday: false } }).text, /3 days this week/)
assert.equal(line({ thoughts: [{ createdAt: at(16), mood: 1 }], streak: { current: 1, activeToday: true } }).pose, 'love', 'a rough day gets warmth, not a stat')
assert.match(line({ thoughts: [{ createdAt: at(13), mood: 3 }], streak: { current: 0, activeToday: false } }).text, /How’s your head/)
assert.equal(typeof wobbiLine, 'function')

/* queued actions: junk is dropped */
assert.deepEqual(normalizeActions(null), []); assert.deepEqual(normalizeActions({}), [])
const t = now.getTime()
const raw = [
  { kind: 'mood', mood: 4, at: t - 1000 }, { kind: 'mood', mood: 6, at: t }, { kind: 'mood', mood: 2.5, at: t }, { kind: 'mood', mood: 3 },
  { kind: 'anchor', id: 'a0', done: true, day: '2026-10-16', at: t }, { kind: 'anchor', id: '', done: true, day: 'x', at: t }, { kind: 'anchor', id: 'a1', done: 'yes', day: 'x', at: t },
  { kind: 'nuke', at: t }, null, 'x',
]
assert.deepEqual(normalizeActions(raw), [{ kind: 'mood', mood: 4, at: t - 1000 }, { kind: 'anchor', id: 'a0', done: true, day: '2026-10-16', at: t }])

/* planning moods: logged at tap time, old/future/duplicate taps dropped, capped */
const items = [{ anchor: { id: 'a0' }, manual: false, auto: false }, { anchor: { id: 'a1' }, manual: true, auto: false }, { anchor: { id: 'a2' }, manual: false, auto: true }]
let p = planActions([{ kind: 'mood', mood: 4, at: t - 60_000 }, { kind: 'mood', mood: 4, at: t - 60_000 }, { kind: 'mood', mood: 2, at: t - 49 * 3600_000 }, { kind: 'mood', mood: 5, at: t + 3600_000 }], now, items)
assert.deepEqual(p.moods, [{ mood: 4, createdAt: new Date(t - 60_000).toISOString() }])
p = planActions(Array.from({ length: 30 }, (_, n) => ({ kind: 'mood', mood: 3, at: t - n * 1000 })), now, items)
assert.equal(p.moods.length, MAX_MOODS_PER_DRAIN); assert.equal(p.moods.at(-1).createdAt, now.toISOString(), 'keeps the newest')
assert.ok(p.moods.every((m, n, a) => !n || a[n - 1].createdAt <= m.createdAt), 'oldest first')

/* planning anchors: last tap wins, only today, never fights an automatic tick, no-op when already there */
const A = (id, done, day = '2026-10-16', dt = 0) => ({ kind: 'anchor', id, done, day, at: t + dt })
assert.deepEqual(planActions([A('a0', true)], now, items).toggles, ['a0'])
assert.deepEqual(planActions([A('a0', true), A('a0', false, '2026-10-16', 10)], now, items).toggles, [], 'ticked then unticked = nothing to do')
assert.deepEqual(planActions([A('a0', true, '2026-10-15')], now, items).toggles, [], "yesterday's tick does not land on today")
assert.deepEqual(planActions([A('a1', true)], now, items).toggles, [], 'already ticked')
assert.deepEqual(planActions([A('a1', false)], now, items).toggles, ['a1'])
assert.deepEqual(planActions([A('a2', false)], now, items).toggles, [], 'automatic ticks are left alone')
assert.deepEqual(planActions([A('gone', true)], now, items).toggles, [], 'a removed anchor is ignored')

console.log('widgets ok')
