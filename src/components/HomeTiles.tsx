import { Check, Lock, Pause, PenLine, Play } from 'lucide-react'
import Pal from './Pal'
import { Footprints, Jar } from '@phosphor-icons/react'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { usePomo } from '../lib/pomoStore'
import { guardSupported } from '../lib/guardNative'
import { dayKey } from '../lib/dates'
import { fmtClock, stepChoices } from '../lib/focus.ts'
import { PHASE_LABEL, phaseMinutes, shouldBlock } from '../lib/pomodoro.ts'
import type { PoseName } from '../lib/pal.ts'

/** Big Focus card, drawn like the widgets: Wobbi in the pose of the moment, and the live clock while a block runs. */
export function FocusCard({ onOpen }: { onOpen: () => void }) {
  const p = usePomo()
  const { run, settings: s } = p
  const on = !!run.timer, brk = run.phase !== 'work'
  const pose: PoseName = !on ? 'holdPlay' : p.paused ? 'think' : brk ? (run.phase === 'long' ? 'nap' : 'coffee') : 'focus'
  const locked = guardSupported() && shouldBlock(run, s)
  return (
    <div role="button" tabIndex={0} className={`big-card focus-card ${on ? (brk ? 'brk' : 'live') : ''}`} onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }} aria-label={on ? `Focus: ${PHASE_LABEL[run.phase]}, ${fmtClock(p.left)} left` : 'Focus'}>
      <span className="big-kicker">{on ? <><i className="live-dot" />{p.paused ? 'Paused' : PHASE_LABEL[run.phase]}</> : 'Focus'}</span>
      {on ? <b className="big-num">{fmtClock(p.left)}</b> : <b className="big-title">Start a<br />focus block</b>}
      <span className="big-sub">{on && !brk && p.task ? p.task.text : `${p.stats.today.blocks}/${s.goal} blocks today`}</span>
      {locked && <span className="big-badge"><Lock size={12} strokeWidth={3} /> Apps blocked</span>}
      {!on && <span className="big-cta"><Play size={14} strokeWidth={3} fill="currentColor" /> {phaseMinutes('work', s)} min</span>}
      {on && <button className="big-cta" aria-label={p.paused ? 'Resume focus' : 'Pause focus'} onClick={e => { e.stopPropagation(); p.startPause() }}>
        {p.paused ? <><Play size={14} strokeWidth={3} fill="currentColor" /> Resume</> : <><Pause size={14} strokeWidth={3} fill="currentColor" /> Pause</>}
      </button>}
      <span className="big-art" aria-hidden="true"><Pal pose={pose} size={118} motion="still" /></span>
      {on && <span className="big-bar" aria-hidden="true"><i style={{ width: `${Math.round(p.progress * 100)}%` }} /></span>}
    </div>
  )
}

/** Big Journal card: today's prompt and how often you wrote this week, with Wobbi reading. */
export function JournalCard({ onOpen }: { onOpen: () => void }) {
  const { journal } = useStore()
  const today = dayKey(new Date()), week = new Date(Date.now() - 6 * 864e5).toISOString()
  const n = new Set(journal.filter(e => e.createdAt >= week).map(e => dayKey(e.createdAt))).size   // days written, like the focus card's blocks
  const wrote = journal.some(e => dayKey(e.createdAt) === today)
  return (
    <button className="big-card journal-card" onClick={onOpen} aria-label="Journal">
      <span className="big-kicker">{wrote ? <><Check size={13} strokeWidth={3.4} /> Journal · today’s done</> : 'Journal'}</span>
      <b className="big-title">{wrote ? <>Add to<br />today’s page</> : <>Write or<br />talk it out</>}</b>
      <span className="big-sub">{n ? `${n}/7 days this week` : 'One line is enough'}</span>
      <span className="big-cta"><PenLine size={14} strokeWidth={3} /> Write</span>
      <span className="big-art" aria-hidden="true"><Pal pose="read" size={118} motion="still" /></span>
    </button>
  )
}

/** 5-4-3-2-1 grounding, straight from Home (it used to live only inside SOS). */
export function GroundTool({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="card tool" onClick={onOpen} aria-label="Ground yourself: 5-4-3-2-1">
      <Footprints className="tool-icon" size={34} weight="duotone" color="#5fd39a" aria-hidden="true" /><b>Ground</b><small>5-4-3-2-1</small>
    </button>
  )
}

/** Worry tile in the tools row: how many are parked, or an invitation to park one. Opens worry time (or the park sheet while nothing is parked). */
export function WorryTool({ onWorry, onPark }: { onWorry: () => void; onPark: () => void }) {
  const { worries } = useStore()
  const n = worries.filter(w => w.status === 'open').length
  return (
    <button className="card tool worry-tool" onClick={n ? onWorry : onPark} aria-label={n ? `${n} parked ${n === 1 ? 'worry' : 'worries'}` : 'Park a worry'}>
      <Jar className="tool-icon" size={34} weight="duotone" color="#b79cff" aria-hidden="true" /><b>Worries</b><small>{n ? `${n} parked` : 'Park one'}</small>
    </button>
  )
}

/** One line under the tools when a worry has a planned small step waiting. */
export function StepNudge({ onStep }: { onStep: () => void }) {
  const { worries, focusSessions } = useStore()
  const step = stepChoices(worries, focusSessions).fromWorries[0]?.text
  if (!step) return null
  return <button className="tile-step" onClick={onStep}><Emoji name="rocket" size={20} /> A small step is waiting: {step}</button>
}
