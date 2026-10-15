import assert from 'node:assert/strict'
import { evidenceLine, levelFor, levelUps, LEVEL_THRESHOLDS, MAX_LEVEL, skillCounts, skillLevels } from '../src/lib/levels.ts'
import { milestones, MIN_OVERALL, MIN_POINTS, proofCards } from '../src/lib/proof.ts'

/* ---- levels ---- */
assert.deepEqual(levelFor(0), { level: 0, count: 0, next: 1, toNext: 1, progress: 0 })
assert.equal(levelFor(1).level, 1); assert.equal(levelFor(2).level, 1); assert.equal(levelFor(3).level, 2)
assert.deepEqual(levelFor(5), { level: 2, count: 5, next: 7, toNext: 2, progress: 0.5 })
assert.equal(levelFor(250).level, MAX_LEVEL); assert.deepEqual(levelFor(9999), { level: 10, count: 9999, next: null, toNext: null, progress: 1 })
assert.equal(levelFor(-4).level, 0); assert.equal(levelFor(2.9).count, 2)
let last = -1; for (let c = 0; c < 300; c++) { const l = levelFor(c).level; assert.ok(l >= last, 'levels are monotonic in the count'); last = l }
for (const [i, t] of LEVEL_THRESHOLDS.entries()) { assert.equal(levelFor(t).level, i + 1); assert.equal(levelFor(t - 1).level, i, `just below ${t}`) }

const day = n => new Date(2026, 9, 1 + n, 12).toISOString()
const data = {
  thoughts: [{ createdAt: day(0), alternateThought: 'balanced' }, { createdAt: day(0), alternateThought: '  ' }, { createdAt: day(1), alternateThought: '' }],
  sessions: [{ createdAt: day(1), completed: true }, { createdAt: day(2), completed: false }, { createdAt: day(2), completed: true }],
  worries: [{ createdAt: day(0), status: 'let-go', reviewedAt: day(3) }, { createdAt: day(0), status: 'open', reviewedAt: null }, { createdAt: day(0), status: 'actionable', reviewedAt: day(3) }],
}
assert.deepEqual(skillCounts(data), { calming: 2, reframing: 1, worry: 2, consistency: 4, journaling: 0, focus: 0 }, 'blank alternate thoughts and open worries do not count; unfinished sessions neither')
assert.equal(skillLevels(data).consistency.level, 2)
assert.equal(skillCounts({ ...data, journal: [{ createdAt: day(9) }], focus: [{ createdAt: day(10), completed: true }, { createdAt: day(11), completed: false }] }).consistency, 6)

/* ---- level-ups: first run is quiet, only increases count ---- */
const now = skillLevels(data)
assert.deepEqual(levelUps(null, now), [])
assert.deepEqual(levelUps({ calming: 1, reframing: 1, worry: 1, consistency: 1 }, now), [{ skill: 'consistency', from: 1, to: 2, count: 4 }])
assert.deepEqual(levelUps({ calming: 9, reframing: 9, worry: 9, consistency: 9, journaling: 9, focus: 9 }, now), [], 'levels never go down, so nothing to celebrate')
assert.match(evidenceLine('reframing', 15), /15 entries/); assert.match(evidenceLine('worry', 1), /1 parked worry\./)

