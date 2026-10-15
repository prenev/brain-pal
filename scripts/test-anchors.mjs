import assert from 'node:assert/strict'
import { activeAnchors, anchorStreak, anchorsOnDay, activityFrom, canAdd, checkKey, cleanLabel, dayProgress, MAX_ANCHORS, reorder } from '../src/lib/anchors.ts'

const A = (id, createdAt = '2026-10-01T09:00:00', extra = {}) => ({ id, label: id, emoji: 'sun', link: null, order: Number(id.replace(/\D/g, '')) || 0, createdAt, archivedAt: null, ...extra })
const none = { checkin: new Set(), breathing: new Set(), journal: new Set(), worry: new Set() }
const ck = (...pairs) => new Set(pairs.map(([id, d]) => checkKey(id, d)))

// cap
const five = [1, 2, 3, 4, 5].map(n => A('a' + n))
assert.equal(MAX_ANCHORS, 5); assert.equal(canAdd(five), false); assert.equal(canAdd(five.slice(1)), true)
assert.equal(canAdd([...five.slice(1), A('a9', undefined, { archivedAt: '2026-10-02T00:00:00' })]), true, 'archived ones do not count')
assert.deepEqual(activeAnchors([A('a3'), A('a1'), A('a2', undefined, { archivedAt: 'x' })]).map(a => a.id), ['a1', 'a3'])
assert.equal(cleanLabel('  Walk   outside \n now  '), 'Walk outside now'); assert.equal(cleanLabel('x'.repeat(99)).length, 40)

// progress: manual, auto-linked, both, none
const a = [A('a1'), A('a2', undefined, { link: 'breathing' }), A('a3', undefined, { link: 'checkin' })]
const act = activityFrom({ thoughts: [{ createdAt: '2026-10-05T23:30:00' }], sessions: [{ createdAt: '2026-10-05T07:00:00' }], worries: [{ reviewedAt: null }] })
let p = dayProgress(a, '2026-10-05', ck(['a1', '2026-10-05']), act)
assert.deepEqual([p.done, p.total, p.complete], [3, 3, true]); assert.deepEqual(p.items.map(i => i.auto), [false, true, true])
p = dayProgress(a, '2026-10-06', ck(['a1', '2026-10-06']), act)
assert.deepEqual([p.done, p.complete], [1, false], 'auto links only count on the day they happened')
assert.deepEqual(dayProgress([], '2026-10-06', new Set(), none), { done: 0, total: 0, complete: false, items: [] }, 'no anchors is never "complete"')
assert.equal(activityFrom({ thoughts: [], sessions: [], journal: [{ createdAt: '2026-10-05T10:00:00' }], worries: [{ reviewedAt: '2026-10-05T10:00:00' }] }).worry.has('2026-10-05'), true)

// history is not rewritten: an anchor added/archived later doesn't affect earlier days
const hist = [A('a1', '2026-10-01T09:00:00'), A('a2', '2026-10-10T09:00:00', { archivedAt: '2026-10-12T09:00:00' })]
assert.deepEqual(anchorsOnDay(hist, '2026-10-09').map(x => x.id), ['a1'])
assert.deepEqual(anchorsOnDay(hist, '2026-10-11').map(x => x.id), ['a1', 'a2'])
assert.deepEqual(anchorsOnDay(hist, '2026-10-12').map(x => x.id), ['a1'], 'archived from its archive day on')

// streak: counts back from today, or from yesterday while today is unfinished; resets on a gap
const s = [A('a1', '2026-09-28T09:00:00')]
const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07']
const checks = ck(...days.map(d => ['a1', d]))
const now = d => new Date(`${d}T12:00:00`)
assert.deepEqual(anchorStreak(s, checks, none, now('2026-10-07')), { current: 3, longest: 3, completeToday: true })
assert.deepEqual(anchorStreak(s, checks, none, now('2026-10-08')), { current: 3, longest: 3, completeToday: false }, 'alive until the end of tomorrow')
assert.equal(anchorStreak(s, checks, none, now('2026-10-09')).current, 0, 'two missed days end it')
assert.equal(anchorStreak(s, checks, none, now('2026-10-04')).current, 3, 'the 3-day run before the gap is still alive on the gap day')
assert.deepEqual(anchorStreak([], new Set(), none), { current: 0, longest: 0, completeToday: false })
// year boundary + all anchors required
const y = [A('a1', '2026-12-20T09:00:00'), A('a2', '2026-12-20T09:00:00')]
const yc = ck(...['2026-12-30', '2026-12-31', '2027-01-01'].flatMap(d => [['a1', d], ['a2', d]]), ['a1', '2027-01-02'])
assert.equal(anchorStreak(y, yc, none, now('2027-01-01')).current, 3)
assert.equal(anchorStreak(y, yc, none, now('2027-01-02')).current, 3, 'a half-done today does not break it yet')

// reorder swaps neighbours, ignores the ends
const r = reorder([A('a1'), A('a2'), A('a3')], 'a2', -1)
assert.deepEqual(activeAnchors(r).map(x => x.id), ['a2', 'a1', 'a3'])
assert.deepEqual(reorder(r, 'a2', -1), r); assert.deepEqual(activeAnchors(reorder(r, 'a3', 1)).map(x => x.id), ['a2', 'a1', 'a3'])
console.log('anchors: all tests passed')
