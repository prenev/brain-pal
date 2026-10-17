import { PalTip } from '../components/Pal'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates'
import { MOODS } from '../lib/mood'
import Face from '../components/Face'
import DayCards from '../components/EntryCard'
import { monthLabel } from '../components/ui'
import type { Thought } from '../lib/types'

export default function CalendarPage({ onNewOn }: { onNewOn: (d: Date) => void }) {
  const { thoughts } = useStore()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [sel, setSel] = useState<string | null>(null)
  const todayKey = dayKey(new Date())
  const isNow = dayKey(month).slice(0, 7) === todayKey.slice(0, 7)

  const byDay = useMemo(() => {
    const m = new Map<string, Thought[]>()
    thoughts.forEach(t => { const k = dayKey(t.createdAt); m.set(k, [...(m.get(k) ?? []), t]) })
    return m
  }, [thoughts])

  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7 // Monday-first
  const cells = Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - lead + 1))
  const rows = cells.slice(35).every(d => d.getMonth() !== month.getMonth()) ? 5 : 6
  const counts = MOODS.map(m => ({ ...m, n: thoughts.filter(t => t.mood === m.v && dayKey(t.createdAt).slice(0, 7) === dayKey(month).slice(0, 7)).length }))
  const total = counts.reduce((a, c) => a + c.n, 0)

  // half-donut arcs
  const R = 100, cx = 120, cy = 120
  let acc = 0
  const arcs = counts.filter(c => c.n).map(c => {
    const a0 = Math.PI * (1 + acc / total); acc += c.n; const a1 = Math.PI * (1 + acc / total)
    const p = (a: number, r: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    return <path key={c.v} d={`M${p(a0, R)} A${R},${R} 0 0 1 ${p(a1, R)} L${p(a1, 62)} A62,62 0 0 0 ${p(a0, 62)}Z`} fill={c.color} />
  })

  return (
    <>
      <div className="topbar">
        <button className="glass round green" aria-label="Previous" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></button>
        <span className="title">{monthLabel(month)}</span>
        <button className="glass round green" aria-label="Next" disabled={isNow} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></button>
      </div>

      <PalTip id="calendar" pose="wave">Tap a day to look back, or tap a + to add how you felt that day.</PalTip>
      <div className="card">
        <div className="cal">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div className="dow" key={d}>{d}</div>)}
          {cells.slice(0, rows * 7).map(d => {
            const k = dayKey(d), es = byDay.get(k) ?? [], off = d.getMonth() !== month.getMonth()
            const future = k > todayKey, moods = [...new Set(es.map(e => e.mood))]
            return (
              <button key={k} className={`cell ${off ? 'off' : ''} ${k === todayKey ? 'today' : ''}`} disabled={future}
                onClick={() => es.length ? setSel(sel === k ? null : k) : onNewOn(d)}>
                <span className={`bub ${future ? 'future' : ''}`} style={off && !es.length ? { opacity: .5 } : undefined}>
                  {moods.length === 1 && <Face mood={moods[0]} size={46} />}
                  {moods.length > 1 && <>
                    <span className="half" style={{ clipPath: 'inset(0 50% 0 0)' }}><Face mood={moods[0]} size={46} /></span>
                    <span className="half" style={{ clipPath: 'inset(0 0 0 50%)' }}><Face mood={moods[1]} size={46} /></span>
                  </>}
                  {!moods.length && !future && <Plus size={20} />}
                </span>
                {d.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {sel && byDay.get(sel)?.length ? <DayCards list={[...byDay.get(sel)!].sort((a, b) => b.createdAt.localeCompare(a.createdAt))} /> : null}

      <div className="card">
        <div className="card-head"><h3>Mood Count</h3></div>
        {total === 0 ? <p className="muted">Nothing logged this month.</p> : <svg viewBox="0 0 240 130" width="100%" role="img" aria-label="Mood count">{arcs}</svg>}
        <div className="row spread" style={{ marginTop: 8 }}>
          {counts.map(c => <div key={c.v} style={{ textAlign: 'center', flex: 1 }}><div style={{ display: 'grid', placeItems: 'center' }}><Face mood={c.v} size={34} /></div><b style={{ color: c.color }}>{c.n}</b></div>)}
        </div>
      </div>
    </>
  )
}
