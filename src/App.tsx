import { useState } from 'react'
import { Plus, ArrowLeft, Pencil } from 'lucide-react'
import { Emoji } from './lib/emoji'
import Celebrate, { type Celebration } from './components/Celebrate'
import { Sheet } from './components/ui'
import { StoreProvider, useStore } from './lib/store'
import Entries from './pages/Entries'
import Stats from './pages/Stats'
import CalendarPage from './pages/CalendarPage'
import Breathe from './pages/Breathe'
import More from './pages/More'
import Login from './pages/Login'
import NewEntry from './pages/NewEntry'
import Sos from './components/Sos'

const TABS = [
  { id: 'entries', label: 'Entries', icon: 'notebook' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'breathe', label: 'Breathe', icon: 'wind' },
  { id: 'more', label: 'More', icon: 'gear' },
] as const
type Tab = (typeof TABS)[number]['id']

function Shell() {
  const { ready, needsLogin, recovery } = useStore()
  const [tab, setTab] = useState<Tab>('entries')
  const [menu, setMenu] = useState(false)
  const [composeAt, setComposeAt] = useState<Date | null>(null)
  const [otherDay, setOtherDay] = useState(false)
  const [sos, setSos] = useState(false)
  const [moreView, setMoreView] = useState<'support' | null>(null)
  const [composeMood, setComposeMood] = useState<number | null>(null)
  const [cel, setCel] = useState<Celebration | null>(null)

  if (!ready) return <div className="center-screen muted">Loading…</div>
  if (needsLogin || recovery) return <Login />

  const start = (d: Date) => { setMenu(false); setOtherDay(false); setComposeAt(d) }
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d }

  return (
    <>
      <div className="app">
        {tab === 'entries' && <Entries onSos={() => setSos(true)} onSupport={() => { setMoreView('support'); setTab('more') }} />}
        {tab === 'stats' && <Stats />}
        {tab === 'calendar' && <CalendarPage onNewOn={d => { const n = new Date(); d.setHours(n.getHours(), n.getMinutes()); start(d) }} />}
        {tab === 'breathe' && <Breathe onSos={() => setSos(true)} />}
        {tab === 'more' && <More key={moreView ?? 'm'} initial={moreView} />}
      </div>

      <div className="dock">
        <nav className="tabbar glass" aria-label="Main">
          {TABS.map(({ id, label, icon }) => (
            <button key={id} className={`tab ${tab === id ? 'on' : ''}`} aria-current={tab === id} onClick={() => { setMoreView(null); setTab(id) }}>
              <Emoji name={icon} size={28} />{label}
            </button>
          ))}
        </nav>
        <button className="fab" aria-label="New entry" onClick={() => setMenu(true)}><Plus size={34} strokeWidth={3} /></button>
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
            <button className="sheet-item" onClick={() => { setMenu(false); setSos(true) }}><span className="ic"><Emoji name="sos" size={30} /></span>I’m anxious right now</button>
            <button className="sheet-item" onClick={() => { setMenu(false); setTab('breathe') }}><span className="ic"><Emoji name="wind" size={30} /></span>Start breathing</button>
            <div className="sheet-label">Create Entry</div>
            <button className="sheet-item" onClick={() => setOtherDay(true)}><span className="ic"><Emoji name="calendar" size={30} /></span>Other day</button>
            <button className="sheet-item" onClick={() => start(yesterday())}><span className="ic"><Emoji name="past" size={30} /></span>Yesterday</button>
            <button className="btn primary" onClick={() => start(new Date())}><Pencil size={20} style={{ display: 'inline', verticalAlign: -3 }} /> Today</button>
          </>}
        </Sheet>
      )}
      {sos && <Sos onClose={() => setSos(false)} onLog={() => { setSos(false); setComposeMood(null); setComposeAt(new Date()) }} />}
      {composeAt && <NewEntry date={composeAt} initialMood={composeMood} onSaved={() => { setComposeAt(null); setTab(t => (t === 'calendar' ? t : 'entries')); setCel({ emoji: 'party', title: 'Entry saved!', sub: 'Checking in with yourself is a skill — you just practised it.' }) }} onClose={() => { setComposeAt(null); setTab(t => (t === 'calendar' ? t : 'entries')) }} />}
      {cel && <Celebrate c={cel} onClose={() => setCel(null)} />}
    </>
  )
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>
}
