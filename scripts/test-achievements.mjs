import assert from 'node:assert/strict'
import { achievements, familyProgress, FAMILIES, longestRun, newlyUnlocked, streakMilestoneDays, TIER_COINS, TIERS } from '../src/lib/achievements.ts'
import { COLLECTIBLES } from '../src/lib/shop.ts'

const data = (o = {}) => ({ thoughts: [], sessions: [], journal: [], focus: [], worries: [], anchorDays: [], sleepDates: [], collectDays: [], streakDays: [], ...o })
const run = n => Array.from({ length: n }, (_, i) => { const d = new Date(2026, 8, 1 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })
const th = (day, alt = '') => ({ createdAt: `${day}T10:00:00`, alternateThought: alt })
const byId = (all, id) => all.find(a => a.id === id)

// the table is sane: every family has increasing thresholds, tiers in order, unique ids, and a reachable top tier
const all0 = achievements(data())
assert.equal(new Set(all0.map(a => a.id)).size, all0.length)
for (const f of FAMILIES) {
  assert.ok(f.tiers.length >= 3 && f.tiers.length <= 5, f.id)
  assert.deepEqual(f.tiers.map(t => t.at), [...f.tiers.map(t => t.at)].sort((a, b) => a - b), f.id + ' thresholds increase')
  assert.deepEqual(f.tiers.map(t => TIERS.indexOf(t.tier)), f.tiers.map((_, i) => i), f.id + ' tiers go bronze → diamond')
  assert.ok(f.tiers[0].at <= 7, f.id + ': the first tier is a first step')
  assert.ok(f.tiers.at(-1).at <= 500, f.id + ': the last tier is reachable')
}
assert.ok(all0.every(a => !a.unlocked && a.day === null && a.progress === 0))
assert.ok(FAMILIES.find(f => f.id === 'collector').tiers.at(-1).at <= COLLECTIBLES.length, 'you can own enough collectibles for the top collector tier')
assert.deepEqual(TIERS.map(t => TIER_COINS[t]), [10, 20, 40, 75, 150], 'rewards are small and rise gently')

// counts unlock at the n-th event, dated that day
const t10 = Array.from({ length: 10 }, (_, i) => th(run(10)[i]))
let all = achievements(data({ thoughts: t10 }))
assert.equal(byId(all, 'checkin-1').day, '2026-09-01'); assert.equal(byId(all, 'checkin-10').day, '2026-09-10'); assert.equal(byId(all, 'checkin-50').unlocked, false)
assert.equal(byId(all, 'checkin-50').progress, 10 / 50)
// reframing needs an actual balanced thought
all = achievements(data({ thoughts: [th('2026-09-01'), th('2026-09-02', '  '), th('2026-09-03', 'It is okay')] }))
assert.equal(byId(all, 'reframe-1').day, '2026-09-03'); assert.equal(byId(all, 'checkin-1').day, '2026-09-01')
// unfinished sessions / focus blocks and open worries do not count
all = achievements(data({ sessions: [{ createdAt: '2026-09-01T10:00:00', completed: false }], focus: [{ createdAt: '2026-09-01T10:00:00', completed: false }], worries: [{ status: 'open', reviewedAt: null }] }))
for (const id of ['calm-1', 'focus-1', 'worry-1']) assert.equal(byId(all, id).unlocked, false, id)
all = achievements(data({ sessions: [{ createdAt: '2026-09-02T10:00:00', completed: true }], focus: [{ createdAt: '2026-09-03T10:00:00', completed: true }], worries: [{ status: 'let-go', reviewedAt: '2026-09-04T10:00:00' }] }))
assert.deepEqual(['calm-1', 'focus-1', 'worry-1'].map(id => byId(all, id).day), ['2026-09-02', '2026-09-03', '2026-09-04'])
// anchors: only days with EVERY anchor done; sleep: once a night; guard; collector
all = achievements(data({ anchorDays: [{ day: '2026-09-01', done: 2, total: 3 }, { day: '2026-09-02', done: 3, total: 3 }, { day: '2026-09-03', done: 0, total: 0 }], sleepDates: ['2026-09-05', '2026-09-05'], collectDays: ['2026-09-07'] }))
assert.equal(byId(all, 'anchors-1').day, '2026-09-02'); assert.equal(byId(all, 'sleep-1').day, '2026-09-05'); assert.equal(byId(all, 'sleep-7').unlocked, false)
assert.equal(byId(all, 'collector-1').day, '2026-09-07')
// focus time: the day the n-th full hour of FINISHED focus was reached
all = achievements(data({ focus: [{ createdAt: '2026-09-01T10:00:00', completed: true, actualSec: 1500 }, { createdAt: '2026-09-02T10:00:00', completed: true, actualSec: 2400 }, { createdAt: '2026-09-03T10:00:00', completed: false, actualSec: 3600 }, { createdAt: '2026-09-04T10:00:00', completed: true, actualSec: 14400 }] }))
assert.equal(byId(all, 'hours-1').day, '2026-09-02'); assert.equal(byId(all, 'hours-5').day, '2026-09-04'); assert.equal(byId(all, 'hours-5').count, 5, 'unfinished blocks do not count'); assert.equal(byId(all, 'hours-20').unlocked, false); assert.equal(byId(all, 'hours-1').text, 'Focused for 1 hour')
// showing up counts distinct days of any activity
all = achievements(data({ thoughts: Array.from({ length: 7 }, (_, i) => th(run(7)[i])), sessions: [{ createdAt: '2026-09-01T09:00:00', completed: true }] }))
assert.equal(byId(all, 'days-7').day, '2026-09-07')

// streaks: consecutive days only, dated when reached, and progress remembers the best run
assert.deepEqual([...streakMilestoneDays(run(8), [3, 7])], [[3, '2026-09-03'], [7, '2026-09-07']])
assert.deepEqual([...streakMilestoneDays(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05'], [3])], [], 'a gap resets the run')
assert.deepEqual([...streakMilestoneDays(['2026-12-30', '2026-12-31', '2027-01-01'], [3])], [[3, '2027-01-01']], 'across the year boundary')
assert.equal(longestRun([]), 0); assert.equal(longestRun(['2026-10-01', '2026-10-03']), 1); assert.equal(longestRun(run(9)), 9)
all = achievements(data({ streakDays: [...run(8), '2026-10-20'] }))
assert.equal(byId(all, 'streak-7').day, '2026-09-07'); assert.equal(byId(all, 'streak-14').unlocked, false); assert.equal(byId(all, 'streak-14').count, 8, 'the best run is remembered after a gap')
assert.equal(byId(all, 'streak-3').text, 'Kept a 3-day streak')

// copy reads naturally
assert.equal(byId(achievements(data()), 'checkin-1').text, 'Logged 1 check-in'); assert.equal(byId(achievements(data()), 'checkin-10').text, 'Logged 10 check-ins')

// first run is quiet; after that new ones come most valuable first; seen ones never repeat
const got = achievements(data({ thoughts: t10, streakDays: run(7) }))
assert.deepEqual(newlyUnlocked(got, null), [])
const seen = got.filter(a => a.unlocked).map(a => a.id)
assert.deepEqual(newlyUnlocked(got, seen), [])
const more = newlyUnlocked(got, seen.filter(id => id !== 'checkin-10' && id !== 'streak-7'))
assert.deepEqual(more.map(a => a.id), ['streak-7', 'checkin-10'].sort((x, y) => { const f = id => got.find(a => a.id === id); return f(y).tierIndex - f(x).tierIndex || f(y).at - f(x).at }))

// progress per family
const fp = familyProgress(got).find(p => p.fam.id === 'checkin')
assert.equal(fp.got.length, 2); assert.equal(fp.next.at, 50); assert.equal(fp.count, 10)
console.log('achievements: all tests passed')
