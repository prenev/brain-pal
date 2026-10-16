import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Lock, LockOpen, X } from 'lucide-react'
import Pal, { PalSays } from './Pal'
import { ProGate } from './Pro'
import BreathRunner from './BreathRunner'
import { Toggle } from './ui'
import { burst } from '../lib/confetti'
import { chime, haptic, hapticSuccess } from '../lib/haptics'
import { useStore } from '../lib/store'
import { guardClear, guardLock, guardPickApps, guardRequestAuth, guardStatus, guardSupported, guardUnlock, type GuardStatus } from '../lib/guardNative'
import { loadGuard, loadGuardEvents, saveGuard, saveGuardEvents } from '../lib/extras'
import { addRep, canEnable, CHALLENGES, challengeOf, DEFAULT_GUARD, isUnlocked, minutesLeft, MIN_REP_GAP_MS, newReps, repsDone, UNLOCK_OPTIONS, weekStats, type Challenge, type ChallengeId, type GuardConfig, type GuardEvent } from '../lib/guard.ts'
import type { BreathPattern } from '../lib/types'

const CALM: BreathPattern = { inhale: 4, hold1: 0, exhale: 6, hold2: 0 }
const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** Config + history live on this device only (the app selection is a device-specific token). */
function useGuardState() {
  const [config, setConfig] = useState<GuardConfig>(loadGuard)
  const [events, setEvents] = useState<GuardEvent[]>(loadGuardEvents)
  const update = useCallback((patch: Partial<GuardConfig>) => setConfig(c => { const n = { ...c, ...patch }; saveGuard(n); return n }), [])
  const record = useCallback((e: Omit<GuardEvent, 'id' | 'at'>) => setEvents(es => { const n = [...es, { ...e, id: crypto.randomUUID(), at: new Date().toISOString() }].slice(-200); saveGuardEvents(n); return n }), [])
  return { config, update, events, record }
}

/** App-level: whenever the app comes to the front, ask iOS for the status; the native side re-locks an unlock that has run out. */
export function useGuardRelock() {
  useEffect(() => {
    if (!guardSupported()) return
    const check = () => { if (loadGuard().enabled) guardStatus() }
    check(); document.addEventListener('visibilitychange', check); return () => document.removeEventListener('visibilitychange', check)
  }, [])
}

/** More → Focus guard: setup, status, and the way to earn time. */
export default function Guard() { return <ProGate feature="guard"><GuardSetup /></ProGate> }

