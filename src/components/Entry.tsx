import { useState } from 'react'
import { fmtDate, fmtTime } from '../lib/dates'
import type { Thought } from '../lib/types'

export default function Entry({ t, onDelete }: { t: Thought; onDelete?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const peak = Math.max(0, ...t.emotions.map(e => e.intensity))
  return (
    <div className="glass entry">
      <button style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="muted small">{fmtDate(t.createdAt)} · {fmtTime(t.createdAt)}</div>
        <div className="t">{t.thought}</div>
        <div className="chips">
          {t.emotions.map(e => <span key={e.name} className="chip static">{e.name} {e.intensity}%</span>)}
          {t.tags.map(g => <span key={g} className="chip static" style={{ opacity: .7 }}>#{g}</span>)}
        </div>
        {t.alternateThought && <div className="alt">💡 {t.alternateThought}
          {t.outcomeIntensity !== null && <div className="small muted">Feeling {peak}% → {t.outcomeIntensity}%</div>}</div>}
      </button>
      {open && <>
        {t.situation && <div className="kv"><b>Situation</b>{t.situation}</div>}
        {t.internalBehaviour && <div className="kv"><b>Internal</b>{t.internalBehaviour}</div>}
        {t.externalBehaviour && <div className="kv"><b>External</b>{t.externalBehaviour}</div>}
        {t.photos.length > 0 && <div className="photos">{t.photos.map((p, i) => <img key={i} src={p} alt="" />)}</div>}
        {onDelete && <button className="btn danger" style={{ marginTop: 12 }} onClick={() => confirm('Delete this entry?') && onDelete(t.id)}>Delete</button>}
      </>}
    </div>
  )
}
