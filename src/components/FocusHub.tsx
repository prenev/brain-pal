import { useState } from 'react'
import { ArrowLeft, BarChart3, Check, ChevronDown, ChevronLeft, ChevronRight, ListChecks, Minus, Plus, Settings, SkipForward, RotateCcw, Target, Trash2 } from 'lucide-react'
import Pal from './Pal'
import { Sheet, Toggle } from './ui'
import { Emoji } from '../lib/emoji'
import { usePomo } from '../lib/pomoStore'
import { fmtClock } from '../lib/focus.ts'
import { PHASE_LABEL, phaseMinutes, POMO_PRESETS, type PomoPhase } from '../lib/pomodoro.ts'
import type { PoseName } from '../lib/pal.ts'

const PHASES: PomoPhase[] = ['work', 'short', 'long']
const N = 24, RING = 112
/** One pose per phase: it stays put for the whole block and only changes when you pause or resume. */
const POSE: Record<PomoPhase, PoseName> = { work: 'focus', short: 'coffee', long: 'nap' }

/** The ring of little flowers: they fill clockwise as the clock runs. */
function Flowers({ progress }: { progress: number }) {
  const on = Math.round(progress * N)
  return (
    <svg className="pomo-flowers" viewBox="0 0 300 300" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => { const a = (i * 30 - 90) * Math.PI / 180; return <line key={i} className="tick" x1={150 + 134 * Math.cos(a)} y1={150 + 134 * Math.sin(a)} x2={150 + 146 * Math.cos(a)} y2={150 + 146 * Math.sin(a)} /> })}
      {Array.from({ length: N }, (_, i) => {
        const a = (i * (360 / N) - 90) * Math.PI / 180, cx = 150 + RING * Math.cos(a), cy = 150 + RING * Math.sin(a)
        return (
          <g key={i} className={`flower ${i < on ? 'on' : ''}`}>
            {Array.from({ length: 5 }, (_, k) => { const b = (k * 72 - 90) * Math.PI / 180; return <circle key={k} cx={cx + 6.4 * Math.cos(b)} cy={cy + 6.4 * Math.sin(b)} r="5.6" /> })}
            <circle className="heart" cx={cx} cy={cy} r="3.4" />
          </g>
        )
      })}
    </svg>
  )
}

function Timer({ onTask }: { onTask: () => void }) {
  const p = usePomo()
  const { run, settings: s } = p
  const idle = !run.timer
  const pose: PoseName = p.justFinished ? (run.phase === 'long' ? 'champ' : 'party') : idle ? (run.phase === 'work' ? 'holdPlay' : 'coffee') : p.paused ? 'think' : POSE[run.phase]
  const cycle = s.every, filled = p.doneToday % cycle || (run.phase === 'long' && p.doneToday > 0 ? cycle : 0)
  const idx = PHASES.indexOf(run.phase)
  return (
    <div className="pomo-main" aria-label="Pomodoro timer">
      <div className="pomo-orbit">
        <Flowers progress={p.progress} />
        <button className={`pomo-wobbi ${p.running ? 'run' : ''}`} onClick={p.startPause} aria-label={p.running ? 'Pause' : idle ? 'Start' : 'Resume'}>
          <Pal pose={pose} size={186} motion={p.justFinished ? 'jump' : p.running ? 'none' : 'bob'} />
        </button>
      </div>
      <div className="pomo-dots" aria-label={`${filled} of ${cycle} blocks before the long break`}>{Array.from({ length: cycle }, (_, i) => <i key={i} className={i < filled ? 'on' : ''} />)}</div>
      <div className="pomo-clock" role="timer" aria-label={`${PHASE_LABEL[run.phase]}, ${fmtClock(p.left)} left`}>{fmtClock(p.left)}</div>
      {run.phase === 'work'
        ? <button className={`pomo-task ${p.task ? 'set' : ''}`} onClick={onTask} aria-label={p.task ? `Working on ${p.task.text}. Change task` : 'Pick a task for this session'}>
            <Target size={18} /><span>{p.task ? p.task.text : 'Pick a task for this session'}</span><ChevronDown size={18} />
          </button>
        : <p className="pomo-line">{run.phase === 'short' ? 'Short break: sip, stretch, look away.' : 'Long break: you earned a proper rest.'}</p>}
      <div className="pomo-phase">
        <button aria-label="Previous phase" disabled={!idle} onClick={() => p.setPhase(PHASES[(idx + 2) % 3])}><ChevronLeft size={26} /></button>
        <span><b>{PHASE_LABEL[run.phase].toUpperCase()}</b> {phaseMinutes(run.phase, s)} MIN</span>
        <button aria-label="Next phase" disabled={!idle} onClick={() => p.setPhase(PHASES[(idx + 1) % 3])}><ChevronRight size={26} /></button>
      </div>
      <div className="pomo-ctl">
        <button aria-label="Reset" disabled={idle && run.phase === 'work'} onClick={p.reset}><RotateCcw size={20} /></button>
        <button className="go" onClick={p.startPause}>{p.running ? 'Pause' : idle ? 'Start' : 'Resume'}</button>
        <button aria-label="Skip" onClick={p.skip}><SkipForward size={20} /></button>
      </div>
    </div>
  )
}

