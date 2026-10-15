import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { chime, haptic, stopHaptic } from '../lib/haptics'
import { Toggle } from '../components/ui'
import type { BreathPattern } from '../lib/types'

const PRESETS: Record<string, BreathPattern> = {
  'Box 4': { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
  'Box 5': { inhale: 5, hold1: 5, exhale: 5, hold2: 5 },
  'Box 6': { inhale: 6, hold1: 6, exhale: 6, hold2: 6 },
}
const LABEL = { inhale: 'Inhale', hold1: 'Hold', exhale: 'Exhale', hold2: 'Hold' } as const
const BUZZ: Record<keyof BreathPattern, number[]> = {
  inhale: [30, 110, 40, 90, 50, 70, 70], // swelling
  hold1: [40],
  exhale: [70, 70, 50, 90, 40, 110, 30], // fading
  hold2: [40],
}
const MIN = 0.62

export default function Breathe() {
  const { addSession } = useStore()
  const [preset, setPreset] = useState('Box 4')
  const [cycles, setCycles] = useState(6)
  const [vibrate, setVibrate] = useState(true)
  const [sound, setSound] = useState(false)
  const [running, setRunning] = useState(false)
  const [label, setLabel] = useState('Ready')
  const [count, setCount] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [done, setDone] = useState<null | { cycles: number; sec: number }>(null)
  const orb = useRef<HTMLDivElement>(null)
  const stop = useRef<() => void>(() => {})

  const pattern = PRESETS[preset]
  const total = (pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2) * cycles

  useEffect(() => () => stop.current(), [])

  async function start() {
    setDone(null); setRunning(true)
    const phases = (Object.keys(LABEL) as (keyof BreathPattern)[]).map(k => ({ k, s: pattern[k] })).filter(p => p.s > 0)
    const cycleLen = phases.reduce((a, p) => a + p.s, 0)
    const t0 = performance.now()
    let raf = 0, lastKey = '', finished = false
    let lock: WakeLockSentinel | null = null
    try { lock = await navigator.wakeLock?.request('screen') } catch { /* optional */ }

    const finish = (completed: boolean, elapsedSec: number, cyclesDone: number) => {
      if (finished) return
      finished = true
      cancelAnimationFrame(raf); stopHaptic(); lock?.release().catch(() => {})
      setRunning(false); setLabel('Ready')
      if (orb.current) orb.current.style.transform = `scale(${MIN})`
      if (elapsedSec >= 10) {
        addSession({ pattern, cycles: cyclesDone, durationSec: Math.round(elapsedSec), completed }).catch(console.error)
        setDone({ cycles: cyclesDone, sec: Math.round(elapsedSec) })
      }
      if (completed && vibrate) haptic([80, 60, 80])
    }
    stop.current = () => finish(false, (performance.now() - t0) / 1000, Math.floor((performance.now() - t0) / 1000 / cycleLen))

    const tick = (now: number) => {
      const el = (now - t0) / 1000
      if (el >= cycleLen * cycles) return finish(true, cycleLen * cycles, cycles)
      const inCycle = el % cycleLen
      let acc = 0, idx = 0
      while (idx < phases.length - 1 && inCycle >= acc + phases[idx].s) acc += phases[idx++].s
      const ph = phases[idx], into = inCycle - acc, c = Math.floor(el / cycleLen)
      const prog = into / ph.s
      const scale = ph.k === 'inhale' ? MIN + (1 - MIN) * ease(prog)
        : ph.k === 'exhale' ? 1 - (1 - MIN) * ease(prog)
        : ph.k === 'hold1' ? 1 : MIN
      if (orb.current) orb.current.style.transform = `scale(${scale})`
      setCount(Math.max(1, Math.ceil(ph.s - into)))
      const key = `${c}-${idx}`
      if (key !== lastKey) {
        lastKey = key
        setLabel(LABEL[ph.k]); setCycle(c + 1)
        if (vibrate) haptic(BUZZ[ph.k])
        if (sound) chime(ph.k === 'inhale' ? 523 : ph.k === 'exhale' ? 392 : 440)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  return (
    <>
      <h1>Breathe</h1>
      <p className="sub">Box breathing steadies your nervous system. Follow the orb — or just feel the pulses.</p>

      <div className="glass card">
        <div className="breath-stage">
          <div className="orb" ref={orb} style={{ transform: `scale(${MIN})` }}>
            <div><b>{label}</b>{running && <span>{count}</span>}</div>
          </div>
        </div>
        {running && <p className="center muted" style={{ textAlign: 'center' }}>Round {cycle} of {cycles}</p>}
        {done && !running && (
          <p style={{ textAlign: 'center' }}>Nice work — {done.cycles} rounds, {Math.floor(done.sec / 60)}m {done.sec % 60}s logged. 🌿</p>
        )}
        {running
          ? <button className="btn block" onClick={() => stop.current()}>End session</button>
          : <button className="btn primary block" onClick={start}>Start · {Math.round(total / 60 * 10) / 10} min</button>}
      </div>

      {!running && (
        <div className="glass card">
          <div className="seg" role="tablist" aria-label="Pattern">
            {Object.keys(PRESETS).map(p => <button key={p} className={p === preset ? 'on' : ''} onClick={() => setPreset(p)}>{p}</button>)}
          </div>
          <div style={{ margin: '16px 0 4px' }} className="row spread"><span>Rounds</span><b>{cycles}</b></div>
          <input type="range" min={2} max={20} value={cycles} onChange={e => setCycles(+e.target.value)} aria-label="Rounds" />
          <Toggle label="Vibration" hint="Pulses mark each phase. Strongest on Android; limited on iPhone web." on={vibrate} onChange={setVibrate} />
          <Toggle label="Soft tones" on={sound} onChange={setSound} />
        </div>
      )}
    </>
  )
}

const ease = (t: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2
