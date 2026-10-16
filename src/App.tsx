import { useEffect, useRef, useState } from 'react'
import { Plus, ArrowLeft, House, ChartColumn, CalendarDays, Wind, CircleEllipsis, type LucideIcon } from 'lucide-react'
import { Emoji } from './lib/emoji'
import Celebrate, { type Celebration } from './components/Celebrate'
import { Screen, Sheet } from './components/ui'
import { useNativeTabs } from './lib/nativeTabs'
import Guard, { useGuardRelock } from './components/Guard'
import { StoreProvider, useStore } from './lib/store'
import { evidenceLine, levelUps, SKILLS, type SkillId } from './lib/levels.ts'
import Entries, { AllEntries, type HomeTool } from './pages/Entries'
import Stats from './pages/Stats'
import CalendarPage from './pages/CalendarPage'
import Breathe from './pages/Breathe'
import More from './pages/More'
import Login from './pages/Login'
import NewEntry from './pages/NewEntry'
import Sos from './components/Sos'
import WorryTime from './components/WorryTime'
import ParkWorry from './components/ParkWorry'
import { JournalEditor, JournalList } from './components/Journal'
import FocusFlow from './components/FocusFlow'
import Onboarding from './components/Onboarding'
import Splash from './components/Splash'
import Coach, { coachDone } from './components/Coach'
import WhatsNew, { markSeen, seenVersion } from './components/WhatsNew'
import { unseenReleases } from './lib/whatsnew.ts'
import { APP_VERSION } from './lib/appInfo.ts'
import { PaywallProvider, usePaywallOpen } from './components/Pro'
import Sleep from './components/Sleep'
import FocusHub from './components/FocusHub'
import { PomoProvider } from './lib/pomoStore'
import Progress from './components/Progress'
import Summary from './components/Summary'
import Wallet from './components/Wallet'
import { levelCard } from './lib/share.ts'
import { installFeedback } from './lib/feedback'
import { useWidgetSync } from './lib/nativeWidgets'
import { askForReviewIfHappy, noteFirstSeen } from './lib/reviewAsk'
import type { JournalEntry } from './lib/journal.ts'

type Tab = 'entries' | 'stats' | 'calendar' | 'breathe' | 'more'
// One family of line icons for the tab bar, so every tab has the same weight and size.
const TABS: { id: Tab; label: string; icon: LucideIcon; symbol: string }[] = [   // symbol = SF Symbol for the native iPhone tab bar
  { id: 'entries', label: 'Home', icon: House, symbol: 'house' },
  { id: 'stats', label: 'Stats', icon: ChartColumn, symbol: 'chart.bar' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, symbol: 'calendar' },
  { id: 'breathe', label: 'Breathe', icon: Wind, symbol: 'wind' },
  { id: 'more', label: 'More', icon: CircleEllipsis, symbol: 'ellipsis.circle' },
]
const NATIVE_ITEMS = TABS.map(({ id, label, symbol }) => ({ id, label, symbol }))

