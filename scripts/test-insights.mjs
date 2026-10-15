import assert from 'node:assert/strict'
import { reliefStats, triggerStats, trapStats, timeOfDay, roughPatch, anxietyPeak } from '../src/lib/insights.ts'

const t = (o = {}) => ({ id: Math.random() + '', createdAt: '2026-10-14T09:00:00', mood: 3, emotions: [], tags: [], distortions: [], ...o })
const e = (name, intensity) => ({ name, intensity })

assert.equal(anxietyPeak(t({ emotions: [e('happy', 90), e('anxious', 40), e('afraid', 70)] })), 70)
assert.equal(anxietyPeak(t({ emotions: [e('happy', 90)] })), 0)

assert.equal(reliefStats([]), null)
assert.deepEqual(reliefStats([{ anxietyBefore: 8, anxietyAfter: 4 }, { anxietyBefore: 6, anxietyAfter: 5 }, { anxietyBefore: 5, anxietyAfter: 6 }, { anxietyBefore: null, anxietyAfter: null }]),
  { n: 3, avgDrop: 1.3, helped: 2 })

const th = [
  t({ tags: ['work'], emotions: [e('anxious', 80)] }), t({ tags: ['work', 'sleep'], emotions: [e('stressed', 60)] }),
  t({ tags: ['sleep'], emotions: [e('afraid', 90)] }), t({ tags: ['family'], emotions: [e('anxious', 99)] }), // family n=1 -> excluded
  t({ tags: ['work'], emotions: [e('happy', 99)] }), // not anxious -> ignored
]
assert.deepEqual(triggerStats(th), [{ tag: 'sleep', n: 2, avg: 75 }, { tag: 'work', n: 2, avg: 70 }])

assert.deepEqual(trapStats([t({ distortions: ['mind reading', 'catastrophizing'] }), t({ distortions: ['catastrophizing'] })]), [['catastrophizing', 2], ['mind reading', 1]])

const tod = timeOfDay([t({ createdAt: '2026-10-14T09:00:00', emotions: [e('anxious', 50)] }), t({ createdAt: '2026-10-14T23:30:00', emotions: [e('anxious', 50)] }), t({ createdAt: '2026-10-14T03:00:00', emotions: [e('anxious', 50)] }), t({ createdAt: '2026-10-14T10:00:00' })])
assert.deepEqual(tod.map(x => x.count), [1, 0, 0, 2])

const now = new Date('2026-10-15T12:00:00')
const mk = (d, mood) => t({ createdAt: `2026-10-${d}T10:00:00`, mood })
assert.equal(roughPatch([mk(14, 1), mk(13, 2), mk(12, 2), mk(11, 4)], now), true)
assert.equal(roughPatch([mk(14, 1), mk(13, 4), mk(12, 5), mk(11, 2)], now), false)
assert.equal(roughPatch([mk(14, 1), mk(13, 1)], now), false)           // too few entries
assert.equal(roughPatch([mk('01', 1), mk('02', 1), mk('03', 1)], now), false) // older than 14 days
console.log('insights: all tests passed')