function Todos() {
  const p = usePomo()
  const [text, setText] = useState(''), [err, setErr] = useState('')
  return (
    <div className="todos" aria-label="To-do">
      <div className="row spread"><b style={{ fontSize: 20 }}>To-do</b><span className="muted small">{p.todos.filter(t => !t.done).length} open</span></div>
      <form className="todo-add" onSubmit={e => { e.preventDefault(); const r = p.add(text); setErr(r ?? ''); if (!r) setText('') }}>
        <input className="input" aria-label="New to-do" placeholder="What do you want to get done?" value={text} maxLength={100} onChange={e => { setText(e.target.value); setErr('') }} />
        <button className="btn primary" type="submit" aria-label="Add to-do"><Plus size={20} /></button>
      </form>
      {err && <p role="alert" style={{ color: 'var(--danger)', margin: '6px 2px 0' }}>{err}</p>}
      {p.todos.length === 0 && <div className="todo-empty"><Pal pose="think" size={64} /><span className="muted">Nothing here yet. One small thing is enough.</span></div>}
      <ul>
        {p.todos.map(t => (
          <li key={t.id} className={`${t.done ? 'done' : ''} ${t.id === p.run.taskId ? 'focus' : ''}`}>
            <button role="checkbox" aria-checked={t.done} aria-label={`Done: ${t.text}`} className="tickbox-btn" onClick={() => p.toggle(t.id)}><span className="tickbox">{t.done && <Check size={16} strokeWidth={3.4} />}</span></button>
            <button className="todo-text" aria-pressed={t.id === p.run.taskId} disabled={t.done} onClick={() => p.setTask(t.id === p.run.taskId ? null : t.id)}>{t.text}{t.pomos > 0 && <em><Emoji name="fire" size={14} style={{ verticalAlign: -2 }} /> {t.pomos}</em>}</button>
            <button className="icon-btn" aria-label={`Remove ${t.text}`} onClick={() => p.remove(t.id)}><Trash2 size={17} /></button>
          </li>
        ))}
      </ul>
      {p.todos.some(t => !t.done) && <p className="muted small" style={{ margin: '8px 2px 0' }}>Tap a task to work on it this session. Each finished block counts towards it.</p>}
    </div>
  )
}

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
function Stats() {
  const { stats: st, settings, now } = usePomo()
  const max = Math.max(settings.goal, ...st.week.map(d => d.blocks), 1)
  const hours = st.total.minutes >= 60 ? `${Math.floor(st.total.minutes / 60)}h ${st.total.minutes % 60}m` : `${st.total.minutes}m`
  const day = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
  void now
  return (
    <div className="pomo-stats">
      <b style={{ fontSize: 20 }}>Your focus</b>
      <div className="card">
        <div className="row spread"><b style={{ fontSize: 18 }}>Today</b><span className="muted small">goal {settings.goal} blocks</span></div>
        <div className="goal-bar" role="img" aria-label={`${st.today.blocks} of ${settings.goal} blocks`}><i style={{ width: `${Math.min(100, (st.today.blocks / settings.goal) * 100)}%` }} /></div>
        <p style={{ margin: '8px 0 0', fontWeight: 800 }}>{st.today.blocks} {st.today.blocks === 1 ? 'block' : 'blocks'} · {st.today.minutes} min focused{st.today.goalMet ? ' · goal met!' : ''}</p>
      </div>
      <div className="card">
        <b style={{ fontSize: 18 }}>This week</b>
        <div className="week-bars" role="img" aria-label="Focus blocks per day this week">
          {st.week.map((d, i) => (
            <div key={d.day} className={i === 6 ? 'today' : ''}><span className="bar-n">{d.blocks || ''}</span><i style={{ height: `${Math.max(d.blocks ? 10 : 4, (d.blocks / max) * 100)}%` }} /><span>{WD[new Date(`${d.day}T12:00:00`).getDay()]}</span></div>
          ))}
        </div>
      </div>
      <div className="stat-tiles">
        <div className="card"><b>{st.streak}</b><span>day streak</span></div>
        <div className="card"><b>{st.total.blocks}</b><span>blocks</span></div>
        <div className="card"><b>{hours}</b><span>focused</span></div>
      </div>
      {st.best && <p className="muted small" style={{ textAlign: 'center' }}>Best day: {st.best.blocks} blocks on {day(st.best.day)}</p>}
      {st.tasks.length > 0 && <div className="card"><b style={{ fontSize: 18 }}>Most-worked tasks</b>{st.tasks.map(t => <div key={t.task} className="row spread" style={{ marginTop: 8 }}><span>{t.task}</span><b>{t.blocks}</b></div>)}</div>}
      {st.total.blocks === 0 && <div className="todo-empty card"><Pal pose="focus" size={64} /><span className="muted">Finish a focus block and your numbers show up here.</span></div>}
    </div>
  )
}

