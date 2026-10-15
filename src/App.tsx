import { useEffect, useState } from 'react'
import { Plus, ArrowLeft, Pencil, ChartColumn, CalendarDays, Wind, CircleEllipsis, type LucideIcon } from 'lucide-react'
import { Emoji } from './lib/emoji'
import Celebrate, { type Celebration } from './components/Celebrate'
import { Sheet } from './components/ui'
import { StoreProvider, useStore } from './lib/store'
import { evidenceLine, levelUps, SKILLS, type SkillId } from './lib/levels.ts'
import Entries from './pages/Entries'
import Stats from './pages/Stats'
import CalendarPage from './pages/CalendarPage'
import Breathe from './pages/Breathe'
import More from './pages/More'
import Login from './pages/Login'
import NewEntry from './pages/NewEntry'
import Sos from './components/Sos'
import WorryTime from './components/WorryTime'
import ParkWorry from './components/ParkWorry'
import { JournalEditor } from './components/Journal'
import type { JournalEntry } from './lib/journal.ts'

type Tab = 'entries' | 'stats' | 'calendar' | 'breathe' | 'more'
// Line icons for the tab bar; Entries keeps the Fluent nib as the app's signature.
const TABS: { id: Tab; label: string; icon: LucideIcon | 'nib' }[] = [
  { id: 'entries', label: 'Entries', icon: 'nib' },
  { id: 'stats', label: 'Stats', icon: ChartColumn },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'breathe', label: 'Breathe', icon: Wind },
  { id: 'more', label: 'More', icon: CircleEllipsis },
]

function Shell() {
  const { ready, needsLogin, recovery, levels } = useStore()
  const [tab, setTab] = useState<Tab>('entries')
  const [menu, setMenu] = useState(false)
  const [composeAt, setComposeAt] = useState<Date | null>(null)
  const [otherDay, setOtherDay] = useState(false)
  const [sos, setSos] = useState(false)
  const [worryTime, setWorryTime] = useState(false)
  const [park, setPark] = useState(false)
  const [moreView, setMoreView] = useState<'support' | 'journal' | null>(null)
  const [composeMood, setComposeMood] = useState<number | null>(null)
  const [cel, setCel] = useState<Celebration | null>(null)
  const [journalOpen, setJournalOpen] = useState<{ entry?: JournalEntry } | null>(null)

  // Quiet level-up moment: remembers the levels you've already seen, celebrates one rise at a time, never on first run.
  useEffect(() => {
    if (!ready || needsLogin || recovery || cel) return
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
    setCel({ emoji: def.emoji, title: `${def.name} → Level ${up.to}`, sub: evidenceLine(up.skill, up.count) })
  }, [ready, needsLogin, recovery, cel, levels])

  if (!ready) return <div className="center-screen muted">Loading…</div>
  if (needsLogin || recovery) return <Login />

  const start = (d: Date) => { setMenu(false); setOtherDay(false); setComposeAt(d) }
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d }

  return (
    <>
      <div className="app">
        {tab === 'entries' && <Entries onCompose={m => { setComposeMood(m); setComposeAt(new Date()) }} onWorry={() => setWorryTime(true)} onBreathe={() => setTab('breathe')} onAllAnchors={() => setCel({ emoji: 'trophy', title: 'Every anchor done!', sub: 'You showed up for yourself today. That counts.' })} onSos={() => setSos(true)} onSupport={() => { setMoreView('support'); setTab('more') }} />}
        {tab === 'stats' && <Stats />}
        {tab === 'calendar' && <CalendarPage onNewOn={d => { const n = new Date(); d.setHours(n.getHours(), n.getMinutes()); start(d) }} />}
        {tab === 'breathe' && <Breathe onSos={() => setSos(true)} />}
        {tab === 'more' && <More key={moreView ?? 'm'} initial={moreView} onWorry={() => setWorryTime(true)} onJournal={e => setJournalOpen({ entry: e })} />}
      </div>

      <div className="dock">
        <nav className="tabbar" aria-label="Main">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`tab ${tab === id ? 'on' : ''}`} aria-current={tab === id} onClick={() => { setMoreView(null); setTab(id) }}>
              {Icon === 'nib' ? <Emoji name="nib" size={26} style={{ filter: 'drop-shadow(0 0 1.5px rgba(255,255,255,.55))' }} /> : <Icon size={24} strokeWidth={2.2} />}{label}
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
            <button className="sheet-item" onClick={() => { setMenu(false); setPark(true) }}><span className="ic"><Emoji name="worry" size={30} /></span>Park a worry</button>
            <button className="sheet-item" onClick={() => { setMenu(false); setJournalOpen({}) }}><span className="ic"><Emoji name="notebook" size={30} /></span>Write in journal</button>
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
      {journalOpen && <JournalEditor entry={journalOpen.entry} onClose={() => setJournalOpen(null)} onSaved={() => { const edited = !!journalOpen.entry; setJournalOpen(null); if (!edited) setCel({ emoji: 'notebook', title: 'Saved to your journal', sub: 'Writing it down counts — thank you for taking the time.' }) }} />}
      {park && <ParkWorry onClose={() => setPark(false)} onOpenWorryTime={() => { setPark(false); setWorryTime(true) }} />}
      {worryTime && <WorryTime onClose={() => setWorryTime(false)} />}
      {cel && <Celebrate c={cel} onClose={() => setCel(null)} />}
    </>
  )
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>
}
