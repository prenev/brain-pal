import { useState } from 'react'
import { useStore } from '../lib/store'
import { enablePush, isStandalone } from '../lib/push'

export default function Settings() {
  const { mode, session, signOut, thoughts, sessions } = useStore()
  const [hour, setHour] = useState(20)
  const [msg, setMsg] = useState('')

  async function remind() {
    try {
      const r = await enablePush(hour)
      setMsg({
        ok: `Reminders on — daily at ${hour}:00.`,
        denied: 'Notifications are blocked. Enable them in your browser/iOS settings.',
        unconfigured: 'Permission granted, but push needs Supabase + a VAPID key (see README).',
        unsupported: /iPhone|iPad/.test(navigator.userAgent) && !isStandalone()
          ? 'On iPhone, first tap Share → Add to Home Screen, then open Brain Pal from there.'
          : 'This browser does not support push notifications.',
      }[r])
    } catch (e: any) { setMsg(e.message) }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ thoughts, sessions }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'brain-pal-export.json'; a.click()
  }

  return (
    <>
      <h1>Settings</h1>
      <div className="glass card">
        <b>Storage</b>
        <p className="muted small">
          {mode === 'cloud' ? `Synced to your private database${session?.user.email ? ` as ${session.user.email}` : ''}.`
            : 'Local mode: data lives only in this browser. Connect Supabase to sync across devices.'}
        </p>
        {mode === 'cloud' && <button className="btn" onClick={signOut}>Sign out</button>}
      </div>

      <div className="glass card">
        <b>Daily reminder</b>
        <div className="row" style={{ margin: '10px 0' }}>
          <input className="input" type="number" min={0} max={23} value={hour} onChange={e => setHour(+e.target.value)} style={{ width: 90 }} aria-label="Hour" />
          <span className="muted">o'clock</span>
          <button className="btn primary" onClick={remind}>Enable</button>
        </div>
        {msg && <p className="small">{msg}</p>}
      </div>

      <div className="glass card">
        <b>Apple Health</b>
        <p className="muted small">
          Browsers can't access HealthKit — Apple only allows it for native apps. The plan: wrap this same app with
          Capacitor to write Mindful Minutes for each breathing session. Until then, nothing is synced.
        </p>
      </div>

      <div className="glass card">
        <b>Your data</b>
        <p><button className="btn" onClick={exportJson}>Export JSON</button></p>
      </div>
    </>
  )
}
