import { useState } from 'react'
import { Toggle } from './ui'
import { loadFx, saveFx } from '../lib/extras'
import { sfx, unlockAudio } from '../lib/sound'
import { uiTap } from '../lib/feedback'
import { hapticSuccess } from '../lib/haptics'

/** More → Sounds & haptics: two switches, each with a try-it button. Device-only. */
export default function FeedbackSettings() {
  const [fx, setFx] = useState(loadFx)
  const set = (patch: Partial<typeof fx>) => { const n = { ...fx, ...patch }; setFx(n); saveFx(n) }
  return (
    <div className="card">
      <Toggle label="Sound effects" hint="Little sounds for celebrations, ticks and coins. Follows your iPhone’s silent switch." on={fx.sound} onChange={on => { set({ sound: on }); if (on) { unlockAudio(); setTimeout(() => sfx('success'), 60) } }} />
      <Toggle label="Haptic feedback" hint="A light tap when you press buttons, pick feelings and finish things." on={fx.haptics} onChange={on => { set({ haptics: on }); if (on) setTimeout(() => { uiTap(true); hapticSuccess() }, 60) }} />
      <p className="muted small" style={{ margin: '10px 2px 0' }}>Breathing has its own sound and vibration switches on the Breathe tab. Both settings stay on this device.</p>
    </div>
  )
}
