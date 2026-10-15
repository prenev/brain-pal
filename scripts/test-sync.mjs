import assert from 'node:assert/strict'
import { detectLocal, dirtyCount, keyOf, markSynced, reconcile, stableHash, uniqueDocs } from '../src/lib/sync.ts'

const item = (id, data, kind = 'journal') => ({ kind, id, data })
const doc = (id, data, updatedAt, deleted = false, kind = 'journal') => ({ kind, id, data: deleted ? null : data, deleted, updatedAt })

/* ---- hashing ---- */
assert.equal(stableHash({ a: 1, b: [1, 2] }), stableHash({ b: [1, 2], a: 1 }), 'key order does not matter')
assert.notEqual(stableHash({ a: 1 }), stableHash({ a: 2 })); assert.notEqual(stableHash([1, 2]), stableHash([2, 1])); assert.notEqual(stableHash(null), stableHash('null'))
assert.equal(stableHash({ a: undefined, b: 1 }), stableHash({ b: 1 }), 'undefined fields are ignored'); assert.match(stableHash('x'), /^[0-9a-f]{8}$/)

/* ---- detectLocal ---- */
let r = detectLocal({}, [item('1', { t: 'a' })], 100)
assert.deepEqual(r.dirty, [doc('1', { t: 'a' }, 100)]); assert.equal(dirtyCount(r.meta), 1)
// unchanged item keeps its old time and is not dirty once synced
let meta = markSynced(r.meta, r.dirty)
r = detectLocal(meta, [item('1', { t: 'a' })], 200); assert.deepEqual(r.dirty, []); assert.equal(r.meta[keyOf('journal', '1')].updatedAt, 100)
// an edit bumps the time and is dirty
r = detectLocal(meta, [item('1', { t: 'b' })], 300); assert.deepEqual(r.dirty, [doc('1', { t: 'b' }, 300)])
// removing an item leaves a tombstone, once
r = detectLocal(meta, [], 400); assert.deepEqual(r.dirty, [doc('1', null, 400, true)])
const tomb = markSynced(r.meta, r.dirty); assert.deepEqual(detectLocal(tomb, [], 500).dirty, [], 'a synced tombstone is not re-sent'); assert.equal(detectLocal(tomb, [], 500).meta[keyOf('journal', '1')].updatedAt, 400)
// re-creating a deleted item brings it back (newer than the tombstone)
r = detectLocal(tomb, [item('1', { t: 'a' })], 600); assert.deepEqual(r.dirty, [doc('1', { t: 'a' }, 600)]); assert.equal(r.meta[keyOf('journal', '1')].deleted, false)
// unsynced work is retried on every run (a failed push is not forgotten)
const pending = detectLocal({}, [item('1', 1), item('2', 2)], 10); const again = detectLocal(pending.meta, [item('1', 1), item('2', 2)], 20)
assert.deepEqual(again.dirty.map(d => d.updatedAt).sort(), [10, 10], 'keeps the original edit time, not the retry time')
// kinds are separate namespaces; ids may contain the separator
r = detectLocal({}, [item('x', 1, 'journal'), item('x', 2, 'anchor'), item('a|b', 3, 'anchor_check')], 5); assert.equal(r.dirty.length, 3)
assert.deepEqual(r.dirty.find(d => d.kind === 'anchor_check'), doc('a|b', 3, 5, false, 'anchor_check'))

/* ---- markSynced only for the version that was sent ---- */
const m0 = detectLocal({}, [item('1', 'v1')], 10).meta
const edited = detectLocal(m0, [item('1', 'v2')], 20).meta               // edited again while the first push was in flight
assert.equal(markSynced(edited, [doc('1', 'v1', 10)])[keyOf('journal', '1')].synced, false, 'the newer edit is still unsynced')
assert.equal(markSynced(edited, [doc('1', 'v2', 20)])[keyOf('journal', '1')].synced, true)

