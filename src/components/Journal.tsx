import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Bold, ChevronLeft, Eye, Heading1, Italic, List, ListOrdered, Mic, Plus, Quote, Search, Shuffle, Smile, Strikethrough, Tag, Trash2 } from 'lucide-react'
import Face from './Face'
import { PalEmpty, PalTip } from './Pal'
import Support from './Support'
import VoiceRecorder from './VoiceRecorder'
import AudioPlayer from './AudioPlayer'
import { applyFormat, parseMd, type FormatKind, type Inline } from '../lib/mdlite.ts'
import { blobUrl, deleteBlob, putBlob } from '../lib/blobstore'
import type { AudioClip } from '../lib/types'
import { MOODS } from '../lib/mood'
import { useStore } from '../lib/store'
import { looksLikeCrisis } from '../lib/gemini'
import { fmtDate } from '../lib/dates.ts'
import { allJournalTags, cleanText, filterByTag, groupByMonth, isBlank, MAX_BODY, MAX_TITLE, pickTopics, previewOf, searchJournal, wordCount, type JournalEntry } from '../lib/journal.ts'
import { clearDraft, loadDraft, saveDraft } from '../lib/extras'
import { DEFAULT_TAGS } from '../lib/constants'

const FORMATS: { kind: FormatKind; label: string; icon: typeof Bold }[] = [
  { kind: 'bold', label: 'Bold', icon: Bold }, { kind: 'italic', label: 'Italic', icon: Italic }, { kind: 'strike', label: 'Strikethrough', icon: Strikethrough },
  { kind: 'heading', label: 'Heading', icon: Heading1 }, { kind: 'bullet', label: 'Bulleted list', icon: List }, { kind: 'number', label: 'Numbered list', icon: ListOrdered }, { kind: 'quote', label: 'Quote', icon: Quote },
]

/** How far the on-screen keyboard covers the page, so the tool bar can ride just above it (iOS Safari does not move fixed bars by itself). */
function useKeyboardInset() {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return
    const f = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    f(); vv.addEventListener('resize', f); vv.addEventListener('scroll', f)
    return () => { vv.removeEventListener('resize', f); vv.removeEventListener('scroll', f) }
  }, [])
  return inset
}

