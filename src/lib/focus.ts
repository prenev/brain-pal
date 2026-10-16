/**
 * "One small step": a calm start, then a short focus timer. Pure and timestamp-based, so it is drift-proof
 * (a backgrounded tab or a throttled interval can't make it wrong) and testable with a fake clock.
 * There is deliberately no failure state: pausing is free and stopping early is neutral.
 */
export const FOCUS_OPTIONS = [5, 10, 25] as const
export const CALM_START_SEC = 60

export interface FocusSession {
  id: string
  createdAt: string
  /** Planned length in minutes. */
  minutes: number
  /** Time actually spent focusing, in seconds. */
  actualSec: number
  /** The person said they got the step done (or the timer ran out). */
  completed: boolean
  worryId: string | null
  step: string
}

export type TimerStatus = 'running' | 'paused' | 'finished'
export interface Timer { status: TimerStatus; totalMs: number; accumulatedMs: number; startedAt: number | null }

export const startTimer = (minutes: number, now: number): Timer => ({ status: 'running', totalMs: Math.max(1, minutes) * 60_000, accumulatedMs: 0, startedAt: now })

export function elapsedMs(t: Timer, now: number): number {
  const live = t.status === 'running' && t.startedAt !== null ? Math.max(0, now - t.startedAt) : 0   // a clock that jumps back counts as 0, never negative
  return Math.min(t.totalMs, t.accumulatedMs + live)
}
export const remainingMs = (t: Timer, now: number) => t.totalMs - elapsedMs(t, now)
export const isDone = (t: Timer, now: number) => t.status === 'finished' || remainingMs(t, now) <= 0
export const timerProgress = (t: Timer, now: number) => elapsedMs(t, now) / t.totalMs

export function pauseTimer(t: Timer, now: number): Timer {
  if (t.status !== 'running') return t
  return { ...t, status: 'paused', accumulatedMs: elapsedMs(t, now), startedAt: null }
}
export function resumeTimer(t: Timer, now: number): Timer {
  if (t.status !== 'paused' || remainingMs(t, now) <= 0) return t
  return { ...t, status: 'running', startedAt: now }
}
/** Stop the timer (finished or ended early), freezing the time spent. */
export function finishTimer(t: Timer, now: number): Timer {
  return { ...t, status: 'finished', accumulatedMs: elapsedMs(t, now), startedAt: null }
}

/** "mm:ss", rounding up so the clock never shows 00:00 while time is left. */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export interface StepChoice { worryId: string | null; text: string }
export const TINY_STEPS = [
  'Open it and do the very first bit',
  'Write one sentence',
  'Reply to one message',
  'Tidy just the space in front of me',
  'Set out what I need, then stop',
]

/** Plans you made for parked worries and haven't finished a focus session for, newest first (max 5), then generic ideas. */
export function stepChoices(worries: { id: string; status: string; action: string | null; createdAt: string }[], sessions: { worryId: string | null; completed: boolean }[], max = 5): { fromWorries: StepChoice[]; ideas: StepChoice[] } {
  const done = new Set(sessions.filter(s => s.completed && s.worryId).map(s => s.worryId))
  const fromWorries = worries
    .filter(w => w.status === 'actionable' && w.action?.trim() && !done.has(w.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, max)
    .map(w => ({ worryId: w.id, text: w.action!.trim() }))
  return { fromWorries, ideas: TINY_STEPS.map(text => ({ worryId: null, text })) }
}

export const focusMinutes = (sessions: { completed: boolean; actualSec: number }[]) => Math.round(sessions.filter(s => s.completed).reduce((a, s) => a + s.actualSec, 0) / 60)
