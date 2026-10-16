import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { JournalList } from '../components/Journal'
import type { JournalEntry } from '../lib/journal.ts'
import { Emoji } from '../lib/emoji'
import DailyGoal from '../components/DailyGoal'
import TodayCard from '../components/TodayCard'
import { AnchorCard, AnchorsManager } from '../components/Anchors'
import { Sheet } from '../components/ui'
import { activeAnchors } from '../lib/anchors.ts'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates'
import { roughPatch } from '../lib/insights'
import { monthLabel } from '../components/ui'
import EntryCard from '../components/EntryCard'
import { PalEmpty } from '../components/Pal'

const dayNum = (iso: string) => { const d = new Date(iso); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) }

export type HomeView = 'today' | 'entries' | 'journal'

export default function Entries({ view, setView, onJournal, onSos, onSupport, onAllAnchors, onCompose, onWorry, onBreathe, onStep }: { view: HomeView; setView: (v: HomeView) => void; onJournal: (e?: JournalEntry) => void; onSos: () => void; onSupport: () => void; onAllAnchors: () => void; onCompose: (mood: number) => void; onWorry: () => void; onBreathe: () => void; onStep: () => void }) {
  const { thoughts, deleteThought, streak, anchors } = useStore()
  const [editAnchors, setEditAnchors] = useState(false)
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const isNow = dayKey(month).slice(0, 7) === dayKey(new Date()).slice(0, 7)
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  const todayKey = dayKey(new Date())
  const list = useMemo(() => thoughts.filter(t => {
    if (view === 'today') return dayKey(t.createdAt) === todayKey
    if (q) return [t.thought, t.situation, t.alternateThought, t.tags.join(' '), t.emotions.map(e => e.name).join(' ')].join(' ').toLowerCase().includes(q.toLowerCase())
    const d = new Date(t.createdAt)
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
  }), [thoughts, month, q, view, todayKey])

  return (
    <>
      <div className="topbar">
        <div className={`glass streak-pill ${streak.current === 0 ? 'cold' : ''}`} title="Day streak" aria-label={`${streak.current} day streak`}>
          <Emoji name="fire" size={28} />{streak.current}
        </div>
        <span className="title">Home</span>
        {view === 'entries'
          ? <button className="glass round green" aria-label="Search" onClick={() => { setSearching(!searching); setQ('') }}><Search size={24} /></button>
          : <span className="round" aria-hidden="true" />}
      </div>
      <div className="seg three home-seg" role="group" aria-label="Home sections">
        {([['today', 'Today'], ['entries', 'Entries'], ['journal', 'Journal']] as const).map(([id, label]) =>
          <button key={id} className={view === id ? 'on' : ''} aria-pressed={view === id} onClick={() => { setView(id); setSearching(false); setQ('') }}>{label}</button>)}
      </div>

      {view === 'today' && <>
        {!streak.activeToday && streak.current > 0 && new Date().getHours() >= 17 && (
          <div className="card row" style={{ background: 'rgba(255,166,61,.12)', borderColor: 'rgba(255,166,61,.55)' }}>
            <Emoji name="fire" size={32} /><span>Your {streak.current}-day streak ends tonight — log a mood or a breathing session to keep it.</span>
          </div>
        )}
        <TodayCard onDetails={onCompose} onWorry={onWorry} onBreathe={onBreathe} onStep={onStep} />
        {activeAnchors(anchors).length === 0 && <DailyGoal />}
        <AnchorCard onEdit={() => setEditAnchors(true)} onAllDone={onAllAnchors} />
        <button className="sos-card" onClick={onSos}>
          <Emoji name="sos" size={34} />
          <span style={{ flex: 1 }}><b>Anxious right now?</b><span className="sub">Calm your body in under 3 minutes</span></span>
        </button>
        {roughPatch(thoughts) && (
          <button className="card row" style={{ width: '100%', textAlign: 'left', background: 'rgba(74,168,255,.12)', borderColor: 'rgba(74,168,255,.5)' }} onClick={onSupport}>
            <Emoji name="blueheart" size={30} /><span style={{ flex: 1 }}>It’s been a rough patch lately. You don’t have to handle it alone — tap for support options.</span>
          </button>
        )}
        {list.map(t => <EntryCard key={t.id} t={t} onDelete={deleteThought} />)}
      </>}

      {view === 'entries' && <>
        <div className="navmonth month-row">
          <button className="arrow" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={20} /></button>
          <span className="title">{monthLabel(month)}</span>
          <button className="arrow" aria-label="Next month" disabled={isNow} onClick={() => shift(1)}><ChevronRight size={20} /></button>
        </div>
        {searching && <div className="searchbar"><Search size={20} /><input autoFocus placeholder="Search entries, emotions, tags" value={q} onChange={e => setQ(e.target.value)} /></div>}
        {list.length === 0 && <PalEmpty pose={q ? 'think' : 'sleepy'}>{q ? 'No entries match.' : 'No entries this month. Tap + to log how you feel.'}</PalEmpty>}
        {list.map((t, i) => {
          const gap = i > 0 ? dayNum(list[i - 1].createdAt) - dayNum(t.createdAt) - 1 : 0
          return (
            <div key={t.id}>
              {!q && gap > 0 && <div className="gap">{gap} {gap === 1 ? 'Day' : 'Days'} Missing</div>}
              <EntryCard t={t} onDelete={deleteThought} />
            </div>
          )
        })}
      </>}

      {view === 'journal' && <JournalList onOpen={e => onJournal(e)} onWrite={() => onJournal()} />}

      {editAnchors && <Sheet onClose={() => setEditAnchors(false)}><div className="sheet-scroll"><div className="row spread"><b style={{ fontSize: 20 }}>Daily anchors</b><button className="linkbtn" onClick={() => setEditAnchors(false)}>Done</button></div><AnchorsManager /></div></Sheet>}
    </>
  )
}