/* ---- proof cards ---- */
const NOW = new Date(2026, 9, 31, 12)
const ago = n => new Date(2026, 9, 31 - n, 12).toISOString()
const sess = (n, b, a) => ({ createdAt: ago(n), anxietyBefore: b, anxietyAfter: a })
// not enough data: nothing at all
assert.deepEqual(proofCards({ thoughts: [], sessions: [sess(1, 8, 5)], worries: [] }, NOW), [])
// all-time figure only (>= MIN_OVERALL but no previous window)
let c = proofCards({ thoughts: [], sessions: [sess(1, 8, 6), sess(2, 7, 5), sess(3, 9, 6)], worries: [] }, NOW)
assert.equal(c.length, 1); assert.equal(c[0].id, 'relief'); assert.equal(c[0].trend, null); assert.equal(c[0].value, '2.3 pts'); assert.match(c[0].sentence, /After 3 rated sessions/)
// before/after: previous window averages 2, recent 4 -> up and better
const prev = Array.from({ length: MIN_POINTS }, (_, i) => sess(35 + i, 8, 6)), rec = Array.from({ length: MIN_POINTS }, (_, i) => sess(1 + i, 8, 4))
c = proofCards({ thoughts: [], sessions: [...prev, ...rec], worries: [] }, NOW)
assert.deepEqual(c[0].trend, { direction: 'up', better: true }); assert.equal(c[0].value, '4 pts'); assert.match(c[0].sentence, /4 points .* versus 2 .* \(5 and 5 sessions\)/)
assert.deepEqual(c[0].n, { recent: 5, previous: 5 })
// one short of the minimum on a side falls back to the all-time figure (no trend claim)
c = proofCards({ thoughts: [], sessions: [...prev.slice(1), ...rec], worries: [] }, NOW); assert.equal(c[0].trend, null)
// worse is reported as worse, flat as flat
c = proofCards({ thoughts: [], sessions: [...rec.map((s, i) => ({ ...s, createdAt: ago(35 + i) })), ...prev.map((s, i) => ({ ...s, createdAt: ago(1 + i) }))], worries: [] }, NOW)
assert.deepEqual(c[0].trend, { direction: 'down', better: false })
c = proofCards({ thoughts: [], sessions: [...prev, ...prev.map((s, i) => ({ ...s, createdAt: ago(1 + i) }))], worries: [] }, NOW)
assert.deepEqual(c[0].trend, { direction: 'flat', better: null })
// sessions outside both windows (older than 60 days) are ignored for the comparison
c = proofCards({ thoughts: [], sessions: [...rec, ...Array.from({ length: 9 }, (_, i) => sess(70 + i, 9, 1))], worries: [] }, NOW)
assert.equal(c[0].trend, null); assert.equal(c[0].n.previous, null)
// unrated sessions never count
assert.deepEqual(proofCards({ thoughts: [], sessions: Array.from({ length: 9 }, (_, i) => ({ createdAt: ago(i), anxietyBefore: null, anxietyAfter: null })), worries: [] }, NOW), [])
// thoughts: reframing share, distress drop, mood
const th = (n, alt, mood = 3, outcome = null, peak = 80) => ({ createdAt: ago(n), mood, thought: 'x', alternateThought: alt, outcomeIntensity: outcome, emotions: [{ intensity: peak }, { intensity: 20 }] })
const thoughts = [th(1, 'a', 4, 30), th(2, '', 4), th(3, 'b', 5, 40), th(4, 'c', 3, 50), th(5, '', 4), th(6, 'd', 4, 20)]
c = proofCards({ thoughts, sessions: [], worries: [] }, NOW)
assert.deepEqual(c.map(x => x.id), ['distress', 'reframing', 'mood'])
assert.equal(c.find(x => x.id === 'distress').value, '45 pts'); assert.match(c.find(x => x.id === 'distress').sentence, /4 entries/)   // (50+40+30+60)/4
assert.equal(c.find(x => x.id === 'reframing').value, '66.7%'); assert.equal(c.find(x => x.id === 'mood').value, '4 / 5')
// worries
const wr = (n, status) => ({ status, reviewedAt: ago(n) })
c = proofCards({ thoughts: [], sessions: [], worries: [wr(1, 'let-go'), wr(2, 'let-go'), wr(3, 'actionable'), { status: 'open', reviewedAt: null }] }, NOW)
assert.equal(c[0].id, 'worry'); assert.equal(c[0].value, '66.7%')
assert.ok(MIN_OVERALL >= 3 && MIN_POINTS >= 5)

/* ---- milestones ---- */
assert.deepEqual(milestones({ thoughts: [], sessions: [], worries: [] }), [])
const ms = milestones({ thoughts: [th(10, 'alt'), th(20, '')], sessions: [{ ...sess(8, null, null), completed: true }, { ...sess(5, 8, 3), completed: true }], worries: [{ status: 'let-go', reviewedAt: ago(2) }] })
assert.deepEqual(ms.map(m => m.id), ['first-let-go', 'first-relief', 'first-calm', 'first-reframe', 'first-entry'], 'newest first')
assert.equal(ms.find(m => m.id === 'first-calm').at, ago(8)); assert.equal(ms.find(m => m.id === 'first-entry').at, ago(20)); assert.equal(ms.find(m => m.id === 'first-reframe').at, ago(10))
console.log('proof: all tests passed')