/* ---- reconcile: first sign-in on a new device ---- */
let rec = reconcile({}, [], [doc('1', 'a', 100), doc('2', 'b', 110)])
assert.deepEqual(rec.apply.map(d => d.id), ['1', '2']); assert.deepEqual(rec.push, []); assert.equal(dirtyCount(rec.meta), 0)
// a remote tombstone for something we never had is just remembered
rec = reconcile({}, [], [doc('9', null, 50, true)]); assert.deepEqual(rec.apply, []); assert.equal(rec.meta[keyOf('journal', '9')].deleted, true)

/* ---- newest edit wins, both directions ---- */
const base = markSynced(detectLocal({}, [item('1', 'old')], 100).meta, [doc('1', 'old', 100)])
rec = reconcile(base, [item('1', 'old')], [doc('1', 'newer remote', 200)])
assert.deepEqual(rec.apply, [doc('1', 'newer remote', 200)]); assert.deepEqual(rec.push, []); assert.equal(rec.meta[keyOf('journal', '1')].updatedAt, 200)
const localNew = detectLocal(base, [item('1', 'local edit')], 300)
rec = reconcile(localNew.meta, [item('1', 'local edit')], [doc('1', 'old', 100)])
assert.deepEqual(rec.apply, []); assert.deepEqual(rec.push.map(d => [d.id, d.data, d.updatedAt]), [['1', 'local edit', 300]])
rec = reconcile(localNew.meta, [item('1', 'local edit')], [doc('1', 'remote at 250', 250)]); assert.deepEqual(rec.apply, [], 'our 300 beats their 250'); assert.equal(rec.push.length, 1)
rec = reconcile(localNew.meta, [item('1', 'local edit')], [doc('1', 'remote at 350', 350)]); assert.equal(rec.apply[0].data, 'remote at 350'); assert.deepEqual(rec.push, [])

/* ---- deletes ---- */
// deleted on another device (newer) -> removed here
rec = reconcile(base, [item('1', 'old')], [doc('1', null, 200, true)]); assert.deepEqual(rec.apply, [doc('1', null, 200, true)])
// we edited after they deleted -> the edit wins and is pushed back (the item is resurrected)
rec = reconcile(localNew.meta, [item('1', 'local edit')], [doc('1', null, 200, true)]); assert.deepEqual(rec.apply, []); assert.equal(rec.push[0].deleted, false)
// we deleted (newer) while the server still has the item -> push the tombstone
const delLocal = detectLocal(base, [], 400)
rec = reconcile(delLocal.meta, [], [doc('1', 'old', 100)]); assert.deepEqual(rec.apply, []); assert.deepEqual(rec.push, [doc('1', null, 400, true)])
// both deleted -> nothing to do
rec = reconcile(markSynced(delLocal.meta, delLocal.dirty), [], [doc('1', null, 400, true)]); assert.deepEqual([rec.apply, rec.push], [[], []])

/* ---- ties converge: both devices pick the same winner ---- */
const A = detectLocal({}, [item('1', 'from A')], 500), B = detectLocal({}, [item('1', 'from B')], 500)
const aSeesB = reconcile(A.meta, [item('1', 'from A')], [doc('1', 'from B', 500)]), bSeesA = reconcile(B.meta, [item('1', 'from B')], [doc('1', 'from A', 500)])
const winnerOnA = aSeesB.apply.length ? 'from B' : 'from A', winnerOnB = bSeesA.apply.length ? 'from A' : 'from B'
assert.equal(winnerOnA, winnerOnB, 'same timestamp, same winner on both devices')
// identical on both sides: just marked synced
const same = detectLocal({}, [item('1', 'same')], 500); rec = reconcile(same.meta, [item('1', 'same')], [doc('1', 'same', 500)]); assert.deepEqual([rec.apply, rec.push], [[], []]); assert.equal(dirtyCount(rec.meta), 0)

