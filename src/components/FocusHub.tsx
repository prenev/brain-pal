import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Pause, Play, Plus, RotateCcw, SkipForward, Trash2 } from 'lucide-react'
import Pal from './Pal'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { hapticSuccess } from '../lib/haptics'
import { sfx } from '../lib/sound'
import { burst } from '../lib/confetti'
import { dayKey } from '../lib/dates.ts'
import { elapsedMs, finishTimer, fmtClock, isDone, pauseTimer, remainingMs, resumeTimer, startTimer, timerProgress, type Timer } from '../lib/focus.ts'
import { addPomoTo, addTodo, isPomoStep, nextPhase, normalizePomo, PHASE_LABEL, phaseMinutes, POMO_PRESETS, pomoStep, removeTodo, tidyTodos, toggleTodo, type PomoPhase, type PomoSettings } from '../lib/pomodoro.ts'
import { loadPomo, loadTodos, savePomo, saveTodos } from '../lib/extras'

const R = 54, C = 2 * Math.PI * R

/** Focus: a pomodoro timer (focus block, short break, long break every few blocks) and a small to-do list to pick the block's task from. */
export default function FocusHub() {
  const { focusSessions, addFocus } = useStore()
  const [s, setS] = useState<PomoSettings>(loadPomo)
  const [todos, setTodos] = useState(() => tidyTodos(loadTodos(), Date.now()))
  const [phase, setPhase] = useState<PomoPhase>('work')
  const [timer, setTimer] = useState<Timer | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [, tick] = useState(0)
  const startedWork = useRef(false)

  const today = dayKey(new Date())
  const doneToday = useMemo(() => focusSessions.filter(f => f.completed && isPomoStep(f.step) && dayKey(f.createdAt) === today).length, [focusSessions, today])
  const task = todos.find(t => t.id === taskId && !t.done) ?? null
  const persist = (next: typeof todos) => { setTodos(next); saveTodos(next) }
  const choose = (p: typeof POMO_PRESETS[number]) => { const n = normalizePomo(p.s); setS(n); savePomo(n); setTimer(null); setPhase('work') }

  useEffect(() => { if (!timer || timer.status !== 'running') return; const id = setInterval(() => tick(n => n + 1), 250); return () => clearInterval(id) }, [timer?.status])      // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {          // keep the screen on while a block runs
    if (!timer || timer.status !== 'running') return
    let lock: WakeLockSentinel | null = null, off = false
    navigator.wakeLock?.request('screen').then(l => { if (off) l.release().catch(() => {}); else lock = l }).catch(() => {})
    return () => { off = true; lock?.release().catch(() => {}) }
  }, [timer?.status])

  const now = Date.now()
  // a running block that has run out: record it (focus blocks only) and roll into the next phase
  useEffect(() => {
    if (!timer || timer.status !== 'running' || !isDone(timer, Date.now())) return
    const done = finishTimer(timer, Date.now())
    if (phase === 'work') {
      addFocus({ minutes: s.work, actualSec: Math.round(elapsedMs(done, Date.now()) / 1000), completed: true, worryId: null, step: pomoStep(task?.text ?? null) })
      if (task) persist(addPomoTo(todos, task.id))
      sfx('celebrate'); hapticSuccess(); burst()
    } else { hapticSuccess() }
    const nxt = nextPhase(phase, phase === 'work' ? doneToday + 1 : doneToday, s)
    setPhase(nxt); setTimer(startTimer(phaseMinutes(nxt, s), Date.now()))       // the next phase starts by itself: a break should be a break, not a decision
  })   // eslint-disable-line react-hooks/exhaustive-deps

  const left = timer ? remainingMs(timer, now) : phaseMinutes(phase, s) * 60_000
  const progress = timer ? timerProgress(timer, now) : 0
  const running = timer?.status === 'running'

  function startStop() {
    if (!timer) { startedWork.current = true; setTimer(startTimer(phaseMinutes(phase, s), Date.now())); return }
    setTimer(running ? pauseTimer(timer, Date.now()) : resumeTimer(timer, Date.now()))
  }
  const reset = () => { setTimer(null); setPhase('work') }
  const skip = () => { const nxt = nextPhase(phase, doneToday, s); setPhase(nxt); setTimer(null) }
  function add() { const r = addTodo(todos, text, new Date().toISOString(), crypto.randomUUID()); setErr(r.error ?? ''); if (!r.error) { persist(r.list); setText('') } }

  return (
    <>
      <div className={`pomo card ${phase}`} aria-label="Pomodoro timer">
        <div className="seg" role="group" aria-label="Rhythm">{POMO_PRESETS.map(p => <button key={p.id} className={p.s.work === s.work && p.s.short === s.short ? 'on' : ''} onClick={() => choose(p)} disabled={!!timer}>{p.name}<small>{p.blurb}</small></button>)}</div>
        <div className="pomo-ring" role="timer" aria-label={`${PHASE_LABEL[phase]}, ${fmtClock(left)} left`}>
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r={R} /><circle className="fg" cx="60" cy="60" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - progress)} /></svg>
          <div><b>{fmtClock(left)}</b><span>{PHASE_LABEL[phase]}</span></div>
        </div>
        <p className="muted pomo-task">{phase === 'work' ? (task ? <>Working on <b>{task.text}</b></> : 'Pick a task below, or just focus.') : <>Breathe, stretch, look away from the screen.</>}</p>
        <div className="pomo-ctl">
          <button className="btn" aria-label="Reset" onClick={reset} disabled={!timer}><RotateCcw size={20} /></button>
          <button className="btn primary" style={{ flex: 1 }} onClick={startStop}>{running ? <><Pause size={20} style={{ display: 'inline', verticalAlign: -4 }} /> Pause</> : <><Play size={20} style={{ display: 'inline', verticalAlign: -4 }} /> {timer ? 'Resume' : 'Start'}</>}</button>
          <button className="btn" aria-label="Skip" onClick={skip}><SkipForward size={20} /></button>
        </div>
        <div className="pomo-dots" aria-label={`${doneToday} focus blocks today`}>
          {Array.from({ length: Math.max(s.every, doneToday) }, (_, i) => <i key={i} className={i < doneToday ? 'on' : ''} />)}
          <span className="muted small">{doneToday} today</span>
        </div>
      </div>

      <div className="card todos" aria-label="To-do">
        <div className="row spread"><b style={{ fontSize: 18 }}>To-do</b><span className="muted small">{todos.filter(t => !t.done).length} open</span></div>
        <form className="todo-add" onSubmit={e => { e.preventDefault(); add() }}>
          <input className="input" aria-label="New to-do" placeholder="What do you want to get done?" value={text} maxLength={100} onChange={e => { setText(e.target.value); setErr('') }} />
          <button className="btn primary" type="submit" aria-label="Add to-do"><Plus size={20} /></button>
        </form>
        {err && <p role="alert" style={{ color: 'var(--danger)', margin: '6px 2px 0' }}>{err}</p>}
        {todos.length === 0 && <div className="todo-empty"><Pal pose="think" size={64} /><span className="muted">Nothing here yet. One small thing is enough.</span></div>}
        <ul>
          {todos.map(t => (
            <li key={t.id} className={`${t.done ? 'done' : ''} ${t.id === taskId ? 'focus' : ''}`}>
              <button role="checkbox" aria-checked={t.done} aria-label={`Done: ${t.text}`} className="tickbox-btn" onClick={() => { persist(toggleTodo(todos, t.id, new Date().toISOString())); if (!t.done) { hapticSuccess(); if (taskId === t.id) setTaskId(null) } }}><span className="tickbox">{t.done && <Check size={16} strokeWidth={3.4} />}</span></button>
              <button className="todo-text" aria-pressed={t.id === taskId} disabled={t.done} onClick={() => setTaskId(t.id === taskId ? null : t.id)}>{t.text}{t.pomos > 0 && <em><Emoji name="fire" size={14} style={{ verticalAlign: -2 }} /> {t.pomos}</em>}</button>
              <button className="icon-btn" aria-label={`Remove ${t.text}`} onClick={() => persist(removeTodo(todos, t.id))}><Trash2 size={17} /></button>
            </li>
          ))}
        </ul>
        {todos.some(t => !t.done) && <p className="muted small" style={{ margin: '8px 2px 0' }}>Tap a task to work on it in the next focus block.</p>}
      </div>
    </>
  )
}
