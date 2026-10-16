import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useStore } from './store'
import { isNative } from './native'
import { requestNotificationPermission } from './nativeReminders'
import { loadPomo, loadRun, loadTodos, savePomo, saveRun, saveTodos } from './extras'
import { elapsedMs, finishTimer, isDone, pauseTimer, remainingMs, resumeTimer, startTimer } from './focus.ts'
import { addPomoTo, addTodo, nextPhase, normalizePomo, PHASE_LABEL, phaseMinutes, pomoStats, pomoStep, removeTodo, tidyTodos, toggleTodo, type PomoPhase, type PomoRun, type PomoSettings, type PomoStats, type Todo } from './pomodoro.ts'
import { liveEnd, liveStart, liveUpdate } from './liveActivity'
import { chime, hapticSuccess } from './haptics'
import { sfx } from './sound'
import { burst } from './confetti'

const NOTIF_ID = 7301

interface Pomo {
  settings: PomoSettings; setSettings: (p: Partial<PomoSettings>) => void
  run: PomoRun; running: boolean; paused: boolean; left: number; progress: number; now: number
  stats: PomoStats; todos: Todo[]; task: Todo | null; doneToday: number; justFinished: number | null
  startPause(): void; reset(): void; skip(): void; setPhase(p: PomoPhase): void; setTask(id: string | null): void
  add(text: string): string | null; toggle(id: string): void; remove(id: string): void
}
const Ctx = createContext<Pomo>(null!)
export const usePomo = () => useContext(Ctx)

/** The pomodoro lives above every screen: leaving the Focus page never stops the clock, finished blocks are recorded either way. */
export function PomoProvider({ children }: { children: ReactNode }) {
  const { focusSessions, addFocus, ready } = useStore()
  const [settings, setS] = useState<PomoSettings>(loadPomo)
  const [run, setRun] = useState<PomoRun>(loadRun)
  const [todos, setTodos] = useState<Todo[]>(() => tidyTodos(loadTodos(), Date.now()))
  const [now, setNow] = useState(() => Date.now())
  const [justFinished, setJustFinished] = useState<number | null>(null)
  const live = useRef(false)
  const stats = useMemo(() => pomoStats(focusSessions, new Date(now), settings.goal), [focusSessions, now, settings.goal])   // eslint-disable-line react-hooks/exhaustive-deps
  const doneToday = stats.today.blocks
  const task = todos.find(t => t.id === run.taskId && !t.done) ?? null

  const commit = useCallback((r: PomoRun) => { setRun(r); saveRun(r) }, [])
  const setSettings = useCallback((p: Partial<PomoSettings>) => setS(cur => { const n = normalizePomo({ ...cur, ...p }); savePomo(n); return n }), [])
  const persistTodos = (next: Todo[]) => { setTodos(next); saveTodos(next) }

  const running = run.timer?.status === 'running', paused = run.timer?.status === 'paused'
  useEffect(() => { if (!running) return; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id) }, [running])
  useEffect(() => { setNow(Date.now()) }, [run])

  // --- phone-side extras: a notification when the block ends, and the lock-screen timer ---
  const sync = useCallback(async (r: PomoRun) => {
    const t = r.timer, at = Date.now()
    if (isNative()) {
      LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] }).catch(() => {})
      if (t?.status === 'running') {
        const when = new Date(at + remainingMs(t, at))
        try { if (await requestNotificationPermission()) await LocalNotifications.schedule({ notifications: [{ id: NOTIF_ID, title: r.phase === 'work' ? 'Focus block done' : 'Break over', body: r.phase === 'work' ? 'Nicely done. Time for a break.' : 'Ready when you are.', schedule: { at: when }, extra: { route: 'focus' } }] }) } catch { /* notifications are a bonus */ }
      }
    }
    if (!t) { if (live.current) { live.current = false; liveEnd() } return }
    const o = { title: PHASE_LABEL[r.phase], subtitle: 'Wobbi focus', startsAt: at - elapsedMs(t, at), endsAt: at + remainingMs(t, at), remainingSec: t.status === 'paused' ? Math.round(remainingMs(t, at) / 1000) : undefined }
    if (live.current) liveUpdate(o); else { live.current = true; liveStart('focus', o) }
  }, [])

  // --- a clock that ran out (also catches up after the app was closed) ---
  useEffect(() => {
    const t = run.timer
    if (!ready || !t || t.status !== 'running' || !isDone(t, Date.now())) return
    const end = Date.now(), done = finishTimer(t, end)
    if (run.phase === 'work') {
      addFocus({ minutes: settings.work, actualSec: Math.round(elapsedMs(done, end) / 1000), completed: true, worryId: null, step: pomoStep(task?.text ?? null) })
      if (task) persistTodos(addPomoTo(todos, task.id))
      sfx('celebrate'); hapticSuccess(); burst(); setJustFinished(end)
    } else { hapticSuccess() }
    if (settings.bell) chime(run.phase === 'work' ? 784 : 523, 420)
    const nxt = nextPhase(run.phase, run.phase === 'work' ? doneToday + 1 : doneToday, settings)
    const auto = run.phase === 'work' ? settings.autoBreak : settings.autoFocus
    const next: PomoRun = { phase: nxt, taskId: run.taskId, timer: auto ? startTimer(phaseMinutes(nxt, settings), end) : null }
    commit(next); void sync(next)
  })   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (justFinished === null) return; const id = setTimeout(() => setJustFinished(null), 5000); return () => clearTimeout(id) }, [justFinished])
  useEffect(() => () => { if (live.current) liveEnd() }, [])

  const t = run.timer
  const left = t ? remainingMs(t, now) : phaseMinutes(run.phase, settings) * 60_000
  const progress = t ? Math.min(1, elapsedMs(t, now) / t.totalMs) : 0

  const api: Pomo = {
    settings, setSettings, run, running, paused, left, progress, now, stats, todos, task, doneToday, justFinished,
    startPause() {
      const at = Date.now()
      const next: PomoRun = !t ? { ...run, timer: startTimer(phaseMinutes(run.phase, settings), at) } : { ...run, timer: running ? pauseTimer(t, at) : resumeTimer(t, at) }
      commit(next); void sync(next)
    },
    reset() { const next: PomoRun = { ...run, phase: 'work', timer: null }; commit(next); void sync(next) },
    skip() { const next: PomoRun = { ...run, phase: nextPhase(run.phase, doneToday, settings), timer: null }; commit(next); void sync(next) },
    setPhase(p) { if (t) return; commit({ ...run, phase: p }) },
    setTask(id) { commit({ ...run, taskId: id }) },
    add(text) { const r = addTodo(todos, text, new Date().toISOString(), crypto.randomUUID()); if (r.error) return r.error; persistTodos(r.list); return null },
    toggle(id) { const was = todos.find(x => x.id === id)?.done; persistTodos(toggleTodo(todos, id, new Date().toISOString())); if (!was) { hapticSuccess(); if (run.taskId === id) commit({ ...run, taskId: null }) } },
    remove(id) { persistTodos(removeTodo(todos, id)); if (run.taskId === id) commit({ ...run, taskId: null }) },
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
