import assert from 'node:assert/strict'
import { CHALLENGES, DEFAULT_GUARD, UNLOCK_OPTIONS, MIN_REP_GAP_MS, normalizeGuard, normalizeEvents, canEnable, newReps, addRep, repsDone, unlockUntil, isUnlocked, minutesLeft, weekStats, challengeOf } from '../src/lib/guard.ts'

// challenges are well-formed and unique
assert.equal(new Set(CHALLENGES.map(c => c.id)).size, CHALLENGES.length)
for (const c of CHALLENGES) { assert.ok(c.target > 0 && c.label && c.how && c.pose, c.id) }
assert.equal(challengeOf('pushups').target, 10); assert.equal(challengeOf('nope'), undefined)

// normalising: junk never crashes, defaults come back
assert.deepEqual(normalizeGuard(null), DEFAULT_GUARD); assert.deepEqual(normalizeGuard('x'), DEFAULT_GUARD); assert.deepEqual(normalizeGuard([]), DEFAULT_GUARD)
assert.deepEqual(normalizeGuard({ enabled: true, challenges: ['squats', 'squats', 'bogus'], unlockMinutes: 15, appCount: 3 }), { enabled: true, challenges: ['squats'], unlockMinutes: 15, appCount: 3 })
assert.deepEqual(normalizeGuard({ enabled: 'yes', challenges: [], unlockMinutes: 7, appCount: -2 }), { ...DEFAULT_GUARD, enabled: false }, 'only a real `true` enables; bad numbers and an empty list fall back')
assert.equal(normalizeGuard({ appCount: 2.5 }).appCount, 0)
assert.equal(normalizeEvents('x').length, 0)
assert.equal(normalizeEvents([{ id: 'a', at: '2026-10-01T10:00:00Z', challenge: 'pushups', minutes: 10, reps: 10 }, { id: 'b', at: 'x', challenge: 'nope' }, null]).length, 1)
assert.equal(normalizeEvents(Array.from({ length: 300 }, (_, i) => ({ id: 'e' + i, at: '2026-10-01T10:00:00Z', challenge: 'plank', minutes: 5, reps: 0 }))).length, 200, 'history is capped')

// enabling needs the iPhone app, apps, and an activity
const ok = { ...DEFAULT_GUARD, appCount: 2 }
assert.equal(canEnable(ok, true), true); assert.equal(canEnable(ok, false), false); assert.equal(canEnable({ ...ok, appCount: 0 }, true), false); assert.equal(canEnable({ ...ok, challenges: [] }, true), false)

// rep counting: tapping faster than one per ~second does not count
let s = newReps(); let r = addRep(s, 1000); assert.equal(r.counted, true); s = r.state
r = addRep(s, 1000 + MIN_REP_GAP_MS - 1); assert.equal(r.counted, false); assert.equal(r.state.reps, 1, 'too fast: ignored'); assert.equal(r.state, s)
r = addRep(s, 1000 + MIN_REP_GAP_MS); assert.equal(r.counted, true); assert.equal(r.state.reps, 2)
let t = 0; let st = newReps(); for (let i = 0; i < 40; i++) { t += 100; st = addRep(st, t).state }
assert.ok(st.reps <= 5, `button-mashing for 4 s counts at most ~5 reps, got ${st.reps}`)
st = newReps(); for (let i = 0; i < 10; i++) st = addRep(st, i * 1000).state
assert.equal(st.reps, 10); assert.equal(repsDone(st, 10), true); assert.equal(repsDone({ reps: 9, lastAt: 0 }, 10), false)

// unlock window
const now = Date.UTC(2026, 9, 16, 12, 0, 0)
const until = unlockUntil(now, 10); assert.equal(until - now, 600_000)
assert.equal(isUnlocked(until, now), true); assert.equal(isUnlocked(until, until), false, 'the instant it ends it is locked'); assert.equal(isUnlocked(null, now), false); assert.equal(isUnlocked(undefined, now), false)
assert.equal(minutesLeft(until, now), 10); assert.equal(minutesLeft(until, now + 1), 10); assert.equal(minutesLeft(until, until + 5), 0)
assert.ok(UNLOCK_OPTIONS.includes(10))

// this week
const d = (ago) => new Date(Date.UTC(2026, 9, 16 - ago, 12)).toISOString()
const ev = [{ id: '1', at: d(0), challenge: 'pushups', minutes: 10, reps: 10 }, { id: '2', at: d(3), challenge: 'squats', minutes: 10, reps: 15 }, { id: '3', at: d(6), challenge: 'plank', minutes: 5, reps: 0 }, { id: '4', at: d(7), challenge: 'plank', minutes: 5, reps: 0 }]
assert.deepEqual(weekStats(ev, new Date(now)), { challenges: 3, reps: 25, minutesEarned: 25 }, 'a rolling 7 days including today; day 8 is out')
assert.deepEqual(weekStats([], new Date(now)), { challenges: 0, reps: 0, minutesEarned: 0 })
console.log('guard: all tests passed')
