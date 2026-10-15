import { useState } from 'react'
import { ArrowLeft, ChevronRight, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import Support from '../components/Support'
import { disablePush, enablePush, fmtHour, getReminder, isIOS, isStandalone, sendTest } from '../lib/push'
import { Toggle } from '../components/ui'

function Row({ icon, color, label, value, onClick }: { icon: React.ReactNode; color: string; label: string; value?: string; onClick?: () => void }) {
  return (
    <button className="li" onClick={onClick}>
      <span className="sq" style={{ background: color }}>{icon}</span>{label}
      <span className="val">{value}</span>{onClick && <ChevronRight size={20} color="#636366" />}
    </button>
  )
}

export default function More({ initial = null }: { initial?: 'support' | null }) {
  const { mode, session, signOut, thoughts, sessions, importLocal } = useStore()
  const [view, setView] = useState<null | 'gallery' | 'reminders' | 'health' | 'account' | 'support'>(initial)
  const [rem, setRem] = useState(getReminder)
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

  const STATUS: Record<string, string> = {
    denied: 'Notifications are blocked. Turn them on for this site in your browser or iOS settings.',
    unconfigured: 'Permission granted, but server push needs Supabase + a VAPID key (see README). Test notifications still work.',
  }
  async function applyReminder(enabled: boolean, hour: number) {
    setMsg('')
    try {
      if (!enabled) { await disablePush(); setRem({ enabled: false, hour }); return }
      const r = await enablePush(hour)
      setRem(getReminder())
      setMsg(r === 'ok' ? `Reminder set for ${fmtHour(hour)}.` : r === 'unsupported'
        ? (isIOS() && !isStandalone() ? 'On iPhone: tap Share → Add to Home Screen, then open Brain Pal from there.' : 'This browser does not support notifications.')
        : STATUS[r])
    } catch (e: any) { setMsg(e.message) }
  }
  async function deleteAccount() {
    if (!confirm('Permanently delete your account and ALL entries and photos? This cannot be undone.')) return
    const { error } = await supabase!.functions.invoke('delete-account')
    if (error) { setAcctMsg(`Could not delete: ${error.message}`); return }
    localStorage.removeItem('bp.reminder'); await signOut()
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
        <span className="title">{{ gallery: 'Photo Gallery', reminders: 'Reminders', health: 'Apple Health', account: 'Account', support: 'Get support' }[view]}</span>
        <span style={{ width: 50 }} />
      </div>
      {view === 'gallery' && (photos.length ? <div className="gallery">{photos.map((p, i) => <img key={i} src={p} alt="" />)}</div> : <div className="card empty">No photos yet.</div>)}
      {view === 'reminders' && <div className="card">
        <Toggle label="Daily reminder" hint="Only nudges you if you haven't checked in yet today." on={rem.enabled} onChange={on => applyReminder(on, rem.hour)} />
        <label className="field" style={{ marginTop: 12 }}><span>Remind me at</span>
          <select className="input" value={rem.hour} onChange={e => { const h = +e.target.value; setRem({ ...rem, hour: h }); if (rem.enabled) applyReminder(true, h) }}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
          </select></label>
        <p className="muted small">If your streak is at risk you'll get a streak-saver message instead of the usual one.</p>
        <button className="btn" onClick={async () => setMsg((await sendTest()) ? 'Test sent.' : 'Enable the reminder first so notifications are allowed.')}>Send test notification</button>
        {msg && <p className="small" role="status">{msg}</p>}
      </div>}
      {view === 'support' && <Support />}
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
        <button className="btn block" style={{ marginTop: 10, color: 'var(--danger)', background: 'none' }} onClick={deleteAccount}>Delete account…</button>
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
        <span className="glass round"><Emoji name="gear" size={28} /></span>
        <span className="title">More</span>
        <span className="glass pill-btn">{name ? `Hi, ${name}` : 'Hi there'}</span>
      </div>

      <div className="list">
        {mode === 'cloud' && <Row icon={<Emoji name="sunglasses" size={30} />} color="var(--card2)" label="Account" value={name} onClick={() => setView('account')} />}
        <Row icon={<Emoji name="photo" size={30} />} color="var(--card2)" label="Photo Gallery" onClick={() => setView('gallery')} />
        <Row icon={<Emoji name="bell" size={30} />} color="var(--card2)" label="Reminders" value={rem.enabled ? fmtHour(rem.hour) : 'Off'} onClick={() => setView('reminders')} />
        <Row icon={<Emoji name="blueheart" size={30} />} color="var(--card2)" label="Get support" onClick={() => setView('support')} />
        <Row icon={<Emoji name="heartfire" size={30} />} color="var(--card2)" label="Apple Health" value="Soon" onClick={() => setView('health')} />
      </div>
      <div className="list">
        <Row icon={<Emoji name="cloud" size={30} />} color="var(--card2)" label="Storage" value={mode === 'cloud' ? 'Synced' : 'This device'} />
        <Row icon={<Emoji name="notebook" size={30} />} color="var(--card2)" label="Export data" onClick={exportJson} />
        {mode === 'cloud' && <Row icon={<LogOut size={24} />} color="var(--card2)" label="Sign out" onClick={signOut} />}
      </div>
      <p className="muted small" style={{ textAlign: 'center' }}>Brain Pal 0.1 · {thoughts.length} entries · {sessions.length} breathing sessions</p>
    </>
  )
}
