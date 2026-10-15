import assert from 'node:assert/strict'
import { CALM_START_SEC, elapsedMs, finishTimer, FOCUS_OPTIONS, fmtClock, focusMinutes, isDone, pauseTimer, remainingMs, resumeTimer, startTimer, stepChoices, TINY_STEPS, timerProgress } from '../src/lib/focus.ts'

const MIN = 60_000, T0 = 1_000_000
assert.deepEqual([...FOCUS_OPTIONS], [5, 10, 25]); assert.equal(CALM_START_SEC, 60)

// a running timer is a pure function of timestamps
let t = startTimer(5, T0)
assert.equal(elapsedMs(t, T0), 0); assert.equal(remainingMs(t, T0), 5 * MIN); assert.equal(timerProgress(t, T0), 0)
assert.equal(elapsedMs(t, T0 + 90_000), 90_000); assert.equal(timerProgress(t, T0 + 150_000), 0.5)
assert.equal(isDone(t, T0 + 5 * MIN - 1), false); assert.equal(isDone(t, T0 + 5 * MIN), true)
assert.equal(elapsedMs(t, T0 + 99 * MIN), 5 * MIN, 'never past the total, even if the tab slept for hours')
assert.equal(elapsedMs(t, T0 - 5000), 0, 'a clock that jumps backwards counts as zero, not negative')

// pause stops the clock; resume continues from where it was
t = pauseTimer(t, T0 + 2 * MIN)
assert.equal(t.status, 'paused'); assert.equal(elapsedMs(t, T0 + 2 * MIN), 2 * MIN); assert.equal(elapsedMs(t, T0 + 60 * MIN), 2 * MIN, 'paused time is free')
assert.equal(pauseTimer(t, T0 + 3 * MIN), t, 'pausing twice changes nothing')
t = resumeTimer(t, T0 + 10 * MIN)
assert.equal(t.status, 'running'); assert.equal(elapsedMs(t, T0 + 10 * MIN), 2 * MIN); assert.equal(remainingMs(t, T0 + 11 * MIN), 2 * MIN)
assert.equal(isDone(t, T0 + 13 * MIN), true)
assert.equal(resumeTimer(t, T0 + 11 * MIN), t, 'resuming a running timer changes nothing')
// pause/resume many times never loses or invents time
let u = startTimer(25, 0), now = 0
for (let i = 0; i < 10; i++) { now += 30_000; u = pauseTimer(u, now); now += 123_456; u = resumeTimer(u, now) }
assert.equal(elapsedMs(u, now), 10 * 30_000)
// cannot resume a timer that already ran out while paused-at-end
const full = pauseTimer(startTimer(5, 0), 5 * MIN); assert.equal(resumeTimer(full, 6 * MIN), full)

// finishing early freezes the time spent
const early = finishTimer(startTimer(10, T0), T0 + 3 * MIN)
assert.deepEqual([early.status, elapsedMs(early, T0 + 99 * MIN), isDone(early, T0)], ['finished', 3 * MIN, true])
assert.equal(startTimer(0, 0).totalMs, MIN, 'a zero-minute timer is clamped to one minute')

// clock formatting rounds up
assert.deepEqual([fmtClock(0), fmtClock(1), fmtClock(59_000), fmtClock(60_000), fmtClock(25 * MIN), fmtClock(-5)], ['00:00', '00:01', '00:59', '01:00', '25:00', '00:00'])

// step choices: only plans for open ("actionable") worries without a finished focus session; newest first; capped
const w = (id, status, action, createdAt) => ({ id, status, action, createdAt })
const worries = [w('a', 'actionable', 'Email the landlord', '2026-10-10T10:00:00Z'), w('b', 'actionable', '  ', '2026-10-11T10:00:00Z'), w('c', 'let-go', 'ignored', '2026-10-12T10:00:00Z'),
  w('d', 'actionable', 'Book the dentist', '2026-10-13T10:00:00Z'), w('e', 'open', null, '2026-10-14T10:00:00Z'), w('f', 'actionable', 'Pay the invoice', '2026-10-09T10:00:00Z')]
let c = stepChoices(worries, [])
assert.deepEqual(c.fromWorries.map(x => x.text), ['Book the dentist', 'Email the landlord', 'Pay the invoice']); assert.equal(c.fromWorries[0].worryId, 'd')
assert.deepEqual(c.ideas.map(x => x.text), TINY_STEPS); assert.ok(c.ideas.every(x => x.worryId === null))
c = stepChoices(worries, [{ worryId: 'd', completed: true }, { worryId: 'a', completed: false }])
assert.deepEqual(c.fromWorries.map(x => x.worryId), ['a', 'f'], 'a finished step drops off; an abandoned one stays')
assert.equal(stepChoices(Array.from({ length: 9 }, (_, i) => w('x' + i, 'actionable', 'step ' + i, `2026-10-0${i + 1}T10:00:00Z`)), []).fromWorries.length, 5)
assert.deepEqual(stepChoices([], []).fromWorries, [])

assert.equal(focusMinutes([{ completed: true, actualSec: 300 }, { completed: true, actualSec: 650 }, { completed: false, actualSec: 9999 }]), 16)
assert.equal(focusMinutes([]), 0)
console.log('focus: all tests passed')
