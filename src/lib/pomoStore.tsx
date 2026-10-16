import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useStore } from './store'
import { isNative } from './native'
import { requestNotificationPermission } from './nativeReminders'
import { loadPomo, loadRun, loadTodos, savePomo, saveRun, saveTodos } from './extras'
import { elapsedMs, pauseTimer, remainingMs, resumeTimer, startTimer } from './focus.ts'
import { addPomoTo, addTodo, catchUp, nextPhase, normalizePomo, PHASE_LABEL, phaseMinutes, plan, pomoStats, pomoStep, removeTodo, tidyTodos, toggleTodo, type PomoPhase, type PomoRun, type PomoSettings, type PomoStats, type Segment, type Todo } from './pomodoro.ts'
import { liveEnd, liveStart, liveUpdate } from './liveActivity'
import { chime, hapticSuccess } from './haptics'
import { sfx } from './sound'
import { burst } from './confetti'

const NOTIF_ID = 7301
const NOTIF_IDS = Array.from({ length: 8 }, (_, i) => ({ id: NOTIF_ID + i }))   // one per upcoming phase change
function notice(seg: Segment, next: Segment | undefined) {
  const mins = (x: Segment) => Math.round((x.end - x.start) / 60_000)
  if (seg.phase === 'work') return { title: 'Focus block done', body: next ? `Nicely done. ${PHASE_LABEL[next.phase]}: ${mins(next)} min, starting now.` : 'Nicely done. Time for a break.' }
  return { title: 'Break over', body: next ? `Back to focus: ${mins(next)} min, starting now.` : 'Ready when you are.' }
}

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

  const latestRun = useRef(run); latestRun.current = run
  const commit = useCallback((r: PomoRun) => { latestRun.current = r; setRun(r); saveRun(r) }, [])
  const setSettings = useCallback((p: Partial<PomoSettings>) => setS(cur => { const n = normalizePomo({ ...cur, ...p }); savePomo(n); return n }), [])
  const persistTodos = (next: Todo[]) => { setTodos(next); saveTodos(next) }

  const running = run.timer?.status === 'running', paused = run.timer?.status === 'paused'
  useEffect(() => { if (!running) return; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id) }, [running])
  useEffect(() => { setNow(Date.now()) }, [run])

  // --- phone-side extras. The app sleeps in the background, so everything the clock will do on its own is handed over up
  // front: a notification for each phase change, and the whole run of phases to the lock-screen / Dynamic Island timer. ---
  const latest = useRef({ settings, doneToday, task }); latest.current = { settings, doneToday, task }
  const sync = useCallback(async (r: PomoRun) => {
    const t = r.timer, at = Date.now(), { settings: st, doneToday: dt, task: tk } = latest.current
    const segs = plan(r, st, dt, at)
    if (isNative()) {
      LocalNotifications.cancel({ notifications: NOTIF_IDS }).catch(() => {})
      if (segs.length) {
        try {
          if (await requestNotificationPermission()) await LocalNotifications.schedule({ notifications: segs.map((g, i) => ({ id: NOTIF_ID + i, ...notice(g, segs[i + 1]), schedule: { at: new Date(g.end) }, extra: { route: 'focus' } })) })
        } catch { /* notifications are a bonus */ }
      }
    }
    if (!t) { if (live.current) { live.current = false; liveEnd() } return }
    const o = {
      title: PHASE_LABEL[r.phase], subtitle: r.phase === 'work' ? (tk?.text ?? 'Wobbi focus') : 'Wobbi break', phase: r.phase,
      startsAt: at - elapsedMs(t, at), endsAt: at + remainingMs(t, at), remainingSec: t.status === 'paused' ? Math.round(remainingMs(t, at) / 1000) : undefined,
      next: segs.slice(1).map(g => ({ title: PHASE_LABEL[g.phase], subtitle: g.phase === 'work' ? (tk?.text ?? 'Wobbi focus') : 'Wobbi break', phase: g.phase, startsAt: g.start, endsAt: g.end })),
    }
    if (live.current) liveUpdate(o); else { live.current = true; liveStart('focus', o) }
  }, [])

  // --- catch up with everything that happened while the app was closed or asleep (several phases if need be) ---
  useEffect(() => {
    if (!ready || run.timer?.status !== 'running') return
    const at = Date.now(), { run: next, finished } = catchUp(run, settings, doneToday, at)
    if (!finished.length) return
    let list = todos
    for (const f of finished) {
      if (f.phase !== 'work') continue
      const tk = todos.find(x => x.id === f.taskId && !x.done)
      addFocus({ minutes: settings.work, actualSec: f.actualSec, completed: true, worryId: null, step: pomoStep(tk?.text ?? null), createdAt: new Date(f.end).toISOString() })
      if (tk) list = addPomoTo(list, tk.id)
    }
    if (list !== todos) persistTodos(list)
    const last = finished[finished.length - 1]
    if (at - last.end < 60_000) {   // only celebrate what you are here to see
      if (last.phase === 'work') { sfx('celebrate'); burst(); setJustFinished(at) }
      hapticSuccess(); if (settings.bell) chime(last.phase === 'work' ? 784 : 523, 420)
    }
    commit(next); void sync(next)
  })   // eslint-disable-line react-hooks/exhaustive-deps
  // the island / notifications are re-handed over on launch and whenever the app comes back (iOS may have dropped them)
  useEffect(() => {
    if (!ready) return
    const again = () => { if (document.visibilityState === 'visible') { setNow(Date.now()); if (latestRun.current.timer) void sync(latestRun.current) } }
    again(); document.addEventListener('visibilitychange', again)
    return () => document.removeEventListener('visibilitychange', again)
  }, [ready, sync])
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
    setTask(id) { const next = { ...run, taskId: id }; latest.current = { ...latest.current, task: todos.find(x => x.id === id && !x.done) ?? null }; commit(next); if (next.timer) void sync(next) },
    add(text) { const r = addTodo(todos, text, new Date().toISOString(), crypto.randomUUID()); if (r.error) return r.error; persistTodos(r.list); return null },
    toggle(id) { const was = todos.find(x => x.id === id)?.done; persistTodos(toggleTodo(todos, id, new Date().toISOString())); if (!was) { hapticSuccess(); if (run.taskId === id) commit({ ...run, taskId: null }) } },
    remove(id) { persistTodos(removeTodo(todos, id)); if (run.taskId === id) commit({ ...run, taskId: null }) },
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