function Shell() {
  const { ready, loginOpen, recovery, levels, coins, thoughts, sessions, worries, journal, anchors } = useStore()
  const hasData = thoughts.length + sessions.length + worries.length + journal.length + anchors.length > 0
  const [onboarded, setOnboarded] = useState(() => { try { return !!localStorage.getItem('bp.onboarded') } catch { return true } })
  const finishOnboarding = () => { try { localStorage.setItem('bp.onboarded', '1') } catch { /* ignore */ } setOnboarded(true) }
  useEffect(() => { if (ready && !onboarded && hasData) finishOnboarding() }, [ready, onboarded, hasData])   // people who already use the app never see it
  useGuardRelock()
  useWidgetSync()
  useEffect(() => installFeedback(), [])
  const [coached, setCoached] = useState(coachDone)
  const [news, setNews] = useState(() => unseenReleases(seenVersion(), APP_VERSION))
  useEffect(() => { if (seenVersion() === null) markSeen(APP_VERSION) }, [])      // fresh install: first run already explains everything
  useEffect(() => { const back = () => setCoached(false); window.addEventListener('bp:coach-reset', back); return () => window.removeEventListener('bp:coach-reset', back) }, [])
  const [coinToast, setCoinToast] = useState<{ n: number; id: number } | null>(null)
  const lastCoins = useRef<number | null>(null)
  // A quiet "+N coins" when you earn some (never on load, never when coins drop from spending).
  useEffect(() => {
    if (!ready) return
    const prev = lastCoins.current; lastCoins.current = coins
    if (prev !== null && coins > prev) { setCoinToast({ n: coins - prev, id: Date.now() + Math.random() }) }
  }, [ready, coins])
  // Its own timer: a later change in coins (spending, undoing an entry) must never cancel the hide.
  useEffect(() => { if (!coinToast) return; const t = setTimeout(() => setCoinToast(null), 2600); return () => clearTimeout(t) }, [coinToast])
  useEffect(() => { noteFirstSeen() }, [])
  const [tab, setTab] = useState<Tab>('entries')
  const [screen, setScreen] = useState<'guard' | 'journal' | 'thoughts' | 'search' | 'sleep' | 'progress' | 'summary' | 'coins' | 'focus' | null>(null)   // full-screen pages opened from Home
  const [menu, setMenu] = useState(false)
  const [composeAt, setComposeAt] = useState<Date | null>(null)
  const [otherDay, setOtherDay] = useState(false)
  const [sos, setSos] = useState(false)
  const [worryTime, setWorryTime] = useState(false)
  const [park, setPark] = useState(false)
  const [moreView, setMoreView] = useState<'support' | 'journal' | null>(null)
  const [composeMood, setComposeMood] = useState<number | null>(null)
  const [cel, setCel] = useState<Celebration | null>(null)
  const [focusOpen, setFocusOpen] = useState(false)
  const [journalOpen, setJournalOpen] = useState<{ entry?: JournalEntry } | null>(null)

  // A tapped reminder (iPhone app) opens the matching tool.
  useEffect(() => {
    const go = (e: Event) => {
      const route = (e as CustomEvent<string>).detail
      if (route === 'sos' || route === 'grounding') { setScreen(null); setSos(true) }   // grounding lives inside SOS (rate first, then 5-4-3-2-1)
      else if (route === 'breathe') setTab('breathe')
      else if (route === 'journal') setJournalOpen({})
      else if (route === 'checkin' || route === 'anchors') { setScreen(null); setTab('entries') }
      else if (route === 'worry') setWorryTime(true)
      else if (route === 'park') setPark(true)
      else if (route === 'guard' || route === 'sleep' || route === 'progress' || route === 'coins' || route === 'focus') { setTab('entries'); setScreen(route) }
    }
    window.addEventListener('bp:route', go); return () => window.removeEventListener('bp:route', go)
  }, [])

  // A celebration is a happy moment: the only time we may ask for a rating (rarely; see lib/review.ts).
  useEffect(() => { if (cel) askForReviewIfHappy() }, [cel])

  // Quiet level-up moment: remembers the levels you've already seen, celebrates one rise at a time, never on first run.
  useEffect(() => {
    if (!ready || loginOpen || recovery || cel) return
    let seen: Partial<Record<SkillId, number>> | null = null
    try { seen = JSON.parse(localStorage.getItem('bp.levels.seen') ?? 'null') } catch { /* ignore */ }
    const save = (v: Partial<Record<SkillId, number>>) => { try { localStorage.setItem('bp.levels.seen', JSON.stringify(v)) } catch { /* ignore */ } }
    const current = Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, v.level])) as Record<SkillId, number>
    if (!seen) { save(current); return }
    const ups = levelUps(seen, levels)
    const quiet = ups.filter(u => u.to < 2)          // Level 1 is just "you started": record it, don't interrupt
    const up = ups.find(u => u.to >= 2)
    if (quiet.length || up) save({ ...seen, ...Object.fromEntries(quiet.map(u => [u.skill, u.to])), ...(up ? { [up.skill]: up.to } : {}) })
    if (!up) return
    const def = SKILLS.find(s => s.id === up.skill)!
    setCel({ emoji: def.emoji, title: `${def.name} → Level ${up.to}`, sub: evidenceLine(up.skill, up.count), card: levelCard(def.name, up.to), sound: 'levelup' })
  }, [ready, loginOpen, recovery, cel, levels])

  // iPhone app: the real UIKit tab bar. Hidden whenever a sheet / full-screen flow is open or before the app proper shows.
  const paywallOpen = usePaywallOpen()
  const [immersive, setImmersive] = useState(false)
  useEffect(() => { const f = (e: Event) => setImmersive(!!(e as CustomEvent<boolean>).detail); window.addEventListener('bp:immersive', f); return () => window.removeEventListener('bp:immersive', f) }, [])
  const overlayOpen = paywallOpen || immersive || !!screen || menu || !!composeAt || sos || worryTime || park || focusOpen || !!journalOpen || !!cel
  const nativeBar = useNativeTabs(NATIVE_ITEMS, tab, !ready || loginOpen || recovery || (!onboarded && !hasData) || overlayOpen, id => { setMoreView(null); setTab(id as Tab) })

  if (!ready) return <Splash />
  if (loginOpen || recovery) return <Login />
  if (!onboarded && !hasData) return <Onboarding onDone={finishOnboarding} />

  const start = (d: Date) => { setMenu(false); setOtherDay(false); setComposeAt(d) }
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d }

  return (
    <>
      <div className="app">
        {tab === 'entries' && <Entries onTool={(t: HomeTool) => (t === 'worry' ? setWorryTime(true) : setScreen(t))} onStep={() => setFocusOpen(true)} onCompose={m => { setComposeMood(m); setComposeAt(new Date()) }} onWorry={() => setWorryTime(true)} onPark={() => setPark(true)} onAllAnchors={() => setCel({ emoji: 'trophy', title: 'Every anchor done!', sub: 'You showed up for yourself today. That counts.' })} onSos={() => setSos(true)} />}
        {tab === 'stats' && <Stats />}
        {tab === 'calendar' && <CalendarPage onNewOn={d => { const n = new Date(); d.setHours(n.getHours(), n.getMinutes()); start(d) }} />}
        {tab === 'breathe' && <Breathe onSos={() => setSos(true)} />}
        {tab === 'more' && <More key={moreView ?? 'm'} initial={moreView} onWorry={() => setWorryTime(true)} onJournal={e => setJournalOpen({ entry: e })} />}
      </div>

      <div className="dock">
        {!nativeBar && <nav className="tabbar" aria-label="Main">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`tab ${tab === id ? 'on' : ''}`} aria-current={tab === id} onClick={() => { setMoreView(null); setTab(id) }}>
              <Icon size={24} strokeWidth={2.2} />{label}
            </button>
          ))}
        </nav>}
        {tab !== 'more' && tab !== 'breathe' && tab !== 'entries' && <button className="fab" aria-label="New entry" onClick={() => setMenu(true)}><Plus size={34} strokeWidth={3} /></button>}
      </div>

      {menu && (
        <Sheet onClose={() => { setMenu(false); setOtherDay(false) }}>
          {otherDay ? <>
            <button className="sheet-item" onClick={() => setOtherDay(false)}><span className="ic"><ArrowLeft /></span>Pick a day</button>
            <input className="input" type="date" max={new Date().toISOString().slice(0, 10)} onChange={e => {
              if (!e.target.value) return
              const [y, m, d] = e.target.value.split('-').map(Number), n = new Date()
              start(new Date(y, m - 1, d, n.getHours(), n.getMinutes()))
            }} />
          </> : <>
            <div className="sheet-label first">Write</div>
            <button className="sheet-item" onClick={() => start(new Date())}><span className="ic"><Emoji name="nib" size={30} /></span>Thought entry</button>
            <button className="sheet-item" onClick={() => { setMenu(false); setJournalOpen({}) }}><span className="ic"><Emoji name="notebook" size={30} /></span>Journal entry</button>
            <button className="sheet-item" onClick={() => { setMenu(false); setPark(true) }}><span className="ic"><Emoji name="worry" size={30} /></span>Park a worry</button>
            <div className="sheet-label">Calm &amp; focus</div>
            <button className="sheet-item" onClick={() => { setMenu(false); setTab('breathe') }}><span className="ic"><Emoji name="wind" size={30} /></span>Start breathing</button>
            <button className="sheet-item" onClick={() => { setMenu(false); setFocusOpen(true) }}><span className="ic"><Emoji name="rocket" size={30} /></span>Start a small step</button>
            <div className="sheet-label">Entry for another day</div>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => start(yesterday())}>Yesterday</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setOtherDay(true)}>Other day</button>
            </div>
          </>}
        </Sheet>
      )}
      {sos && <Sos onStep={() => setFocusOpen(true)} onClose={() => setSos(false)} onLog={() => { setSos(false); setComposeMood(null); setComposeAt(new Date()) }} />}
      {composeAt && <NewEntry date={composeAt} initialMood={composeMood} onSaved={() => { setComposeAt(null); setTab(t => (t === 'calendar' ? t : 'entries')); setCel({ emoji: 'party', title: 'Entry saved!', sub: 'Checking in with yourself is a skill — you just practised it.' }) }} onClose={() => { setComposeAt(null); setTab(t => (t === 'calendar' ? t : 'entries')) }} />}
      {screen === 'guard' && <Screen title="Focus guard" onClose={() => setScreen(null)}><Guard /></Screen>}
      {screen === 'journal' && <Screen title="Journal" onClose={() => setScreen(null)}><JournalList onOpen={e => setJournalOpen({ entry: e })} onWrite={() => setJournalOpen({})} /></Screen>}
      {(screen === 'thoughts' || screen === 'search') && <AllEntries search={screen === 'search'} onClose={() => setScreen(null)} />}
      {screen === 'focus' && <FocusHub onClose={() => setScreen(null)} />}
      {screen === 'sleep' && <Screen title="Sleep" onClose={() => setScreen(null)}><Sleep /></Screen>}
      {screen === 'progress' && <Screen title="Progress" onClose={() => setScreen(null)}><Progress /></Screen>}
      {screen === 'summary' && <Screen title="Summary" onClose={() => setScreen(null)}><Summary /></Screen>}
      {screen === 'coins' && <Screen title="Coins" onClose={() => setScreen(null)}><Wallet /></Screen>}
      {focusOpen && <FocusFlow onClose={() => setFocusOpen(false)} />}
      {journalOpen && <JournalEditor entry={journalOpen.entry} onClose={() => setJournalOpen(null)} onSaved={() => { const edited = !!journalOpen.entry; setJournalOpen(null); if (!edited) setCel({ emoji: 'notebook', title: 'Saved to your journal', sub: 'Writing it down counts — thank you for taking the time.' }) }} />}
      {park && <ParkWorry onClose={() => setPark(false)} onOpenWorryTime={() => { setPark(false); setWorryTime(true) }} />}
      {worryTime && <WorryTime onClose={() => setWorryTime(false)} />}
      {news.length > 0 && onboarded && <WhatsNew releases={news} onClose={() => { markSeen(APP_VERSION); setNews([]) }} />}
      {tab === 'entries' && !overlayOpen && !coached && news.length === 0 && <Coach onDone={() => setCoached(true)} />}
      {coinToast && <div className="coin-toast" role="status"><Emoji name="star" size={20} /> +{coinToast.n} {coinToast.n === 1 ? 'coin' : 'coins'}</div>}
      {cel && <Celebrate c={cel} onClose={() => setCel(null)} />}
    </>
  )
}

export default function App() {
  return <StoreProvider><PomoProvider><PaywallProvider><Shell /></PaywallProvider></PomoProvider></StoreProvider>
}
