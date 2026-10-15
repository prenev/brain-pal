import { useState } from 'react'
import { ArrowLeft, Bell, ChevronRight, Download, HeartPulse, Image, LogOut, Cloud, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from '../lib/store'
import { enablePush, isStandalone } from '../lib/push'

function Row({ icon, color, label, value, onClick }: { icon: React.ReactNode; color: string; label: string; value?: string; onClick?: () => void }) {
  return (
    <button className="li" onClick={onClick}>
      <span className="sq" style={{ background: color }}>{icon}</span>{label}
      <span className="val">{value}</span>{onClick && <ChevronRight size={20} color="#636366" />}
    </button>
  )
}

export default function More() {
  const { mode, session, signOut, thoughts, sessions, importLocal } = useStore()
  const [view, setView] = useState<null | 'gallery' | 'reminders' | 'health' | 'account'>(null)
  const [hour, setHour] = useState(20)
  const [msg, setMsg] = useState('')
  const photos = thoughts.flatMap(t => t.photos)
  const meta = session?.user.user_metadata?.name as string | undefined
  const name = meta || session?.user.email?.split('@')[0]
  const [nick, setNick] = useState(meta ?? '')
  const [pw, setPw] = useState('')
  const [acctMsg, setAcctMsg] = useState('')
  const localCount = (() => { try { return JSON.parse(localStorage.getItem('bp.thoughts') ?? '[]').length + JSON.parse(localStorage.getItem('bp.sessions') ?? '[]').length } catch { return 0 } })()

  async function saveName() {
    const { error } = await supabase!.auth.updateUser({ data: { name: nick.trim() } })
    setAcctMsg(error ? error.message : 'Name updated.')
  }
  async function savePw() {
    const { error } = await supabase!.auth.updateUser({ password: pw })
    setAcctMsg(error ? error.message : 'Password updated.'); if (!error) setPw('')
  }
  async function doImport() {
    setAcctMsg('Importing…')
    try { setAcctMsg(`Imported ${await importLocal()} items from this device.`) } catch (e: any) { setAcctMsg(e.message) }
  }

  async function remind() {
    try {
      const r = await enablePush(hour)
      setMsg({
        ok: `Reminders on — daily at ${hour}:00.`,
        denied: 'Notifications are blocked. Enable them in your browser or iOS settings.',
        unconfigured: 'Permission granted, but push needs Supabase + a VAPID key (see README).',
        unsupported: /iPhone|iPad/.test(navigator.userAgent) && !isStandalone()
          ? 'On iPhone: tap Share → Add to Home Screen, then open Brain Pal from there.'
          : 'This browser does not support push notifications.',
      }[r])
    } catch (e: any) { setMsg(e.message) }
  }

  function exportJson() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ thoughts, sessions }, null, 2)], { type: 'application/json' }))
    a.download = 'brain-pal-export.json'; a.click()
  }

  if (view) return (
    <>
      <div className="topbar">
        <button className="glass round green" aria-label="Back" onClick={() => setView(null)}><ArrowLeft /></button>
        <span className="title">{{ gallery: 'Photo Gallery', reminders: 'Reminders', health: 'Apple Health', account: 'Account' }[view]}</span>
        <span style={{ width: 50 }} />
      </div>
      {view === 'gallery' && (photos.length ? <div className="gallery">{photos.map((p, i) => <img key={i} src={p} alt="" />)}</div> : <div className="card empty">No photos yet.</div>)}
      {view === 'reminders' && <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>A daily nudge to check in.</p>
        <div className="row"><input className="input" type="number" min={0} max={23} value={hour} onChange={e => setHour(+e.target.value)} style={{ width: 90 }} aria-label="Hour (0-23)" />
          <span className="muted">:00</span><button className="btn primary" onClick={remind}>Enable</button></div>
        {msg && <p className="small">{msg}</p>}
      </div>}
      {view === 'account' && <>
        <div className="card">
          <p className="muted small" style={{ marginTop: 0 }}>Signed in as {session?.user.email}</p>
          <label className="field"><span>Display name</span><input className="input" value={nick} onChange={e => setNick(e.target.value)} /></label>
          <button className="btn" onClick={saveName}>Save name</button>
        </div>
        <div className="card">
          <label className="field"><span>New password</span><input className="input" type="password" minLength={8} autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" /></label>
          <button className="btn" disabled={pw.length < 8} onClick={savePw}>Change password</button>
        </div>
        {localCount > 0 && <div className="card">
          <p style={{ marginTop: 0 }}>{localCount} entries from before you signed up are still on this device.</p>
          <button className="btn primary" onClick={doImport}>Import into my account</button>
        </div>}
        {acctMsg && <p className="small" role="status" style={{ textAlign: 'center' }}>{acctMsg}</p>}
        <button className="btn danger block" onClick={signOut}>Sign out</button>
      </>}
      {view === 'health' && <div className="card">
        <p style={{ marginTop: 0 }}>Apple Health sync isn’t available in the web app.</p>
        <p className="muted">Browsers can’t access HealthKit — only native apps can. The plan is to wrap this same app with Capacitor so every breathing session is saved as Mindful Minutes. Nothing is synced yet.</p>
      </div>}
    </>
  )

  return (
    <>
      <div className="topbar">
        <span className="glass round green"><HeartPulse /></span>
        <span className="title">More</span>
        <span className="glass pill-btn">{name ? `Hi, ${name}` : 'Hi there'}</span>
      </div>

      <div className="list">
        {mode === 'cloud' && <Row icon={<UserRound size={24} />} color="#3b82f6" label="Account" value={name} onClick={() => setView('account')} />}
        <Row icon={<Image size={24} />} color="#e8873a" label="Photo Gallery" onClick={() => setView('gallery')} />
        <Row icon={<Bell size={24} />} color="#3fa869" label="Reminders" value="8:00 pm" onClick={() => setView('reminders')} />
        <Row icon={<HeartPulse size={24} />} color="#e0364a" label="Apple Health" value="Soon" onClick={() => setView('health')} />
      </div>
      <div className="list">
        <Row icon={<Cloud size={24} />} color="#5e6ad2" label="Storage" value={mode === 'cloud' ? 'Synced' : 'This device'} />
        <Row icon={<Download size={24} />} color="#8e6bd8" label="Export data" onClick={exportJson} />
        {mode === 'cloud' && <Row icon={<LogOut size={24} />} color="#636366" label="Sign out" onClick={signOut} />}
      </div>
      <p className="muted small" style={{ textAlign: 'center' }}>Brain Pal 0.1 · {thoughts.length} entries · {sessions.length} breathing sessions</p>
    </>
  )
}
