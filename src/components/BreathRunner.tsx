import { useEffect, useMemo, useRef, useState } from 'react'
import { Square, Timer, Volume2, VolumeX } from 'lucide-react'
import Pal from './Pal'
import { sfx } from '../lib/sound'
import { chime, haptic, hapticSuccess, stopHaptic } from '../lib/haptics'
import { isNative, Mindful } from '../lib/native'
import { breathAt, cycleLength } from '../lib/breathing'
import type { BreathPattern } from '../lib/types'

const LABEL = { inhale: 'Inhale', hold1: 'Hold', exhale: 'Exhale', hold2: 'Hold' } as const
const BUZZ: Record<keyof BreathPattern, number[]> = {
  inhale: [30, 110, 40, 90, 50, 70, 70], // swelling
  hold1: [40],
  exhale: [70, 70, 50, 90, 40, 110, 30], // fading
  hold2: [40],
}
const MIN = 0.62
const POSE = { inhale: 'breatheIn', hold1: 'breatheIn', exhale: 'breatheOut', hold2: 'breatheOut' } as const
const clock = (sec: number) => { const t = Math.max(0, Math.round(sec)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
const ease = (t: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2

export interface BreathResult { completed: boolean; elapsedSec: number; cyclesDone: number }

/** Full-screen breathing scene: Wobbi swells and settles with the breath over a glow that changes colour per phase. Haptic/sound cued. Starts on mount; calls onFinish once. */
export default function BreathRunner({ pattern, cycles, vibrate, sound, onFinish, endLabel = 'End session' }: {
  pattern: BreathPattern; cycles: number; vibrate: boolean; sound: boolean; onFinish: (r: BreathResult) => void; endLabel?: string
}) {
  const scene = useRef<HTMLDivElement>(null)
  const soundRef = useRef(sound)
  const [soundOn, setSoundOn] = useState(sound)
  soundRef.current = soundOn
  const [phase, setPhase] = useState<keyof BreathPattern>('inhale')
  const [left, setLeft] = useState(() => cycleLength(pattern) * cycles)
  const specks = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ x: (i * 37 + 11) % 100, s: 4 + (i * 7) % 9, d: 9 + (i * 5) % 11, o: (i * 13) % 10 })), [])
  const stop = useRef<() => void>(() => {})
  const done = useRef(onFinish)
  done.current = onFinish
  const [label, setLabel] = useState('Get ready')
  const [count, setCount] = useState(0)
  const [cycle, setCycle] = useState(1)

  useEffect(() => { window.dispatchEvent(new CustomEvent('bp:immersive', { detail: true })); return () => { window.dispatchEvent(new CustomEvent('bp:immersive', { detail: false })) } }, [])

  useEffect(() => {
    const cycleLen = cycleLength(pattern)
    const t0 = performance.now()
    let raf = 0, finished = false, lastKey = ''
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then(l => { if (finished) l.release().catch(() => {}); else lock = l }).catch(() => {})

    if (isNative()) Mindful.keepAwake({ enabled: true }).catch(() => {})   // wake lock isn't reliable in the app's web view
    const cleanup = () => { finished = true; cancelAnimationFrame(raf); stopHaptic(); lock?.release().catch(() => {}); if (isNative()) Mindful.keepAwake({ enabled: false }).catch(() => {}) }
    const end = (completed: boolean, elapsed: number, cyclesDone: number) => {
      if (finished) return
      cleanup()
      if (completed) { if (vibrate) hapticSuccess(); sfx('success') }
      done.current({ completed, elapsedSec: Math.round(elapsed), cyclesDone })
    }
    stop.current = () => { const el = (performance.now() - t0) / 1000; end(false, el, Math.floor(el / cycleLen)) }

    const tick = (now: number) => {
      const el = (now - t0) / 1000
      const st = breathAt(el, pattern, cycles)
      if (st.done) return end(true, cycleLen * cycles, cycles)
      const { cycle: c, index: idx, key: phase, into, dur } = st, prog = into / dur
      const ph = { k: phase, s: dur }
      const scale = ph.k === 'inhale' ? MIN + (1 - MIN) * ease(prog) : ph.k === 'exhale' ? 1 - (1 - MIN) * ease(prog) : ph.k === 'hold1' ? 1 : MIN
      scene.current?.style.setProperty('--b', String((scale - MIN) / (1 - MIN)))
      setCount(Math.max(1, Math.ceil(ph.s - into)))
      const key = `${c}-${idx}`
      if (key !== lastKey) {
        lastKey = key; setLabel(LABEL[ph.k]); setPhase(ph.k); setCycle(c + 1); setLeft(Math.max(0, cycleLen * cycles - el))
        if (vibrate) haptic(BUZZ[ph.k])
        if (soundRef.current) chime(ph.k === 'inhale' ? 523 : ph.k === 'exhale' ? 392 : 440)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return cleanup
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="breath-scene" ref={scene} data-phase={phase} style={{ ['--b' as string]: 0 }} role="group" aria-label="Breathing exercise">
      <i className="bg bg-inhale" /><i className="bg bg-hold" /><i className="bg bg-exhale" />
      <div className="specks" aria-hidden="true">{specks.map((k, i) => <i key={i} style={{ left: `${k.x}%`, width: k.s, height: k.s, animationDuration: `${k.d}s`, animationDelay: `-${k.o}s` }} />)}</div>
      <div className="breath-core">
        <i className="ring r3" /><i className="ring r2" /><i className="ring r1" /><i className="glow" />
        <div className="orb breath-pal"><Pal pose={POSE[phase]} size={236} motion="none" /></div>
      </div>
      <div className="breath-say" aria-live="off"><b>{label}</b>{count > 0 && <span>{count}</span>}</div>
      <p className="breath-round">Round {cycle} of {cycles}</p>
      <div className="breath-bar">
        <button onClick={() => setSoundOn(v => !v)} aria-pressed={soundOn} aria-label={soundOn ? 'Mute tones' : 'Turn tones on'}>{soundOn ? <Volume2 size={26} /> : <VolumeX size={26} />}<span>{soundOn ? 'Sound' : 'Muted'}</span></button>
        <button onClick={() => stop.current()}><Square size={26} /><span>{endLabel}</span></button>
        <div className="breath-left" aria-label="Time left"><Timer size={26} /><span>{clock(left)}</span></div>
      </div>
    </div>
  )
}
