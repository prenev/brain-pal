import assert from 'node:assert/strict'
import { ALL_DAYS, allRitualIds, DEFAULT_RITUALS, fmtTime, ID_STRIDE, MAX_RITUALS, MAX_SCHEDULED, migrateOldReminder, normalizeRituals, planRituals, RITUAL_BASE_ID, ritualText } from '../src/lib/rituals.ts'

const none = { checkin: false, breathedAm: false, breathedPm: false, anchorsComplete: false, journaled: false }
const R = (id, kind, hour, minute = 0, extra = {}) => ({ id, kind, label: id, hour, minute, days: ALL_DAYS, enabled: true, ...extra })
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min)   // local time, like the app

// nothing enabled -> nothing planned
assert.deepEqual(planRituals(at(2026, 10, 15, 6), DEFAULT_RITUALS, none), [])

// morning + evening breathe at 06:00 on a Thursday: both fire today, 14 days each, sorted by time
const both = [R('morning-breathe', 'breathe', 7), R('evening-breathe', 'breathe', 21, 30)]
let plan = planRituals(at(2026, 10, 15, 6), both, none)
assert.equal(plan.length, 28); assert.deepEqual(plan.map(p => p.at.getTime()), [...plan.map(p => p.at.getTime())].sort((a, b) => a - b))
assert.deepEqual([plan[0].at.getHours(), plan[0].at.getMinutes(), plan[0].ritualId], [7, 0, 'morning-breathe'])
assert.deepEqual([plan[1].at.getHours(), plan[1].at.getMinutes()], [21, 30]); assert.equal(plan[0].route, 'breathe')
// ids are unique, stable per ritual+day, and inside the cancel-all range
assert.equal(new Set(plan.map(p => p.id)).size, 28)
assert.equal(plan.find(p => p.ritualId === 'morning-breathe' && p.at.getDate() === 15).id, RITUAL_BASE_ID + 0 * ID_STRIDE + 0)
assert.equal(plan.find(p => p.ritualId === 'evening-breathe' && p.at.getDate() === 16).id, RITUAL_BASE_ID + 1 * ID_STRIDE + 1)
const ids = new Set(allRitualIds()); assert.ok(plan.every(p => ids.has(p.id)))

// past times are skipped: at 08:00 the 07:00 one starts tomorrow
plan = planRituals(at(2026, 10, 15, 8), [R('m', 'breathe', 7)], none)
assert.equal(plan.length, 13); assert.equal(plan[0].at.getDate(), 16)
// exactly at the time counts as passed
assert.equal(planRituals(at(2026, 10, 15, 7), [R('m', 'breathe', 7)], none)[0].at.getDate(), 16)

// weekdays only (Mon-Fri = 1..5): Thursday 15th fires, Sat 17th / Sun 18th don't
plan = planRituals(at(2026, 10, 15, 6), [R('w', 'breathe', 7, 0, { days: [1, 2, 3, 4, 5] })], none)
assert.equal(plan.length, 10); assert.ok(plan.every(p => ![0, 6].includes(p.at.getDay())))

// skip today once done — per kind and per half of the day; tomorrow is unaffected
const skipCase = (rit, done) => planRituals(at(2026, 10, 15, 6), [rit], { ...none, ...done })
assert.equal(skipCase(R('c', 'checkin', 20), { checkin: true }).length, 13)
assert.equal(skipCase(R('c', 'checkin', 20), { breathedAm: true }).length, 14, 'unrelated activity does not skip')
assert.equal(skipCase(R('m', 'breathe', 7), { breathedAm: true }).length, 13); assert.equal(skipCase(R('m', 'breathe', 7), { breathedPm: true }).length, 14, 'an evening session does not cancel the morning ritual')
assert.equal(skipCase(R('e', 'breathe', 21), { breathedPm: true }).length, 13)
assert.equal(skipCase(R('a', 'anchors', 12), { anchorsComplete: true }).length, 13); assert.equal(skipCase(R('j', 'journal', 21), { journaled: true }).length, 13)
assert.equal(skipCase(R('c', 'checkin', 20), { checkin: true })[0].at.getDate(), 16)

// budget: never more than the cap, even with a full house
const four = [R('a', 'breathe', 7), R('b', 'breathe', 21), R('c', 'checkin', 20), R('d', 'anchors', 12)]
assert.equal(planRituals(at(2026, 10, 15, 0, 1), four, none).length, 56); assert.ok(56 <= MAX_SCHEDULED && MAX_SCHEDULED <= 64)
assert.equal(planRituals(at(2026, 10, 15, 0, 1), [...four, R('e', 'journal', 22)], none).length, 56, 'a fifth ritual is ignored')
assert.equal(MAX_RITUALS, 4)
// disabled rituals plan nothing; a month boundary and DST-adjacent dates still produce local wall-clock times
assert.deepEqual(planRituals(at(2026, 10, 15, 6), [R('x', 'breathe', 7, 0, { enabled: false })], none), [])
plan = planRituals(at(2026, 10, 28, 6), [R('m', 'breathe', 7)], none)
assert.ok(plan.every(p => p.at.getHours() === 7 && p.at.getMinutes() === 0), 'always 07:00 local, including across the clock change')
assert.equal(plan[4].at.getMonth(), 10)

// wording: deterministic per day, varied across days, gentle (no guilt words)
assert.deepEqual(ritualText('breathe', '2026-10-15'), ritualText('breathe', '2026-10-15'))
const bodies = new Set(Array.from({ length: 20 }, (_, i) => ritualText('breathe', `2026-10-${String(i + 1).padStart(2, '0')}`).body)); assert.ok(bodies.size >= 2)
for (const k of ['breathe', 'checkin', 'journal', 'anchors']) for (let i = 1; i < 20; i++) assert.doesNotMatch(Object.values(ritualText(k, `2026-10-${String(i).padStart(2, '0')}`)).join(' '), /miss|fail|lose|lost|don.t break|behind/i)

// migration keeps an existing reminder as the check-in ritual
let m = migrateOldReminder({ enabled: true, hour: 9 })
assert.deepEqual([m.find(r => r.id === 'checkin').enabled, m.find(r => r.id === 'checkin').hour], [true, 9]); assert.ok(m.filter(r => r.id !== 'checkin').every(r => !r.enabled))
assert.equal(migrateOldReminder({ enabled: false, hour: 30 }).find(r => r.id === 'checkin').hour, 23)
assert.deepEqual(migrateOldReminder(null), DEFAULT_RITUALS); assert.equal(migrateOldReminder({}).find(r => r.id === 'checkin').hour, 20)

// stored data is sanitised, never trusted
assert.deepEqual(normalizeRituals('garbage'), DEFAULT_RITUALS); assert.deepEqual(normalizeRituals(null), DEFAULT_RITUALS)
const n = normalizeRituals([{ id: 'checkin', hour: 99, minute: -5, days: [9, 'x', 2, 2], enabled: 1 }, { id: 'nope', hour: 1 }, null])
const c = n.find(r => r.id === 'checkin'); assert.deepEqual([c.hour, c.minute, c.days, c.enabled], [20, 0, [2], true]); assert.equal(n.length, 4)
assert.deepEqual(normalizeRituals([{ id: 'morning-breathe', hour: 6, minute: 45, days: [], enabled: true }]).find(r => r.id === 'morning-breathe').days, ALL_DAYS, 'an empty weekday list falls back to every day')
assert.equal(fmtTime(7, 5), '07:05')
console.log('rituals: all tests passed')
