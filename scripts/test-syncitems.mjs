import assert from 'node:assert/strict'
import { applyDocs, collectItems, unchangedSince } from '../src/lib/syncItems.ts'
import { DEFAULT_RITUALS } from '../src/lib/rituals.ts'
import { detectLocal, keyOf, markSynced } from '../src/lib/sync.ts'

const empty = () => ({ journal: [], anchors: [], checks: new Set(), focus: [], manualNights: [], purchases: [], rituals: DEFAULT_RITUALS.map(r => ({ ...r })), themeId: null })
const J = (id, t = 'x') => ({ id, createdAt: '2026-10-15T10:00:00Z', updatedAt: '2026-10-15T10:00:00Z', title: t, body: 'b', mood: null, tags: [], prompt: null })
const doc = (kind, id, data, updatedAt = 1, deleted = false) => ({ kind, id, data: deleted ? null : data, deleted, updatedAt })

/* ---- collect: every collection becomes items; the single-doc kinds only exist when meaningful ---- */
const x = { ...empty(), journal: [J('j1')], anchors: [{ id: 'a1', label: 'Walk', emoji: 'walk', link: null, order: 1, createdAt: 'x', archivedAt: null }], checks: new Set(['a1|2026-10-15']),
  focus: [{ id: 'f1', createdAt: 'x', minutes: 5, actualSec: 300, completed: true, worryId: null, step: 's' }], manualNights: [{ date: '2026-10-15', start: 1, end: 2, asleepMin: 400 }], purchases: [{ id: 'p1', itemId: 'treat', at: 'x', cost: 25 }], themeId: 'theme-ocean' }
const items = collectItems(x)
assert.deepEqual(items.map(i => i.kind).sort(), ['anchor', 'anchor_check', 'focus', 'journal', 'manual_night', 'purchase', 'rituals', 'theme'])
assert.deepEqual(items.find(i => i.kind === 'anchor_check'), { kind: 'anchor_check', id: 'a1|2026-10-15', data: { key: 'a1|2026-10-15' } })
assert.equal(collectItems(empty()).some(i => i.kind === 'theme'), false, 'no theme item without a theme'); assert.equal(collectItems(empty()).filter(i => i.kind === 'rituals').length, 1)

/* ---- apply: add, replace, delete, per kind; input untouched ---- */
const base = { ...empty(), journal: [J('j1', 'old'), J('j2')], checks: new Set(['a|d1']), themeId: 'theme-ocean' }
const snapshot = JSON.stringify([...base.journal]) + [...base.checks]
let out = applyDocs(base, [doc('journal', 'j1', J('j1', 'new')), doc('journal', 'j2', null, 2, true), doc('journal', 'j3', J('j3'))])
assert.deepEqual(out.journal.map(j => [j.id, j.title]), [['j1', 'new'], ['j3', 'x']]); assert.equal(JSON.stringify([...base.journal]) + [...base.checks], snapshot, 'does not mutate its input')
out = applyDocs(base, [doc('anchor_check', 'a|d2', { key: 'a|d2' }), doc('anchor_check', 'a|d1', null, 2, true)]); assert.deepEqual([...out.checks], ['a|d2'])
out = applyDocs(base, [doc('theme', 'theme', null, 2, true)]); assert.equal(out.themeId, null)
out = applyDocs(base, [doc('theme', 'theme', { id: 'theme-berry' })]); assert.equal(out.themeId, 'theme-berry')
out = applyDocs(base, [doc('rituals', 'all', [{ id: 'checkin', hour: 9, minute: 30, days: [1, 2], enabled: true }])]); const c = out.rituals.find(r => r.id === 'checkin'); assert.deepEqual([c.hour, c.minute, c.days, c.enabled], [9, 30, [1, 2], true]); assert.equal(out.rituals.length, 4)
out = applyDocs(base, [doc('manual_night', '2026-10-14', { date: '2026-10-14', start: 1, end: 2, asleepMin: 300 }), doc('purchase', 'p9', { id: 'p9', itemId: 'treat', cost: 25 }), doc('anchor', 'a9', { id: 'a9', label: 'L', createdAt: 'x' }), doc('focus', 'f9', { id: 'f9', createdAt: 'x' })])
assert.deepEqual([out.manualNights.length, out.purchases.length, out.anchors.length, out.focus.length], [1, 1, 1, 1])

/* ---- hostile / malformed remote data is ignored, never crashes the app ---- */
out = applyDocs(base, [doc('journal', 'bad1', 'a string'), doc('journal', 'bad2', { id: 5 }), doc('journal', 'bad3', null, 1, false), doc('purchase', 'p', { id: 'p', itemId: 'x', cost: -5 }), doc('manual_night', 'n', { date: 'x' }),
  doc('anchor_check', 'no-separator', { key: 'z' }), doc('theme', 'theme', { id: 42 }), doc('rituals', 'all', 'junk')])
assert.deepEqual(out.journal.map(j => j.id), ['j1', 'j2'], 'invalid journal docs dropped'); assert.equal(out.purchases.length, 0); assert.equal(out.manualNights.length, 0)
assert.deepEqual([...out.checks], ['a|d1']); assert.equal(out.themeId, 'theme-ocean'); assert.deepEqual(out.rituals, DEFAULT_RITUALS, 'junk rituals fall back to defaults')

/* ---- a local edit made while a sync was in flight is never overwritten ---- */
const before = { ...empty(), journal: [J('j1', 'v1')] }, l = detectLocal({}, collectItems(before), 10), meta = markSynced(l.meta, l.dirty)
const edited = { ...before, journal: [J('j1', 'v2 typed during sync')] }
const incoming = [doc('journal', 'j1', J('j1', 'remote'), 99), doc('journal', 'j2', J('j2'), 99)]
assert.deepEqual(unchangedSince(incoming, collectItems(before), meta).map(d => d.id), ['j1', 'j2'], 'untouched locally: apply')
assert.deepEqual(unchangedSince(incoming, collectItems(edited), meta).map(d => d.id), ['j2'], 'edited locally since: skip, the next round sorts it out')
assert.equal(keyOf('journal', 'j1'), 'journal|j1')
console.log('syncitems: all tests passed')
