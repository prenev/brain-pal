import { useState } from 'react'
import Pal from './Pal'
import type { PoseName } from '../lib/pal.ts'

const KEY = 'bp.coach.done'
export const coachDone = () => { try { return !!localStorage.getItem(KEY) } catch { return true } }
export const resetCoach = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } window.dispatchEvent(new Event('bp:coach-reset')) }

const STEPS: { pose: PoseName; text: string }[] = [
  { pose: 'stop', text: 'In an emergency, or when anxiety spikes, tap the red SOS siren at the top. It guides you through, and it’s always free.' },
  { pose: 'wave', text: 'Hi! To check in, just tap a face on the home card. That’s the whole thing.' },
  { pose: 'idle', text: 'Swipe the row of tools sideways for your thoughts, journal, sleep, progress and more.' },
  { pose: 'think', text: 'Tap + whenever you want to write, park a worry or breathe. The red siren up top is for when anxiety spikes.' },
]

/** Pal in the bottom-right corner explains the app in three bubbles, once. */
export default function Coach({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const last = i === STEPS.length - 1
  const finish = () => { try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } onDone() }
  const step = STEPS[i]
  return (
    <div className="coach" role="dialog" aria-label="Tips from Pal">
      <div className="bubble">
        <span aria-live="polite">{step.text}</span>
        <div className="row">
          <button className="linkbtn" onClick={finish}>Skip</button>
          <button className="btn primary small" onClick={() => (last ? finish() : setI(i + 1))}>{last ? 'Got it' : 'Next'}</button>
        </div>
      </div>
      <Pal key={i} pose={step.pose} motion={i === 0 ? 'wave' : 'bob'} size={76} />
    </div>
  )
}
