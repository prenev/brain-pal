import { ChevronLeft, ChevronRight, Minus, Play, Plus, Siren } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import Pal from '../components/Pal'
import BreathRunner, { type BreathResult } from '../components/BreathRunner'
import { Emoji } from '../lib/emoji'
import { burst } from '../lib/confetti'
import { breathsPerMinute, clampSec, MINUTE_CHOICES, patternLabel, roundsFor, TECHNIQUES, wavePath, type Technique } from '../lib/breathing.ts'
import type { BreathPattern } from '../lib/types'

const BOX_SECONDS = [3, 4, 5, 6]

/** A little line drawing of the breath: up while you breathe in, level on holds, down on the way out. */
function Wave({ p, on }: { p: BreathPattern; on: boolean }) {
  return <svg className={`wave ${on ? 'on' : ''}`} viewBox="0 0 96 40" width="96" height="40" aria-hidden="true"><path d={wavePath(p)} /></svg>
}
/** Each rhythm has its own colour, so the list and the set-up screen feel like places, not forms. */
const TECH_COLOR: Record<string, string> = { calm: '#35d07f', coherent: '#4aa8ff', box: '#a78bfa', relax: '#7c8cff', custom: '#ff8fb1' }

/** A soft orb that breathes in the rhythm itself (in · hold · out · rest), so you can feel the pace before starting. */
function Orb({ p, color }: { p: BreathPattern; color: string }) {
  const total = Math.max(1, p.inhale + p.hold1 + p.exhale + p.hold2), pc = (x: number) => ((x / total) * 100).toFixed(2)
  const a = p.inhale, b = a + p.hold1, c = b + p.exhale
  const name = `orb-${[p.inhale, p.hold1, p.exhale, p.hold2].join('-').replace(/\./g, '_')}`
  return (
    <div className="b-orb" style={{ ['--tc' as string]: color }} aria-hidden="true">
      <style>{`@keyframes ${name}{0%{transform:scale(.6)}${pc(a)}%{transform:scale(1)}${pc(b)}%{transform:scale(1)}${pc(c)}%{transform:scale(.6)}100%{transform:scale(.6)}}`}</style>
      <i className="ring" /><i className="core" style={{ animation: `${name} ${total}s ease-in-out infinite` }} />
    </div>
  )
}

function Stepper({ label, value, onChange, min = 0, max = 12 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span>{label}</span>
      <button aria-label={`Shorter ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(clampSec(value - 0.5, min, max))}><Minus size={18} /></button>
      <b>{value}s</b>
      <button aria-label={`Longer ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(clampSec(value + 0.5, min, max))}><Plus size={18} /></button>
    </div>
  )
}