function GuardSetup() {
  const { config, update, events, record } = useGuardState()
  const [status, setStatus] = useState<GuardStatus | null>(null)
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState(false)
  const [until, setUntil] = useState<number | null>(null)
  const [, tick] = useState(0)
  const native = guardSupported()

  const refresh = useCallback(async () => { const s = await guardStatus(); setStatus(s); setUntil(s.unlockedUntil); if (s.available && s.appCount !== config.appCount) update({ appCount: s.appCount }) }, [config.appCount, update])
  useEffect(() => { refresh() }, [])      // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 15000); return () => clearInterval(id) }, [])
  const now = Date.now()
  const unlocked = isUnlocked(until, now)
  const week = useMemo(() => weekStats(events, new Date()), [events])
  const ready = native && !!status?.available

  async function allow() { setMsg(''); const r = await guardRequestAuth(); setMsg(r.authorized ? '' : r.error ? `Screen Time access wasn’t granted: ${r.error}` : 'Screen Time access wasn’t granted.'); refresh() }
  async function choose() { setMsg(''); const n = await guardPickApps(); if (n === null) setMsg('Couldn’t open the app picker.'); else update({ appCount: n }); refresh() }
  async function turn(on: boolean) {
    if (!on) { if (!confirm('Turn the guard off? Your apps will be unlocked. You can switch it on again whenever you like.')) return; await guardClear(); update({ enabled: false }); setUntil(null); return }
    if (!canEnable(config, native)) return
    const ok = await guardLock(); if (!ok) { setMsg('Couldn’t lock the apps. Is Screen Time allowed?'); return }
    update({ enabled: true }); setUntil(null); setMsg('')
  }
  async function earned(c: Challenge, reps: number) {
    record({ challenge: c.id, minutes: config.enabled ? config.unlockMinutes : 0, reps })
    if (config.enabled && native) { const u = await guardUnlock(config.unlockMinutes); setUntil(u) }
  }
  async function relock() { await guardLock(); setUntil(null); refresh() }

  return (
    <>
      <PalSays pose={config.enabled ? (unlocked ? 'cheer' : 'stop') : 'idle'}>
        {config.enabled ? (unlocked ? 'Enjoy it! I’ll lock them again when time’s up.' : 'Your apps are paused. Earn a few minutes with a quick activity.') : 'I can keep your scroll-trap apps paused until you earn a few minutes with a quick activity. Deal?'}
      </PalSays>

      {!native && <div className="card" style={{ marginTop: 14 }}>
        <b>Blocking apps is part of the iPhone app</b>
        <p className="muted" style={{ marginBottom: 10 }}>It uses iOS Screen Time, which browsers can’t reach. You can still try the activities here.</p>
        <button className="btn block" onClick={() => setOpen(true)}>Try an activity</button>
      </div>}

      {native && status && !status.available && <div className="card" style={{ marginTop: 14 }}>
        <b>Not available in this build</b>
        <p className="muted" style={{ margin: 0 }}>The Focus guard needs iOS 16+ and Apple’s Screen Time permission switched on for the app (see docs/SCREENTIME.md).</p>
      </div>}

      {ready && <>
        <div className="card guard-steps" style={{ marginTop: 14 }}>
          <div className="guard-step">
            <span className={`dot ${status!.authorized ? 'ok' : ''}`}>{status!.authorized ? <Check size={16} /> : 1}</span>
            <span style={{ flex: 1 }}>Screen Time access</span>
            {status!.authorized ? <span className="muted">Allowed</span> : <button className="btn small" onClick={allow}>Allow Screen Time</button>}
          </div>
          <div className="guard-step">
            <span className={`dot ${config.appCount > 0 ? 'ok' : ''}`}>{config.appCount > 0 ? <Check size={16} /> : 2}</span>
            <span style={{ flex: 1 }}>Apps to pause{config.appCount > 0 ? <span className="muted"> · {config.appCount} chosen</span> : null}</span>
            <button className="btn small" disabled={!status!.authorized} onClick={choose}>{config.appCount > 0 ? 'Change apps' : 'Choose apps'}</button>
          </div>
          <div className="guard-step col">
            <span className="row" style={{ gap: 12 }}><span className="dot ok"><Check size={16} /></span><span style={{ flex: 1 }}>Earn time with</span></span>
            <div className="chips" role="group" aria-label="Unlock activities">
              {CHALLENGES.map(c => {
                const on = config.challenges.includes(c.id)
                return <button key={c.id} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => { const next: ChallengeId[] = on ? config.challenges.filter(x => x !== c.id) : [...config.challenges, c.id]; if (next.length) update({ challenges: next }) }}>{c.label}</button>
              })}
            </div>
            <div className="seg" role="radiogroup" aria-label="Time you earn" style={{ marginTop: 10 }}>
              {UNLOCK_OPTIONS.map(m => <button key={m} role="radio" aria-checked={config.unlockMinutes === m} className={config.unlockMinutes === m ? 'on' : ''} onClick={() => update({ unlockMinutes: m })}>{m} min</button>)}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <Toggle label="Guard on" hint={canEnable(config, native) ? 'Chosen apps stay paused until you do an activity.' : 'Allow Screen Time and choose at least one app first.'} on={config.enabled} onChange={turn} />
        </div>

        {config.enabled && <div className="card guard-status" aria-live="polite" style={{ marginTop: 14 }}>
          <div className="row" style={{ gap: 12 }}>
            <span className={`lockbadge ${unlocked ? 'open' : ''}`}>{unlocked ? <LockOpen size={22} /> : <Lock size={22} />}</span>
            <div style={{ flex: 1 }}>
              <b>{unlocked ? `Unlocked · ${minutesLeft(until!, now)} min left` : 'Locked'}</b>
              <div className="muted small">{unlocked ? `until ${clock(until!)}` : `${config.appCount} ${config.appCount === 1 ? 'item' : 'items'} paused`}</div>
            </div>
          </div>
          {unlocked ? <button className="btn block" style={{ marginTop: 12 }} onClick={relock}>Lock again now</button>
            : <button className="btn primary block" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>Unlock with an activity</button>}
        </div>}
      </>}

      {msg && <p className="small" role="alert" style={{ color: 'var(--danger)' }}>{msg}</p>}
      {week.challenges > 0 && <p className="muted small" style={{ textAlign: 'center' }}>This week: {week.challenges} {week.challenges === 1 ? 'activity' : 'activities'}{week.reps ? ` · ${week.reps} reps` : ''}</p>}
      <p className="muted small" style={{ textAlign: 'center' }}>Reps are on the honour system, so only do what feels safe for you. You can always switch the guard off.</p>

      {open && <Challenge config={config} practice={!(config.enabled && native)} onClose={() => { setOpen(false); refresh() }} onEarned={earned} />}
    </>
  )
}

