import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Check, Search, Trash2 } from 'lucide-react'
import Face from './Face'
import { PalEmpty } from './Pal'
import Support from './Support'
import { Emoji } from '../lib/emoji'
import { MOODS } from '../lib/mood'
import { useStore } from '../lib/store'
import { looksLikeCrisis } from '../lib/gemini'
import { dayKey, fmtDate } from '../lib/dates.ts'
import { allJournalTags, cleanText, filterByTag, groupByMonth, isBlank, MAX_BODY, MAX_TITLE, pickPrompt, previewOf, promptText, searchJournal, wordCount, type JournalEntry } from '../lib/journal.ts'
import { clearDraft, loadDraft, saveDraft } from '../lib/extras'
import { DEFAULT_TAGS } from '../lib/constants'

/** Full-screen writing space. New entries autosave a draft so nothing is lost if you leave; existing entries edit in place. */
export function JournalEditor({ entry, onClose, onSaved }: { entry?: JournalEntry; onClose: () => void; onSaved: () => void }) {
  const { addJournal, updateJournal, deleteJournal, journal } = useStore()
  const draft = useMemo(() => (entry ? null : loadDraft()), [entry])
  const hasDraft = !!draft && !isBlank(draft.title, draft.body)
  const [title, setTitle] = useState(entry?.title ?? (hasDraft ? draft!.title : ''))
  const [body, setBody] = useState(entry?.body ?? (hasDraft ? draft!.body : ''))
  const [mood, setMood] = useState<number | null>(entry?.mood ?? (hasDraft ? draft!.mood : null))
  const [tags, setTags] = useState<string[]>(entry?.tags ?? (hasDraft ? draft!.tags : []))
  const [prompt, setPrompt] = useState<string | null>(entry ? null : hasDraft ? draft!.prompt : null)
  const [restored] = useState(hasDraft)
  const [err, setErr] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const todayPrompt = pickPrompt(dayKey(new Date()))
  const tagChoices = useMemo(() => [...new Set([...allJournalTags(journal), ...DEFAULT_TAGS.slice(0, 6), ...tags])].slice(0, 12), [journal, tags])
  const crisis = looksLikeCrisis(`${title} ${body}`)

  // Autosave the draft of a *new* entry (debounced); clear it when blank.
  useEffect(() => {
    if (entry) return
    const t = setTimeout(() => { isBlank(title, body) ? clearDraft() : saveDraft({ title, body, mood, tags, prompt }) }, 400)
    return () => clearTimeout(t)
  }, [entry, title, body, mood, tags, prompt])
  useEffect(() => { area.current?.focus() }, [])

  function save() {
    const c = cleanText(title, body, tags)
    if (!c.title && !c.body) { setErr('Write a few words first — even one line counts.'); return }
    if (entry) updateJournal(entry.id, { ...c, mood }); else addJournal({ ...c, mood, prompt })
    clearDraft(); onSaved()
  }
  function remove() {
    if (!entry || !confirm('Delete this journal entry? This cannot be undone.')) return
    deleteJournal(entry.id); onClose()
  }

  return (
    <div className="overlay" role="dialog" aria-modal aria-label={entry ? 'Edit journal entry' : 'New journal entry'}><div className="inner">
      <div className="topbar" style={{ background: 'linear-gradient(#000 70%, transparent)' }}>
        <button className="glass round" aria-label="Back" onClick={onClose}><ChevronLeft size={26} /></button>
        <span className="title">{entry ? fmtDate(entry.createdAt) : 'Journal'}</span>
        <button className="glass pill-btn" onClick={save}>
          <span className="round" style={{ width: 40, height: 40, background: 'var(--accent)', color: '#04130a' }}><Check size={22} /></span>Save
        </button>
      </div>

      {restored && <p className="muted small" role="status" style={{ textAlign: 'center' }}>Picked up where you left off.</p>}
      {crisis && <div role="alert"><Support /></div>}

      {!entry && !prompt && <button className="card prompt-card" onClick={() => setPrompt(todayPrompt.id)}>
        <Emoji name="bulb" size={26} /><span style={{ flex: 1, textAlign: 'left' }}><small className="muted">Need a place to start?</small><br />{todayPrompt.text}</span>
      </button>}
      {prompt && <div className="card prompt-card" role="note">
        <Emoji name="bulb" size={26} /><span style={{ flex: 1 }}>{promptText(prompt)}</span>
        <button className="linkbtn" onClick={() => setPrompt(null)}>Clear</button>
      </div>}

      <input className="input" aria-label="Title" maxLength={MAX_TITLE} placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 10 }} />
      <textarea ref={area} className="input journal-area" aria-label="Journal entry" maxLength={MAX_BODY} placeholder="Write whatever is on your mind…" value={body} onChange={e => { setBody(e.target.value); setErr('') }} />
      <div className="row spread muted small" style={{ margin: '6px 4px 14px' }}><span>{wordCount(body)} {wordCount(body) === 1 ? 'word' : 'words'}</span>{err && <span role="alert" style={{ color: 'var(--danger)' }}>{err}</span>}</div>

      <div className="card">
        <b>How are you feeling? <span className="muted small">(optional)</span></b>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }} role="group" aria-label="Mood">
          {MOODS.map(m => <button key={m.v} type="button" aria-pressed={mood === m.v} aria-label={`Mood: ${m.name}`} onClick={() => setMood(mood === m.v ? null : m.v)} style={{ opacity: mood === null || mood === m.v ? 1 : .35 }}><Face mood={m.v} size={46} /></button>)}
        </div>
        <b style={{ display: 'block', marginTop: 16 }}>Tags</b>
        <div className="chips" style={{ marginTop: 10 }}>
          {tagChoices.map(t => <button key={t} type="button" className={`chip ${tags.includes(t) ? 'on' : ''}`} aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])}>{t}</button>)}
        </div>
      </div>
      {entry && <button className="btn block danger" onClick={remove}><Trash2 size={18} style={{ display: 'inline', verticalAlign: -3 }} /> Delete entry</button>}
    </div></div>
  )
}

