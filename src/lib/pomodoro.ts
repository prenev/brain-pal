import { dayKey } from './dates.ts'
import type { Timer } from './focus.ts'

/** Pomodoro rhythm, run state, stats and a tiny to-do list. Pure: the timer itself reuses the timestamp-based Timer in focus.ts. Tested in scripts/test-pomodoro.mjs. */
export type PomoPhase = 'work' | 'short' | 'long'
export interface PomoSettings { work: number; short: number; long: number; every: number; autoBreak: boolean; autoFocus: boolean; bell: boolean; goal: number }
const EXTRA = { autoBreak: true, autoFocus: false, bell: true, goal: 4 }

export const POMO_PRESETS: { id: string; name: string; blurb: string; s: PomoSettings }[] = [
  { id: 'classic', name: 'Classic', blurb: '25 · 5', s: { work: 25, short: 5, long: 15, every: 4, ...EXTRA } },
  { id: 'gentle', name: 'Gentle', blurb: '15 · 3', s: { work: 15, short: 3, long: 10, every: 4, ...EXTRA } },
  { id: 'deep', name: 'Deep', blurb: '50 · 10', s: { work: 50, short: 10, long: 20, every: 3, ...EXTRA, goal: 3 } },
]
export const DEFAULT_POMO = POMO_PRESETS[0].s
export const POMO_TAG = 'Pomodoro'

export const phaseMinutes = (p: PomoPhase, s: PomoSettings) => (p === 'work' ? s.work : p === 'short' ? s.short : s.long)
export const PHASE_LABEL: Record<PomoPhase, string> = { work: 'Focus', short: 'Short break', long: 'Long break' }

/** After a focus block: a long break every `every` blocks, otherwise a short one. After any break: back to focus. `doneToday` counts the block that just finished. */
export function nextPhase(phase: PomoPhase, doneToday: number, s: PomoSettings): PomoPhase {
  if (phase !== 'work') return 'work'
  return doneToday > 0 && doneToday % Math.max(1, s.every) === 0 ? 'long' : 'short'
}
export function normalizePomo(raw: unknown): PomoSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<PomoSettings>
  const n = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d)
  const b = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
  return { work: n(r.work, 1, 120, 25), short: n(r.short, 1, 60, 5), long: n(r.long, 1, 90, 15), every: n(r.every, 2, 8, 4), autoBreak: b(r.autoBreak, EXTRA.autoBreak), autoFocus: b(r.autoFocus, EXTRA.autoFocus), bell: b(r.bell, EXTRA.bell), goal: n(r.goal, 1, 12, EXTRA.goal) }
}

/* ---- the run (what is on the clock right now); small enough to keep in localStorage so leaving the screen never loses it ---- */
export interface PomoRun { phase: PomoPhase; timer: Timer | null; taskId: string | null }
export const IDLE_RUN: PomoRun = { phase: 'work', timer: null, taskId: null }
export function normalizeRun(raw: unknown): PomoRun {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<PomoRun>
  const phase: PomoPhase = r.phase === 'short' || r.phase === 'long' ? r.phase : 'work'
  const t = r.timer as Partial<Timer> | null | undefined
  const ok = !!t && typeof t === 'object' && (t.status === 'running' || t.status === 'paused') && typeof t.totalMs === 'number' && t.totalMs > 0 && typeof t.accumulatedMs === 'number' && t.accumulatedMs >= 0 && (t.status === 'paused' || typeof t.startedAt === 'number')
  return { phase, taskId: typeof r.taskId === 'string' ? r.taskId : null, timer: ok ? { status: t!.status as Timer['status'], totalMs: t!.totalMs!, accumulatedMs: t!.accumulatedMs!, startedAt: t!.status === 'running' ? t!.startedAt! : null } : null }
}