function Stepper({ label, value, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span>{label}</span>
      <button aria-label={`Less ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}><Minus size={18} /></button>
      <b>{value}{unit}</b>
      <button aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}><Plus size={18} /></button>
    </div>
  )
}

function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { settings: s, setSettings, run } = usePomo()
  const locked = !!run.timer
  return (
    <Sheet onClose={onClose}>
      <div className="pomo-sheet">
        <div className="row spread"><b style={{ fontSize: 20 }}>Timer settings</b><button className="linkbtn" onClick={onClose}>Done</button></div>
        <div className="seg" role="group" aria-label="Presets" style={{ margin: '12px 0' }}>{POMO_PRESETS.map(pr => <button key={pr.id} disabled={locked} className={pr.s.work === s.work && pr.s.short === s.short && pr.s.long === s.long ? 'on' : ''} onClick={() => setSettings(pr.s)}>{pr.name}<small>{pr.blurb}</small></button>)}</div>
        <div className="steppers">
          <Stepper label="Focus" value={s.work} min={5} max={90} step={5} unit=" min" onChange={v => setSettings({ work: v })} />
          <Stepper label="Short break" value={s.short} min={1} max={30} unit=" min" onChange={v => setSettings({ short: v })} />
          <Stepper label="Long break" value={s.long} min={5} max={60} step={5} unit=" min" onChange={v => setSettings({ long: v })} />
          <Stepper label="Blocks to a long break" value={s.every} min={2} max={8} onChange={v => setSettings({ every: v })} />
          <Stepper label="Daily goal" value={s.goal} min={1} max={12} unit=" blocks" onChange={v => setSettings({ goal: v })} />
        </div>
        {locked && <p className="muted small">Lengths change when the clock is reset.</p>}
        <Toggle label="Start breaks automatically" on={s.autoBreak} onChange={v => setSettings({ autoBreak: v })} />
        <Toggle label="Start focus automatically after a break" on={s.autoFocus} onChange={v => setSettings({ autoFocus: v })} />
        <Toggle label="Soft bell when a block ends" hint="A reminder also arrives as a notification in the iPhone app." on={s.bell} onChange={v => setSettings({ bell: v })} />
      </div>
    </Sheet>
  )
}

/** Focus: a full-screen pomodoro (no scrolling). To-do, stats and settings open as sheets on top of it. */
export default function FocusHub({ onClose }: { onClose: () => void }) {
  const p = usePomo()
  const [sheet, setSheet] = useState<'todo' | 'stats' | 'settings' | null>(null)
  const close = () => setSheet(null)
  return (
    <div className={`pomo-screen ${p.run.phase}`} role="dialog" aria-modal aria-label="Focus">
      <div className="pomo-bar">
        <button className="glass round green" aria-label="Back" onClick={onClose}><ArrowLeft /></button>
        <span className="pomo-chip" aria-label={`${p.stats.today.blocks} of ${p.settings.goal} blocks today`}><i className={p.stats.today.goalMet ? 'ok' : ''} />{p.stats.today.blocks}/{p.settings.goal} today</span>
        <div className="pomo-nav">
          <button aria-label="To-do" onClick={() => setSheet('todo')}><ListChecks size={22} /></button>
          <button aria-label="Stats" onClick={() => setSheet('stats')}><BarChart3 size={22} /></button>
          <button aria-label="Timer settings" onClick={() => setSheet('settings')}><Settings size={22} /></button>
        </div>
      </div>
      <Timer onTask={() => setSheet('todo')} />
      {sheet === 'todo' && <Sheet onClose={close}><div className="pomo-sheet"><Todos /><button className="btn primary" onClick={close}>Done</button></div></Sheet>}
      {sheet === 'stats' && <Sheet onClose={close}><div className="pomo-sheet"><Stats /><button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={close}>Close</button></div></Sheet>}
      {sheet === 'settings' && <SettingsSheet onClose={close} />}
    </div>
  )
}
