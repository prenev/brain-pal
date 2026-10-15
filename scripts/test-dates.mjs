import assert from 'node:assert/strict'
import { computeStreak, dayKey, lastNDays } from '../src/lib/dates.ts'

const now = new Date(2026, 9, 15, 12) // 15 Oct 2026, local noon
assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05')
assert.deepEqual(lastNDays(3, now), ['2026-10-13', '2026-10-14', '2026-10-15'])
assert.deepEqual(lastNDays(3, new Date(2026, 2, 2)), ['2026-02-28', '2026-03-01', '2026-03-02']) // month boundary

const S = (...d) => new Set(d)
assert.deepEqual(computeStreak(S(), now), { current: 0, longest: 0, activeToday: false })
assert.deepEqual(computeStreak(S('2026-10-15'), now), { current: 1, longest: 1, activeToday: true })
assert.deepEqual(computeStreak(S('2026-10-13', '2026-10-14'), now), { current: 2, longest: 2, activeToday: false })  // alive until end of today
assert.equal(computeStreak(S('2026-10-12', '2026-10-13'), now).current, 0)                                     // missed yesterday: broken
assert.deepEqual(computeStreak(S('2026-10-15', '2026-10-14', '2026-10-13', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'), now), { current: 3, longest: 5, activeToday: true })
assert.equal(computeStreak(S('2026-09-30', '2026-10-01'), new Date(2026, 9, 1, 9)).current, 2)                   // across months
console.log('dates: all tests passed')
