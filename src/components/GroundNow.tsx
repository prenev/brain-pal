import Grounding from './Grounding'
import { Screen } from './ui'
import { useStore } from '../lib/store'
import type { BreathPattern } from '../lib/types'

const UNUSED: BreathPattern = { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }   // grounding is stored like a breathing session; the pattern is ignored

/** Home → Ground: 5-4-3-2-1 straight away (SOS still offers it after the anxiety rating). Saved like the SOS one, so it counts for calming. */
export default function GroundNow({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { addSession } = useStore()
  return (
    <Screen title="Ground yourself" onClose={onClose}>
      <p className="muted" style={{ textAlign: 'center', margin: '4px 12px 18px', fontWeight: 700 }}>Come back to the room you're in, one sense at a time.</p>
      <Grounding onFinish={sec => { addSession({ kind: 'grounding', pattern: UNUSED, cycles: 0, durationSec: sec, completed: true }).catch(console.error); onDone() }} />
    </Screen>
  )
}
