import { useState } from 'react'
import { Toggle } from './ui'
import { useStore } from '../lib/store'
import { ALL_DAYS, fmtTime, type Ritual } from '../lib/rituals.ts'
import { requestNotificationPermission, sendNativeTest } from '../lib/nativeReminders'

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const BLURB: Record<Ritual['kind'], string> = {
  breathe: 'A gentle nudge to take a slow minute. Opens Breathe.',
  checkin: 'A one-tap check-in. Skipped today once you’ve checked in.',
  journal: 'A prompt to write a few lines. Opens your journal.',
  anchors: 'A nudge about your daily anchors. Skipped once they’re all done.',
}

/** iPhone app: a few purposeful reminders. Each one opens the matching tool and stays quiet once you've done the thing. */
export default function Rituals() {
  const { rituals, setRituals } = useStore()
  const [msg, setMsg] = useState('')
  const patch = (id: string, p: Partial<Ritual>) => setRituals(rituals.map(r => (r.id === id ? { ...r, ...p } : r)))

  async function toggle(r: Ritual, on: boolean) {
    setMsg('')
    if (on) {
      try {
        if (!(await requestNotificationPermission())) { setMsg('Notifications are blocked. Turn them on in Settings → Notifications → Brain Pal.'); return }
      } catch { setMsg('Could not ask for notification permission.'); return }
    }
    patch(r.id, { enabled: on })
  }
  const toggleDay = (r: Ritual, d: number) => {
    const days = r.days.includes(d) ? r.days.filter(x => x !== d) : [...r.days, d].sort()
    if (days.length) patch(r.id, { days })      // at least one day stays on
  }

  return (
    <>
      <p className="muted small" style={{ margin: '0 4px 12px' }}>Pick the moments that suit you. Reminders are quiet by default and never nag: each is skipped for today once you’ve already done it.</p>
      {rituals.map(r => (
        <div key={r.id} className="card ritual" aria-label={r.label}>
          <Toggle label={r.label} hint={BLURB[r.kind]} on={r.enabled} onChange={on => toggle(r, on)} />
          {r.enabled && <>
            <label className="field" style={{ marginTop: 12 }}><span>Time</span>
              <input className="input" type="time" aria-label={`${r.label} time`} value={fmtTime(r.hour, r.minute)} onChange={e => {
                const [h, m] = e.target.value.split(':').map(Number)
                if (Number.isInteger(h) && Number.isInteger(m)) patch(r.id, { hour: h, minute: m })
              }} /></label>
            <div className="chips days" role="group" aria-label={`${r.label} days`}>
              {ALL_DAYS.map(d => <button key={d} type="button" className={`chip ${r.days.includes(d) ? 'on' : ''}`} aria-pressed={r.days.includes(d)} aria-label={DAY_NAME[d]} onClick={() => toggleDay(r, d)}>{DAY_LETTER[d]}</button>)}
            </div>
          </>}
        </div>
      ))}
      <button className="btn" onClick={async () => { try { await sendNativeTest(); setMsg('Test sent — it should arrive in a couple of seconds.') } catch { setMsg('Allow notifications first (turn a reminder on).') } }}>Send test notification</button>
      {msg && <p className="small" role="status">{msg}</p>}
    </>
  )
}
