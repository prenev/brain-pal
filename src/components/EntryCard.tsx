import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import Face from './Face'
import AudioPlayer from './AudioPlayer'
import { Emoji } from '../lib/emoji'
import { NameIcon } from '../lib/icons'
import { moodOf } from '../lib/mood'
import { dayKey, fmtTime } from '../lib/dates'
import { useStore } from '../lib/store'
import { AiError, aiEnabled, transcribe } from '../lib/gemini'
import type { Thought } from '../lib/types'

/** App.tsx listens for this and opens the entry flow with the entry filled in. */
export const EDIT_ENTRY = 'bp:edit-entry'
const dayNum = (iso: string) => { const d = new Date(iso); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) }

/** The ⋯ menu: a small popover with Edit and Delete. Closes on any tap outside. */
function EntryMenu({ t }: { t: Thought }) {
  const { deleteThought } = useStore()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', off); return () => document.removeEventListener('pointerdown', off)
  }, [open])
  return (
    <div className="emenu" ref={box}>
      <button className="emenu-btn" aria-label="Entry options" aria-expanded={open} onClick={() => setOpen(!open)}><MoreHorizontal size={20} /></button>
      {open && <div className="emenu-pop" role="menu">
        <button role="menuitem" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent(EDIT_ENTRY, { detail: t.id })) }}><Pencil size={17} /> Edit</button>
        <button role="menuitem" className="danger" onClick={() => { setOpen(false); if (confirm('Delete this entry?')) void deleteThought(t.id) }}><Trash2 size={17} /> Delete</button>
      </div>}
    </div>
  )
}

/** One entry inside a day card, always fully open: feelings, tags, the note, the kinder thought, voice and photos. */
function EntryItem({ t, last }: { t: Thought; last: boolean }) {
  const { setTranscript } = useStore()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const m = moodOf(t.mood)
  const peak = Math.max(0, ...t.emotions.map(e => e.intensity))
  async function runTranscribe() {
    if (!t.audio?.url) { setErr('The audio file isn’t available to transcribe.'); return }
    setBusy(true); setErr('')
    try { const text = await transcribe(await (await fetch(t.audio.url)).blob()); if (!text) setErr('No speech was detected.'); else await setTranscript(t.id, text) }
    catch (x) { setErr(x instanceof AiError ? x.message : 'Could not transcribe.') } finally { setBusy(false) }
  }
  return (
    <div className={`entry ${last ? 'last' : ''}`} aria-label={`${m.name} at ${fmtTime(t.createdAt)}`}>
      <div className="entry-rail"><Face mood={t.mood} size={52} bare /><i className="entry-line" aria-hidden="true" /></div>
      <div className="body">
        <div className="entry-head">
          <div className="mood-line"><span className="mood-name" style={{ color: m.color }}>{m.name}</span><span className="time">{fmtTime(t.createdAt)}</span></div>
          <EntryMenu t={t} />
        </div>
        {(t.emotions.length > 0 || t.tags.length > 0) && (
          <div className="etags">
            {t.emotions.map(e => <span key={e.name} className="etag"><NameIcon name={e.name} size={20} /><span>{e.name}</span></span>)}
            {t.tags.map(g => <span key={g} className="etag"><NameIcon name={g} size={18} />{g}</span>)}
          </div>
        )}
        {t.thought && <p className="etext">{t.thought}</p>}
        {t.situation && <p className="esit">{t.situation}</p>}
        {t.alternateThought && <div className="alt"><Emoji name="bulb" size={24} /><div>{t.alternateThought}
          {t.outcomeIntensity !== null && peak > 0 && <div className="small muted">Feeling {peak}% → {t.outcomeIntensity}%</div>}</div></div>}
        {t.distortions.length > 0 && <div className="chips etraps">{t.distortions.map(d => <span key={d} className="chip">{d}</span>)}</div>}
        {t.audio && <div className="evoice">
          {t.audio.url ? <AudioPlayer src={t.audio.url} durationSec={t.audio.durationSec} /> : <p className="muted small" style={{ margin: 0 }}>The audio for this memo is on another device.</p>}
          {t.audio.transcript ? <div className="etranscript">{t.audio.transcript}</div>
            : aiEnabled() && <button className="btn" style={{ marginTop: 10 }} disabled={busy} onClick={runTranscribe}>{busy ? 'Transcribing…' : 'Transcribe'}</button>}
          {err && <p role="alert" style={{ color: 'var(--danger)', margin: '8px 0 0' }}>{err}</p>}
        </div>}
        {t.photos.length > 0 && <div className="photos">{t.photos.map((p, i) => <img key={i} src={p} alt="" />)}</div>}
      </div>
    </div>
  )
}

const dayLabel = (iso: string) => {
  const d = new Date(iso), diff = dayNum(new Date().toISOString()) - dayNum(iso)
  const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return diff === 0 ? `Today, ${date}` : diff === 1 ? `Yesterday, ${date}` : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
}

/** One card per day: a header in the colour of that day's latest mood, then every entry of the day on a timeline. */
export function DayCard({ items }: { items: Thought[] }) {
  const m = moodOf(items[0].mood)
  return (
    <section className="card daycard" style={{ ['--dc' as string]: m.color }} aria-label={dayLabel(items[0].createdAt)}>
      <header className="daycard-head"><i aria-hidden="true" />{dayLabel(items[0].createdAt)}<span>{items.length > 1 ? `${items.length} entries` : ''}</span></header>
      {items.map((t, i) => <EntryItem key={t.id} t={t} last={i === items.length - 1} />)}
    </section>
  )
}

/** A list of entries (newest first) grouped into day cards; optionally with "N days missing" between them. */
export default function DayCards({ list, gaps = false }: { list: Thought[]; gaps?: boolean }) {
  const groups: Thought[][] = []
  for (const t of list) { const g = groups[groups.length - 1]; if (g && dayKey(g[0].createdAt) === dayKey(t.createdAt)) g.push(t); else groups.push([t]) }
  return <>{groups.map((g, i) => {
    const gap = gaps && i > 0 ? dayNum(groups[i - 1][0].createdAt) - dayNum(g[0].createdAt) - 1 : 0
    return <div key={g[0].id}>{gap > 0 && <div className="gap">{gap} {gap === 1 ? 'Day' : 'Days'} Missing</div>}<DayCard items={g} /></div>
  })}</>
}
