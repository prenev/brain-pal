import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, X } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { activeAnchors, ANCHOR_EMOJI, canAdd, MAX_ANCHORS, MAX_LABEL, STARTERS, type AnchorLink } from '../lib/anchors.ts'

const LINK_LABEL: Record<AnchorLink, string> = { breathing: 'a breathing session', checkin: 'a mood entry', journal: 'a journal entry', worry: 'reviewing a worry', focus: 'a small step' }

/** Today's anchors on the home screen: big round checks, a progress bar, and a gentle all-done moment. */
export function AnchorCard({ onEdit, onAllDone }: { onEdit: () => void; onAllDone: () => void }) {
  const { anchorsToday: p, anchorStreak: st, toggleAnchor } = useStore()
  const [expanded, setExpanded] = useState(false)

  if (p.total === 0) return (
    <button className="card row anchor-empty" onClick={onEdit}>
      <Emoji name="target" size={34} />
      <span style={{ flex: 1, textAlign: 'left' }}><b>Choose your daily anchors</b>
        <span className="sub">Up to {MAX_ANCHORS} small things that make a day count</span></span>
    </button>
  )

  const tick = (id: string, done: boolean) => {
    toggleAnchor(id)
    if (!done && p.done + 1 === p.total) onAllDone()
  }
  const all = p.done === p.total
  const R = 15, C = 2 * Math.PI * R
  const streakLine = st.current > 0 ? `${st.current} ${st.current === 1 ? 'day' : 'days'} with every anchor done` : null
  // everything ticked: shrink to one slim line (tap to open the list again)
  if (all && !expanded) return (
    <button className="card anchors-mini" aria-label="Daily anchors, all done. Show the list" aria-expanded="false" onClick={() => setExpanded(true)}>
      <span className="ring" role="img" aria-label={`${p.done} of ${p.total} done`}>
        <svg viewBox="0 0 38 38" width="34" height="34"><circle cx="19" cy="19" r={R} /><circle className="fg" cx="19" cy="19" r={R} strokeDasharray={C} strokeDashoffset={0} /></svg>
        <i>{p.done}/{p.total}</i>
      </span>
      <span className="mini-text"><b>Anchors done</b>{streakLine && <span className="muted small">{streakLine}</span>}</span>
      <ChevronDown size={20} className="tile-go" aria-hidden="true" />
    </button>
  )
  return (
    <div className="card anchors" aria-label="Daily anchors">
      <div className="anchors-head">
        <div>
          <b>Today’s anchors</b>
          <span className="muted small">{all ? 'Every one done. That counts.' : 'Small things that make a day count'}</span>
        </div>
        <span className="ring" role="img" aria-label={`${p.done} of ${p.total} done`}>
          <svg viewBox="0 0 38 38" width="46" height="46"><circle cx="19" cy="19" r={R} /><circle className="fg" cx="19" cy="19" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - p.done / p.total)} /></svg>
          <i>{p.done}/{p.total}</i>
        </span>
      </div>
      <ul className="anchor-rows">
        {p.items.map(({ anchor, done, auto, manual }) => (
          <li key={anchor.id}>
            <button role="checkbox" aria-checked={done} aria-label={anchor.label} className={`arow ${done ? 'done' : ''}`} disabled={auto && !manual}
              title={auto && !manual ? 'Done automatically: you did it in the app' : undefined} onClick={() => tick(anchor.id, manual)}>
              <span className="tickbox">{done && <Check size={18} strokeWidth={3.4} />}</span>
              <Emoji name={anchor.emoji} size={24} /><span className="alabel">{anchor.label}</span>
              {auto && !manual && <em className="auto">auto</em>}
            </button>
          </li>
        ))}
      </ul>
      {streakLine && <p className="muted small anchors-streak"><Emoji name="fire" size={16} style={{ verticalAlign: -3 }} /> {streakLine}</p>}
      <div className="anchors-actions"><button className="linkbtn anchors-edit" onClick={onEdit}>Edit anchors</button>{all && <button className="linkbtn anchors-edit" onClick={() => setExpanded(false)}>Collapse</button>}</div>
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
