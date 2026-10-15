import type { BreathPattern } from './types'

export type PhaseKey = keyof BreathPattern
const ORDER: PhaseKey[] = ['inhale', 'hold1', 'exhale', 'hold2']

/** The non-empty phases of a pattern, in order (e.g. 4-6 breathing has no holds). */
export const phasesOf = (p: BreathPattern) => ORDER.map(k => ({ k, s: p[k] })).filter(x => x.s > 0)
export const cycleLength = (p: BreathPattern) => phasesOf(p).reduce((a, x) => a + x.s, 0)

export type BreathState =
  | { done: true }
  | { done: false; cycle: number; index: number; key: PhaseKey; into: number; dur: number }

/**
 * Where in the exercise we are after `elapsedSec`. Negative elapsed time is clamped to 0: the first
 * requestAnimationFrame timestamp can precede the moment the timer started, and treating that as
 * "round -1" made the opening haptic fire twice.
 */
export function breathAt(elapsedSec: number, pattern: BreathPattern, cycles: number): BreathState {
  const phases = phasesOf(pattern), len = cycleLength(pattern)
  const el = Math.max(0, elapsedSec)
  if (len <= 0 || el >= len * cycles) return { done: true }
  const inCycle = el % len
  let acc = 0, index = 0
  while (index < phases.length - 1 && inCycle >= acc + phases[index].s) acc += phases[index++].s
  return { done: false, cycle: Math.floor(el / len), index, key: phases[index].k, into: inCycle - acc, dur: phases[index].s }
}
