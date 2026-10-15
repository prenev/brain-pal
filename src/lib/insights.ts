export const ANXIOUS_EMOTIONS = ['anxious', 'afraid', 'stressed', 'overwhelmed', 'desperate']

import type { BreathSession, Thought } from './types'

/** Highest intensity (0–100) among anxiety-type emotions on an entry; 0 if none. */
export const anxietyPeak = (t: Thought): number =>
  Math.max(0, ...t.emotions.filter(e => ANXIOUS_EMOTIONS.includes(e.name)).map(e => e.intensity))

/** How much SOS sessions lowered self-rated anxiety (0–10 scale). */
export function reliefStats(sessions: BreathSession[]) {
  const rated = sessions.filter(s => s.anxietyBefore !== null && s.anxietyAfter !== null)
  if (!rated.length) return null
  const drops = rated.map(s => s.anxietyBefore! - s.anxietyAfter!)
  return {
    n: rated.length,
    avgDrop: Math.round((drops.reduce((a, b) => a + b, 0) / drops.length) * 10) / 10,
    helped: drops.filter(d => d > 0).length,
  }
}

/** Tags ranked by average anxiety intensity on entries that carry them (needs ≥ minN entries). */
export function triggerStats(thoughts: Thought[], minN = 2) {
  const by = new Map<string, number[]>()
  for (const t of thoughts) {
    const p = anxietyPeak(t)
    if (p > 0) t.tags.forEach(g => by.set(g, [...(by.get(g) ?? []), p]))
  }
  return [...by].filter(([, v]) => v.length >= minN)
    .map(([tag, v]) => ({ tag, n: v.length, avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }))
    .sort((a, b) => b.avg - a.avg || b.n - a.n).slice(0, 3)
}

export function trapStats(thoughts: Thought[]) {
  const c = new Map<string, number>()
  thoughts.forEach(t => t.distortions.forEach(d => c.set(d, (c.get(d) ?? 0) + 1)))
  return [...c].sort((a, b) => b[1] - a[1]).slice(0, 3)
}

const BUCKETS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const
const bucket = (h: number) => (h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 22 ? 2 : 3)

/** When anxious entries happen (local time of day). */
export function timeOfDay(thoughts: Thought[]) {
  const counts = [0, 0, 0, 0]
  thoughts.filter(t => anxietyPeak(t) > 0).forEach(t => counts[bucket(new Date(t.createdAt).getHours())]++)
  return BUCKETS.map((label, i) => ({ label, count: counts[i] }))
}

/** True when at least 3 of the last 5 entries (within 14 days) were "bad"/"awful". */
export function roughPatch(thoughts: Thought[], now = new Date()): boolean {
  const cutoff = now.getTime() - 14 * 864e5
  const last = thoughts.filter(t => new Date(t.createdAt).getTime() >= cutoff)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
  return last.length >= 3 && last.filter(t => t.mood <= 2).length >= 3
}
