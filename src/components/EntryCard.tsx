import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import Face from './Face'
import { Emoji } from '../lib/emoji'
import { NameIcon } from '../lib/icons'
import { moodOf } from '../lib/mood'
import { fmtTime } from '../lib/dates'
import type { Thought } from '../lib/types'

export default function EntryCard({ t, onDelete }: { t: Thought; onDelete?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const m = moodOf(t.mood)
  const peak = Math.max(0, ...t.emotions.map(e => e.intensity))
  const date = new Date(t.createdAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
  return (
    <div className="card entry" onClick={() => setOpen(!open)}>
      <Face mood={t.mood} size={64} />
      <div className="body">
        <div className="row spread" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="date">{date}</div>
            <div className="mood-line"><span className="mood-name" style={{ color: m.color }}>{m.name}</span><span className="time">{fmtTime(t.createdAt)}</span></div>
          </div>
          <button className="icon-btn" aria-label="More" aria-expanded={open}><MoreHorizontal size={20} /></button>
        </div>
        {(t.emotions.length > 0 || t.tags.length > 0) && (
          <div className="etags">
            {t.emotions.map(e => <span key={e.name} className="etag"><NameIcon name={e.name} size={22} /><span style={{ color: m.color }}>{e.name}</span></span>)}
            {t.tags.map(g => <span key={g} className="etag"><NameIcon name={g} size={20} />{g}</span>)}
          </div>
        )}
        {t.thought && <p className="etext">{t.thought}</p>}
        {t.alternateThought && (
          <div className="alt"><Emoji name="bulb" size={26} /><div>{t.alternateThought}
            {t.outcomeIntensity !== null && peak > 0 && <div className="small muted">Feeling {peak}% → {t.outcomeIntensity}%</div>}</div>
          </div>
        )}
        {open && <>
          {t.situation && <div className="kv"><b>Situation</b>{t.situation}</div>}
          {t.distortions.length > 0 && <div className="kv"><b>Thinking traps</b><div className="chips">{t.distortions.map(d => <span key={d} className="chip">{d}</span>)}</div></div>}
          {t.internalBehaviour && <div className="kv"><b>Internal reaction</b>{t.internalBehaviour}</div>}
          {t.externalBehaviour && <div className="kv"><b>External behaviour</b>{t.externalBehaviour}</div>}
          {t.photos.length > 0 && <div className="photos">{t.photos.map((p, i) => <img key={i} src={p} alt="" />)}</div>}
          {onDelete && <button className="btn danger" style={{ marginTop: 14 }} onClick={e => { e.stopPropagation(); confirm('Delete this entry?') && onDelete(t.id) }}>Delete entry</button>}
        </>}
      </div>
    </div>
  )
}
