import assert from 'node:assert/strict'
import { breathAt, cycleLength, phasesOf } from '../src/lib/breathing.ts'

const box = { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }, calm = { inhale: 4, hold1: 0, exhale: 6, hold2: 0 }, relax = { inhale: 4, hold1: 7, exhale: 8, hold2: 0 }

assert.deepEqual(phasesOf(calm).map(p => p.k), ['inhale', 'exhale']); assert.equal(cycleLength(box), 16); assert.equal(cycleLength(calm), 10); assert.equal(cycleLength(relax), 19)

const at = (t, p = box, c = 6) => breathAt(t, p, c)
assert.deepEqual(at(0), { done: false, cycle: 0, index: 0, key: 'inhale', into: 0, dur: 4 })
assert.deepEqual(at(3.99), { done: false, cycle: 0, index: 0, key: 'inhale', into: 3.99, dur: 4 })
assert.equal(at(4).key, 'hold1'); assert.equal(at(8).key, 'exhale'); assert.equal(at(12).key, 'hold2'); assert.equal(at(15.9).key, 'hold2')
assert.deepEqual([at(16).cycle, at(16).key, at(16).into], [1, 'inhale', 0])               // next round
assert.equal(at(96).done, true); assert.equal(at(95.99).done, false); assert.equal(at(95.99).cycle, 5)  // 6 rounds * 16 s
assert.deepEqual([at(4, calm).key, at(9.9, calm).key, at(10, calm).key, at(10, calm).cycle], ['exhale', 'exhale', 'inhale', 1])  // holds of 0 s are skipped
assert.equal(at(5, relax).key, 'hold1'); assert.equal(at(11, relax).key, 'exhale'); assert.equal(at(19, relax).key, 'inhale')

// REGRESSION: the first animation-frame timestamp can precede the timer's start (tiny negative elapsed).
// That used to read as "round -1", so the first phase change fired the opening haptic twice.
for (const neg of [-0.001, -0.016, -0.2, -5]) {
  const s = at(neg); assert.equal(s.done, false); assert.deepEqual([s.cycle, s.index, s.key, s.into], [0, 0, 'inhale', 0], `elapsed ${neg}`)
}
// the phase identity (cycle-index) is stable across the first frames, so the cue fires exactly once
const id = t => { const s = at(t); return `${s.cycle}-${s.index}` }
assert.equal(new Set([-0.016, 0, 0.016, 0.032, 1, 3.9].map(id)).size, 1)

assert.equal(breathAt(1, { inhale: 0, hold1: 0, exhale: 0, hold2: 0 }, 3).done, true)        // empty pattern can't loop forever
assert.equal(breathAt(1, box, 0).done, true)
console.log('breathing: all tests passed')
