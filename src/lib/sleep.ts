import { dayKey } from './dates.ts'

/**
 * Sleep from Apple Health (Apple Watch / iPhone) or a manual log. Pure logic, no platform imports.
 * HealthKit reports raw segments (often from several sources at once); we merge them into nights.
 */
export type SegmentKind = 'inBed' | 'asleep' | 'core' | 'deep' | 'rem' | 'awake'
export interface Segment { start: number; end: number; kind: SegmentKind }

export interface Night {
  /** Local date you woke up (YYYY-MM-DD) — the night "belongs" to the morning after. */
  date: string
  start: number; end: number
  asleepMin: number; inBedMin: number; awakeMin: number
  deepMin: number; remMin: number; coreMin: number; unspecifiedMin: number
  /** asleep / in bed, 0-100, or null when there is no in-bed data. */
  efficiency: number | null
  source: 'health' | 'manual'
  /** 1-5, manual log only */
  quality: number | null
}

export const NAP_GAP_MS = 3 * 3_600_000       // a gap this long between sleep starts a new session
export const MIN_SESSION_MIN = 20             // shorter than this is noise
export const MIN_NIGHT_MIN = 180              // the longest session of a day only counts as "the night" if it is at least this long
const MIN = 60_000

// When sources disagree about the same moment the more specific / more cautious reading wins:
// explicit "awake" beats any sleep reading, a named stage beats generic "asleep", and any sleep beats "in bed".
const PRIORITY: Record<SegmentKind, number> = { inBed: 0, asleep: 1, core: 2, rem: 3, deep: 4, awake: 5 }
const SLEEP: SegmentKind[] = ['asleep', 'core', 'rem', 'deep']
const isSleep = (k: SegmentKind) => SLEEP.includes(k)

/** Paint all segments onto one timeline (highest priority wins), then merge neighbours of the same kind. */
export function mergeSegments(raw: Segment[]): Segment[] {
  const segs = raw.filter(s => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start && s.kind in PRIORITY)
  if (!segs.length) return []
  const cuts = [...new Set(segs.flatMap(s => [s.start, s.end]))].sort((a, b) => a - b)
  const out: Segment[] = []
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1]
    let best: SegmentKind | null = null
    for (const s of segs) if (s.start <= a && s.end >= b && (best === null || PRIORITY[s.kind] > PRIORITY[best])) best = s.kind
    if (!best) continue
    const last = out[out.length - 1]
    if (last && last.kind === best && last.end === a) last.end = b; else out.push({ start: a, end: b, kind: best })
  }
  return out
}

const minutes = (segs: Segment[], pred: (k: SegmentKind) => boolean, from = -Infinity, to = Infinity) =>
  segs.reduce((acc, s) => (pred(s.kind) ? acc + Math.max(0, Math.min(s.end, to) - Math.max(s.start, from)) : acc), 0) / MIN

interface Session { start: number; end: number; segs: Segment[]; asleepMin: number }

/** Split the merged timeline into sleep sessions separated by long gaps. */
function sessions(merged: Segment[]): Session[] {
  const sleep = merged.filter(s => isSleep(s.kind))
  const groups: Segment[][] = []
  for (const s of sleep) {
    const g = groups[groups.length - 1]
    if (g && s.start - g[g.length - 1].end <= NAP_GAP_MS) g.push(s); else groups.push([s])
  }
  return groups.map(g => {
    const start = g[0].start, end = g[g.length - 1].end
    return { start, end, segs: merged.filter(s => s.end > start && s.start < end), asleepMin: minutes(g, () => true) }
  }).filter(x => x.asleepMin >= MIN_SESSION_MIN)
}

function toNight(x: Session): Night {
  const inBedMin = minutes(x.segs, k => k !== 'awake' || true, x.start, x.end)     // everything inside the span: asleep + awake + in-bed-only
  const awakeMin = minutes(x.segs, k => k === 'awake', x.start, x.end)
  const stage = (k: SegmentKind) => Math.round(minutes(x.segs, q => q === k, x.start, x.end))
  const hasInBed = x.segs.some(s => s.kind === 'inBed')
  const asleepMin = Math.round(x.asleepMin)
  return {
    date: dayKey(new Date(x.end)), start: x.start, end: x.end,
    asleepMin, inBedMin: Math.round(inBedMin), awakeMin: Math.round(awakeMin),
    deepMin: stage('deep'), remMin: stage('rem'), coreMin: stage('core'), unspecifiedMin: stage('asleep'),
    efficiency: hasInBed || awakeMin > 0 ? Math.min(100, Math.round((asleepMin / Math.max(1, inBedMin)) * 100)) : null,
    source: 'health', quality: null,
  }
}

export interface SleepResult { nights: Night[]; naps: { start: number; end: number; min: number }[] }

