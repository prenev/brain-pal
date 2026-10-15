import { dayKey, shift } from './dates.ts'

/**
 * Plain-language summaries (day / week / month) written from templates: offline, deterministic, no AI.
 * Wording rules: facts only, correlations phrased softly, nothing that reads as diagnosis, never guilt for a quiet period.
 */
export interface SummaryData {
  thoughts: { createdAt: string; mood: number; emotions: { name: string }[]; distortions: string[] }[]
  sessions: { createdAt: string; durationSec: number; completed: boolean; anxietyBefore: number | null; anxietyAfter: number | null }[]
  worries: { createdAt: string; status: string; reviewedAt: string | null }[]
  journal?: { createdAt: string }[]
  /** Per-day anchor completion (days that had anchors). */
  anchorDays?: { day: string; done: number; total: number }[]
}

export interface PeriodSummary {
  start: string; end: string; days: number
  entries: number; activeDays: number
  avgMood: number | null; prevAvgMood: number | null
  bestDay: { day: string; mood: number } | null; toughestDay: { day: string; mood: number } | null
  topEmotions: string[]; topTrap: string | null
  calmingSessions: number; calmingMinutes: number; avgRelief: number | null
  worriesParked: number; worriesLetGo: number; worriesPlanned: number
  anchorsFullDays: number; anchorsTrackedDays: number
  journalEntries: number
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const r1 = (n: number) => Math.round(n * 10) / 10
const top = (xs: string[], n: number) => {
  const c = new Map<string, number>(); for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1)
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(e => e[0])
}
const inRange = (iso: string, start: string, end: string) => { const d = dayKey(iso); return d >= start && d <= end }
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const dayName = (key: string) => { const [y, m, d] = key.split('-').map(Number); return DAY_NAMES[new Date(y, m - 1, d).getDay()] }

