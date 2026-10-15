import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Flame, Search } from 'lucide-react'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates'
import { monthLabel } from '../components/ui'
import EntryCard from '../components/EntryCard'

const dayNum = (iso: string) => { const d = new Date(iso); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) }

export default function Entries() {
  const { thoughts, deleteThought, streak } = useStore()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const isNow = dayKey(month).slice(0, 7) === dayKey(new Date()).slice(0, 7)
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  const list = useMemo(() => thoughts.filter(t => {
    if (q) return [t.thought, t.situation, t.alternateThought, t.tags.join(' '), t.emotions.map(e => e.name).join(' ')].join(' ').toLowerCase().includes(q.toLowerCase())
    const d = new Date(t.createdAt)
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
  }), [thoughts, month, q])

  return (
    <>
      <div className="topbar">
        <div className="glass round green" title="Streak" style={{ color: streak.activeToday ? '#ffb340' : 'var(--accent)' }}>
          <Flame size={26} />{!streak.activeToday && <i className="dot-badge" />}
        </div>
        <div className="navmonth">
          <button className="arrow" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={20} /></button>
          <span className="title">{monthLabel(month)}</span>
          <button className="arrow" aria-label="Next month" disabled={isNow} onClick={() => shift(1)}><ChevronRight size={20} /></button>
        </div>
        <button className="glass round green" aria-label="Search" onClick={() => { setSearching(!searching); setQ('') }}><Search size={24} /></button>
      </div>

      {searching && <div className="searchbar"><Search size={20} /><input autoFocus placeholder="Search entries, emotions, tags" value={q} onChange={e => setQ(e.target.value)} /></div>}

      {list.length === 0 && <div className="card empty">{q ? 'No entries match.' : 'No entries this month. Tap + to log how you feel.'}</div>}
      {list.map((t, i) => {
        const gap = i > 0 ? dayNum(list[i - 1].createdAt) - dayNum(t.createdAt) - 1 : 0
        return (
          <div key={t.id}>
            {!q && gap > 0 && <div className="gap">{gap} {gap === 1 ? 'Day' : 'Days'} Missing</div>}
            <EntryCard t={t} onDelete={deleteThought} />
          </div>
        )
      })}
    </>
  )
}
