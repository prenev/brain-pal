/** Pure helpers behind the Today card and the short emotion/tag lists. */

export type NextAction =
  | { kind: 'mood' }
  | { kind: 'anchors'; left: number }
  | { kind: 'worries'; count: number }
  | { kind: 'done' }

export interface TodayState { hasEntryToday: boolean; anchorsLeft: number; openWorries: number }

/** The single most useful thing to offer right now. Order: check in → finish anchors → review parked worries → all set. */
export function nextAction(s: TodayState): NextAction {
  if (!s.hasEntryToday) return { kind: 'mood' }
  if (s.anchorsLeft > 0) return { kind: 'anchors', left: s.anchorsLeft }
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
