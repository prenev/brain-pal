import { useEffect, useRef, useState } from 'react'
import { chime, haptic, hapticSuccess, stopHaptic } from '../lib/haptics'
import { isNative, Mindful } from '../lib/native'
import type { BreathPattern } from '../lib/types'

const LABEL = { inhale: 'Inhale', hold1: 'Hold', exhale: 'Exhale', hold2: 'Hold' } as const
const BUZZ: Record<keyof BreathPattern, number[]> = {
  inhale: [30, 110, 40, 90, 50, 70, 70], // swelling
  hold1: [40],
  exhale: [70, 70, 50, 90, 40, 110, 30], // fading
  hold2: [40],
}
const MIN = 0.62
const ease = (t: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2

export interface BreathResult { completed: boolean; elapsedSec: number; cyclesDone: number }

/** Animated orb + haptic/sound-cued breathing timer. Starts on mount; calls onFinish once. */
export default function BreathRunner({ pattern, cycles, vibrate, sound, onFinish }: {
  pattern: BreathPattern; cycles: number; vibrate: boolean; sound: boolean; onFinish: (r: BreathResult) => void
}) {
  const orb = useRef<HTMLDivElement>(null)
  const stop = useRef<() => void>(() => {})
  const done = useRef(onFinish)
  done.current = onFinish
  const [label, setLabel] = useState('Get ready')
  const [count, setCount] = useState(0)
  const [cycle, setCycle] = useState(1)

  useEffect(() => {
    const phases = (Object.keys(LABEL) as (keyof BreathPattern)[]).map(k => ({ k, s: pattern[k] })).filter(p => p.s > 0)
    const cycleLen = phases.reduce((a, p) => a + p.s, 0)
    const t0 = performance.now()
    let raf = 0, finished = false, lastKey = ''
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then(l => { if (finished) l.release().catch(() => {}); else lock = l }).catch(() => {})

    if (isNative()) Mindful.keepAwake({ enabled: true }).catch(() => {})   // wake lock isn't reliable in the app's web view
    const cleanup = () => { finished = true; cancelAnimationFrame(raf); stopHaptic(); lock?.release().catch(() => {}); if (isNative()) Mindful.keepAwake({ enabled: false }).catch(() => {}) }
    const end = (completed: boolean, elapsed: number, cyclesDone: number) => {
      if (finished) return
      cleanup()
      if (completed && vibrate) hapticSuccess()
      done.current({ completed, elapsedSec: Math.round(elapsed), cyclesDone })
    }
    stop.current = () => { const el = (performance.now() - t0) / 1000; end(false, el, Math.floor(el / cycleLen)) }

    const tick = (now: number) => {
      const el = (now - t0) / 1000
      if (el >= cycleLen * cycles) return end(true, cycleLen * cycles, cycles)
      const inCycle = el % cycleLen
      let acc = 0, idx = 0
      while (idx < phases.length - 1 && inCycle >= acc + phases[idx].s) acc += phases[idx++].s
      const ph = phases[idx], into = inCycle - acc, c = Math.floor(el / cycleLen), prog = into / ph.s
      const scale = ph.k === 'inhale' ? MIN + (1 - MIN) * ease(prog) : ph.k === 'exhale' ? 1 - (1 - MIN) * ease(prog) : ph.k === 'hold1' ? 1 : MIN
      if (orb.current) orb.current.style.transform = `scale(${scale})`
      setCount(Math.max(1, Math.ceil(ph.s - into)))
      const key = `${c}-${idx}`
      if (key !== lastKey) {
        lastKey = key; setLabel(LABEL[ph.k]); setCycle(c + 1)
        if (vibrate) haptic(BUZZ[ph.k])
        if (sound) chime(ph.k === 'inhale' ? 523 : ph.k === 'exhale' ? 392 : 440)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return cleanup
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="breath-stage">
        <div className="orb" ref={orb} style={{ transform: `scale(${MIN})` }}>
          <div><b>{label}</b>{count > 0 && <span>{count}</span>}</div>
        </div>
      </div>
      <p className="muted" style={{ textAlign: 'center' }}>Round {cycle} of {cycles}</p>
      <button className="btn block" onClick={() => stop.current()}>End session</button>
    </>
  )
}