/* ---- the server lost something we thought was synced: it is sent again (but tombstones and unknown items are not) ---- */
const synced = markSynced(detectLocal({}, [item('keep', 'k'), item('gone', 'g')], 10).meta, [doc('keep', 'k', 10), doc('gone', 'g', 10)])
const afterGone = detectLocal(synced, [item('keep', 'k')], 20); const tombSynced = markSynced(afterGone.meta, afterGone.dirty)
rec = reconcile(tombSynced, [item('keep', 'k')], [])      // server is empty
assert.deepEqual(rec.push.map(d => [d.id, d.data, d.updatedAt]), [['keep', 'k', 10]], 'only the live item is re-sent'); assert.equal(rec.meta[keyOf('journal', 'keep')].synced, false)
assert.deepEqual(reconcile(tombSynced, [item('keep', 'k')], [doc('keep', 'k', 10), doc('gone', null, 20, true)]).push, [], 'present on the server: nothing to do')

/* ---- idempotent: a second pass over the same data does nothing ---- */
const remoteSet = [doc('1', 'a', 100), doc('2', 'b', 110), doc('3', null, 120, true)]
const once = reconcile({}, [], remoteSet); const twice = reconcile(once.meta, [item('1', 'a'), item('2', 'b')], remoteSet)
assert.deepEqual([twice.apply, twice.push], [[], []]); assert.deepEqual(twice.meta, once.meta)

/* ---- a full two-device conversation converges ---- */
const server = new Map()
const pushTo = docs => { for (const d of docs) { const cur = server.get(keyOf(d.kind, d.id)); if (!cur || d.updatedAt >= cur.updatedAt) server.set(keyOf(d.kind, d.id), d) } }
const device = () => ({ meta: {}, items: new Map() })
const syncDevice = (dev, now) => {
  const cur = () => [...dev.items.entries()].map(([id, data]) => item(id, data))
  const l = detectLocal(dev.meta, cur(), now)
  const rec = reconcile(l.meta, cur(), [...server.values()])
  for (const d of rec.apply) d.deleted ? dev.items.delete(d.id) : dev.items.set(d.id, d.data)
  const out = uniqueDocs([...l.dirty, ...rec.push]); pushTo(out); dev.meta = markSynced(rec.meta, out)
}
const d1 = device(), d2 = device()
d1.items.set('a', 'one'); d1.items.set('b', 'two'); syncDevice(d1, 1000); syncDevice(d2, 1100)
assert.deepEqual([...d2.items.entries()], [['a', 'one'], ['b', 'two']], 'device 2 receives everything')
d2.items.set('a', 'one edited on 2'); d1.items.delete('b'); syncDevice(d2, 2000); syncDevice(d1, 2100); syncDevice(d2, 2200)
assert.deepEqual([...d1.items.entries()], [['a', 'one edited on 2']]); assert.deepEqual([...d2.items.entries()], [['a', 'one edited on 2']], 'edit and delete both propagate')
d1.items.set('a', 'edit on 1 at 3000'); d2.items.set('a', 'edit on 2 at 3100'); syncDevice(d1, 3000); syncDevice(d2, 3100); syncDevice(d1, 3200); syncDevice(d2, 3300)
assert.equal(d1.items.get('a'), 'edit on 2 at 3100'); assert.equal(d2.items.get('a'), 'edit on 2 at 3100', 'the later edit wins everywhere')
d1.items.set('c', 'new'); syncDevice(d1, 4000); d1.items.delete('c'); syncDevice(d1, 4100); syncDevice(d2, 4200); assert.equal(d2.items.has('c'), false, 'created and deleted before the other device ever saw it')
// offline: nothing reaches the server, work is retried and nothing is lost
const off = device(); off.items.set('x', 'made offline'); const l = detectLocal(off.meta, [item('x', 'made offline')], 5000); off.meta = l.meta   // push failed: not marked synced
assert.equal(dirtyCount(off.meta), 1); syncDevice(off, 5100); assert.equal(server.get(keyOf('journal', 'x')).data, 'made offline'); assert.equal(dirtyCount(off.meta), 0)

assert.deepEqual(uniqueDocs([doc('1', 'a', 1), doc('1', 'b', 2), doc('2', 'c', 3)]).map(d => d.data), ['b', 'c'])
console.log('sync: all tests passed')
