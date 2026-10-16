/** Pomodoro rhythm + a tiny to-do list. Pure: the timer itself reuses the timestamp-based Timer in focus.ts. Tested in scripts/test-pomodoro.mjs. */
export type PomoPhase = 'work' | 'short' | 'long'
export interface PomoSettings { work: number; short: number; long: number; every: number }

export const POMO_PRESETS: { id: string; name: string; blurb: string; s: PomoSettings }[] = [
  { id: 'classic', name: 'Classic', blurb: '25 · 5', s: { work: 25, short: 5, long: 15, every: 4 } },
  { id: 'gentle', name: 'Gentle', blurb: '15 · 3', s: { work: 15, short: 3, long: 10, every: 4 } },
  { id: 'deep', name: 'Deep', blurb: '50 · 10', s: { work: 50, short: 10, long: 20, every: 3 } },
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
  return { work: n(r.work, 1, 120, DEFAULT_POMO.work), short: n(r.short, 1, 60, DEFAULT_POMO.short), long: n(r.long, 1, 90, DEFAULT_POMO.long), every: n(r.every, 2, 8, DEFAULT_POMO.every) }
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
