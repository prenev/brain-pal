import { useState } from 'react'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { STARTERS } from '../lib/anchors.ts'

const PICKS = STARTERS.filter(s => ['Slow breathing', 'Log a mood', 'Walk 10 minutes', 'Get some sunlight', 'Write one line'].includes(s.label))

/** Three short, skippable screens the very first time: what this is, what happens to your data, and (optionally) your first anchors. */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { addAnchor } = useStore()
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const finish = () => { for (const s of PICKS.filter(p => picked.includes(p.label))) addAnchor(s.label, s.emoji, s.link); onDone() }
  const toggle = (l: string) => setPicked(p => (p.includes(l) ? p.filter(x => x !== l) : p.length < 3 ? [...p, l] : p))

  return (
    <div className="overlay onboarding" role="dialog" aria-modal aria-label="Welcome to Brain Pal"><div className="inner" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div className="row spread" style={{ padding: '18px 4px' }}>
        <span className="muted small" aria-live="polite">{step + 1} of 3</span>
        <button className="linkbtn" onClick={onDone}>Skip</button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
        {step === 0 && <>
          <div><Emoji name="lotus" size={110} /></div>
          <h1 style={{ fontSize: 32, margin: 0 }}>A calm place to check in</h1>
          <p className="muted" style={{ fontSize: 18, margin: 0 }}>Log how you feel in one tap, ease anxiety when it spikes, write things down, and see real proof that you’re getting better at coping.</p>
          <p className="muted small" style={{ margin: 0 }}>Brain Pal is a self-help tool, not medical care. If you’re in crisis, the support options are always one tap away in the SOS flow and under More.</p>
        </>}
        {step === 1 && <>
          <div><Emoji name="key" size={110} /></div>
          <h1 style={{ fontSize: 32, margin: 0 }}>Your data stays yours</h1>
          <p className="muted" style={{ fontSize: 18, margin: 0 }}>Everything lives on this device unless you choose to sign in to sync. No ads, no tracking, and nothing you write is sent anywhere by default.</p>
          <p className="muted small" style={{ margin: 0 }}>The optional AI helper is off until you turn it on with your own key. Apple Health is only read if you connect sleep, and only for sleep.</p>
        </>}
        {step === 2 && <>
          <div><Emoji name="target" size={110} /></div>
          <h1 style={{ fontSize: 30, margin: 0 }}>Pick up to three daily anchors</h1>
          <p className="muted" style={{ fontSize: 17, margin: 0 }}>Small things that make a day count. You can change these any time.</p>
          <div className="chips" style={{ justifyContent: 'center' }} role="group" aria-label="Daily anchors">
            {PICKS.map(p => <button key={p.label} className={`chip ${picked.includes(p.label) ? 'on' : ''}`} aria-pressed={picked.includes(p.label)} onClick={() => toggle(p.label)}>{p.label}</button>)}
          </div>
        </>}
      </div>
      <div style={{ padding: '18px 0 calc(var(--safe-b) + 24px)' }}>
        {step < 2 ? <button className="btn primary block" onClick={() => setStep(step + 1)}>Next</button>
          : <button className="btn primary block" onClick={finish}>{picked.length ? 'Start' : 'Start without anchors'}</button>}
      </div>
    </div></div>
  )
}
