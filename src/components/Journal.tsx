import { Keyboard } from '@capacitor/keyboard'
import { isNative } from '../lib/native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bold, ChevronLeft, Heading1, Italic, List, ListOrdered, Mic, Quote, Shuffle, Smile, Strikethrough, Tag, Trash2 } from 'lucide-react'
import Face from './Face'
import Support from './Support'
import VoiceRecorder from './VoiceRecorder'
import AudioPlayer from './AudioPlayer'
import RichBody, { type RichHandle } from './RichBody'
import { parseMd, stripMd, type FormatKind, type Inline } from '../lib/mdlite.ts'
import { blobUrl, deleteBlob, putBlob } from '../lib/blobstore'
import type { AudioClip } from '../lib/types'
import { MOODS } from '../lib/mood'
import { useStore } from '../lib/store'
import { looksLikeCrisis } from '../lib/gemini'
import { allJournalTags, cleanText, isBlank, MAX_BODY, MAX_TITLE, pickTopics, wordCount, type JournalEntry } from '../lib/journal.ts'
import { clearDraft, loadDraft, saveDraft } from '../lib/extras'
import { DEFAULT_TAGS } from '../lib/constants'

const FORMATS: { kind: FormatKind; label: string; icon: typeof Bold }[] = [
  { kind: 'bold', label: 'Bold', icon: Bold }, { kind: 'italic', label: 'Italic', icon: Italic }, { kind: 'strike', label: 'Strikethrough', icon: Strikethrough },
  { kind: 'heading', label: 'Heading', icon: Heading1 }, { kind: 'bullet', label: 'Bulleted list', icon: List }, { kind: 'number', label: 'Numbered list', icon: ListOrdered }, { kind: 'quote', label: 'Quote', icon: Quote },
]

/** How far the on-screen keyboard covers the page, so the tool pill can float just above it (the keyboard slides over the app). */
function useKeyboardInset() {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    if (isNative()) {
      const subs: { remove: () => Promise<void> }[] = []
      void Keyboard.addListener('keyboardWillShow', i => setInset(Math.round(i.keyboardHeight))).then(h => subs.push(h)).catch(() => {})
      void Keyboard.addListener('keyboardWillHide', () => setInset(0)).then(h => subs.push(h)).catch(() => {})
      return () => { for (const h of subs) void h.remove() }
    }
    const vv = window.visualViewport; if (!vv) return
    const f = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    f(); vv.addEventListener('resize', f); vv.addEventListener('scroll', f)
    return () => { vv.removeEventListener('resize', f); vv.removeEventListener('scroll', f) }
  }, [])
  return inset
}

