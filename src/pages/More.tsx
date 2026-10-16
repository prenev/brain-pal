import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronRight, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import Support from '../components/Support'
import AiSettings from '../components/AiSettings'
import { aiEnabled } from '../lib/gemini'
import { isNative } from '../lib/native'
import { connectHealth, disconnectHealth, healthEnabled, syncAll } from '../lib/health'
import { worryStats } from '../lib/worries'
import { disablePush, enablePush, fmtHour, getReminder, isIOS, isStandalone, sendTest } from '../lib/push'
import { Toggle } from '../components/ui'
import { AnchorsManager } from '../components/Anchors'
import { JournalList } from '../components/Journal'
import Rituals from '../components/Rituals'
import Wallet from '../components/Wallet'
import Legal from '../components/Legal'
import { Stickers, inviteFriend } from '../components/ShareSheet'
import FeedbackSettings from '../components/FeedbackSettings'
import { useOpenPaywall } from '../components/Pro'
import { usePro } from '../lib/proStore'
import { resetTips } from '../components/Pal'
import WhatsNew from '../components/WhatsNew'
import { RELEASES } from '../lib/whatsnew.ts'
import { resetCoach } from '../components/Coach'
import Guard from '../components/Guard'
import { loadFx, loadGuard } from '../lib/extras'
import { APP_VERSION } from '../lib/appInfo.ts'
import type { JournalEntry } from '../lib/journal.ts'
import { activeAnchors } from '../lib/anchors.ts'

function Row({ icon, color, label, value, onClick }: { icon: React.ReactNode; color: string; label: string; value?: string; onClick?: () => void }) {
  return (
    <button className="li" onClick={onClick}>
      <span className="sq" style={{ background: color }}>{icon}</span>{label}
      <span className="val">{value}</span>{onClick && <ChevronRight size={20} color="#636366" />}
    </button>
  )
}

