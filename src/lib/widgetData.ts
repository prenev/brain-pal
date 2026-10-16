import { dayKey, shift } from './dates.ts'
import { pickPrompt } from './journal.ts'
import { isPomoStep } from './pomodoro.ts'

/**
 * Home-screen / lock-screen widgets (iPhone). The app writes one small JSON snapshot into the shared App Group;
 * the Swift widget extension (ios-native/Widgets) only ever reads it. Interactive widgets (mood faces, anchor ticks)
 * can't run our JS, so they queue "actions" that the app applies the next time it is open.
 * Pure, no DOM: unit-tested by scripts/test-widgets.mjs. The Swift side mirrors these shapes in WobbiShared.swift.
 */
export const WIDGET_VERSION = 1
export const MAX_WIDGET_ANCHORS = 5

export interface WidgetDay { day: string; letter: string; mood: number | null; sleepMin: number | null }
export interface WidgetAnchor { id: string; label: string; emoji: string; done: boolean; auto: boolean }
export interface WidgetSnapshot {
  v: number
  at: number
  day: string
  hasData: boolean
  streak: number
  activeToday: boolean
  todayMood: number | null
  week: WidgetDay[]
  anchors: WidgetAnchor[]
  worriesOpen: number
  sleep: { lastMin: number | null; avgMin: number | null }
  prompt: string
  coins: number
  /** Focus (pomodoro). Kept under the old Focus-guard key/field names so widgets already on a home screen keep decoding:
   *  enabled = block apps during focus, challenges = blocks today, reps = daily goal, minutes = focused today, week = blocks per day. */
  guard: { enabled: boolean; apps: number; challenges: number; reps: number; minutes: number; week: number[] }
  wobbi: { text: string; pose: string }
}

