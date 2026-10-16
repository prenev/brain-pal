import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { DOCS, SITE_URL, APP_NAME, type LegalDoc } from '../lib/legal.ts'
import { APP_VERSION } from '../lib/appInfo.ts'

const ORDER = ['privacy', 'terms', 'support', 'licenses'] as const

/** More → About & legal: the same documents the App Store links to, readable offline inside the app. */
export default function Legal() {
  const [open, setOpen] = useState<LegalDoc | null>(null)
  if (open) return (
    <>
      <button className="linkbtn" style={{ margin: '0 0 10px' }} onClick={() => setOpen(null)}>‹ All documents</button>
      <article className="card legal" aria-label={open.title}>
        <h2 style={{ marginTop: 0 }}>{open.title}</h2>
        <p className="muted">{open.intro}</p>
        {open.sections.map(s => (
          <section key={s.h}>
            <h3>{s.h}</h3>
            {s.p?.map((t, i) => <p key={i}>{t}</p>)}
            {s.li && <ul>{s.li.map((t, i) => <li key={i}>{t}</li>)}</ul>}
          </section>
        ))}
      </article>
    </>
  )
  return (
    <>
      <div className="card" style={{ textAlign: 'center' }}>
        <img src="icon-192.png" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
        <h3 style={{ margin: '8px 0 0' }}>{APP_NAME}</h3>
        <p className="muted" style={{ margin: 0 }}>Version {APP_VERSION}</p>
        <p className="muted small" style={{ marginBottom: 0 }}>A self-help tool, not medical care. No ads, no tracking.</p>
      </div>
      <div className="list">
        {ORDER.map(id => {
          const d = DOCS[id]()
          return <button key={id} className="li" onClick={() => setOpen(d)}>{d.title}<span className="val" />{<ChevronRight size={20} color="#636366" />}</button>
        })}
      </div>
      <p className="muted small" style={{ textAlign: 'center' }}>{SITE_URL.replace('https://', '')}</p>
    </>
  )
}