/** Raw HealthKit segments -> one night per wake-up date (newest first), plus naps. */
export function buildNights(raw: Segment[]): SleepResult {
  const all = sessions(mergeSegments(raw))
  const byDate = new Map<string, Session[]>()
  for (const s of all) { const d = dayKey(new Date(s.end)); byDate.set(d, [...(byDate.get(d) ?? []), s]) }
  const nights: Night[] = [], naps: SleepResult['naps'] = []
  for (const group of byDate.values()) {
    const main = group.reduce((a, b) => (b.asleepMin > a.asleepMin ? b : a))
    for (const s of group) {
      if (s === main && s.asleepMin >= MIN_NIGHT_MIN) nights.push(toNight(s))
      else naps.push({ start: s.start, end: s.end, min: Math.round(s.asleepMin) })
    }
  }
  return { nights: nights.sort((a, b) => b.date.localeCompare(a.date)), naps: naps.sort((a, b) => b.start - a.start) }
}

/** A night the person logged by hand (web, or no Watch). */
export function manualNight(bed: number, wake: number, quality: number | null = null): Night | null {
  if (!(wake > bed) || wake - bed > 18 * 3_600_000) return null
  const min = Math.round((wake - bed) / MIN)
  return { date: dayKey(new Date(wake)), start: bed, end: wake, asleepMin: min, inBedMin: min, awakeMin: 0, deepMin: 0, remMin: 0, coreMin: 0, unspecifiedMin: min, efficiency: null, source: 'manual', quality }
}

/** One night per date; a measured night beats a hand-logged one for the same morning. Newest first. */
export function mergeNights(health: Night[], manual: Night[]): Night[] {
  const by = new Map<string, Night>()
  for (const n of manual) by.set(n.date, n)
  for (const n of health) by.set(n.date, n)
  return [...by.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export const fmtDuration = (min: number) => { const m = Math.round(min); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` }

/** Minutes after 18:00 of the evening a time falls in, so 23:30 -> 330 and 01:00 -> 420 (no midnight wrap when averaging). */
export const eveningMinutes = (t: number) => { const d = new Date(t); return (d.getHours() * 60 + d.getMinutes() - 18 * 60 + 1440) % 1440 }
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map(x => (x - m) ** 2))) }

export interface SleepSummary { nights: number; avgAsleepMin: number | null; avgBedEvening: number | null; avgWakeMin: number | null; bedtimeSpreadMin: number | null }
/** Averages over the newest `count` nights. Spread (consistency) needs at least 3 nights. */
export function summarizeSleep(nights: Night[], count = 7): SleepSummary {
  const n = nights.slice(0, count)
  if (!n.length) return { nights: 0, avgAsleepMin: null, avgBedEvening: null, avgWakeMin: null, bedtimeSpreadMin: null }
  const beds = n.map(x => eveningMinutes(x.start))
  return {
    nights: n.length, avgAsleepMin: Math.round(mean(n.map(x => x.asleepMin))), avgBedEvening: Math.round(mean(beds)),
    avgWakeMin: Math.round(mean(n.map(x => { const d = new Date(x.end); return d.getHours() * 60 + d.getMinutes() }))),
    bedtimeSpreadMin: n.length >= 3 ? Math.round(sd(beds)) : null,
  }
}

export interface SleepMoodLink { pairs: number; thresholdMin: number; restedMood: number; shortMood: number; diff: number; sentence: string }
export const MIN_PAIRS = 7, MIN_PER_SIDE = 3

/**
 * Does your mood on a day differ after longer vs shorter nights? Splits *your own* nights at their median.
 * Needs >= 7 paired days and >= 3 on each side; the sentence says "tended to", never implies cause.
 */
export function sleepMoodLink(nights: Night[], thoughts: { createdAt: string; mood: number }[]): SleepMoodLink | null {
  const moodByDay = new Map<string, number[]>()
  for (const t of thoughts) { const d = dayKey(t.createdAt); moodByDay.set(d, [...(moodByDay.get(d) ?? []), t.mood]) }
  const pairs = nights.filter(n => moodByDay.has(n.date)).map(n => ({ sleep: n.asleepMin, mood: mean(moodByDay.get(n.date)!) }))
  if (pairs.length < MIN_PAIRS) return null
  const sorted = pairs.map(p => p.sleep).sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const rested = pairs.filter(p => p.sleep >= median), short = pairs.filter(p => p.sleep < median)
  if (rested.length < MIN_PER_SIDE || short.length < MIN_PER_SIDE) return null
  const r = Math.round(mean(rested.map(p => p.mood)) * 10) / 10, s = Math.round(mean(short.map(p => p.mood)) * 10) / 10
  const diff = Math.round((r - s) * 10) / 10
  const h = fmtDuration(median).replace(/ \d+m$/, m => (m === ' 00m' ? '' : m))
  const sentence = Math.abs(diff) < 0.3
    ? `Across ${pairs.length} days, your mood looked about the same after longer and shorter nights.`
    : diff > 0 ? `On days after you slept ${h} or more, your mood tended to be higher (${r} vs ${s} out of 5 after shorter nights). That’s a pattern in your data, not a cause.`
      : `On days after longer nights (${h}+) your mood averaged ${r} vs ${s} after shorter ones — not what’s typical, and not a cause either.`
  return { pairs: pairs.length, thresholdMin: median, restedMood: r, shortMood: s, diff, sentence }
}