/** Summary of `days` days ending on `end` (inclusive, a day key). The previous period of equal length gives the mood comparison. */
export function summarize(d: SummaryData, end: string, days: number): PeriodSummary {
  const start = shift(end, -(days - 1)), pStart = shift(start, -days), pEnd = shift(start, -1)
  const th = d.thoughts.filter(t => inRange(t.createdAt, start, end))
  const prevTh = d.thoughts.filter(t => inRange(t.createdAt, pStart, pEnd))
  const ses = d.sessions.filter(s => s.completed && inRange(s.createdAt, start, end))
  const active = new Set<string>()
  th.forEach(t => active.add(dayKey(t.createdAt))); ses.forEach(s => active.add(dayKey(s.createdAt)))
  d.worries.forEach(w => w.reviewedAt && inRange(w.reviewedAt, start, end) && active.add(dayKey(w.reviewedAt)))
  const jr = (d.journal ?? []).filter(j => inRange(j.createdAt, start, end)); jr.forEach(j => active.add(dayKey(j.createdAt)))

  const byDay = new Map<string, number[]>()
  for (const t of th) { const k = dayKey(t.createdAt); byDay.set(k, [...(byDay.get(k) ?? []), t.mood]) }
  const dayMoods = [...byDay.entries()].map(([day, m]) => ({ day, mood: avg(m)! })).sort((a, b) => a.day.localeCompare(b.day))
  // best / toughest only mean something with a few days to compare and a real difference
  const best = dayMoods.length >= 3 ? dayMoods.reduce((a, b) => (b.mood > a.mood ? b : a)) : null
  const tough = dayMoods.length >= 3 ? dayMoods.reduce((a, b) => (b.mood < a.mood ? b : a)) : null
  const distinct = best && tough && best.mood - tough.mood >= 1

  const rated = ses.filter(s => s.anxietyBefore !== null && s.anxietyAfter !== null).map(s => s.anxietyBefore! - s.anxietyAfter!)
  const wr = d.worries.filter(w => w.reviewedAt && inRange(w.reviewedAt, start, end))
  const am = avg(th.map(t => t.mood)), pm = avg(prevTh.map(t => t.mood))
  const ad = (d.anchorDays ?? []).filter(a => a.day >= start && a.day <= end && a.total > 0)
  return {
    start, end, days, entries: th.length, activeDays: active.size,
    avgMood: am === null ? null : r1(am), prevAvgMood: pm === null ? null : r1(pm),
    bestDay: distinct ? { day: best!.day, mood: r1(best!.mood) } : null, toughestDay: distinct ? { day: tough!.day, mood: r1(tough!.mood) } : null,
    topEmotions: top(th.flatMap(t => t.emotions.map(e => e.name)), 3), topTrap: top(th.flatMap(t => t.distortions), 1)[0] ?? null,
    calmingSessions: ses.length, calmingMinutes: Math.round(ses.reduce((a, s) => a + s.durationSec, 0) / 60),
    avgRelief: rated.length ? r1(avg(rated)!) : null,
    worriesParked: d.worries.filter(w => inRange(w.createdAt, start, end)).length,
    worriesLetGo: wr.filter(w => w.status === 'let-go').length, worriesPlanned: wr.filter(w => w.status === 'actionable').length,
    anchorsFullDays: ad.filter(a => a.done >= a.total).length, anchorsTrackedDays: ad.length, journalEntries: jr.length,
  }
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/** The summary as short sentences, skipping anything with no data. `label` is e.g. "this week". */
export function sentences(s: PeriodSummary, label = 'this week', prevLabel = 'last week'): string[] {
  const out: string[] = []
  if (s.entries === 0 && s.calmingSessions === 0 && s.activeDays === 0 && s.journalEntries === 0) return [`Nothing logged ${label} — that’s okay. Whenever you’re ready, one tap is enough.`]
  out.push(`You showed up on ${s.activeDays} of ${plural(s.days, 'day')}${s.entries ? ` and wrote ${plural(s.entries, 'entry', 'entries')}` : ''}.`)
  if (s.avgMood !== null) {
    if (s.prevAvgMood === null) out.push(`Your average mood was ${s.avgMood} out of 5.`)
    else {
      const diff = r1(s.avgMood - s.prevAvgMood)
      out.push(`Your average mood was ${s.avgMood} out of 5, ${Math.abs(diff) < 0.2 ? `about the same as ${prevLabel}` : diff > 0 ? `up from ${s.prevAvgMood} ${prevLabel}` : `down from ${s.prevAvgMood} ${prevLabel}`}.`)
    }
  }
  if (s.bestDay && s.toughestDay) out.push(`Your best day was ${dayName(s.bestDay.day)} (${s.bestDay.mood}) and the toughest was ${dayName(s.toughestDay.day)} (${s.toughestDay.mood}).`)
  if (s.topEmotions.length) out.push(`Feelings that came up most: ${list(s.topEmotions)}.`)
  if (s.topTrap) out.push(`The thinking trap you noticed most was ${s.topTrap}.`)
  if (s.calmingSessions) out.push(`You did ${plural(s.calmingSessions, 'calming session')} (${plural(s.calmingMinutes, 'minute')})${s.avgRelief !== null && s.avgRelief > 0 ? `, and your anxiety dropped by ${s.avgRelief} points on average afterwards` : ''}.`)
  if (s.worriesParked || s.worriesLetGo || s.worriesPlanned) {
    const bits = [s.worriesLetGo && `let go of ${s.worriesLetGo}`, s.worriesPlanned && `made a plan for ${s.worriesPlanned}`].filter(Boolean) as string[]
    out.push(`You parked ${plural(s.worriesParked, 'worry', 'worries')}${bits.length ? ` and ${list(bits)}` : ''}.`)
  }
  if (s.journalEntries) out.push(`You wrote ${plural(s.journalEntries, 'journal entry', 'journal entries')}.`)
  if (s.anchorsTrackedDays) out.push(`You completed every anchor on ${s.anchorsFullDays} of ${plural(s.anchorsTrackedDays, 'day')}.`)
  return out
}

export const WEEK = 7, MONTH = 30
export const weekSummary = (d: SummaryData, end: string) => summarize(d, end, WEEK)
export const monthSummary = (d: SummaryData, end: string) => summarize(d, end, MONTH)

/** Text for sharing / printing. */
export function shareText(title: string, s: PeriodSummary, label?: string, prevLabel?: string): string {
  return `${title}\n${s.start} – ${s.end}\n\n${sentences(s, label, prevLabel).map(x => `• ${x}`).join('\n')}\n\nFrom Brain Pal — a self-help tool, not medical advice.`
}