export default function More({ initial = null, onWorry, onJournal }: { initial?: 'support' | 'journal' | null; onWorry: () => void; onJournal: (e?: JournalEntry) => void }) {
  const { mode, cloudAvailable, openLogin, session, signOut, thoughts, sessions, worries, importLocal, anchors, journal, rituals, coins, achievements, sync, syncNow } = useStore()
  const [view, setView] = useState<null | 'gallery' | 'reminders' | 'health' | 'account' | 'support' | 'ai' | 'anchors' | 'journal' | 'coins' | 'achievements' | 'legal' | 'guard' | 'stickers' | 'feedback'>(initial)
  const [rem, setRem] = useState(getReminder)
  const [health, setHealth] = useState(healthEnabled)
  const [healthMsg, setHealthMsg] = useState('')
  const [msg, setMsg] = useState('')
  const [tipsBack, setTipsBack] = useState(false)
  const [showNews, setShowNews] = useState(false)
  useEffect(() => { if (mode !== 'cloud' && view === 'account') setView(null) }, [mode, view])     // signed out: leave the account page
  const { pro } = usePro()
  const [inviteMsg, setInviteMsg] = useState('')
  const openPaywall = useOpenPaywall()
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
        ? (isIOS() && !isStandalone() ? 'On iPhone: tap Share → Add to Home Screen, then open Wobbi from there.' : 'This browser does not support notifications.')
        : STATUS[r])
    } catch (e: any) { setMsg(e.message) }
  }
  async function doSignOut() {
    const pending = await signOut()
    if (pending > 0 && confirm(`${pending} ${pending === 1 ? 'change hasn’t' : 'changes haven’t'} been saved to your account yet (are you offline?). Sign out anyway and lose ${pending === 1 ? 'it' : 'them'} from this device?`)) await signOut(true)
  }
  async function deleteAccount() {
    if (!confirm('Permanently delete your account and ALL entries and photos? This cannot be undone.')) return
    const { error } = await supabase!.functions.invoke('delete-account')
    if (error) { setAcctMsg(`Could not delete: ${error.message}`); return }
    localStorage.removeItem('bp.reminder'); await signOut(true)
  }

  function exportJson() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ thoughts: thoughts.map(({ photos: _p, audio, ...t }) => ({ ...t, audio: audio && { durationSec: audio.durationSec, transcript: audio.transcript } })), sessions, worries }, null, 2)], { type: 'application/json' }))
    a.download = 'brain-pal-export.json'; a.click()
  }

  if (view) return (
    <>
      <div className="topbar">
        <button className="glass round green" aria-label="Back" onClick={() => setView(null)}><ArrowLeft /></button>
        <span className="title">{{ gallery: 'Photo Gallery', reminders: 'Reminders', health: 'Apple Health', account: 'Account', support: 'Get support', ai: 'AI helper', anchors: 'Daily anchors', journal: 'Journal', coins: 'Rewards', achievements: 'Rewards', legal: 'About & legal', guard: 'Focus guard', stickers: 'Wobbi stickers', feedback: 'Sounds & haptics' }[view]}</span>
        <span style={{ width: 50 }} />
      </div>
      {view === 'gallery' && (photos.length ? <div className="gallery">{photos.map((p, i) => <img key={i} src={p} alt="" />)}</div> : <div className="card empty">No photos yet.</div>)}
      {view === 'reminders' && isNative() && <Rituals />}
      {view === 'reminders' && !isNative() && <div className="card">
        <Toggle label="Daily reminder" hint="Only nudges you if you haven't checked in yet today." on={rem.enabled} onChange={on => applyReminder(on, rem.hour)} />
        <label className="field" style={{ marginTop: 12 }}><span>Remind me at</span>
          <select className="input" value={rem.hour} onChange={e => { const h = +e.target.value; setRem({ ...rem, hour: h }); if (rem.enabled) applyReminder(true, h) }}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
          </select></label>
        <p className="muted small">If your streak is at risk you'll get a streak-saver message instead of the usual one.</p>
        <button className="btn" onClick={async () => setMsg((await sendTest()) ? 'Test sent.' : 'Enable the reminder first so notifications are allowed.')}>Send test notification</button>
        {msg && <p className="small" role="status">{msg}</p>}
      </div>}
      {view === 'anchors' && <AnchorsManager />}
      {view === 'coins' && <Wallet />}
      {view === 'achievements' && <Wallet initial="achievements" />}
      {view === 'journal' && <JournalList onOpen={onJournal} onWrite={() => onJournal()} />}
      {view === 'support' && <Support />}
      {view === 'legal' && <Legal />}
      {view === 'guard' && <Guard />}
      {view === 'stickers' && <Stickers />}
      {view === 'feedback' && <FeedbackSettings />}
      {view === 'ai' && <AiSettings />}
      {view === 'account' && <>
        <div className="card" aria-label="Sync status">
          <div className="row spread"><b>Sync</b><button className="linkbtn" disabled={sync.status === 'syncing'} onClick={() => void syncNow()}>Sync now</button></div>
          <p className="muted small" role="status" style={{ margin: '6px 0 0' }}>
            {sync.status === 'syncing' ? 'Syncing your journal, anchors, coins and more…'
              : sync.status === 'error' ? `Couldn’t reach your account just now${sync.pending ? ` — ${sync.pending} ${sync.pending === 1 ? 'change is' : 'changes are'} safe on this device and will sync when you’re back online` : ''}.`
              : sync.at ? `Everything is saved to your account (${new Date(sync.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}).` : 'Your journal, anchors, focus sessions, hand-logged sleep, coins and settings sync to your account.'}
          </p>
        </div>
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
        <button className="btn danger block" onClick={doSignOut}>Sign out</button>
        <button className="btn block" style={{ marginTop: 10, color: 'var(--danger)', background: 'none' }} onClick={deleteAccount}>Delete account…</button>
      </>}
      {view === 'health' && (isNative() ? <div className="card">
        <p style={{ marginTop: 0 }}>Save your breathing and grounding sessions to Apple Health as <b>Mindful Minutes</b>.</p>
        <p className="muted small">Sessions are only ever <i>written</i>. The one thing Wobbi can <i>read</i> is your sleep, and only if you turn that on under Stats → Sleep.</p>
        <Toggle label="Save sessions to Apple Health" on={health} onChange={async on => {
          setHealthMsg('')
          if (!on) { disconnectHealth(); setHealth(false); return }
          try {
            const r = await connectHealth()
            setHealth(r === 'ok')
            setHealthMsg(r === 'ok' ? 'Connected. New sessions will appear in Health → Mindfulness.' : r === 'denied' ? 'Permission was declined. You can allow it in Settings → Health → Data Access → Wobbi.' : 'Apple Health isn’t available on this device.')
          } catch (e: any) { setHealthMsg(e?.message ?? 'Could not connect.') }
        }} />
        {health && <button className="btn" style={{ marginTop: 10 }} onClick={async () => { const n = await syncAll(sessions); setHealthMsg(n ? `Saved ${n} past session${n === 1 ? '' : 's'} to Apple Health.` : 'Everything is already saved.') }}>Save past sessions</button>}
        {healthMsg && <p className="small" role="status">{healthMsg}</p>}
      </div> : <div className="card">
        <p style={{ marginTop: 0 }}>Apple Health sync is part of the <b>iPhone app</b>.</p>
        <p className="muted">Browsers can’t access HealthKit — only native apps can. Build the iPhone app from this project (see <code>docs/IOS.md</code>) and every breathing session is saved as Mindful Minutes.</p>
      </div>)}
    </>
  )

  return (
    <>
      {showNews && <WhatsNew releases={RELEASES.slice(0, 1)} onClose={() => setShowNews(false)} />}
      <div className="topbar">
        <span className="glass round"><Emoji name="gear" size={28} /></span>
        <span className="title">More</span>
        <span className="glass pill-btn">{name ? `Hi, ${name}` : 'Hi there'}</span>
      </div>

      <div className="list">
        <Row icon={<Emoji name="sparkles" size={30} />} color="var(--card2)" label="Wobbi Pro" value={pro ? 'Active' : 'Upgrade'} onClick={() => openPaywall()} />
        {mode === 'cloud' && <Row icon={<Emoji name="sunglasses" size={30} />} color="var(--card2)" label="Account" value={name} onClick={() => setView('account')} />}
        {mode !== 'cloud' && cloudAvailable && <Row icon={<Emoji name="cloud" size={30} />} color="var(--card2)" label="Sync across devices" value="Off" onClick={() => openLogin()} />}
        <Row icon={<Emoji name="star" size={30} />} color="var(--card2)" label="Coins & shop" value={String(coins)} onClick={() => setView('coins')} />
        <Row icon={<Emoji name="trophy" size={30} />} color="var(--card2)" label="Achievements" value={`${achievements.filter(a => a.unlocked).length}`} onClick={() => setView('achievements')} />
        <Row icon={<Emoji name="notebook" size={30} />} color="var(--card2)" label="Journal" value={journal.length ? String(journal.length) : ''} onClick={() => setView('journal')} />
        <Row icon={<Emoji name="target" size={30} />} color="var(--card2)" label="Daily anchors" value={activeAnchors(anchors).length ? `${activeAnchors(anchors).length}/5` : ''} onClick={() => setView('anchors')} />
        <Row icon={<Emoji name="shield" size={30} />} color="var(--card2)" label="Focus guard" value={loadGuard().enabled ? 'On' : 'Off'} onClick={() => setView('guard')} />
        <Row icon={<Emoji name="worry" size={30} />} color="var(--card2)" label="Worry time" value={worryStats(worries).open ? `${worryStats(worries).open} parked` : ''} onClick={onWorry} />
        <Row icon={<Emoji name="robot" size={30} />} color="var(--card2)" label="AI helper" value={aiEnabled() ? 'On' : 'Off'} onClick={() => setView('ai')} />
        <Row icon={<Emoji name="photo" size={30} />} color="var(--card2)" label="Photo Gallery" onClick={() => setView('gallery')} />
        <Row icon={<Emoji name="bell" size={30} />} color="var(--card2)" label="Reminders" value={isNative() ? (rituals.some(r => r.enabled) ? `${rituals.filter(r => r.enabled).length} on` : 'Off') : rem.enabled ? fmtHour(rem.hour) : 'Off'} onClick={() => setView('reminders')} />
        <Row icon={<Emoji name="blueheart" size={30} />} color="var(--card2)" label="Get support" onClick={() => setView('support')} />
        <Row icon={<Emoji name="heartfire" size={30} />} color="var(--card2)" label="Apple Health" value={isNative() ? (healthEnabled() ? 'On' : 'Off') : 'iPhone app'} onClick={() => setView('health')} />
      </div>
      <div className="list">
        <Row icon={<Emoji name="cloud" size={30} />} color="var(--card2)" label="Storage" value={mode === 'cloud' ? 'Synced' : 'This device'} />
        <Row icon={<Emoji name="notebook" size={30} />} color="var(--card2)" label="Export data" onClick={exportJson} />
        <Row icon={<Emoji name="heartfire" size={30} />} color="var(--card2)" label="Invite a friend" onClick={async () => setInviteMsg((await inviteFriend()) === 'saved' ? 'Invite text copied.' : '')} />
        <Row icon={<Emoji name="bell" size={30} />} color="var(--card2)" label="Sounds & haptics" value={loadFx().sound || loadFx().haptics ? 'On' : 'Off'} onClick={() => setView('feedback')} />
        <Row icon={<Emoji name="sparkles" size={30} />} color="var(--card2)" label="Wobbi stickers" onClick={() => setView('stickers')} />
        <Row icon={<Emoji name="tada" size={30} />} color="var(--card2)" label="What’s new" onClick={() => setShowNews(true)} />
        <Row icon={<Emoji name="sparkles" size={30} />} color="var(--card2)" label="About & legal" onClick={() => setView('legal')} />
        {mode === 'cloud' && <Row icon={<LogOut size={24} />} color="var(--card2)" label="Sign out" onClick={doSignOut} />}
      </div>
      {inviteMsg && <p className="muted small" role="status" style={{ textAlign: 'center' }}>{inviteMsg}</p>}
      <p className="muted small" style={{ textAlign: 'center' }}><button className="linkbtn" onClick={() => { resetTips(); resetCoach(); setTipsBack(true) }} disabled={tipsBack}>{tipsBack ? 'Wobbi’s tips are back' : 'Show Wobbi’s tips again'}</button></p>
      <p className="muted small" style={{ textAlign: 'center' }}>Wobbi {APP_VERSION} · {thoughts.length} entries · {sessions.length} breathing sessions</p>
    </>
  )
}