export interface WidgetInput {
  now: Date
  thoughts: { createdAt: string; mood: number }[]
  streak: { current: number; activeToday: boolean }
  anchors: { anchor: { id: string; label: string; emoji: string }; done: boolean; auto: boolean }[]
  worriesOpen: number
  nights: { date: string; asleepMin: number }[]
  coins: number
  focus: { block: boolean; apps: number; goal: number; blocks: { createdAt: string; actualSec: number; completed: boolean; step: string }[] }
  /** Breathing sessions + journal entries: only their dates matter here. */
  sessions: { createdAt: string }[]
  journal: { createdAt: string }[]
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function buildSnapshot(i: WidgetInput): WidgetSnapshot {
  const today = dayKey(i.now)
  const days = Array.from({ length: 7 }, (_, n) => shift(today, n - 6))
  const moodsBy = new Map<string, number[]>()
  for (const t of i.thoughts) { const k = dayKey(t.createdAt); moodsBy.set(k, [...(moodsBy.get(k) ?? []), t.mood]) }
  const sleepBy = new Map(i.nights.map(n => [n.date, n.asleepMin]))
  // The day's mood is the latest one logged (what you feel now), not an average that hides it.
  const latestBy = new Map<string, { at: string; mood: number }>()
  for (const t of i.thoughts) { const k = dayKey(t.createdAt), cur = latestBy.get(k); if (!cur || t.createdAt > cur.at) latestBy.set(k, { at: t.createdAt, mood: t.mood }) }
  const week = days.map(day => {
    const [y, m, d] = day.split('-').map(Number)
    return { day, letter: LETTERS[new Date(y, m - 1, d).getDay()], mood: latestBy.get(day)?.mood ?? null, sleepMin: sleepBy.get(day) ?? null }
  })

  const last = [...i.nights].sort((a, b) => b.date.localeCompare(a.date))[0]
  const recent = i.nights.filter(n => n.date >= shift(today, -13) && n.date !== last?.date).map(n => n.asleepMin)
  const avgMin = avg(recent)

  const blocks = i.focus.blocks.filter(b => b.completed && isPomoStep(b.step))
  const todays = blocks.filter(b => dayKey(b.createdAt) === today)

  const snap: WidgetSnapshot = {
    v: WIDGET_VERSION,
    at: i.now.getTime(),
    day: today,
    hasData: i.thoughts.length + i.sessions.length + i.journal.length + i.anchors.length > 0,
    streak: i.streak.current,
    activeToday: i.streak.activeToday,
    todayMood: latestBy.get(today)?.mood ?? null,
    week,
    anchors: i.anchors.slice(0, MAX_WIDGET_ANCHORS).map(a => ({ id: a.anchor.id, label: a.anchor.label, emoji: a.anchor.emoji, done: a.done, auto: a.auto })),
    worriesOpen: i.worriesOpen,
    sleep: { lastMin: last && last.date >= shift(today, -1) ? last.asleepMin : null, avgMin: avgMin === null ? null : Math.round(avgMin) },
    prompt: pickPrompt(today).text,
    coins: i.coins,
    guard: {
      enabled: i.focus.block && i.focus.apps > 0, apps: i.focus.apps, challenges: todays.length, reps: i.focus.goal,
      minutes: Math.round(todays.reduce((a, b) => a + Math.max(0, b.actualSec), 0) / 60), week: days.map(day => blocks.filter(b => dayKey(b.createdAt) === day).length),
    },
    wobbi: { text: '', pose: 'idle' },
  }
  snap.wobbi = wobbiLine(snap, i)
  return snap
}

/** One kind, true sentence for the "Wobbi says" widget. Only ever states what the data shows; never guilt. */
export function wobbiLine(s: WidgetSnapshot, i: Pick<WidgetInput, 'sessions' | 'journal' | 'thoughts'>): { text: string; pose: string } {
  const from = s.week[0].day
  const active = new Set([...i.thoughts, ...i.sessions, ...i.journal].map(x => dayKey(x.createdAt)).filter(d => d >= from))
  const breaths = i.sessions.filter(x => dayKey(x.createdAt) >= from).length
  const anchorsAll = s.anchors.length > 0 && s.anchors.every(a => a.done)
  if (!s.hasData) return { text: 'Hi! I’m Wobbi. Tap me to start.', pose: 'wave' }
  if (anchorsAll) return { text: 'Every anchor done today. That’s you showing up.', pose: 'celebrate' }
  if (s.streak >= 3 && s.activeToday) return { text: `${s.streak} days in a row. I’m proud of you.`, pose: 'cheer' }
  if (active.size >= 3) return { text: `You showed up ${active.size} days this week.`, pose: 'love' }
  if (breaths >= 2) return { text: `${breaths} breathing breaks this week. Your body noticed.`, pose: 'breatheOut' }
  if (s.todayMood !== null && s.todayMood <= 2) return { text: 'Rough day? I’m here. One slow breath?', pose: 'love' }
  if (!s.activeToday) return { text: 'How’s your head today? One tap is enough.', pose: 'think' }
  return { text: 'Small steps count. You took one today.', pose: 'cheer' }
}

/* ---- actions queued by interactive widgets ---- */

export type WidgetAction =
  | { kind: 'mood'; mood: number; at: number }
  | { kind: 'anchor'; id: string; done: boolean; day: string; at: number }

/** Validates whatever came back from native storage (it may be stale, from an older build, or junk). */
export function normalizeActions(raw: unknown): WidgetAction[] {
  if (!Array.isArray(raw)) return []
  const out: WidgetAction[] = []
  for (const a of raw) {
    if (!a || typeof a !== 'object') continue
    const r = a as Record<string, unknown>
    if (typeof r.at !== 'number' || !Number.isFinite(r.at)) continue
    if (r.kind === 'mood' && Number.isInteger(r.mood) && (r.mood as number) >= 1 && (r.mood as number) <= 5) out.push({ kind: 'mood', mood: r.mood as number, at: r.at })
    else if (r.kind === 'anchor' && typeof r.id === 'string' && r.id && typeof r.done === 'boolean' && typeof r.day === 'string') out.push({ kind: 'anchor', id: r.id, done: r.done, day: r.day, at: r.at })
  }
  return out
}

export const MAX_MOODS_PER_DRAIN = 10
const MOOD_MAX_AGE_MS = 48 * 3600_000

/**
 * What the app should do with the queue: moods to log (at the time they were tapped) and anchors to toggle.
 * Anchor ticks only count for the day they were made, the last tap per anchor wins, and an anchor that is
 * already in the wanted state (or ticked itself automatically) is left alone.
 */
export function planActions(actions: WidgetAction[], now: Date, anchors: { anchor: { id: string }; manual: boolean; auto: boolean }[]) {
  const t = now.getTime(), today = dayKey(now)
  const seen = new Set<number>()
  const moods = actions
    .filter((a): a is Extract<WidgetAction, { kind: 'mood' }> => a.kind === 'mood')
    .filter(a => a.at <= t + 5 * 60_000 && t - a.at <= MOOD_MAX_AGE_MS && !seen.has(a.at) && (seen.add(a.at), true))
    .sort((a, b) => a.at - b.at)
    .slice(-MAX_MOODS_PER_DRAIN)
    .map(a => ({ mood: a.mood, createdAt: new Date(Math.min(a.at, t)).toISOString() }))
  const wanted = new Map<string, boolean>()
  for (const a of actions.filter((a): a is Extract<WidgetAction, { kind: 'anchor' }> => a.kind === 'anchor').sort((a, b) => a.at - b.at))
    if (a.day === today) wanted.set(a.id, a.done)
  const toggles = [...wanted].filter(([id, done]) => {
    const item = anchors.find(x => x.anchor.id === id)
    return item && !item.auto && item.manual !== done
  }).map(([id]) => id)
  return { moods, toggles }
}