/* ---- stats from finished blocks (they are saved as focus sessions whose step starts with "Pomodoro") ---- */
export interface BlockLike { createdAt: string; actualSec: number; completed: boolean; step: string }
export interface PomoStats {
  today: { blocks: number; minutes: number; goal: number; goalMet: boolean }
  week: { day: string; blocks: number; minutes: number }[]
  streak: number; total: { blocks: number; minutes: number }
  best: { day: string; blocks: number } | null
  tasks: { task: string; blocks: number }[]
}
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export function pomoStats(sessions: BlockLike[], now: Date, goal: number): PomoStats {
  const blocks = sessions.filter(s => s.completed && isPomoStep(s.step))
  const per = new Map<string, { blocks: number; sec: number }>(), tasks = new Map<string, number>()
  for (const b of blocks) {
    const k = dayKey(b.createdAt), cur = per.get(k) ?? { blocks: 0, sec: 0 }; per.set(k, { blocks: cur.blocks + 1, sec: cur.sec + Math.max(0, b.actualSec) })
    const t = b.step.slice(POMO_TAG.length + 3).trim(); if (t) tasks.set(t, (tasks.get(t) ?? 0) + 1)
  }
  const day = (d: Date) => { const k = dayKey(d), v = per.get(k); return { day: k, blocks: v?.blocks ?? 0, minutes: Math.round((v?.sec ?? 0) / 60) } }
  const today = day(now)
  const week = Array.from({ length: 7 }, (_, i) => day(addDays(now, i - 6)))
  let streak = 0, d = new Date(now); if (!today.blocks) d = addDays(d, -1)      // today is still open: yesterday keeps the streak alive
  while ((per.get(dayKey(d))?.blocks ?? 0) > 0) { streak++; d = addDays(d, -1) }
  const bestEntry = [...per.entries()].sort((a, b) => b[1].blocks - a[1].blocks || b[0].localeCompare(a[0]))[0]
  return {
    today: { blocks: today.blocks, minutes: today.minutes, goal, goalMet: today.blocks >= goal }, week, streak,
    total: { blocks: blocks.length, minutes: Math.round([...per.values()].reduce((a, v) => a + v.sec, 0) / 60) },
    best: bestEntry ? { day: bestEntry[0], blocks: bestEntry[1].blocks } : null,
    tasks: [...tasks.entries()].map(([task, n]) => ({ task, blocks: n })).sort((a, b) => b.blocks - a.blocks || a.task.localeCompare(b.task)).slice(0, 5),
  }
}

/** The step text saved with a finished block, so it shows up in focus history and can be counted. */
export const pomoStep = (task: string | null) => (task ? `${POMO_TAG} · ${task}` : POMO_TAG)
export const isPomoStep = (step: string) => step === POMO_TAG || step.startsWith(`${POMO_TAG} · `)

/* ---- to-dos ---- */
export interface Todo { id: string; text: string; done: boolean; createdAt: string; doneAt: string | null; pomos: number }
export const MAX_TODOS = 30, MAX_TODO_TEXT = 100

export const cleanTodoText = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, MAX_TODO_TEXT)
export function addTodo(list: Todo[], text: string, now: string, id: string): { list: Todo[]; error?: string } {
  const t = cleanTodoText(text)
  if (!t) return { list, error: 'Write what you want to get done.' }
  if (list.filter(x => !x.done).length >= MAX_TODOS) return { list, error: `Keep it to ${MAX_TODOS} open things. Finish or remove one first.` }
  if (list.some(x => !x.done && x.text.toLowerCase() === t.toLowerCase())) return { list, error: 'That one is already on the list.' }
  return { list: [{ id, text: t, done: false, createdAt: now, doneAt: null, pomos: 0 }, ...list] }
}
export const toggleTodo = (list: Todo[], id: string, now: string): Todo[] => list.map(t => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? null : now } : t))
export const removeTodo = (list: Todo[], id: string): Todo[] => list.filter(t => t.id !== id)
export const addPomoTo = (list: Todo[], id: string | null): Todo[] => (id ? list.map(t => (t.id === id ? { ...t, pomos: t.pomos + 1 } : t)) : list)
/** Open first (newest first), done last; done items older than a week drop off so the list stays small. */
export function tidyTodos(list: Todo[], now: number): Todo[] {
  const week = 7 * 864e5
  return [...list.filter(t => !t.done || (t.doneAt && now - new Date(t.doneAt).getTime() < week))].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt.localeCompare(a.createdAt))
}
export function normalizeTodos(raw: unknown): Todo[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((t): t is Todo => !!t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.createdAt === 'string')
    .map(t => ({ id: t.id, text: cleanTodoText(t.text), done: t.done === true, createdAt: t.createdAt, doneAt: typeof t.doneAt === 'string' ? t.doneAt : null, pomos: Number.isFinite(t.pomos) && t.pomos > 0 ? Math.floor(t.pomos) : 0 }))
    .filter(t => t.text).slice(0, MAX_TODOS * 3)
}
