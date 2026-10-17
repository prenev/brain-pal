import { useMemo, useState } from 'react'
import { ArrowLeft, ChevronRight, Mic, PenLine, Plus, Search, X } from 'lucide-react'
import Wallet from './Wallet'
import { Screen } from './ui'
import Pal, { PalEmpty } from './Pal'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { dayKey, shift } from '../lib/dates.ts'
import { allJournalTags, filterByTag, groupByMonth, pickPrompt, previewOf, searchJournal, type JournalEntry } from '../lib/journal.ts'

const monthTitle = (key: string) => new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

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

/** Journal home: coins and search in the app bar, Wobbi with this week's count and today's prompt, then your entries. */
export default function JournalHome({ onClose, onOpen, onWrite, onVoice }: { onClose: () => void; onOpen: (e: JournalEntry) => void; onWrite: () => void; onVoice: () => void }) {
  const { journal, coins } = useStore()
  const today = dayKey(new Date())
  const [searching, setSearching] = useState(false)
  const [shop, setShop] = useState(false)               // Rewards open on top, so Back returns here
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const shown = useMemo(() => filterByTag(searchJournal(journal, q), tag), [journal, q, tag])
  const groups = useMemo(() => groupByMonth(shown), [shown])
  const tags = useMemo(() => allJournalTags(journal), [journal])
  const days = useMemo(() => new Set(journal.map(e => dayKey(e.createdAt))), [journal])
  const week = [...days].filter(d => d >= shift(today, -6)).length
  const wrote = days.has(today)
  const closeSearch = () => { setSearching(false); setQ('') }

  return (
    <div className="overlay journal-home" role="dialog" aria-modal aria-label="Journal"><div className="inner">
      <div className="topbar jbar">
        <button className="glass round green" aria-label="Back" onClick={onClose}><ArrowLeft /></button>
        <span className="title">Journal</span>
        <button className="coin-pill glass jcoins" aria-label={`${coins} coins`} title="Coins and shop" onClick={() => setShop(true)}><Emoji name="star" size={24} />{coins}</button>
        <button className="glass round" aria-label={searching ? 'Close search' : 'Search your journal'} aria-pressed={searching} onClick={() => (searching ? closeSearch() : setSearching(true))}>{searching ? <X size={22} /> : <Search size={22} />}</button>
      </div>

      {searching && <div className="searchbar jsearch"><Search size={20} /><input autoFocus aria-label="Search journal" placeholder="Search your journal" value={q} onChange={e => setQ(e.target.value)} /></div>}

      {!searching && <button className="jwobbi" onClick={onWrite} aria-label={`Write about today's prompt: ${pickPrompt(today).text}`}>
        <span className="jw-pal"><Pal pose="read" size={70} motion="still" /></span>
        <span className="jw-text">
          <small>{wrote ? 'You wrote today' : week ? `${week}/7 days this week` : 'A line is enough'}</small>
          <b>“{pickPrompt(today).text}”</b>
          <em>Write about it <ChevronRight size={15} strokeWidth={3} /></em>
        </span>
      </button>}

      {journal.length > 0 && tags.length > 0 && <div className="chips" style={{ margin: '4px 0 10px' }} role="group" aria-label="Filter by tag">
        {tags.map(t => <button key={t} className={`chip ${tag === t ? 'on' : ''}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</button>)}
      </div>}

      {journal.length === 0 && <PalEmpty pose="think">Nothing here yet. Write a few lines or just talk, it doesn’t have to be good, and nobody else will read it.</PalEmpty>}
      {journal.length > 0 && shown.length === 0 && <div className="card empty">No entries match.</div>}
      {groups.map(g => (
        <section key={g.key}>
          <h2 className="sec">{monthTitle(g.key)}</h2>
          {g.entries.map(e => {
            const d = new Date(e.createdAt), isToday = dayKey(d) === today
            return (
              <button key={e.id} className={`card jentry jcal ${isToday ? 'today' : ''}`} onClick={() => onOpen(e)} aria-label={`Journal entry: ${e.title || previewOf(e, 40) || 'untitled'}`}>
                <span className="jc-date" aria-hidden="true">
                  <b>{d.getDate()}</b><span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
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
