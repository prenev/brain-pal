import { useState } from 'react'
import { useStore } from '../lib/store'
import { PalTip } from '../components/Pal'
import BreathRunner, { type BreathResult } from '../components/BreathRunner'
import { Toggle } from '../components/ui'
import { Emoji } from '../lib/emoji'
import { burst } from '../lib/confetti'
import type { BreathPattern } from '../lib/types'

const PRESETS: Record<string, BreathPattern> = {
  'Box 4': { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
  'Box 5': { inhale: 5, hold1: 5, exhale: 5, hold2: 5 },
  'Box 6': { inhale: 6, hold1: 6, exhale: 6, hold2: 6 },
  'Calm 4-6': { inhale: 4, hold1: 0, exhale: 6, hold2: 0 },
  '4-7-8': { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
}
const HINTS: Record<string, string> = {
  'Calm 4-6': 'A longer exhale than inhale slows your heart rate — the quickest way to settle anxiety.',
  '4-7-8': 'Deeply relaxing; good before sleep. Skip it if holding your breath feels uncomfortable.',
}

export default function Breathe({ onSos }: { onSos: () => void }) {
  const { addSession } = useStore()
  const [preset, setPreset] = useState('Box 4')
  const [cycles, setCycles] = useState(6)
  const [vibrate, setVibrate] = useState(true)
  const [sound, setSound] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState<null | { cycles: number; sec: number }>(null)

  const pattern = PRESETS[preset]
  const total = (pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2) * cycles

  function finish(r: BreathResult) {
    setRunning(false)
    if (r.elapsedSec >= 10) {
      addSession({ pattern, cycles: r.cyclesDone, durationSec: r.elapsedSec, completed: r.completed }).catch(console.error)
      setDone({ cycles: r.cyclesDone, sec: r.elapsedSec })
      if (r.completed) burst()
    }
  }

  return (
    <>
      <div className="topbar"><span className="title">Breathe</span></div>

      {!running && <button className="sos-card" onClick={onSos}>
        <Emoji name="sos" size={36} />
        <span style={{ flex: 1 }}><b>Anxious right now?</b><span className="sub">Guided help in under 3 minutes</span></span>
      </button>}

      {running
        ? <div className="card"><BreathRunner pattern={pattern} cycles={cycles} vibrate={vibrate} sound={sound} onFinish={finish} /></div>
        : <>
          {done && <div className="card" style={{ textAlign: 'center' }}><Emoji name="lotus" size={64} /><div style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>Nice work!</div><div className="muted">{done.cycles} rounds · {Math.floor(done.sec / 60)}m {done.sec % 60}s logged</div></div>}
          <PalTip id="breathe" pose="breatheIn">Pick a pattern and follow the circle. A long, slow breath out is the secret.</PalTip>
          <div className="card">
            <div className="seg" role="tablist" aria-label="Pattern">
              {Object.keys(PRESETS).map(p => <button key={p} className={p === preset ? 'on' : ''} onClick={() => setPreset(p)}>{p}</button>)}
            </div>
            {HINTS[preset] && <p className="muted small" style={{ margin: '12px 4px 0' }}>{HINTS[preset]}</p>}
            <div style={{ margin: '16px 0 4px' }} className="row spread"><span>Rounds</span><b>{cycles}</b></div>
            <input type="range" min={2} max={20} value={cycles} onChange={e => setCycles(+e.target.value)} aria-label="Rounds" />
            <Toggle label="Vibration" hint="Pulses mark each phase. Strongest on Android; limited on iPhone web." on={vibrate} onChange={setVibrate} />
            <Toggle label="Soft tones" on={sound} onChange={setSound} />
            <button className="btn primary block" style={{ marginTop: 10 }} onClick={() => { setDone(null); setRunning(true) }}>Start · {Math.round(total / 60 * 10) / 10} min</button>
          </div>
        </>}
    </>
  )
}
