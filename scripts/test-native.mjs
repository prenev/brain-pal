import assert from 'node:assert/strict'
import { parseAuthLink, pendingHealthSessions, planReminderDates, reminderText, toImpactSequence } from '../src/lib/nativeCore.ts'

/* ---- vibration pattern -> Taptic taps ---- */
assert.deepEqual(toImpactSequence([30, 110, 40, 90, 50, 70, 70]), [  // inhale: swells
  { at: 0, style: 'LIGHT' }, { at: 140, style: 'MEDIUM' }, { at: 270, style: 'MEDIUM' }, { at: 390, style: 'HEAVY' }])
assert.deepEqual(toImpactSequence([70, 70, 50, 90, 40, 110, 30]), [  // exhale: fades
  { at: 0, style: 'HEAVY' }, { at: 140, style: 'MEDIUM' }, { at: 280, style: 'MEDIUM' }, { at: 430, style: 'LIGHT' }])
assert.deepEqual(toImpactSequence([40]), [{ at: 0, style: 'MEDIUM' }])   // hold tick
assert.deepEqual(toImpactSequence(30), [{ at: 0, style: 'LIGHT' }])
assert.deepEqual(toImpactSequence(90), [{ at: 0, style: 'HEAVY' }])
assert.deepEqual(toImpactSequence([]), []); assert.deepEqual(toImpactSequence([0, 50, 0]), [])  // zero-length "on" = no tap
for (const p of [[30, 110, 40, 90, 50, 70, 70], [70, 70, 50, 90, 40, 110, 30]]) {               // taps never closer than 100 ms (Taptic limit)
  const s = toImpactSequence(p); for (let i = 1; i < s.length; i++) assert.ok(s[i].at - s[i - 1].at >= 100)
}

/* ---- reminder schedule ---- */
const at = (d, h, m = 0) => new Date(2026, 9, d, h, m)
let ds = planReminderDates(at(15, 12), 20)                       // before 8 pm: today counts
assert.equal(ds.length, 14); assert.equal(ds[0].getTime(), at(15, 20).getTime()); assert.equal(ds[13].getTime(), at(28, 20).getTime())
ds = planReminderDates(at(15, 21), 20); assert.equal(ds.length, 13); assert.equal(ds[0].getTime(), at(16, 20).getTime())  // after 8 pm: starts tomorrow
ds = planReminderDates(at(15, 12), 20, 14, true); assert.equal(ds.length, 13); assert.equal(ds[0].getTime(), at(16, 20).getTime()) // already checked in today
assert.equal(planReminderDates(at(15, 20), 20)[0].getTime(), at(16, 20).getTime())                   // exactly 8:00 -> already due, skip
assert.equal(planReminderDates(new Date(2026, 11, 30, 12), 9)[1].getTime(), new Date(2027, 0, 1, 9).getTime())  // year boundary
assert.equal(planReminderDates(at(15, 12), 20, 3).length, 3); assert.ok(planReminderDates(at(15, 12), 0).every(d => d.getHours() === 0))
assert.equal(reminderText(0).title, 'How are you feeling?'); assert.match(reminderText(5).title, /streak/i)

/* ---- auth deep links ---- */
assert.deepEqual(parseAuthLink('brainpal://auth#access_token=AT&refresh_token=RT&type=magiclink'), { kind: 'tokens', access_token: 'AT', refresh_token: 'RT', type: 'magiclink' })
assert.equal(parseAuthLink('brainpal://auth#access_token=AT&refresh_token=RT&type=recovery').type, 'recovery')
assert.deepEqual(parseAuthLink('brainpal://auth?code=abc123'), { kind: 'code', code: 'abc123' })
assert.deepEqual(parseAuthLink('brainpal://auth#error=access_denied&error_description=Email+link+is+invalid+or+has+expired'), { kind: 'error', message: 'Email link is invalid or has expired' })
for (const bad of ['https://evil.com/#access_token=a&refresh_token=b', 'brainpal://other#access_token=a&refresh_token=b', 'brainpal://auth', 'brainpal://auth#access_token=only', 'not a url', '']) assert.equal(parseAuthLink(bad), null, bad)

/* ---- Apple Health backlog ---- */
const S = (id, createdAt, durationSec) => ({ id, createdAt, durationSec })
const out = pendingHealthSessions([S('b', '2026-10-15T10:10:00.000Z', 120), S('a', '2026-10-14T09:00:00.000Z', 60), S('short', '2026-10-15T11:00:00.000Z', 5), S('done', '2026-10-13T09:00:00.000Z', 60)], new Set(['done']))
assert.deepEqual(out.map(x => x.session.id), ['a', 'b'])                                   // oldest first; synced + too-short skipped
assert.equal(out[1].end, Date.parse('2026-10-15T10:10:00.000Z')); assert.equal(out[1].start, out[1].end - 120000)
assert.deepEqual(pendingHealthSessions([], new Set()), [])
console.log('native: all tests passed')
