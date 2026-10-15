import { dayKey, shift } from './dates.ts'

/** Daily anchors: a few small non-negotiables that make a day "count". Capped on purpose — this is not a todo list. */
export type AnchorLink = 'checkin' | 'breathing' | 'journal' | 'worry'
export interface Anchor {
  id: string
  label: string
  emoji: string
  /** If set, doing that thing in the app ticks this anchor automatically. */
  link: AnchorLink | null
  order: number
  createdAt: string
  archivedAt: string | null
}

export const MAX_ANCHORS = 5
export const MAX_LABEL = 40

export const STARTERS: { label: string; emoji: string; link: AnchorLink | null }[] = [
  { label: 'Slow breathing', emoji: 'wind', link: 'breathing' },
  { label: 'Log a mood', emoji: 'memo', link: 'checkin' },
  { label: 'Write one line', emoji: 'notebook', link: 'journal' },
  { label: 'Walk 10 minutes', emoji: 'walk', link: null },
  { label: 'Get some sunlight', emoji: 'sun', link: null },
  { label: 'Drink water', emoji: 'water', link: null },
  { label: 'Take meds / vitamins', emoji: 'pill', link: null },
  { label: 'Stretch', emoji: 'lotus', link: null },
  { label: 'Read 10 pages', emoji: 'book', link: null },
  { label: 'Lights out on time', emoji: 'bed', link: null },
]
export const ANCHOR_EMOJI = ['wind', 'memo', 'notebook', 'walk', 'sun', 'water', 'pill', 'lotus', 'book', 'bed', 'run', 'dumbbell', 'salad', 'apple', 'shower', 'tooth', 'music', 'pray', 'phoneoff', 'heartfire']

export const activeAnchors = (all: Anchor[]): Anchor[] => all.filter(a => !a.archivedAt).sort((a, b) => a.order - b.order)
export const canAdd = (all: Anchor[]): boolean => activeAnchors(all).length < MAX_ANCHORS
export const cleanLabel = (s: string): string => s.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL)

/** Which days had something done for each link kind (built once from the app's data). */
export interface Activity { checkin: Set<string>; breathing: Set<string>; journal: Set<string>; worry: Set<string> }
export function activityFrom(d: {
  thoughts: { createdAt: string }[]; sessions: { createdAt: string }[]; journal?: { createdAt: string }[]; worries: { reviewedAt: string | null }[]
}): Activity {
  const days = (xs: (string | null)[]) => new Set(xs.filter((x): x is string => !!x).map(x => dayKey(x)))
  return {
    checkin: days(d.thoughts.map(t => t.createdAt)), breathing: days(d.sessions.map(s => s.createdAt)),
    journal: days((d.journal ?? []).map(j => j.createdAt)), worry: days(d.worries.map(w => w.reviewedAt)),
  }
}

export const checkKey = (anchorId: string, day: string) => `${anchorId}|${day}`

/** Anchors that existed on `day` (so editing your list today never rewrites history). */
export const anchorsOnDay = (all: Anchor[], day: string): Anchor[] =>
  all.filter(a => dayKey(a.createdAt) <= day && (!a.archivedAt || day < dayKey(a.archivedAt))).sort((a, b) => a.order - b.order)

export interface DayItem { anchor: Anchor; done: boolean; auto: boolean; manual: boolean }
export interface DayProgress { done: number; total: number; complete: boolean; items: DayItem[] }

export function dayProgress(all: Anchor[], day: string, checks: Set<string>, act: Activity): DayProgress {
  const items = anchorsOnDay(all, day).map(anchor => {
    const manual = checks.has(checkKey(anchor.id, day))
    const auto = !!anchor.link && act[anchor.link].has(day)
    return { anchor, manual, auto, done: manual || auto }
  })
  const done = items.filter(i => i.done).length
  return { done, total: items.length, complete: items.length > 0 && done === items.length, items }
}

export interface AnchorStreak { current: number; longest: number; completeToday: boolean }

/** Consecutive days with *every* anchor done. Like the main streak, it survives until the end of the next day. */
export function anchorStreak(all: Anchor[], checks: Set<string>, act: Activity, now = new Date()): AnchorStreak {
  const today = dayKey(now)
  const completeToday = dayProgress(all, today, checks, act).complete
  if (!all.length) return { current: 0, longest: 0, completeToday }
  const first = all.map(a => dayKey(a.createdAt)).sort()[0]
  let current = 0, longest = 0, run = 0
  let cursor = first
  for (let guard = 0; cursor <= today && guard < 3700; guard++, cursor = shift(cursor, 1)) {
    run = dayProgress(all, cursor, checks, act).complete ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  // current: walk back from today (or yesterday if today isn't finished yet)
  let c = completeToday ? today : shift(today, -1)
  while (c >= first && dayProgress(all, c, checks, act).complete) { current++; c = shift(c, -1) }
  return { current, longest, completeToday }
}

/** Swap an anchor with its neighbour in the active list; returns the new order values to store. */
export function reorder(all: Anchor[], id: string, dir: -1 | 1): Anchor[] {
  const list = activeAnchors(all), i = list.findIndex(a => a.id === id), j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return all
  const a = list[i], b = list[j]
  return all.map(x => (x.id === a.id ? { ...x, order: b.order } : x.id === b.id ? { ...x, order: a.order } : x))
}