const inline = (c: Inline[]): React.ReactNode[] => c.map((n, i) => n.t === 'text' ? n.v : n.t === 'b' ? <strong key={i}>{inline(n.c)}</strong> : n.t === 'i' ? <em key={i}>{inline(n.c)}</em> : <s key={i}>{inline(n.c)}</s>)
/** Rendered journal text (the same Markdown-lite the toolbar writes). Text only: nothing typed can become HTML. */
export function Rendered({ text }: { text: string }) {
  return <div className="md">{parseMd(text).map((b, i) => {
    if (b.t === 'h') return <h3 key={i}>{inline(b.c)}</h3>
    if (b.t === 'quote') return <blockquote key={i}>{inline(b.c)}</blockquote>
    if (b.t === 'hr') return <hr key={i} />
    if ('items' in b) { const li = b.items.map((it, j) => <li key={j}>{inline(it)}</li>); return b.t === 'ul' ? <ul key={i}>{li}</ul> : <ol key={i}>{li}</ol> }
    return <p key={i}>{inline(b.c)}</p>
  })}</div>
}

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
  const [topics, setTopics] = useState(() => pickTopics(4))
  const [preview, setPreview] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [clip, setClip] = useState<AudioClip | null>(null)
  const [dropAudio, setDropAudio] = useState(false)
  const [oldAudioUrl, setOldAudioUrl] = useState<string | null>(null)
  const kb = useKeyboardInset()
  const [restored] = useState(hasDraft)
  const [err, setErr] = useState('')
  const [panel, setPanel] = useState<'mood' | 'tags' | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const tagChoices = useMemo(() => [...new Set([...allJournalTags(journal), ...DEFAULT_TAGS.slice(0, 6), ...tags])].slice(0, 12), [journal, tags])
  const crisis = looksLikeCrisis(`${title} ${body}`)

  // Autosave the draft of a *new* entry (debounced); clear it when blank.
  useEffect(() => {
    if (entry) return
    const t = setTimeout(() => { isBlank(title, body) ? clearDraft() : saveDraft({ title, body, mood, tags, prompt }) }, 400)
    return () => clearTimeout(t)
  }, [entry, title, body, mood, tags, prompt])
  useEffect(() => { area.current?.focus() }, [])
  useEffect(() => { if (entry?.audio) void blobUrl(entry.audio.ref).then(setOldAudioUrl) }, [entry])
  useLayoutEffect(() => { const a = area.current; if (a) { a.style.height = 'auto'; a.style.height = `${a.scrollHeight}px` } }, [body])

  async function save() {
    const c = cleanText(title, body, tags)
    if (!c.title && !c.body && !clip) { setErr('Write a few words first — even one line counts.'); return }
    try {
      let audio = dropAudio ? null : entry?.audio ?? null
      if ((dropAudio || clip) && entry?.audio) await deleteBlob(entry.audio.ref).catch(() => {})
      if (clip) { const ref = `jaudio-${crypto.randomUUID()}`; await putBlob(ref, clip.blob); audio = { ref, durationSec: clip.durationSec, mime: clip.mime, transcript: clip.transcript } }
      if (entry) updateJournal(entry.id, { ...c, mood, audio }); else addJournal({ ...c, mood, prompt, audio })
      clearDraft(); onSaved()
    } catch { setErr('Couldn’t save the voice note. Try again, or save without it.') }
  }
  function remove() {
    if (!entry || !confirm('Delete this journal entry? This cannot be undone.')) return
    if (entry.audio) void deleteBlob(entry.audio.ref).catch(() => {})
    deleteJournal(entry.id); onClose()
  }

  const fmt = (kind: FormatKind) => {
    const a = area.current; if (!a) return
    const r = applyFormat(body, a.selectionStart, a.selectionEnd, kind)
    setBody(r.text); requestAnimationFrame(() => { a.focus(); a.setSelectionRange(r.start, r.end) })
  }
  const useTopic = (t: { id: string; text: string }) => { setBody(b => (b.trim() ? `${b.replace(/\s+$/, '')}\n\n` : '') + t.text + '\n'); setPrompt(t.id); requestAnimationFrame(() => { const a = area.current; if (a) { a.focus(); a.setSelectionRange(a.value.length, a.value.length) } }) }
  const words = wordCount(body)
  const when = new Date(entry?.createdAt ?? Date.now()).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })

  // Notes-style page: no boxes, the text is the page. Mood and tags live in a slim toolbar so they never get in the way.
  return (
    <div className="overlay notes" role="dialog" aria-modal aria-label={entry ? 'Edit journal entry' : 'New journal entry'}><div className="inner">
      <div className="notes-bar">
        <button className="notes-back" aria-label="Back" onClick={onClose}><ChevronLeft size={26} />Journal</button>
        <span className="row" style={{ gap: 4 }}>{entry && <button className="notes-back" aria-label="Delete entry" onClick={remove} style={{ color: 'var(--muted)' }}><Trash2 size={21} /></button>}<button className="notes-done" onClick={save}>Save</button></span>
      </div>
      <p className="notes-date">{when} · {words} {words === 1 ? 'word' : 'words'}</p>
      {err && <p className="notes-date" role="alert" style={{ color: 'var(--danger)' }}>{err}</p>}

      {restored && <p className="muted small" role="status" style={{ textAlign: 'center' }}>Picked up where you left off.</p>}
      {crisis && <div role="alert"><Support /></div>}

      <input className="notes-title" aria-label="Title" maxLength={MAX_TITLE} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); area.current?.focus() } }} />
      {!body.trim() && !preview && <div className="topic-row" role="group" aria-label="Topic ideas">
        {topics.map(t => <button key={t.id} type="button" className="chip" onClick={() => useTopic(t)}>{t.chip}</button>)}
        <button type="button" className="chip shuffle" aria-label="More topic ideas" onClick={() => setTopics(pickTopics(4, topics.map(t => t.id)))}><Shuffle size={14} /></button>
      </div>}
      {preview ? <div className="notes-preview" aria-label="Preview"><Rendered text={body || '*Nothing written yet.*'} /></div>
        : <textarea ref={area} className="notes-body" aria-label="Journal entry" maxLength={MAX_BODY} placeholder="Write whatever is on your mind…" value={body} onChange={e => { setBody(e.target.value); setErr('') }} />}
      {(entry?.audio && !dropAudio && !clip) && <div className="notes-voice">{oldAudioUrl ? <AudioPlayer src={oldAudioUrl} durationSec={entry.audio.durationSec} label="Voice note" /> : <p className="muted small">This voice note was recorded on another device.</p>}
        <button className="linkbtn" onClick={() => setDropAudio(true)}>Remove voice note</button></div>}

      <div className="notes-dock" style={{ ['--kb' as string]: `${kb}px` }}>
      {panel && <div className="notes-panel" role="group" aria-label={panel === 'mood' ? 'Choose a mood' : 'Choose tags'}>
        {panel === 'mood'
          ? <div className="row" style={{ justifyContent: 'space-between' }}>
              {MOODS.map(m => <button key={m.v} type="button" aria-pressed={mood === m.v} aria-label={`Mood: ${m.name}`} onClick={() => setMood(mood === m.v ? null : m.v)} style={{ opacity: mood === null || mood === m.v ? 1 : .35 }}><Face mood={m.v} size={44} /></button>)}
            </div>
          : <div className="chips">
              {tagChoices.map(t => <button key={t} type="button" className={`chip ${tags.includes(t) ? 'on' : ''}`} aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])}>{t}</button>)}
            </div>}
      </div>}
      {voiceOpen && <div className="notes-voicepanel"><VoiceRecorder clip={clip} onChange={c => { setClip(c); if (!c) setVoiceOpen(false) }} onFill={() => {}} /></div>}
      <div className="notes-row" role="toolbar" aria-label="Formatting and extras">
        {!preview && <span className="fmt-bar">
          {FORMATS.map(({ kind, label, icon: Icon }) => <button key={kind} type="button" aria-label={label} onPointerDown={e => e.preventDefault()} onClick={() => fmt(kind)}><Icon size={20} /></button>)}
          <i className="vsep" />
        </span>}
        <button aria-label="Mood" aria-expanded={panel === 'mood'} className={panel === 'mood' ? 'on' : ''} onClick={() => setPanel(panel === 'mood' ? null : 'mood')}>
          {mood ? <Face mood={mood} size={26} /> : <Smile size={22} />}
        </button>
        <button aria-label="Tags" aria-expanded={panel === 'tags'} className={panel === 'tags' ? 'on' : ''} onClick={() => setPanel(panel === 'tags' ? null : 'tags')}>
          <Tag size={21} />{tags.length > 0 && <span className="small">{tags.length}</span>}
        </button>
        <button aria-label="Voice note" aria-expanded={voiceOpen} className={voiceOpen || clip ? 'on' : ''} onClick={() => setVoiceOpen(!voiceOpen)}><Mic size={21} /></button>
        <button aria-label={preview ? 'Back to writing' : 'Preview'} aria-pressed={preview} className={preview ? 'on' : ''} onClick={() => setPreview(!preview)}><Eye size={21} /></button>
      </div>
      </div>
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
      <PalTip id="journal" pose="think">Write anything. A line is enough. Only you can read it.</PalTip>
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
              <div className="row spread"><span className="muted small">{fmtDate(e.createdAt)}</span><span className="row" style={{ gap: 8 }}>{e.audio && <Mic size={18} aria-label="Has a voice note" />}{e.mood && <Face mood={e.mood} size={26} />}</span></div>
              {e.title && <b style={{ display: 'block', marginTop: 4 }}>{e.title}</b>}
              <p style={{ margin: '4px 0 0' }}>{previewOf(e)}</p>
              {e.tags.length > 0 && <div className="chips" style={{ marginTop: 8 }}>{e.tags.map(t => <span key={t} className="chip">{t}</span>)}</div>}
            </button>
          ))}
        </section>
      ))}
      <button className="fab journal-fab" aria-label="New journal entry" onClick={onWrite}><Plus size={34} strokeWidth={3} /></button>
    </>
  )
}
