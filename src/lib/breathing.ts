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

/* ---- techniques shown on the Breathe tab ---- */
export interface Technique { id: 'calm' | 'coherent' | 'box' | 'relax' | 'custom'; name: string; tag: string; blurb: string; pattern: BreathPattern }
export const TECHNIQUES: Technique[] = [
  { id: 'calm', name: 'Calm 4-6', tag: 'Settle', blurb: 'A longer breath out than in. Quick to feel, easy to learn.', pattern: { inhale: 4, hold1: 0, exhale: 6, hold2: 0 } },
  { id: 'coherent', name: 'Coherent', tag: 'Balance', blurb: 'Even, unhurried waves of 5.5 seconds. Good for a steady head.', pattern: { inhale: 5.5, hold1: 0, exhale: 5.5, hold2: 0 } },
  { id: 'box', name: 'Box', tag: 'Focus', blurb: 'In, hold, out, hold, all the same length. Pick how long.', pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 } },
  { id: 'relax', name: '4-7-8', tag: 'Wind down', blurb: 'A long hold and a slow release. Nice before sleep. Skip the hold if it feels uncomfortable.', pattern: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 } },
  { id: 'custom', name: 'Your own pace', tag: 'Paced', blurb: 'Set the in and out yourself. A slower pace of 5–6 breaths a minute is a common place to start.', pattern: { inhale: 5, hold1: 0, exhale: 5, hold2: 0 } },
]
export const MINUTE_CHOICES = [1, 2, 3, 5, 10] as const
export const clampSec = (n: number, lo = 2, hi = 12) => Math.min(hi, Math.max(lo, Math.round(n * 2) / 2))
/** How many rounds fit in about `minutes` (at least one). */
export const roundsFor = (minutes: number, p: BreathPattern) => Math.max(1, Math.round((minutes * 60) / Math.max(1, cycleLength(p))))
export const breathsPerMinute = (p: BreathPattern) => Math.round((60 / Math.max(1, cycleLength(p))) * 10) / 10
export const patternLabel = (p: BreathPattern) => phasesOf(p).map(x => x.s).join(' · ')

/** SVG path for one breath cycle: it rises while you breathe in, stays level on holds, falls while you breathe out. Fits a w × h box. */
export function wavePath(p: BreathPattern, w = 96, h = 40): string {
  const total = cycleLength(p) || 1, pad = 4, hi = pad, lo = h - pad
  let x = 0, y = lo; const pts = [`M0 ${lo}`]
  for (const { k, s } of phasesOf(p)) {
    const nx = x + (s / total) * w
    if (k === 'inhale') { pts.push(`C${(x + (nx - x) * 0.5).toFixed(1)} ${y} ${(x + (nx - x) * 0.5).toFixed(1)} ${hi} ${nx.toFixed(1)} ${hi}`); y = hi }
    else if (k === 'exhale') { pts.push(`C${(x + (nx - x) * 0.5).toFixed(1)} ${y} ${(x + (nx - x) * 0.5).toFixed(1)} ${lo} ${nx.toFixed(1)} ${lo}`); y = lo }
    else pts.push(`L${nx.toFixed(1)} ${y}`)
    x = nx
  }
  return pts.join(' ')
}
