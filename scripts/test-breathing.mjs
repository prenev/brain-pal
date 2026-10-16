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

// ---- techniques on the Breathe tab ----
import { TECHNIQUES, MINUTE_CHOICES, clampSec, roundsFor, breathsPerMinute, patternLabel, wavePath, cycleLength as cl } from '../src/lib/breathing.ts'
assert.equal(new Set(TECHNIQUES.map(t => t.id)).size, TECHNIQUES.length); assert.ok(TECHNIQUES.some(t => t.id === 'box') && TECHNIQUES.some(t => t.id === 'coherent') && TECHNIQUES.some(t => t.id === 'custom'), 'box and paced options both exist')
for (const t of TECHNIQUES) { assert.ok(t.name && t.tag && t.blurb, t.id); assert.ok(cl(t.pattern) >= 8 && cl(t.pattern) <= 24, `${t.id} cycle is a sane length`); assert.ok(t.pattern.exhale >= t.pattern.inhale || t.id === 'box' || t.id === 'coherent' || t.id === 'custom', `${t.id}: calming patterns breathe out at least as long as in`) }
assert.equal(roundsFor(2, { inhale: 4, hold1: 0, exhale: 6, hold2: 0 }), 12); assert.equal(roundsFor(1, { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }), 4); assert.equal(roundsFor(0, { inhale: 4, hold1: 0, exhale: 6, hold2: 0 }), 1, 'always at least one round')
assert.ok(MINUTE_CHOICES.every(m => m >= 1)); assert.equal(clampSec(1), 2); assert.equal(clampSec(99), 12); assert.equal(clampSec(5.3), 5.5); assert.equal(clampSec(5.2), 5)
assert.equal(breathsPerMinute({ inhale: 5.5, hold1: 0, exhale: 5.5, hold2: 0 }), 5.5); assert.equal(patternLabel({ inhale: 4, hold1: 7, exhale: 8, hold2: 0 }), '4 · 7 · 8')
const wave = wavePath({ inhale: 4, hold1: 4, exhale: 4, hold2: 4 }, 96, 40)
assert.match(wave, /^M0 36 C/); assert.equal((wave.match(/L/g) ?? []).length, 2, 'a box has two level holds'); assert.ok(wavePath({ inhale: 4, hold1: 0, exhale: 6, hold2: 0 }).indexOf('L') === -1, 'paced breathing has no flat parts')
// a mid-way breath (5.5 s) still lands on the right phase
assert.equal(breathAt(5.6, { inhale: 5.5, hold1: 0, exhale: 5.5, hold2: 0 }, 3).key, 'exhale')
console.log('breathing techniques ok')
