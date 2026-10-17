import { dayKey, shift } from './dates.ts'
import type { JournalEntry } from './journal.ts'

/** Calendar helpers for the Journal home: the week ribbon, the month grid and filtering by a tapped day. Pure, tested in scripts/test-journal.mjs. */

/** Monday of the week that contains `day` (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7   // Monday = 0
  return shift(day, -dow)
}
/** The seven days of the week containing `day`, Monday first. */
export const weekOf = (day: string): string[] => { const s = weekStart(day); return Array.from({ length: 7 }, (_, i) => shift(s, i)) }

export interface DayInfo { day: string; count: number; /** average mood 1-5, null when none of the day's entries has one */ mood: number | null }
/** What was written on each day (only days with entries are present). */
export function infoByDay(entries: JournalEntry[]): Map<string, DayInfo> {
  const m = new Map<string, { count: number; sum: number; n: number }>()
  for (const e of entries) {
    const k = dayKey(e.createdAt), c = m.get(k) ?? { count: 0, sum: 0, n: 0 }
    c.count++; if (e.mood) { c.sum += e.mood; c.n++ }
    m.set(k, c)
  }
  return new Map([...m].map(([day, c]) => [day, { day, count: c.count, mood: c.n ? Math.min(5, Math.max(1, Math.round(c.sum / c.n))) : null }]))
}

/** Six weeks of days (Monday first) covering the month `key` ("YYYY-MM"); `inMonth` marks the days that belong to it. */
export function monthGrid(key: string): { day: string; inMonth: boolean }[] {
  const first = `${key}-01`, start = weekStart(first)
  return Array.from({ length: 42 }, (_, i) => { const day = shift(start, i); return { day, inMonth: day.slice(0, 7) === key } })
}
export const shiftMonth = (key: string, by: number): string => { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 1 + by, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

export const filterByDay = (entries: JournalEntry[], day: string | null) => (day ? entries.filter(e => dayKey(e.createdAt) === day) : entries)
/** "Fri, 2 Oct" style heading for a day key. */
export const dayHeading = (day: string, locale?: string): string => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) }
