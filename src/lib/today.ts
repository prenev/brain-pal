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

/** The feelings that fit a mood (1 awful … 5 rad): a good day suggests good feelings, a hard day the hard ones. */
export const EMOTIONS_FOR_MOOD: Record<number, string[]> = {
  5: ['happy', 'excited', 'grateful', 'hopeful', 'content', 'relaxed'],
  4: ['happy', 'content', 'grateful', 'relaxed', 'hopeful', 'excited'],
  3: ['tired', 'content', 'unsure', 'bored', 'relaxed', 'stressed'],
  2: ['anxious', 'stressed', 'sad', 'tired', 'overwhelmed', 'lonely'],
  1: ['overwhelmed', 'sad', 'anxious', 'afraid', 'angry', 'desperate'],
}
/** Ranking for the feelings grid: your own past entries *with a similar mood* first, then the ones that fit this mood. */
export function emotionsForMood(all: string[], mood: number, past: { mood: number; emotions: { name: string }[] }[]): string[] {
  const fit = EMOTIONS_FOR_MOOD[Math.min(5, Math.max(1, Math.round(mood)))] ?? STARTER_EMOTIONS
  const near = past.filter(t => Math.abs(t.mood - mood) <= 1).map(t => t.emotions.map(e => e.name).filter(n => fit.includes(n) || mood === 3))
  return rankByUse(all, near, { starters: fit })
}

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
