/** Pure helpers behind the Today card and the short emotion/tag lists. */

export type NextAction =
  | { kind: 'mood' }
  | { kind: 'anchors'; left: number }
  | { kind: 'step'; count: number }
  | { kind: 'worries'; count: number }
  | { kind: 'done' }

export interface TodayState { hasEntryToday: boolean; anchorsLeft: number; openWorries: number; plannedSteps?: number }

/** The single most useful thing to offer right now. Order: check in → finish anchors → a planned small step → review parked worries → all set. */
export function nextAction(s: TodayState): NextAction {
  if (!s.hasEntryToday) return { kind: 'mood' }
  if (s.anchorsLeft > 0) return { kind: 'anchors', left: s.anchorsLeft }
  if ((s.plannedSteps ?? 0) > 0) return { kind: 'step', count: s.plannedSteps! }
  if (s.openWorries > 0) return { kind: 'worries', count: s.openWorries }
  return { kind: 'done' }
}

/** Default short list for someone with no history yet. */
export const STARTER_EMOTIONS = ['anxious', 'stressed', 'sad', 'tired', 'happy', 'grateful']

/**
 * Options ordered by how often *you* used them recently (last `window` entries), ties/unused keep their original order.
 * `starters` fill the front for new users so the list is never empty of sensible choices.
 */
export function rankByUse(options: string[], uses: string[][], opts: { starters?: string[]; window?: number } = {}): string[] {
  const counts = new Map<string, number>()
  for (const list of uses.slice(0, opts.window ?? 60)) for (const n of new Set(list)) counts.set(n, (counts.get(n) ?? 0) + 1)
  const starterRank = new Map((opts.starters ?? []).map((n, i) => [n, i]))
  return options.map((o, i) => ({ o, i })).sort((a, b) => {
    const ca = counts.get(a.o) ?? 0, cb = counts.get(b.o) ?? 0
    if (ca !== cb) return cb - ca
    const sa = starterRank.get(a.o) ?? Infinity, sb = starterRank.get(b.o) ?? Infinity
    return sa !== sb ? sa - sb : a.i - b.i
  }).map(x => x.o)
}

/** The short list shown first: top `n` by use, plus anything already selected, never duplicates. */
export function shortList(ranked: string[], selected: string[], n = 6): string[] {
  return [...new Set([...ranked.slice(0, n), ...selected.filter(s => ranked.includes(s))])]
}

/* ---- Home highlights: the few things worth a glance today ---- */
export interface Highlight { id: 'sleep' | 'worries' | 'step' | 'streak'; tone: 'good' | 'warn' | 'info'; emoji: string; text: string; go: 'sleep' | 'worry' | 'step' | 'checkin' }
export interface HighlightInput {
  today: string
  /** the newest sleep night, if any (date = the morning you woke up) */
  night: { date: string; asleepMin: number } | null
  openWorries: number
  plannedStep: string | null
  /** days in the current streak, only when it ends tonight (nothing logged yet today) */
  streakEndsTonight: number | null
}
const hm = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m`
export const LOW_SLEEP_MIN = 300, GOOD_SLEEP_MIN = 420

/** Short, kind, factual lines (never advice about health). At most three, most useful first. */
export function highlights(i: HighlightInput): Highlight[] {
  const out: Highlight[] = []
  if (i.night && i.night.date === i.today) {
    const m = i.night.asleepMin
    out.push(m < LOW_SLEEP_MIN ? { id: 'sleep', tone: 'warn', emoji: 'sleep', text: `Sleep was low last night: ${hm(m)}. Go easy on yourself today.`, go: 'sleep' }
      : m >= GOOD_SLEEP_MIN ? { id: 'sleep', tone: 'good', emoji: 'sleep', text: `You slept ${hm(m)} last night. Nicely rested.`, go: 'sleep' }
      : { id: 'sleep', tone: 'info', emoji: 'sleep', text: `You slept ${hm(m)} last night.`, go: 'sleep' })
  }
  if (i.openWorries > 0) out.push({ id: 'worries', tone: 'info', emoji: 'worry', text: `${i.openWorries} parked ${i.openWorries === 1 ? 'worry is' : 'worries are'} waiting. Look at ${i.openWorries === 1 ? 'it' : 'them'} when you’re ready.`, go: 'worry' })
  if (i.plannedStep) out.push({ id: 'step', tone: 'info', emoji: 'rocket', text: `A small step is waiting: ${i.plannedStep}`, go: 'step' })
  if (i.streakEndsTonight && i.streakEndsTonight > 0) out.push({ id: 'streak', tone: 'warn', emoji: 'fire', text: `Your ${i.streakEndsTonight}-day streak ends tonight. A mood check-in keeps it.`, go: 'checkin' })
  return out.slice(0, 3)
}