/** Which formats are on where the cursor is, so their buttons light up (and tapping again visibly turns them off). */
function useActiveFormats(): Set<FormatKind> {
  const [on, setOn] = useState<Set<FormatKind>>(new Set())
  useEffect(() => {
    const read = () => {
      const sel = window.getSelection(), node = sel?.anchorNode ?? null
      const el = node ? (node.nodeType === 1 ? node as Element : node.parentElement) : null
      if (!el?.closest('.notes-body')) { setOn(new Set()); return }
      const q = (c: string) => { try { return document.queryCommandState(c) } catch { return false } }
      const next = new Set<FormatKind>()
      if (q('bold')) next.add('bold'); if (q('italic')) next.add('italic'); if (q('strikeThrough')) next.add('strike')
      if (el.closest('ul')) next.add('bullet'); if (el.closest('ol')) next.add('number')
      if (el.closest('h1,h2,h3')) next.add('heading'); if (el.closest('blockquote')) next.add('quote')
      setOn(cur => (cur.size === next.size && [...next].every(k => cur.has(k)) ? cur : next))
    }
    document.addEventListener('selectionchange', read); document.addEventListener('input', read)
    return () => { document.removeEventListener('selectionchange', read); document.removeEventListener('input', read) }
  }, [])
  return on
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
export function JournalEditor({ entry, initial, onClose, onSaved }: { entry?: JournalEntry; /** a voice journal that was just recorded: the words and the audio */ initial?: { body: string; clip: AudioClip }; onClose: () => void; onSaved: () => void }) {
  const { addJournal, updateJournal, deleteJournal, journal } = useStore()
  const draft = useMemo(() => (entry ? null : loadDraft()), [entry])
  const hasDraft = !!draft && !isBlank(draft.title, draft.body)
  const [title, setTitle] = useState(entry?.title ?? (hasDraft ? draft!.title : ''))
  const [body, setBody] = useState(entry?.body ?? [hasDraft ? draft!.body : '', initial?.body ?? ''].filter(b => b.trim()).join('\n\n'))
  const [mood, setMood] = useState<number | null>(entry?.mood ?? (hasDraft ? draft!.mood : null))
  const [tags, setTags] = useState<string[]>(entry?.tags ?? (hasDraft ? draft!.tags : []))
  const [prompt, setPrompt] = useState<string | null>(entry ? null : hasDraft ? draft!.prompt : null)
  const [topics, setTopics] = useState(() => pickTopics(4))
  const [voiceOpen, setVoiceOpen] = useState(!!initial)
  const [clip, setClip] = useState<AudioClip | null>(initial?.clip ?? null)
  const [dropAudio, setDropAudio] = useState(false)
  const [oldAudioUrl, setOldAudioUrl] = useState<string | null>(null)
  const kb = useKeyboardInset()
  const activeFmt = useActiveFormats()
  const [restored] = useState(hasDraft)
  const [err, setErr] = useState('')
  const [panel, setPanel] = useState<'mood' | 'tags' | null>(null)
  const area = useRef<RichHandle>(null)
  const tagChoices = useMemo(() => [...new Set([...allJournalTags(journal), ...DEFAULT_TAGS.slice(0, 6), ...tags])].slice(0, 12), [journal, tags])
  const crisis = looksLikeCrisis(`${title} ${body}`)

  // Autosave the draft of a *new* entry (debounced); clear it when blank.
  useEffect(() => {
    if (entry) return
    const t = setTimeout(() => { isBlank(title, body) ? clearDraft() : saveDraft({ title, body, mood, tags, prompt }) }, 400)
    return () => clearTimeout(t)
  }, [entry, title, body, mood, tags, prompt])
  useEffect(() => { if (entry?.audio) void blobUrl(entry.audio.ref).then(setOldAudioUrl) }, [entry])

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

  const fmt = (kind: FormatKind) => area.current?.format(kind)
  const useTopic = (t: { id: string; text: string }) => { setBody(b => (b.trim() ? `${b.replace(/\s+$/, '')}\n\n` : '') + t.text); setPrompt(t.id); requestAnimationFrame(() => area.current?.focus()) }
  const words = wordCount(stripMd(body))
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
      {!body.trim() && <div className="topic-row" role="group" aria-label="Topic ideas">
        {topics.map(t => <button key={t.id} type="button" className="chip" onClick={() => useTopic(t)}>{t.chip}</button>)}
        <button type="button" className="chip shuffle" aria-label="More topic ideas" onClick={() => setTopics(pickTopics(4, topics.map(t => t.id)))}><Shuffle size={14} /></button>
      </div>}
      <RichBody ref={area} autoFocus label="Journal entry" max={MAX_BODY} placeholder="Write whatever is on your mind…" value={body} onChange={v => { setBody(v); setErr('') }} />
      {(entry?.audio && !dropAudio && !clip) && <div className="notes-voice">{oldAudioUrl ? <AudioPlayer src={oldAudioUrl} durationSec={entry.audio.durationSec} label="Voice note" /> : <p className="muted small">This voice note was recorded on another device.</p>}
        <button className="linkbtn" onClick={() => setDropAudio(true)}>Remove voice note</button></div>}

      <div className={`notes-dock ${kb > 0 ? 'kb' : ''}`} style={{ ['--kb' as string]: `${kb}px` }}>
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
        <span className="fmt-bar">
          {FORMATS.map(({ kind, label, icon: Icon }) => <button key={kind} type="button" aria-label={label} aria-pressed={activeFmt.has(kind)} className={activeFmt.has(kind) ? 'on' : ''} onPointerDown={e => e.preventDefault()} onClick={() => { fmt(kind); document.dispatchEvent(new Event('selectionchange')) }}><Icon size={20} /></button>)}
          <i className="vsep" />
        </span>
        <button aria-label="Mood" aria-expanded={panel === 'mood'} className={panel === 'mood' ? 'on' : ''} onClick={() => setPanel(panel === 'mood' ? null : 'mood')}>
          {mood ? <Face mood={mood} size={26} /> : <Smile size={22} />}
        </button>
        <button aria-label="Tags" aria-expanded={panel === 'tags'} className={panel === 'tags' ? 'on' : ''} onClick={() => setPanel(panel === 'tags' ? null : 'tags')}>
          <Tag size={21} />{tags.length > 0 && <span className="small">{tags.length}</span>}
        </button>
        <button aria-label="Voice note" aria-expanded={voiceOpen} className={voiceOpen || clip ? 'on' : ''} onClick={() => setVoiceOpen(!voiceOpen)}><Mic size={21} /></button>
      </div>
      </div>
    </div></div>
  )
}
