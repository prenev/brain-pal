import { useRef, useState } from 'react'
import { Wind, Hand, Square, X, TrendingDown } from 'lucide-react'
import BreathRunner, { type BreathResult } from './BreathRunner'
import Grounding from './Grounding'
import { Toggle } from './ui'
import { useStore } from '../lib/store'
import type { BreathPattern } from '../lib/types'

const CALM: BreathPattern = { inhale: 4, hold1: 0, exhale: 6, hold2: 0 }   // longer exhale settles the nervous system
const BOX: BreathPattern = { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }
type Step = 'rate' | 'choose' | 'breath' | 'ground' | 'after'
type Tool = { id: 'calm' | 'ground' | 'box'; title: string; sub: string; icon: React.ReactNode }

const TOOLS: Tool[] = [
  { id: 'calm', title: 'Slow breathing', sub: '2 minutes · in 4, out 6', icon: <Wind /> },
  { id: 'ground', title: 'Ground yourself', sub: '5-4-3-2-1 senses · about 3 minutes', icon: <Hand /> },
  { id: 'box', title: 'Box breathing', sub: '2 minutes · 4-4-4-4', icon: <Square /> },
]
const WORDS = ['calm', 'a little uneasy', 'uneasy', 'tense', 'anxious', 'very anxious', 'panicking']
const word = (n: number) => WORDS[Math.min(6, Math.floor((n / 10) * 6.99))]

export default function Sos({ onClose, onLog }: { onClose: () => void; onLog: () => void }) {
  const { addSession } = useStore()
  const [step, setStep] = useState<Step>('rate')
  const [before, setBefore] = useState(6)
  const [after, setAfter] = useState(4)
  const [tool, setTool] = useState<Tool['id']>('calm')
  const [vibrate, setVibrate] = useState(true)
  const [saved, setSaved] = useState(false)
  const result = useRef<{ kind: 'breathing' | 'grounding'; pattern: BreathPattern; sec: number; cycles: number; completed: boolean }>()

  const finishBreath = (r: BreathResult) => {
    result.current = { kind: 'breathing', pattern: tool === 'box' ? BOX : CALM, sec: r.elapsedSec, cycles: r.cyclesDone, completed: r.completed }
    setStep('after')
  }
  const finishGround = (sec: number) => {
    result.current = { kind: 'grounding', pattern: BOX, sec, cycles: 0, completed: true }
    setStep('after')
  }
  async function save() {
    const r = result.current
    if (r) await addSession({ kind: r.kind, pattern: r.pattern, cycles: r.cycles, durationSec: r.sec, completed: r.completed, anxietyBefore: before, anxietyAfter: after }).catch(console.error)
    setSaved(true)
  }
  const drop = before - after

  return (
    <div className="overlay"><div className="inner" style={{ paddingTop: 'calc(var(--safe-t) + 14px)' }}>
      <div className="row spread" style={{ marginBottom: 10 }}>
        <span className="muted">{step === 'rate' ? 'Right now' : step === 'choose' ? 'Pick one' : step === 'after' ? 'How do you feel now?' : ''}</span>
        <button className="glass round" aria-label="Close" onClick={onClose}><X size={24} /></button>
      </div>

      {step === 'rate' && <>
        <h1 style={{ fontSize: 32, margin: '10px 0 6px' }}>You’re safe. Let’s slow things down.</h1>
        <p className="muted" style={{ fontSize: 18, marginTop: 0 }}>This feeling is uncomfortable, but it will pass. First: how anxious are you right now?</p>
        <div className="card" style={{ marginTop: 22, textAlign: 'center' }}>
          <div className="sos-num">{before}<span className="muted" style={{ fontSize: 22 }}> / 10</span></div>
          <div className="muted" style={{ marginBottom: 12 }}>{word(before)}</div>
          <input type="range" min={0} max={10} value={before} aria-label="Anxiety right now, 0 to 10" onChange={e => setBefore(+e.target.value)} />
        </div>
        <button className="btn primary block" style={{ marginTop: 8 }} onClick={() => { setTool(before >= 7 ? 'ground' : 'calm'); setStep('choose') }}>Continue</button>
      </>}

      {step === 'choose' && <>
        <h1 style={{ fontSize: 30, margin: '6px 0 16px' }}>What would help most?</h1>
        {TOOLS.map(t => {
          const rec = (before >= 7 && t.id === 'ground') || (before < 7 && t.id === 'calm')
          return (
            <button key={t.id} className="card tool" onClick={() => { setTool(t.id); setStep(t.id === 'ground' ? 'ground' : 'breath') }}>
              <span className="sq tool-ic">{t.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}><b style={{ fontSize: 19 }}>{t.title}</b>{rec && <span className="chip on" style={{ marginLeft: 8 }}>try first</span>}
                <div className="muted small">{t.sub}</div></span>
            </button>
          )
        })}
        <div className="card"><Toggle label="Vibration pulses" hint="Feel the rhythm with your eyes closed." on={vibrate} onChange={setVibrate} /></div>
      </>}

      {step === 'breath' && <BreathRunner pattern={tool === 'box' ? BOX : CALM} cycles={tool === 'box' ? 8 : 12} vibrate={vibrate} sound={false} onFinish={finishBreath} />}
      {step === 'ground' && <Grounding onFinish={finishGround} />}

      {step === 'after' && !saved && <>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="sos-num">{after}<span className="muted" style={{ fontSize: 22 }}> / 10</span></div>
          <div className="muted" style={{ marginBottom: 12 }}>{word(after)}</div>
          <input type="range" min={0} max={10} value={after} aria-label="Anxiety now, 0 to 10" onChange={e => setAfter(+e.target.value)} />
        </div>
        <button className="btn primary block" onClick={save}>Save</button>
      </>}

      {step === 'after' && saved && <>
        <div className="card" style={{ textAlign: 'center', padding: 26 }}>
          <TrendingDown size={40} color={drop > 0 ? 'var(--accent)' : 'var(--muted)'} />
          <h1 style={{ fontSize: 28, margin: '10px 0 6px' }}>{drop > 0 ? `Down ${drop} point${drop === 1 ? '' : 's'}` : drop === 0 ? 'Holding steady' : 'Still a tough one'}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {drop > 0 ? `From ${before} to ${after}. You did that — and you can do it again.`
              : drop === 0 ? 'Staying level counts. Anxiety often eases after the exercise ends — try again whenever you like.'
              : 'That happens. It doesn’t mean it isn’t working. Try the other exercise, or reach out to someone you trust.'}
          </p>
        </div>
        <button className="btn primary block" onClick={onLog}>Write down what triggered it</button>
        <button className="btn block" style={{ marginTop: 10 }} onClick={onClose}>Done</button>
      </>}
    </div></div>
  )
}
