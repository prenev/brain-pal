import { useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { GROUNDING } from '../lib/constants'

/** 5-4-3-2-1 sensory grounding. Tap once per thing you notice. */
export default function Grounding({ onFinish }: { onFinish: (elapsedSec: number) => void }) {
  const t0 = useRef(performance.now())
  const [step, setStep] = useState(0)
  const [got, setGot] = useState(0)
  const g = GROUNDING[step]
  const next = () => {
    if (step === GROUNDING.length - 1) return onFinish(Math.round((performance.now() - t0.current) / 1000))
    setStep(step + 1); setGot(0)
  }
  const tap = () => {
    haptic(30)
    if (got + 1 >= g.n) { setGot(g.n); setTimeout(next, 450) } else setGot(got + 1)
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="progress">{GROUNDING.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
      <div className="ground-n" aria-hidden>{g.n}</div>
      <p style={{ fontSize: 20, lineHeight: 1.4, margin: '0 8px 22px' }}>{g.prompt}</p>
      <div className="ground-dots" aria-label={`${got} of ${g.n} noticed`}>
        {Array.from({ length: g.n }, (_, i) => <i key={i} className={i < got ? 'on' : ''} />)}
      </div>
      <button className="btn primary block" data-fx="off" style={{ marginTop: 22 }} onClick={tap}>I noticed one</button>
      <button className="btn block" style={{ marginTop: 10, background: 'none', color: 'var(--muted)' }} onClick={next}>
        {step === GROUNDING.length - 1 ? 'Finish' : 'Skip this step'}
      </button>
    </div>
  )
}
