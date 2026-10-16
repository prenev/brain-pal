import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Siren } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import TodayCard from '../components/TodayCard'
import { AnchorCard, AnchorsManager } from '../components/Anchors'
import { Screen, Sheet } from '../components/ui'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates'
import { roughPatch } from '../lib/insights'
import { worryStats } from '../lib/worries'
import { loadGuard } from '../lib/extras'
import { monthLabel } from '../components/ui'
import EntryCard from '../components/EntryCard'
import { PalEmpty, PalTip } from '../components/Pal'

const dayNum = (iso: string) => { const d = new Date(iso); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) }

export type HomeTool = 'thoughts' | 'journal' | 'worry' | 'guard' | 'sleep' | 'progress' | 'summary' | 'coins'

/** Home: today's check-in, the secondary tools, anchors and today's entries. */
export default function Entries({ onTool, onSos, onSupport, onAllAnchors, onCompose, onWorry, onBreathe, onStep }: { onTool: (t: HomeTool) => void; onSos: () => void; onSupport: () => void; onAllAnchors: () => void; onCompose: (mood: number) => void; onWorry: () => void; onBreathe: () => void; onStep: () => void }) {
  const { thoughts, deleteThought, streak, worries, coins } = useStore()
  const [editAnchors, setEditAnchors] = useState(false)
  const todayKey = dayKey(new Date())
  const today = useMemo(() => thoughts.filter(t => dayKey(t.createdAt) === todayKey), [thoughts, todayKey])
  const parked = worryStats(worries).open
  // A strip you can scroll sideways: thoughts lead, then the things that used to be buried in Stats and More.
  const tools: { id: HomeTool; emoji: string; label: string; badge?: string }[] = [
    { id: 'thoughts', emoji: 'nib', label: 'Thoughts' },
    { id: 'journal', emoji: 'notebook', label: 'Journal' },
    { id: 'worry', emoji: 'worry', label: 'Worry time', badge: parked ? String(parked) : undefined },
    { id: 'guard', emoji: 'shield', label: 'Focus guard', badge: loadGuard().enabled ? 'On' : undefined },
    { id: 'sleep', emoji: 'sleep', label: 'Sleep' },
    { id: 'progress', emoji: 'chart', label: 'Progress' },
    { id: 'summary', emoji: 'memo', label: 'Summary' },
    { id: 'coins', emoji: 'star', label: 'Coins', badge: coins ? String(coins) : undefined },
  ]

  return (
    <>
      <div className="topbar">
        <div className={`glass streak-pill ${streak.current === 0 ? 'cold' : ''}`} title="Day streak" aria-label={`${streak.current} day streak`}>
          <Emoji name="fire" size={28} />{streak.current}
        </div>
        <span className="title">Home</span>
        <button className="glass round sos" aria-label="Anxious right now? Get help" title="Anxious right now?" onClick={onSos}><Siren size={24} /></button>
      </div>

      {!streak.activeToday && streak.current > 0 && new Date().getHours() >= 17 && (
        <div className="card row" style={{ background: 'rgba(255,166,61,.12)', borderColor: 'rgba(255,166,61,.55)' }}>
          <Emoji name="fire" size={32} /><span>Your {streak.current}-day streak ends tonight — log a mood or a breathing session to keep it.</span>
        </div>
      )}
      <TodayCard onDetails={onCompose} onWorry={onWorry} onBreathe={onBreathe} onStep={onStep} />
      <div className="tools-row" role="group" aria-label="Tools">
        {tools.map(t => (
          <button key={t.id} className={`card tool ${t.id === 'thoughts' ? 'lead' : ''}`} onClick={() => onTool(t.id)}>
            <Emoji name={t.emoji} size={30} /><b>{t.label}</b>{t.badge && <i className="badge" aria-label={t.badge}>{t.badge}</i>}
          </button>
        ))}
      </div>
      <AnchorCard onEdit={() => setEditAnchors(true)} onAllDone={onAllAnchors} />
      {roughPatch(thoughts) && (
        <button className="card row" style={{ width: '100%', textAlign: 'left', background: 'rgba(74,168,255,.12)', borderColor: 'rgba(74,168,255,.5)' }} onClick={onSupport}>
          <Emoji name="blueheart" size={30} /><span style={{ flex: 1 }}>It’s been a rough patch lately. You don’t have to handle it alone — tap for support options.</span>
        </button>
      )}
      {today.slice(0, 1).map(t => <EntryCard key={t.id} t={t} onDelete={deleteThought} />)}
      {today.length > 1 && <button className="linkbtn more-today" onClick={() => onTool('thoughts')}>{today.length - 1} more today</button>}

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
    </Screen>
  )
}
