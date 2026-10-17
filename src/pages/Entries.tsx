import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Siren } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import MoodCard from '../components/MoodCard'
import { FocusCard, GroundTool, JournalCard, StepNudge, WorryTool } from '../components/HomeTiles'
import { MoonStars } from '@phosphor-icons/react'
import { fmtDuration } from '../lib/sleep.ts'
import { AnchorCard, AnchorsManager } from '../components/Anchors'
import { Screen, Sheet } from '../components/ui'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates'
import { monthLabel } from '../components/ui'
import DayCards from '../components/EntryCard'
import { PalEmpty, PalTip } from '../components/Pal'


const HOME_ENTRIES = 3

export type HomeTool = 'thoughts' | 'journal' | 'worry' | 'ground' | 'sleep' | 'progress' | 'summary' | 'coins' | 'focus'

/** Home, top to bottom: how you feel, today's anchors, the big Focus + Journal cards, then Worries / Sleep / Ground, then everything logged today. */
export default function Entries({ onTool, onSos, onAllAnchors, onCompose, onWorry, onPark, onStep }: { onTool: (t: HomeTool) => void; onSos: () => void; onAllAnchors: () => void; onCompose: (mood: number) => void; onWorry: () => void; onPark: () => void; onStep: () => void }) {
  const { thoughts, streak, coins, sleepNights } = useStore()
  const [editAnchors, setEditAnchors] = useState(false)
  const todayKey = dayKey(new Date())
  const today = useMemo(() => thoughts.filter(t => dayKey(t.createdAt) === todayKey), [thoughts, todayKey])
  const night = sleepNights[0]?.date === todayKey ? sleepNights[0] : null
  // today's entries, or (nothing today) the latest ones from any day; a few at most, then "All entries"
  const latest = useMemo(() => (today.length ? today : [...thoughts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))).slice(0, HOME_ENTRIES), [today, thoughts])

  return (
    <>
      <div className="topbar">
        <button className={`glass streak-pill ${streak.current === 0 ? 'cold' : ''}`} title="Day streak" aria-label={`${streak.current} day streak. See your progress`} onClick={() => onTool('progress')}>
          <Emoji name="fire" size={28} />{streak.current}
        </button>
        <span style={{ flex: 1 }} />
        <button className="glass coin-pill" aria-label={`${coins} coins`} title="Coins" onClick={() => onTool('coins')}><Emoji name="star" size={26} />{coins}</button>
        <button className="glass round sos" aria-label="Anxious right now? Get help" title="Anxious right now?" onClick={onSos}><Siren size={24} /></button>
      </div>

      <MoodCard onPick={onCompose} />
      <div className="home-top">
        <FocusCard onOpen={() => onTool('focus')} />
        <JournalCard onOpen={() => onTool('journal')} />
      </div>
      <AnchorCard onEdit={() => setEditAnchors(true)} onAllDone={onAllAnchors} />
      <div className="tools-row" role="group" aria-label="Tools">
        <WorryTool onWorry={onWorry} onPark={onPark} />
        <button className="card tool" onClick={() => onTool('sleep')}>
          <MoonStars className="tool-icon" size={34} weight="duotone" color="#ffc83d" aria-hidden="true" /><b>Sleep</b>{night && <small>{fmtDuration(night.asleepMin)}</small>}
        </button>
        <GroundTool onOpen={() => onTool('ground')} />
      </div>
      <StepNudge onStep={onStep} />
      {!today.length && latest.length > 0 && <div className="home-label">Latest entries</div>}
      <DayCards list={latest} />
      {thoughts.length > 0 && <button className="linkbtn more-today" onClick={() => onTool('thoughts')}>All entries{thoughts.length > latest.length ? ` (${thoughts.length})` : ''}</button>}

      {editAnchors && <Sheet onClose={() => setEditAnchors(false)}><div className="sheet-scroll"><div className="row spread"><b style={{ fontSize: 20 }}>Daily anchors</b><button className="linkbtn" onClick={() => setEditAnchors(false)}>Done</button></div><AnchorsManager /></div></Sheet>}
    </>
  )
}

/** Every thought entry, month by month, with search. */
export function AllEntries({ search = false, onClose }: { search?: boolean; onClose: () => void }) {
  const { thoughts } = useStore()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(search)
  const isNow = dayKey(month).slice(0, 7) === dayKey(new Date()).slice(0, 7)
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const list = useMemo(() => thoughts.filter(t => {
    if (q) return [t.thought, t.situation, t.alternateThought, t.tags.join(' '), t.emotions.map(e => e.name).join(' ')].join(' ').toLowerCase().includes(q.toLowerCase())
    const d = new Date(t.createdAt)
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
  }), [thoughts, month, q])

  return (
    <Screen title="Entries" onClose={onClose} right={<button className="glass round green" aria-label="Search" onClick={() => { setSearching(!searching); setQ('') }}><Search size={24} /></button>}>
      <PalTip id="thoughts" pose="think">Every thought record, month by month. Tap one to open it, or search for a word, feeling or tag.</PalTip>
      <div className="navmonth month-row">
        <button className="arrow" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={20} /></button>
        <span className="title">{monthLabel(month)}</span>
        <button className="arrow" aria-label="Next month" disabled={isNow} onClick={() => shift(1)}><ChevronRight size={20} /></button>
      </div>
      {searching && <div className="searchbar"><Search size={20} /><input autoFocus placeholder="Search entries, emotions, tags" value={q} onChange={e => setQ(e.target.value)} /></div>}
      {list.length === 0 && <PalEmpty pose={q ? 'think' : 'sleepy'}>{q ? 'No entries match.' : 'No entries this month. Tap a face on Home to log how you feel.'}</PalEmpty>}
      <DayCards list={list} gaps={!q} />
    </Screen>
  )
}
