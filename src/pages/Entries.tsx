import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Siren } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import MoodCard from '../components/MoodCard'
import { GuardTile, WorryTile } from '../components/HomeTiles'
import { fmtDuration } from '../lib/sleep.ts'
import { AnchorCard, AnchorsManager } from '../components/Anchors'
import { Screen, Sheet } from '../components/ui'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates'
import { monthLabel } from '../components/ui'
import EntryCard from '../components/EntryCard'
import { PalEmpty, PalTip } from '../components/Pal'

const dayNum = (iso: string) => { const d = new Date(iso); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) }

export type HomeTool = 'thoughts' | 'journal' | 'worry' | 'guard' | 'sleep' | 'progress' | 'summary' | 'coins' | 'focus'

/** Home, top to bottom: how you feel, today's anchors, the Focus-guard tile, the worry tile, Journal / Sleep / Focus, then everything logged today. */
export default function Entries({ onTool, onSos, onAllAnchors, onCompose, onWorry, onPark, onStep }: { onTool: (t: HomeTool) => void; onSos: () => void; onAllAnchors: () => void; onCompose: (mood: number) => void; onWorry: () => void; onPark: () => void; onStep: () => void }) {
  const { thoughts, deleteThought, streak, coins, sleepNights } = useStore()
  const [editAnchors, setEditAnchors] = useState(false)
  const todayKey = dayKey(new Date())
  const today = useMemo(() => thoughts.filter(t => dayKey(t.createdAt) === todayKey), [thoughts, todayKey])
  const night = sleepNights[0]?.date === todayKey ? sleepNights[0] : null
  const tools: { id: HomeTool; emoji: string; label: string; sub?: string }[] = [
    { id: 'journal', emoji: 'notebook', label: 'Journal' },
    { id: 'sleep', emoji: 'sleep', label: 'Sleep', sub: night ? fmtDuration(night.asleepMin) : undefined },
    { id: 'focus', emoji: 'rocket', label: 'Focus' },
  ]

  return (
    <>
      <div className="topbar">
        <div className={`glass streak-pill ${streak.current === 0 ? 'cold' : ''}`} title="Day streak" aria-label={`${streak.current} day streak`}>
          <Emoji name="fire" size={28} />{streak.current}
        </div>
        <span style={{ flex: 1 }} />
        <button className="glass coin-pill" aria-label={`${coins} coins`} title="Coins" onClick={() => onTool('coins')}><Emoji name="star" size={26} />{coins}</button>
        <button className="glass round sos" aria-label="Anxious right now? Get help" title="Anxious right now?" onClick={onSos}><Siren size={24} /></button>
      </div>

      <MoodCard onPick={onCompose} />
      <AnchorCard onEdit={() => setEditAnchors(true)} onAllDone={onAllAnchors} />
      <GuardTile onOpen={() => onTool('guard')} />
      <WorryTile onWorry={onWorry} onPark={onPark} onStep={onStep} />
      <div className="tools-row" role="group" aria-label="Tools">
        {tools.map(t => (
          <button key={t.id} className="card tool" onClick={() => onTool(t.id)}>
            <Emoji name={t.emoji} size={30} /><b>{t.label}</b>{t.sub && <small>{t.sub}</small>}
          </button>
        ))}
      </div>
      {today.map(t => <EntryCard key={t.id} t={t} onDelete={deleteThought} />)}
      <button className="linkbtn more-today" onClick={() => onTool('thoughts')}>All entries</button>

      {editAnchors && <Sheet onClose={() => setEditAnchors(false)}><div className="sheet-scroll"><div className="row spread"><b style={{ fontSize: 20 }}>Daily anchors</b><button className="linkbtn" onClick={() => setEditAnchors(false)}>Done</button></div><AnchorsManager /></div></Sheet>}
    </>
  )
}

/** Every thought entry, month by month, with search. */
export function AllEntries({ search = false, onClose }: { search?: boolean; onClose: () => void }) {
  const { thoughts, deleteThought } = useStore()
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
      {list.map((t, i) => {
        const gap = i > 0 ? dayNum(list[i - 1].createdAt) - dayNum(t.createdAt) - 1 : 0
        return (
          <div key={t.id}>
            {!q && gap > 0 && <div className="gap">{gap} {gap === 1 ? 'Day' : 'Days'} Missing</div>}
            <EntryCard t={t} onDelete={deleteThought} />
          </div>
        )
      })}
    </Screen>
  )
}
