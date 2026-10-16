import { ChevronLeft, ChevronRight, Minus, Plus, Siren } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PalTip } from '../components/Pal'
import BreathRunner, { type BreathResult } from '../components/BreathRunner'
import { Toggle } from '../components/ui'
import { Emoji } from '../lib/emoji'
import { burst } from '../lib/confetti'
import { breathsPerMinute, clampSec, MINUTE_CHOICES, patternLabel, roundsFor, TECHNIQUES, wavePath, type Technique } from '../lib/breathing.ts'
import type { BreathPattern } from '../lib/types'

const BOX_SECONDS = [3, 4, 5, 6]

/** A little line drawing of the breath: up while you breathe in, level on holds, down on the way out. */
function Wave({ p, on }: { p: BreathPattern; on: boolean }) {
  return <svg className={`wave ${on ? 'on' : ''}`} viewBox="0 0 96 40" width="96" height="40" aria-hidden="true"><path d={wavePath(p)} /></svg>
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
  const { addSession } = useStore()
  const [techId, setTechId] = useState<Technique['id']>('calm')
  const [boxSec, setBoxSec] = useState(4)
  const [custom, setCustom] = useState({ inhale: 5, hold1: 0, exhale: 5, hold2: 0 })
  const [minutes, setMinutes] = useState<number>(2)
  const [vibrate, setVibrate] = useState(true)
  const [sound, setSound] = useState(true)
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
            <PalTip id="breathe" pose="breatheIn">Pick a rhythm. A long, slow breath out is the secret.</PalTip>
            <div className="techs">
              {TECHNIQUES.map(t => {
                const p = t.id === 'box' ? { inhale: boxSec, hold1: boxSec, exhale: boxSec, hold2: boxSec } : t.id === 'custom' ? custom : t.pattern
                return (
                  <button key={t.id} className="tech" aria-label={`${t.name}, ${t.tag}`} onClick={() => { setTechId(t.id); setDone(null); setStep('setup') }}>
                    <Wave p={p} on={false} />
                    <span className="tech-text"><b>{t.name}</b><em>{t.tag}</em><small>{patternLabel(p)} s</small></span>
                    <ChevronRight size={22} className="tech-go" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </>
          : <>
            <div className="card tech-hero">
              <Wave p={pattern} on />
              <p className="muted" style={{ margin: '12px 0 0' }}>{tech.blurb}</p>
              <div className="muted small" style={{ marginTop: 6 }}>{patternLabel(pattern)} s · {bpm} breaths a minute</div>
            </div>
            {techId === 'box' && <div className="card"><div style={{ fontWeight: 800, marginBottom: 8 }}>Box length</div><div className="seg" role="group" aria-label="Box length">{BOX_SECONDS.map(n => <button key={n} className={n === boxSec ? 'on' : ''} onClick={() => setBoxSec(n)}>{n} sec</button>)}</div></div>}
            {techId === 'custom' && <div className="card"><div className="steppers">
              <Stepper label="Breathe in" value={custom.inhale} min={2} onChange={v => setCustom({ ...custom, inhale: v })} />
              <Stepper label="Hold" value={custom.hold1} min={0} max={10} onChange={v => setCustom({ ...custom, hold1: v })} />
              <Stepper label="Breathe out" value={custom.exhale} min={2} onChange={v => setCustom({ ...custom, exhale: v })} />
              <Stepper label="Rest" value={custom.hold2} min={0} max={10} onChange={v => setCustom({ ...custom, hold2: v })} />
            </div></div>}
            <div className="card tech-detail">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>How long?</div>
              <div className="seg" role="group" aria-label="Session length">{MINUTE_CHOICES.map(m => <button key={m} className={m === minutes ? 'on' : ''} onClick={() => setMinutes(m)}>{m} min</button>)}</div>
            </div>
            <div className="card">
              <Toggle label="Vibration" hint="Pulses mark each phase. Strongest on iPhone with the app." on={vibrate} onChange={setVibrate} />
              <Toggle label="Soft tones" hint="A gentle tone as each phase changes." on={sound} onChange={setSound} />
            </div>
            <button className="btn primary block" onClick={() => { setDone(null); setRunning(true) }}>Start · {minutes} min</button>
          </>}
    </>
  )
}
