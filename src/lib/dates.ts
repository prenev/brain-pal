/** Local-calendar day key, e.g. "2026-10-15". */
export const dayKey = (d: Date | string): string => {
  const x = typeof d === 'string' ? new Date(d) : d
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

const shift = (key: string, days: number): string => {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + days))
}

export interface Streak { current: number; longest: number; activeToday: boolean }

/** A streak survives until the end of the day after the last activity. */
export function computeStreak(activityDays: Set<string>, now = new Date()): Streak {
  const today = dayKey(now)
  const activeToday = activityDays.has(today)
  let cursor = activeToday ? today : shift(today, -1)
  let current = 0
  while (activityDays.has(cursor)) { current++; cursor = shift(cursor, -1) }

  const sorted = [...activityDays].sort()
  let longest = 0, run = 0, prev: string | null = null
  for (const k of sorted) {
    run = prev && shift(prev, 1) === k ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = k
  }
  return { current, longest, activeToday }
}

export const lastNDays = (n: number, now = new Date()): string[] => {
  const today = dayKey(now)
  return Array.from({ length: n }, (_, i) => shift(today, i - (n - 1)))
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
