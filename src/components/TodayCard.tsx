import { useEffect, useState } from 'react'
import Face from './Face'
import { Emoji } from '../lib/emoji'
import { MOODS } from '../lib/mood'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates.ts'
import { nextAction } from '../lib/today.ts'
import { stepChoices } from '../lib/focus.ts'
import { haptic } from '../lib/haptics'

/**
 * The one obvious next thing. With no check-in yet today it is five faces: one tap logs a mood
 * (undo or "add details" right after). Otherwise it points at what's left: anchors, parked worries, or "all set".
 */
export default function TodayCard({ onDetails, onWorry, onBreathe, onStep }: { onDetails: (mood: number) => void; onWorry: () => void; onBreathe: () => void; onStep: () => void }) {
  const { thoughts, anchorsToday, worries, addThought, deleteThought, focusSessions } = useStore()
  const [logged, setLogged] = useState<{ id: string; mood: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { if (!logged) return; const t = setTimeout(() => setLogged(null), 8000); return () => clearTimeout(t) }, [logged])

  const today = dayKey(new Date())
  const action = nextAction({
    hasEntryToday: thoughts.some(t => dayKey(t.createdAt) === today),
    anchorsLeft: anchorsToday.total - anchorsToday.done,
    openWorries: worries.filter(w => w.status === 'open').length,
    plannedSteps: stepChoices(worries, focusSessions).fromWorries.length,
  })
  const nextStep = stepChoices(worries, focusSessions).fromWorries[0]?.text

  async function quick(mood: number) {
    if (busy) return
    setBusy(true); setErr('')
    try {
      const n = await addThought({ mood, situation: '', thought: '', emotions: [], internalBehaviour: '', externalBehaviour: '', alternateThought: '', outcomeIntensity: null, tags: [], distortions: [], photoFiles: [] })
      haptic(15); setLogged({ id: n.id, mood })
    } catch (e: any) { setErr(e?.message ?? 'Could not save') }
    setBusy(false)
  }
  async function undo() { if (logged) { await deleteThought(logged.id); setLogged(null) } }
  async function details() { if (logged) { const m = logged.mood; await deleteThought(logged.id); setLogged(null); onDetails(m) } }

  return (
    <div className="card today" aria-label="Today">
      {logged && <div className="toast-row" role="status">
        <span>Mood logged.</span>
        <span className="row" style={{ gap: 6 }}>
          <button className="linkbtn" onClick={details}>Add details</button>
          <button className="linkbtn" onClick={undo}>Undo</button>
        </span>
      </div>}
      {action.kind === 'mood' && <>
        <b style={{ fontSize: 19 }}>How are you feeling?</b>
        <div className="quickmood" role="group" aria-label="Log how you feel">
          {MOODS.map(m => (
            <button key={m.v} disabled={busy} aria-label={`Log mood: ${m.name}`} onClick={() => quick(m.v)} style={{ color: m.color }}>
              <Face mood={m.v} size={52} /><span>{m.name}</span>
            </button>
          ))}
        </div>
      </>}
      {action.kind === 'anchors' && <p className="today-line"><Emoji name="target" size={26} /><span><b>{action.left} {action.left === 1 ? 'anchor' : 'anchors'} left today.</b> Tick them off below.</span></p>}
      {action.kind === 'step' && <button className="today-line linklike" onClick={onStep}>
        <Emoji name="rocket" size={26} /><span style={{ flex: 1, textAlign: 'left' }}><b>A small step is waiting:</b> {nextStep}</span></button>}
      {action.kind === 'worries' && <button className="today-line linklike" onClick={onWorry}>
        <Emoji name="worry" size={26} /><span style={{ flex: 1, textAlign: 'left' }}><b>{action.count} parked {action.count === 1 ? 'worry' : 'worries'}.</b> Take a few minutes to go through them?</span></button>}
      {action.kind === 'done' && <button className="today-line linklike" onClick={onBreathe}>
        <Emoji name="sparkles" size={26} /><span style={{ flex: 1, textAlign: 'left' }}><b>You’re all set today.</b> A slow breath is always on offer.</span></button>}
      {err && <p role="alert" style={{ color: 'var(--danger)', margin: '10px 0 0' }}>{err}</p>}
    </div>
  )
}
