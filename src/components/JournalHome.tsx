import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Mic, PenLine, Plus, Search, X } from 'lucide-react'
import Face from './Face'
import CuteIcon from './CuteIcon'
import Wallet from './Wallet'
import { Screen } from './ui'
import { PalEmpty, PalTip } from './Pal'
import { useStore } from '../lib/store'
import { dayKey, shift } from '../lib/dates.ts'
import { allJournalTags, filterByTag, groupByMonth, previewOf, searchJournal, type JournalEntry } from '../lib/journal.ts'
import { dayHeading, filterByDay, infoByDay, monthGrid, shiftMonth, weekOf } from '../lib/journalCal.ts'

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthTitle = (key: string) => new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

/** One day's marker: a mood face when the day has entries, a dot for entries without a mood, a dim ghost when nothing was written. */
function Marker({ info, size = 40 }: { info?: { count: number; mood: number | null }; size?: number }) {
  if (!info) return <span className="jday-ghost" style={{ width: size, height: size }} aria-hidden="true" />
  return <span className="jday-mark" style={{ width: size, height: size }} aria-hidden="true">{info.mood ? <Face mood={info.mood} size={size} /> : <i className="jday-dot"><PenLine size={size * 0.45} /></i>}{info.count > 1 && <b>{info.count}</b>}</span>
}

/** The + button fans out into two choices: write, or talk it out. */
function FabFan({ onText, onVoice }: { onText: () => void; onVoice: () => void }) {
  const [open, setOpen] = useState(false)
  const go = (f: () => void) => { setOpen(false); f() }
  return (
    <div className={`fab-fan ${open ? 'open' : ''}`}>
      {open && <button className="fab-scrim" aria-label="Close" tabIndex={-1} onClick={() => setOpen(false)} />}
      <button className="fan-item fan-voice" aria-label="Record a voice journal" tabIndex={open ? 0 : -1} aria-hidden={!open} onClick={() => go(onVoice)}><Mic size={26} /><span>Voice</span></button>
      <button className="fan-item fan-text" aria-label="Write an entry" tabIndex={open ? 0 : -1} aria-hidden={!open} onClick={() => go(onText)}><PenLine size={26} /><span>Write</span></button>
      <button className="fab journal-fab" aria-label="New journal entry" aria-expanded={open} onClick={() => setOpen(!open)}><Plus size={34} strokeWidth={3} className="fab-plus" /></button>
    </div>
  )
}

