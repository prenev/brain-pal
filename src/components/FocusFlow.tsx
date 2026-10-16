import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import BreathRunner from './BreathRunner'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { hapticSuccess } from '../lib/haptics'
import { sfx } from '../lib/sound'
import { isNative, Mindful } from '../lib/native'
import { liveEnd, liveStart, liveUpdate } from '../lib/liveActivity'
import { CALM_START_SEC, elapsedMs, finishTimer, FOCUS_OPTIONS, fmtClock, isDone, pauseTimer, remainingMs, resumeTimer, startTimer, stepChoices, timerProgress, type Timer } from '../lib/focus.ts'
import type { BreathPattern } from '../lib/types'

const CALM: BreathPattern = { inhale: 4, hold1: 0, exhale: 6, hold2: 0 }   // 6 rounds of 10 s = the 60-second calm start

type Phase = 'choose' | 'calm' | 'focus' | 'done'

/** "One small step": pick the tiniest next thing, settle with a minute of slow breathing, then a short focus timer. No fail state. */
export default function FocusFlow({ onClose }: { onClose: () => void }) {
  const { worries, focusSessions, addFocus } = useStore()
  const { fromWorries, ideas } = useMemo(() => stepChoices(worries, focusSessions), [worries, focusSessions])
  const [phase, setPhase] = useState<Phase>('choose')
  const [step, setStep] = useState('')
  const [worryId, setWorryId] = useState<string | null>(null)
  const [minutes, setMinutes] = useState<number>(5)
  const [timer, setTimer] = useState<Timer | null>(null)
  const [, tick] = useState(0)
  const [result, setResult] = useState<{ completed: boolean; sec: number } | null>(null)
  const saved = useRef(false)

  // Re-render a few times a second; the clock itself is derived from timestamps, so throttled timers can't make it wrong.
  useEffect(() => { if (phase !== 'focus') return; const id = setInterval(() => tick(n => n + 1), 250); return () => clearInterval(id) }, [phase])

  // Keep the screen on while focusing.
  useEffect(() => {
    if (phase !== 'focus') return
    let lock: WakeLockSentinel | null = null, off = false
    navigator.wakeLock?.request('screen').then(l => { if (off) l.release().catch(() => {}); else lock = l }).catch(() => {})
    if (isNative()) Mindful.keepAwake({ enabled: true }).catch(() => {})
    return () => { off = true; lock?.release().catch(() => {}); if (isNative()) Mindful.keepAwake({ enabled: false }).catch(() => {}) }
  }, [phase])

  // Lock screen / Dynamic Island: the countdown keeps going when you put the phone down (paused shows the frozen time).
  const live = useRef(false)
  useEffect(() => {
    if (phase !== 'focus' || !timer || timer.status === 'finished') return
    const now = Date.now(), left = remainingMs(timer, now)
    const o = { title: step || 'One small step', subtitle: `${minutes}-minute focus`, startsAt: now - elapsedMs(timer, now), endsAt: now + left, remainingSec: timer.status === 'paused' ? Math.round(left / 1000) : undefined }
    if (live.current) liveUpdate(o); else { live.current = true; liveStart('focus', o) }
  }, [phase, timer?.status]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase !== 'focus' && live.current) { live.current = false; liveEnd() } }, [phase])
  useEffect(() => () => { if (live.current) liveEnd() }, [])

  function finish(t: Timer, completed: boolean) {
    const done = finishTimer(t, Date.now())
    const sec = Math.round(elapsedMs(done, Date.now()) / 1000)
    if (!saved.current) { saved.current = true; addFocus({ minutes, actualSec: sec, completed, worryId, step }) }
    setTimer(done); setResult({ completed, sec }); setPhase('done')
    if (completed) { sfx('celebrate'); hapticSuccess() }
  }
  // The timer ran out.
  useEffect(() => { if (phase === 'focus' && timer && timer.status === 'running' && isDone(timer, Date.now())) finish(timer, true) })

  const startFocus = () => { setTimer(startTimer(minutes, Date.now())); setPhase('focus') }
  const reset = () => { saved.current = false; setResult(null); setTimer(null); setStep(''); setWorryId(null); setPhase('choose') }
  const now = Date.now()

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="One small step"><div className="inner">
      <div className="topbar" style={{ background: 'none' }}>
        <span style={{ width: 50 }} />
        <span className="title">{phase === 'choose' ? 'One small step' : phase === 'calm' ? 'Settle first' : phase === 'focus' ? 'Focus' : ''}</span>
        <button className="glass round" aria-label="Close" onClick={() => (phase === 'focus' && timer ? finish(timer, false) : onClose())}><X size={24} /></button>
      </div>

      {phase === 'choose' && <>
        <h1 style={{ fontSize: 30, margin: '6px 0 6px' }}>What’s the tiniest next step?</h1>
        <p className="muted" style={{ marginTop: 0 }}>Starting is the hard part. Pick something small and we’ll start it together — a minute to settle, then a short focus.</p>
        {fromWorries.length > 0 && <>
          <b>From your worries</b>
          <div style={{ marginTop: 8 }}>{fromWorries.map(c => (
            <button key={c.worryId} className={`card step-choice ${worryId === c.worryId ? 'on' : ''}`} aria-pressed={worryId === c.worryId} onClick={() => { setStep(c.text); setWorryId(c.worryId) }}>{c.text}</button>
          ))}</div>
        </>}
        <b>Ideas</b>
        <div className="chips" style={{ margin: '8px 0 14px' }}>{ideas.map(c => (
          <button key={c.text} className={`chip ${step === c.text && !worryId ? 'on' : ''}`} onClick={() => { setStep(c.text); setWorryId(null) }}>{c.text}</button>
        ))}</div>
        <label className="field"><span>Or your own</span>
          <input className="input" maxLength={140} placeholder="e.g. Open the email and read it" value={step} onChange={e => { setStep(e.target.value); setWorryId(null) }} /></label>
        <div className="seg" role="radiogroup" aria-label="How long" style={{ marginBottom: 14 }}>
          {FOCUS_OPTIONS.map(m => <button key={m} role="radio" aria-checked={minutes === m} className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>{m} min</button>)}
        </div>
        <button className="btn primary block" disabled={!step.trim()} onClick={() => setPhase('calm')}>Start</button>
      </>}

      {phase === 'calm' && <>
        <p className="muted" style={{ textAlign: 'center' }}>Breathe with the circle for a minute. Your step: <b style={{ color: 'var(--text, #fff)' }}>{step}</b></p>
        <BreathRunner pattern={CALM} cycles={CALM_START_SEC / 10} vibrate sound={false} endLabel="Skip — start now" onFinish={startFocus} />
      </>}

      {phase === 'focus' && timer && <>
        <p className="muted" style={{ textAlign: 'center', margin: '4px 0 0' }}>Just this:</p>
        <h1 style={{ textAlign: 'center', fontSize: 26, margin: '4px 0' }}>{step}</h1>
        <div className="focus-clock" role="timer" aria-label="Time left">{fmtClock(remainingMs(timer, now))}</div>
        <div className="bar" style={{ margin: '0 4px 18px' }}><i style={{ width: `${timerProgress(timer, now) * 100}%` }} /></div>
        {timer.status === 'paused' && <p className="muted" role="status" style={{ textAlign: 'center' }}>Paused — take as long as you need.</p>}
        <div className="row" style={{ gap: 10, marginBottom: 10 }}>
          {timer.status === 'running'
            ? <button className="btn block" onClick={() => setTimer(pauseTimer(timer, Date.now()))}><Pause size={18} style={{ display: 'inline', verticalAlign: -3 }} /> Pause</button>
            : <button className="btn primary block" onClick={() => setTimer(resumeTimer(timer, Date.now()))}><Play size={18} style={{ display: 'inline', verticalAlign: -3 }} /> Resume</button>}
          <button className="btn primary block" onClick={() => finish(timer, true)}>I did it</button>
        </div>
        <button className="btn block" style={{ background: 'none', color: 'var(--muted)' }} onClick={() => finish(timer, false)}>Stop for now</button>
      </>}

      {phase === 'done' && result && <>
        <div className="card" style={{ textAlign: 'center', padding: 26 }}>
          <Emoji name={result.completed ? 'party' : 'hug'} size={90} />
          <h1 style={{ fontSize: 28, margin: '10px 0 6px' }}>{result.completed ? 'Done — nice.' : 'That’s okay.'}</h1>
          <p className="muted" style={{ margin: 0 }}>{result.completed
            ? `${Math.max(1, Math.round(result.sec / 60))} ${Math.max(1, Math.round(result.sec / 60)) === 1 ? 'minute' : 'minutes'} on “${step}”. You started, and you finished a piece of it.`
            : 'Starting is the hard part, and you did that. Come back to it whenever you like.'}</p>
        </div>
        <button className="btn primary block" onClick={reset}>Another small step</button>
        <button className="btn block" style={{ marginTop: 10 }} onClick={onClose}>Close</button>
      </>}
    </div></div>
  )
}
