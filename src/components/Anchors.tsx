import { useState } from 'react'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { activeAnchors, ANCHOR_EMOJI, canAdd, MAX_ANCHORS, MAX_LABEL, STARTERS, type AnchorLink } from '../lib/anchors.ts'
import { haptic } from '../lib/haptics'

const LINK_LABEL: Record<AnchorLink, string> = { breathing: 'a breathing session', checkin: 'a mood entry', journal: 'a journal entry', worry: 'reviewing a worry', focus: 'a small step' }

/** Today's anchors on the home screen: big round checks, a progress bar, and a gentle all-done moment. */
export function AnchorCard({ onEdit, onAllDone }: { onEdit: () => void; onAllDone: () => void }) {
  const { anchorsToday: p, anchorStreak: st, toggleAnchor } = useStore()

  if (p.total === 0) return (
    <button className="card row anchor-empty" onClick={onEdit}>
      <Emoji name="target" size={34} />
      <span style={{ flex: 1, textAlign: 'left' }}><b>Choose your daily anchors</b>
        <span className="sub">Up to {MAX_ANCHORS} small things that make a day count</span></span>
    </button>
  )

  const tick = (id: string, done: boolean) => {
    toggleAnchor(id); haptic(done ? 8 : 18)
    if (!done && p.done + 1 === p.total) onAllDone()
  }
  return (
    <div className="card anchors" aria-label="Daily anchors">
      <div className="row spread" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: 18 }}>Daily anchors</b>
        <span className="row" style={{ gap: 10 }}>
          <span className="muted" style={{ fontWeight: 800 }} aria-label={`${p.done} of ${p.total} done`}>{p.done}/{p.total}</span>
          <button className="linkbtn" onClick={onEdit}>Edit</button>
        </span>
      </div>
      <div className="bar"><i style={{ width: `${(p.done / p.total) * 100}%` }} /></div>
      <div className="anchor-list">
        {p.items.map(({ anchor, done, auto, manual }) => (
          <button key={anchor.id} role="checkbox" aria-checked={done} aria-label={anchor.label}
            className={`anchor-item ${done ? 'done' : ''}`} disabled={auto && !manual}
            title={auto && !manual ? 'Done automatically — you did it in the app' : undefined}
            onClick={() => tick(anchor.id, manual)}>
            <span className="anchor-box">{done ? <Emoji name="check" size={26} /> : <Emoji name={anchor.emoji} size={26} />}</span>
            <span className="anchor-label">{anchor.label}</span>
            {auto && !manual && <em className="auto">auto</em>}
          </button>
        ))}
      </div>
      {st.current > 0 && <p className="muted small" style={{ margin: '12px 0 0' }}><Emoji name="fire" size={16} style={{ verticalAlign: -3 }} /> {st.current} {st.current === 1 ? 'day' : 'days'} with every anchor done</p>}
    </div>
  )
}

/** Add / reorder / remove anchors. Capped at 5 on purpose: anchors are not a todo list. */
export function AnchorsManager() {
  const { anchors, addAnchor, removeAnchor, moveAnchor } = useStore()
  const list = activeAnchors(anchors)
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState(ANCHOR_EMOJI[0])
  const [link, setLink] = useState<AnchorLink | ''>('')
  const full = !canAdd(anchors)
  const left = STARTERS.filter(s => !list.some(a => a.label.toLowerCase() === s.label.toLowerCase()))

  return (
    <div>
      <div className="card">
        <p style={{ marginTop: 0 }}>Pick up to <b>{MAX_ANCHORS}</b> small, doable things. Do them and the day counts — that’s all.</p>
        <p className="muted small" style={{ marginBottom: 0 }}>This isn’t a to-do list: it stays short on purpose, and a missed day is just a missed day.</p>
      </div>

      {list.length > 0 && <div className="card">
        <b>Your anchors <span className="muted">({list.length}/{MAX_ANCHORS})</span></b>
        <ul className="anchor-edit">
          {list.map((a, i) => (
            <li key={a.id} className="row">
              <Emoji name={a.emoji} size={28} />
              <span style={{ flex: 1, minWidth: 0 }}>{a.label}{a.link && <span className="muted small"> · ticks itself after {LINK_LABEL[a.link]}</span>}</span>
              <button className="iconbtn" aria-label={`Move ${a.label} up`} disabled={i === 0} onClick={() => moveAnchor(a.id, -1)}><ArrowUp size={18} /></button>
              <button className="iconbtn" aria-label={`Move ${a.label} down`} disabled={i === list.length - 1} onClick={() => moveAnchor(a.id, 1)}><ArrowDown size={18} /></button>
              <button className="iconbtn" aria-label={`Remove ${a.label}`} onClick={() => removeAnchor(a.id)}><X size={18} /></button>
            </li>
          ))}
        </ul>
      </div>}

      {full ? <p className="card muted" role="status">You have {MAX_ANCHORS} anchors — that’s the maximum, on purpose. Remove one to add another.</p> : <>
        <div className="card">
          <b>Ideas</b>
          <div className="chips" style={{ marginTop: 10 }}>
            {left.map(s => <button key={s.label} className="chip" onClick={() => addAnchor(s.label, s.emoji, s.link)}>{s.label}</button>)}
          </div>
        </div>
        <form className="card" onSubmit={e => { e.preventDefault(); if (addAnchor(label, emoji, link || null)) { setLabel(''); setLink('') } }}>
          <b>Your own</b>
          <label className="field" style={{ marginTop: 10 }}><span>Name</span>
            <input className="input" maxLength={MAX_LABEL} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Call a friend" /></label>
          <div className="chips" role="radiogroup" aria-label="Icon" style={{ marginBottom: 14 }}>
            {ANCHOR_EMOJI.map(n => <button type="button" key={n} role="radio" aria-checked={emoji === n} aria-label={`Icon ${n}`} className={`chip ${emoji === n ? 'on' : ''}`} onClick={() => setEmoji(n)}><Emoji name={n} size={22} /></button>)}
          </div>
          <label className="field"><span>Tick it automatically after (optional)</span>
            <select className="input" value={link} onChange={e => setLink(e.target.value as AnchorLink | '')}>
              <option value="">Nothing — I’ll tick it myself</option>
              {(Object.keys(LINK_LABEL) as AnchorLink[]).map(k => <option key={k} value={k}>{LINK_LABEL[k]}</option>)}
            </select></label>
          <button className="btn primary block" type="submit" disabled={!label.trim()}>Add anchor</button>
        </form>
      </>}
    </div>
  )
}