/** Browse, search and filter your journal. */
export function JournalList({ onOpen, onWrite }: { onOpen: (e: JournalEntry) => void; onWrite: () => void }) {
  const { journal } = useStore()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const shown = useMemo(() => filterByTag(searchJournal(journal, q), tag), [journal, q, tag])
  const groups = useMemo(() => groupByMonth(shown), [shown])
  const tags = useMemo(() => allJournalTags(journal), [journal])
  const monthName = (key: string) => new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <>
      <button className="btn primary block" onClick={onWrite} style={{ marginBottom: 14 }}>Write something</button>
      {journal.length > 0 && <>
        <div className="searchbar"><Search size={20} /><input aria-label="Search journal" placeholder="Search your journal" value={q} onChange={e => setQ(e.target.value)} /></div>
        {tags.length > 0 && <div className="chips" style={{ margin: '10px 0' }} role="group" aria-label="Filter by tag">
          {tags.map(t => <button key={t} className={`chip ${tag === t ? 'on' : ''}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</button>)}
        </div>}
      </>}
      {journal.length === 0 && <PalEmpty pose="think">Nothing here yet. Write a few lines — it doesn’t have to be good, and nobody else will read it.</PalEmpty>}
      {journal.length > 0 && shown.length === 0 && <div className="card empty">No entries match.</div>}
      {groups.map(g => (
        <section key={g.key}>
          <h2 className="sec">{monthName(g.key)}</h2>
          {g.entries.map(e => (
            <button key={e.id} className="card jentry" onClick={() => onOpen(e)} aria-label={`Journal entry: ${e.title || previewOf(e, 40) || 'untitled'}`}>
              <div className="row spread"><span className="muted small">{fmtDate(e.createdAt)}</span>{e.mood && <Face mood={e.mood} size={26} />}</div>
              {e.title && <b style={{ display: 'block', marginTop: 4 }}>{e.title}</b>}
              <p style={{ margin: '4px 0 0' }}>{previewOf(e)}</p>
              {e.tags.length > 0 && <div className="chips" style={{ marginTop: 8 }}>{e.tags.map(t => <span key={t} className="chip">{t}</span>)}</div>}
            </button>
          ))}
        </section>
      ))}
    </>
  )
}