export default function Breathe({ onSos }: { onSos: () => void }) {
  const { addSession, sessions } = useStore()
  const weekMin = Math.round(sessions.filter(x => Date.now() - new Date(x.createdAt).getTime() < 7 * 864e5).reduce((a, x) => a + x.durationSec, 0) / 60)
  const [techId, setTechId] = useState<Technique['id']>('calm')
  const [boxSec, setBoxSec] = useState(4)
  const [custom, setCustom] = useState({ inhale: 5, hold1: 0, exhale: 5, hold2: 0 })
  const [minutes, setMinutes] = useState<number>(2)
  const vibrate = true, sound = true   // both on; the session screen has its own switches
  const [step, setStep] = useState<'pick' | 'setup'>('pick')
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState<null | { cycles: number; sec: number }>(null)

  const tech = TECHNIQUES.find(t => t.id === techId)!
  const pattern: BreathPattern = techId === 'box' ? { inhale: boxSec, hold1: boxSec, exhale: boxSec, hold2: boxSec } : techId === 'custom' ? custom : tech.pattern
  const cycles = useMemo(() => roundsFor(minutes, pattern), [minutes, pattern])
  const bpm = breathsPerMinute(pattern)

  function finish(r: BreathResult) {
    setRunning(false); setStep('pick')
    if (r.elapsedSec >= 10) {
      addSession({ pattern, cycles: r.cyclesDone, durationSec: r.elapsedSec, completed: r.completed }).catch(console.error)
      setDone({ cycles: r.cyclesDone, sec: r.elapsedSec })
      if (r.completed) burst()
    }
  }

  return (
    <>
      <div className="topbar">
        {step === 'setup' && !running
          ? <button className="glass round" aria-label="Back to breathing styles" onClick={() => setStep('pick')}><ChevronLeft size={26} /></button>
          : <span className="round" aria-hidden="true" />}
        <span className="title">{step === 'setup' && !running ? tech.name : 'Breathe'}</span>
        <button className="glass round sos" aria-label="Anxious right now? Get help" title="Anxious right now?" onClick={onSos}><Siren size={24} /></button>
      </div>

      {running
        ? <BreathRunner pattern={pattern} cycles={cycles} vibrate={vibrate} sound={sound} onFinish={finish} />
        : step === 'pick'
          ? <>
            {done && <div className="card" style={{ textAlign: 'center' }}><Emoji name="lotus" size={64} /><div style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>Nice work!</div><div className="muted">{done.cycles} rounds · {Math.floor(done.sec / 60)}m {done.sec % 60}s logged</div></div>}
            <button className="jwobbi" onClick={() => { setTechId('calm'); setDone(null); setStep('setup') }} aria-label="Start calm breathing">
              <span className="jw-pal"><Pal pose="breatheIn" size={74} motion="still" /></span>
              <span className="jw-bubble">
                <small>{weekMin > 0 ? `${weekMin} ${weekMin === 1 ? 'minute' : 'minutes'} breathed this week` : 'One minute is enough to start'}</small>
                <b>Pick a rhythm. A long, slow breath out is the secret.</b>
                <em>Start with Calm 4-6 <ChevronRight size={15} strokeWidth={3} /></em>
              </span>
            </button>
            <div className="techs">
              {TECHNIQUES.map(t => {
                const p = t.id === 'box' ? { inhale: boxSec, hold1: boxSec, exhale: boxSec, hold2: boxSec } : t.id === 'custom' ? custom : t.pattern
                return (
                  <button key={t.id} className="tech" style={{ ['--tc' as string]: TECH_COLOR[t.id] }} aria-label={`${t.name}, ${t.tag}`} onClick={() => { setTechId(t.id); setDone(null); setStep('setup') }}>
                    <Wave p={p} on={false} />
                    <span className="tech-text"><em>{t.tag}</em><b>{t.name}</b><small>{patternLabel(p)} s · {breathsPerMinute(p)}/min</small></span>
                    <ChevronRight size={22} className="tech-go" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </>
          : <>
            <div className="b-stage" style={{ ['--tc' as string]: TECH_COLOR[techId] }}>
              <Orb p={pattern} color={TECH_COLOR[techId]} />
              <em className="b-tag">{tech.tag}</em>
              <h2>{tech.name}</h2>
              <p>{tech.blurb}</p>
              <span className="b-pat">{patternLabel(pattern)} s · {bpm} breaths a minute</span>
            </div>
            {techId === 'box' && <div className="b-ctl"><span>Box length</span><div className="seg" role="group" aria-label="Box length">{BOX_SECONDS.map(n => <button key={n} className={n === boxSec ? 'on' : ''} onClick={() => setBoxSec(n)}>{n}s</button>)}</div></div>}
            {techId === 'custom' && <div className="b-ctl"><span>Your pace</span><div className="steppers">
              <Stepper label="Breathe in" value={custom.inhale} min={2} onChange={v => setCustom({ ...custom, inhale: v })} />
              <Stepper label="Hold" value={custom.hold1} min={0} max={10} onChange={v => setCustom({ ...custom, hold1: v })} />
              <Stepper label="Breathe out" value={custom.exhale} min={2} onChange={v => setCustom({ ...custom, exhale: v })} />
              <Stepper label="Rest" value={custom.hold2} min={0} max={10} onChange={v => setCustom({ ...custom, hold2: v })} />
            </div></div>}
            <div className="b-ctl"><span>How long</span>
              <div className="seg" role="group" aria-label="Session length">{MINUTE_CHOICES.map(m => <button key={m} className={m === minutes ? 'on' : ''} onClick={() => setMinutes(m)}>{m} min</button>)}</div>
            </div>
            <button className="b-start" onClick={() => { setDone(null); setRunning(true) }}><Play size={22} fill="currentColor" /> Start · {minutes} min</button>
            <p className="b-note">Vibration and soft tones are on. You can switch them during the session.</p>
          </>}
    </>
  )
}