type Phase = 'choose' | 'do' | 'done'

/** Pick an activity, do it, get the time. Practice mode (no guard / web) does everything except lock or unlock. */
function Challenge({ config, practice, onClose, onEarned }: { config: GuardConfig; practice: boolean; onClose: () => void; onEarned: (c: Challenge, reps: number) => Promise<void> }) {
  const { addJournal } = useStore()
  const options = (practice ? CHALLENGES : config.challenges.map(challengeOf).filter((c): c is Challenge => !!c))
  const [phase, setPhase] = useState<Phase>('choose')
  const [c, setC] = useState<Challenge | null>(null)
  const [reps, setReps] = useState(newReps)
  const [slow, setSlow] = useState(false)
  const [line, setLine] = useState('')
  const [started, setStarted] = useState<number | null>(null)
  const [, tick] = useState(0)
  const done = useRef(false)

  useEffect(() => { if (phase !== 'do' || c?.kind !== 'timer') return; const id = setInterval(() => tick(n => n + 1), 250); return () => clearInterval(id) }, [phase, c])
  const secLeft = c?.kind === 'timer' && started ? Math.max(0, Math.ceil(c.target - (Date.now() - started) / 1000)) : 0
  useEffect(() => { if (phase === 'do' && c?.kind === 'timer' && started && secLeft === 0) finish(c, 0) })   // eslint-disable-line react-hooks/exhaustive-deps

  async function finish(ch: Challenge, n: number) {
    if (done.current) return; done.current = true
    await onEarned(ch, n); setPhase('done'); burst(); chime(); hapticSuccess()
  }
  const begin = (ch: Challenge) => { done.current = false; setC(ch); setReps(newReps()); setLine(''); setSlow(false); setStarted(ch.kind === 'timer' ? Date.now() : null); setPhase('do') }
  function rep() {
    if (!c) return
    const r = addRep(reps, Date.now())
    if (!r.counted) { setSlow(true); return }
    setSlow(false); setReps(r.state); haptic(12)
    if (repsDone(r.state, c.target)) finish(c, r.state.reps)
  }
  async function saveLine() {
    if (!c || line.trim().length < c.target) return
    addJournal({ title: '', body: line.trim(), mood: null, tags: ['focus guard'], prompt: null }); finish(c, 0)
  }

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="Unlock activity"><div className="inner">
      <div className="topbar" style={{ background: 'none' }}>
        <span style={{ width: 50 }} />
        <span className="title">{phase === 'choose' ? 'Earn your time' : c?.label ?? ''}</span>
        <button className="glass round" aria-label="Close" onClick={onClose}><X size={24} /></button>
      </div>

      {phase === 'choose' && <>
        <PalSays pose="flex">{practice ? 'Pick an activity to try. (Practice: nothing gets locked or unlocked.)' : `Pick one. Finish it and your apps open for ${config.unlockMinutes} minutes.`}</PalSays>
        <div style={{ marginTop: 14 }}>
          {options.map(o => (
            <button key={o.id} className="card step-choice challenge-opt" onClick={() => begin(o)}>
              <Pal pose={o.pose} size={52} motion="none" />
              <span style={{ flex: 1, textAlign: 'left' }}><b>{o.label}</b><span className="muted small" style={{ display: 'block' }}>{o.kind === 'reps' ? `${o.target} ${o.unit}` : o.kind === 'journal' ? 'one honest line' : o.target >= 60 ? `${Math.round(o.target / 60)} min` : `${o.target} sec`}</span></span>
            </button>
          ))}
        </div>
      </>}

      {phase === 'do' && c && <div style={{ textAlign: 'center' }}>
        <p className="muted" style={{ margin: '0 0 4px' }}>{c.how}</p>
        {c.kind === 'reps' && <>
          <Pal pose={c.pose} size={150} motion={reps.reps ? 'jump' : 'bob'} />
          <div className="rep-count" role="status" aria-label="Reps done">{reps.reps} <small>/ {c.target}</small></div>
          <div className="bar" style={{ margin: '0 4px 16px' }}><i style={{ width: `${Math.min(100, (reps.reps / c.target) * 100)}%` }} /></div>
          <button className="btn primary block rep-btn" onClick={rep}>I did one</button>
          <p className="muted small" role="status" style={{ minHeight: 20 }}>{slow ? `One rep at a time (about ${Math.round(MIN_REP_GAP_MS / 100) / 10}s each) — go slow and steady.` : 'We can’t watch you, so this one’s on the honour system.'}</p>
        </>}
        {c.kind === 'timer' && <>
          <Pal pose={c.pose} size={150} motion="bob" />
          <div className="focus-clock" role="timer" aria-label="Time left">{Math.floor(secLeft / 60)}:{String(secLeft % 60).padStart(2, '0')}</div>
          <div className="bar" style={{ margin: '0 4px 16px' }}><i style={{ width: `${Math.min(100, ((c.target - secLeft) / c.target) * 100)}%` }} /></div>
          <button className="btn block" style={{ background: 'none', color: 'var(--muted)' }} onClick={() => setPhase('choose')}>Stop</button>
        </>}
        {c.kind === 'breathe' && <BreathRunner pattern={CALM} cycles={c.target / 10} vibrate sound={false} endLabel="Stop" onFinish={r => { if (r.completed) finish(c, 0); else setPhase('choose') }} />}
        {c.kind === 'journal' && <>
          <Pal pose="think" size={120} />
          <textarea className="input" aria-label="One honest line" placeholder="Right now I feel…" value={line} maxLength={300} onChange={e => setLine(e.target.value)} style={{ marginTop: 10 }} />
          <button className="btn primary block" style={{ marginTop: 10 }} disabled={line.trim().length < c.target} onClick={saveLine}>Save to journal</button>
        </>}
      </div>}

      {phase === 'done' && c && <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <Pal pose="celebrate" size={150} motion="jump" />
        <h1 style={{ fontSize: 28, margin: '8px 0 6px' }}>{practice ? 'Nice one!' : 'Earned it!'}</h1>
        <p className="muted" style={{ margin: 0 }}>{practice ? 'That was practice, so nothing was unlocked.' : `Your apps are open for ${config.unlockMinutes} minutes. I’ll lock them again after that.`}</p>
        <button className="btn primary block" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
      </div>}
    </div></div>
  )
}

export { DEFAULT_GUARD }
