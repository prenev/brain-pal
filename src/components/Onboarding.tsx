import { useState } from 'react'
import Pal, { type PalMotion } from './Pal'
import { useStore } from '../lib/store'
import { STARTERS } from '../lib/anchors.ts'
import type { PoseName } from '../lib/pal.ts'

const PICKS = STARTERS.filter(s => ['Slow breathing', 'Log a mood', 'Walk 10 minutes', 'Get some sunlight', 'Write one line'].includes(s.label))

interface Page { pose: PoseName; motion: PalMotion; title: string; body: string; note?: string }
/** The story: one idea per screen, Pal doing the talking. */
export const STORY: Page[] = [
  { pose: 'wave', motion: 'wave', title: 'Hi, I’m Pal!', body: 'I’m your pocket buddy for a calmer head. I’ll help you check in, settle down when things spike, and build tiny habits that stick. No pressure, no guilt.', note: 'Brain Pal is a self-help tool, not medical care. If you’re in crisis, support options are always one tap away in the SOS flow and under More.' },
  { pose: 'idle', motion: 'bob', title: 'Check in with one tap', body: 'Tap a face to log how you feel. Add a thought, a photo or a voice memo only when you want to. Your calendar and stats turn it into patterns you can actually see.' },
  { pose: 'breatheIn', motion: 'breathe', title: 'Calm down, together', body: 'Slow breathing and grounding walk you through it, and the red siren button up top is there for when anxiety spikes. Park worries for later, then decide: one small step, or let it go.' },
  { pose: 'flex', motion: 'bob', title: 'Grow a little each day', body: 'Pick up to five tiny daily anchors. Your skill levels grow with what you really do, with proof, and never go down. On iPhone, the Focus guard can keep time-sink apps paused until you move.' },
  { pose: 'love', motion: 'bob', title: 'Your data stays yours', body: 'Everything lives on this device unless you choose to sign in to sync. No ads, no tracking, and nothing you write is sent anywhere by default.', note: 'The optional AI helper is off until you turn it on with your own key. Apple Health is only read if you connect sleep, and only for sleep.' },
]
const LAST = STORY.length          // the final screen picks anchors

/** First run: Pal explains everything in a few skippable screens, then you can pick your first anchors. */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { addAnchor } = useStore()
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const finish = () => { for (const s of PICKS.filter(p => picked.includes(p.label))) addAnchor(s.label, s.emoji, s.link); onDone() }
  const toggle = (l: string) => setPicked(p => (p.includes(l) ? p.filter(x => x !== l) : p.length < 3 ? [...p, l] : p))
  const page = STORY[step]

  return (
    <div className="overlay onboarding" role="dialog" aria-modal aria-label="Welcome to Brain Pal"><div className="inner" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div className="row spread" style={{ padding: 'calc(var(--safe-t) + 14px) 4px 10px' }}>
        <span className="dots" role="img" aria-label={`Step ${step + 1} of ${LAST + 1}`}>{Array.from({ length: LAST + 1 }, (_, i) => <i key={i} className={i === step ? 'on' : i < step ? 'past' : ''} />)}</span>
        <button className="linkbtn" onClick={onDone}>Skip</button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}>
        {page ? <>
          <Pal key={step} pose={page.pose} motion={page.motion} size={190} />
          <h1 style={{ fontSize: 31, margin: 0 }}>{page.title}</h1>
          <p className="muted" style={{ fontSize: 18, margin: 0 }}>{page.body}</p>
          {page.note && <p className="muted small" style={{ margin: 0 }}>{page.note}</p>}
        </> : <>
          <Pal pose="cheer" motion="bob" size={150} />
          <h1 style={{ fontSize: 30, margin: 0 }}>Pick up to three daily anchors</h1>
          <p className="muted" style={{ fontSize: 17, margin: 0 }}>Small things that make a day count. You can change these any time.</p>
          <div className="chips" style={{ justifyContent: 'center' }} role="group" aria-label="Daily anchors">
            {PICKS.map(p => <button key={p.label} className={`chip ${picked.includes(p.label) ? 'on' : ''}`} aria-pressed={picked.includes(p.label)} onClick={() => toggle(p.label)}>{p.label}</button>)}
          </div>
        </>}
      </div>
      <div style={{ padding: '18px 0 calc(var(--safe-b) + 24px)' }}>
        {step < LAST ? <button className="btn primary block" onClick={() => setStep(step + 1)}>Next</button>
          : <button className="btn primary block" onClick={finish}>{picked.length ? 'Start' : 'Start without anchors'}</button>}
      </div>
    </div></div>
  )
}