/** Journal home: coins, month and search in the app bar, a week ribbon you can swipe or pull open into a month, then your entries. */
export default function JournalHome({ onClose, onOpen, onWrite, onVoice }: { onClose: () => void; onOpen: (e: JournalEntry) => void; onWrite: () => void; onVoice: () => void }) {
  const { journal, coins } = useStore()
  const today = dayKey(new Date())
  const [anchor, setAnchor] = useState(today)                  // any day of the week shown in the ribbon
  const [picked, setPicked] = useState<string | null>(null)    // the day the list is filtered to
  const [monthOpen, setMonthOpen] = useState(false)
  const [monthKey, setMonthKey] = useState(today.slice(0, 7))
  const [searching, setSearching] = useState(false)
  const [shop, setShop] = useState(false)               // Rewards open on top, so Back returns here
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const info = useMemo(() => infoByDay(journal), [journal])
  const shown = useMemo(() => filterByTag(filterByDay(searchJournal(journal, q), picked), tag), [journal, q, picked, tag])
  const groups = useMemo(() => groupByMonth(shown), [shown])
  const tags = useMemo(() => allJournalTags(journal), [journal])
  const week = weekOf(anchor)
  const title = monthOpen ? monthKey : (picked ?? anchor).slice(0, 7)

  const drag = useRef<number | null>(null)
  const pickDay = (d: string) => { setPicked(picked === d ? null : d); setAnchor(d); setMonthKey(d.slice(0, 7)) }
  const toggleMonth = () => { setMonthKey((picked ?? anchor).slice(0, 7)); setMonthOpen(!monthOpen) }
  const step = (by: number) => { if (monthOpen) setMonthKey(shiftMonth(monthKey, by)); else setAnchor(shift(anchor, by * 7)) }
  const closeSearch = () => { setSearching(false); setQ('') }

  return (
    <div className="overlay journal-home" role="dialog" aria-modal aria-label="Journal"><div className="inner">
      <div className="topbar jbar">
        <button className="glass round green" aria-label="Back" onClick={onClose}><ArrowLeft /></button>
        <button className="jmonth" aria-expanded={monthOpen} aria-label={`${monthTitle(title)}. ${monthOpen ? 'Hide' : 'Show'} the month`} onClick={toggleMonth}>{monthTitle(title)} <ChevronDown size={18} className={monthOpen ? 'flip' : ''} /></button>
        <button className="coin-pill glass jcoins" aria-label={`${coins} coins`} title="Coins and shop" onClick={() => setShop(true)}><CuteIcon name="coin" size={22} />{coins}</button>
        <button className="glass round" aria-label={searching ? 'Close search' : 'Search your journal'} aria-pressed={searching} onClick={() => (searching ? closeSearch() : setSearching(true))}>{searching ? <X size={22} /> : <Search size={22} />}</button>
      </div>

      {searching && <div className="searchbar jsearch"><Search size={20} /><input autoFocus aria-label="Search journal" placeholder="Search your journal" value={q} onChange={e => setQ(e.target.value)} /></div>}

      <div className="jribbon" aria-label={monthOpen ? 'Month' : 'This week'}
        onPointerDown={e => { drag.current = e.clientX }}
        onPointerUp={e => { if (drag.current !== null && Math.abs(e.clientX - drag.current) > 48) step(e.clientX < drag.current ? 1 : -1); drag.current = null }}
        onPointerCancel={() => { drag.current = null }}>
        <div className="jnav"><button aria-label={monthOpen ? 'Previous month' : 'Previous week'} onClick={() => step(-1)}><ChevronLeft size={20} /></button><button aria-label={monthOpen ? 'Next month' : 'Next week'} onClick={() => step(1)}><ChevronRight size={20} /></button></div>
        <div className="jwd" aria-hidden="true">{WD.map(w => <span key={w}>{w}</span>)}</div>
        {!monthOpen
          ? <div className="jweek" role="group" aria-label="Days">{week.map(d => (
            <button key={d} className={`jday ${d === picked ? 'picked' : ''} ${d === today ? 'today' : ''}`} aria-pressed={d === picked} aria-label={`${dayHeading(d)}${info.get(d) ? `, ${info.get(d)!.count} ${info.get(d)!.count === 1 ? 'entry' : 'entries'}` : ''}`} onClick={() => pickDay(d)}>
              <span className="jnum">{+d.slice(8)}</span><Marker info={info.get(d)} />
            </button>))}</div>
          : <div className="jmonthgrid" role="group" aria-label="Days of the month">{monthGrid(monthKey).map(({ day, inMonth }) => (
            <button key={day} className={`jday small ${day === picked ? 'picked' : ''} ${day === today ? 'today' : ''} ${inMonth ? '' : 'off'}`} aria-pressed={day === picked} aria-label={`${dayHeading(day)}${info.get(day) ? `, ${info.get(day)!.count} ${info.get(day)!.count === 1 ? 'entry' : 'entries'}` : ''}`} onClick={() => pickDay(day)}>
              <span className="jnum">{+day.slice(8)}</span><Marker info={info.get(day)} size={30} />
            </button>))}</div>}
        <button className="jgrab" aria-label={monthOpen ? 'Show only this week' : 'Show the whole month'} onClick={toggleMonth}><i /></button>
      </div>

      <PalTip id="journal" pose="think">Write anything. A line is enough. Only you can read it.</PalTip>
      {journal.length > 0 && tags.length > 0 && <div className="chips" style={{ margin: '4px 0 10px' }} role="group" aria-label="Filter by tag">
        {tags.map(t => <button key={t} className={`chip ${tag === t ? 'on' : ''}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</button>)}
      </div>}
      {picked && <div className="jpicked row spread"><b>{dayHeading(picked)}</b><button className="linkbtn" onClick={() => setPicked(null)}>Show all</button></div>}

      {journal.length === 0 && <PalEmpty pose="think">Nothing here yet. Write a few lines or just talk, it doesn’t have to be good, and nobody else will read it.</PalEmpty>}
      {journal.length > 0 && shown.length === 0 && <div className="card empty">{picked && !q && !tag ? `Nothing written on ${dayHeading(picked)}.` : 'No entries match.'}</div>}
      {groups.map(g => (
        <section key={g.key}>
          {!picked && <h2 className="sec">{monthTitle(g.key)}</h2>}
          {g.entries.map(e => {
            const d = new Date(e.createdAt), isToday = dayKey(d) === today
            return (
              <button key={e.id} className={`card jentry jcal ${isToday ? 'today' : ''}`} onClick={() => onOpen(e)} aria-label={`Journal entry: ${e.title || previewOf(e, 40) || 'untitled'}`}>
                <span className="jc-date" aria-hidden="true">
                  <b>{d.getDate()}</b><span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  {e.mood ? <Face mood={e.mood} size={34} /> : <i className="jc-dot"><PenLine size={15} /></i>}
                </span>
                <span className="jc-body">
                  <span className="jc-meta muted small">{d.toLocaleDateString(undefined, { month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })} · {d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}{e.audio && <Mic size={14} aria-label="Has a voice note" />}</span>
                  {e.title && <b className="jc-title">{e.title}</b>}
                  <span className="jc-text">{previewOf(e)}</span>
                  {e.tags.length > 0 && <span className="chips" style={{ marginTop: 6 }}>{e.tags.map(t => <span key={t} className="chip">{t}</span>)}</span>}
                </span>
              </button>
            )
          })}
        </section>
      ))}
      <div style={{ height: 110 }} aria-hidden="true" />
      <FabFan onText={onWrite} onVoice={onVoice} />
      {shop && <Screen title="Rewards" onClose={() => setShop(false)}><Wallet /></Screen>}
    </div></div>
  )
}
