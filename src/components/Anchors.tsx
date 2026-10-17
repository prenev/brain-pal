import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, PenLine, Plus, SkipForward, Undo2, X } from 'lucide-react'
import CuteIcon from './CuteIcon'
import { sfx } from '../lib/sound'
import { hapticSuccess } from '../lib/haptics'
import { burstAt } from '../lib/confetti'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { activeAnchors, ANCHOR_EMOJI, canAdd, MAX_ANCHORS, MAX_LABEL, STARTERS, type AnchorLink, type DayItem } from '../lib/anchors.ts'

const LINK_LABEL: Record<AnchorLink, string> = { breathing: 'a breathing session', checkin: 'a mood entry', journal: 'a journal entry', worry: 'reviewing a worry', focus: 'a small step' }

/** Today's anchors on the home screen: one chunky tile each. Ticking one plays a chime, pops a little confetti and earns a coin. */
const OPEN = -156   // how far a swiped tile slides to show its actions

/** One anchor as a list tile. Swipe it left for Skip today / Edit; tap (or the check) to tick it off. */
function AnchorTile({ item, leaving = false, onTick, onSkip, onEdit }: { item: DayItem; leaving?: boolean; onTick: (e: MouseEvent<HTMLButtonElement>) => void; onSkip: () => void; onEdit: () => void }) {
  const { anchor, done, auto, manual, skipped } = item
  const [x, setX] = useState(0)
  const [drag, setDrag] = useState(false)
  const start = useRef<{ x: number; y: number; base: number } | null>(null)
  const moved = useRef(false)
  const locked = auto && !manual
  const down = (e: PointerEvent) => { start.current = { x: e.clientX, y: e.clientY, base: x }; moved.current = false }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current; if (!s) return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (!moved.current) { if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return; moved.current = true; setDrag(true); e.currentTarget.setPointerCapture(e.pointerId) }
    setX(Math.max(OPEN - 28, Math.min(0, s.base + dx)))
  }
  const up = () => { if (moved.current) setX(v => (v < OPEN / 2 ? OPEN : 0)); start.current = null; setDrag(false) }
  const click = (e: MouseEvent<HTMLButtonElement>) => {
    if (moved.current) { moved.current = false; return }      // that was a swipe, not a tap
    if (x !== 0) { setX(0); return }                            // a tap on an open tile closes it
    if (!locked) onTick(e)
  }
  return (
    <li className={`aswipe ${x !== 0 ? 'open' : ''} ${leaving ? 'leaving' : ''}`}>
      <div className="aactions" aria-hidden={x === 0}>
        <button className="askip" tabIndex={x === 0 ? -1 : 0} onClick={() => { setX(0); onSkip() }}>{skipped ? <Undo2 size={22} /> : <SkipForward size={22} />}<span>{skipped ? 'Unskip' : 'Skip'}</span></button>
        <button className="aedit" tabIndex={x === 0 ? -1 : 0} onClick={() => { setX(0); onEdit() }}><Pencil size={20} /><span>Edit</span></button>
      </div>
      <button role="checkbox" aria-checked={done} aria-label={anchor.label} className={`arow ${done || leaving ? 'done' : ''} ${skipped ? 'skipped' : ''} ${drag ? 'drag' : ''}`}
        style={{ transform: `translateX(${x}px)` }} title={locked ? 'Done automatically: you did it in the app' : undefined}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={click}>
        <span className="agrip" aria-hidden="true"><i /><i /><i /></span>
        <span className="ablob"><Emoji name={anchor.emoji} size={32} /></span>
        <span className="alabel">{anchor.label}{skipped && <small>Skipped today</small>}{locked && <small className="auto">Done in the app</small>}</span>
        {!skipped && <span className="acoin">1<CuteIcon name="coin" size={18} /></span>}
        <span className="acheck" aria-hidden="true"><Check size={26} strokeWidth={3.6} /></span>
      </button>
    </li>
  )
}

/** `onReflect`: the call to action once every anchor is done (opens the journal). */
export function AnchorCard({ onEdit, onAllDone, onReflect }: { onEdit: () => void; onAllDone: () => void; onReflect?: () => void }) {
  const { anchorsToday: p, anchorStreak: st, toggleAnchor, skipAnchor } = useStore()
  const [leaving, setLeaving] = useState<Set<string>>(new Set())   // ticked tiles sliding away

  if (p.items.length === 0) return (
    <button className="arow add" onClick={onEdit}>
      <span className="ablob"><Plus size={22} aria-hidden="true" /></span>
      <span className="alabel">Choose your daily anchors</span>
    </button>
  )

  // a ticked anchor celebrates, slides away, and is gone from the list
  const tick = (e: MouseEvent<HTMLButtonElement>, id: string, done: boolean) => {
    if (done) { toggleAnchor(id); return }
    const r = e.currentTarget.getBoundingClientRect()
    sfx('success'); hapticSuccess(); burstAt(r.left + r.width / 2, r.top + r.height / 2)
    setLeaving(l => new Set(l).add(id))
    setTimeout(() => { toggleAnchor(id); setLeaving(l => { const n = new Set(l); n.delete(id); return n }) }, 420)
    if (p.done + 1 === p.total) setTimeout(onAllDone, 450)
  }
  const shown = p.items.filter(i => (!i.done && !i.skipped) || leaving.has(i.anchor.id))
  const left = p.total - p.done
  const streakLine = st.current > 0 ? `${st.current} ${st.current === 1 ? 'day' : 'days'} with every anchor done` : null
  if (shown.length === 0) return (
    <section className="anchors anchors-done" aria-label="Daily anchors: all done">
      <span className="ad-art"><Emoji name="sunglasses" size={52} /></span>
      <b>Woohoo! Anchors done for today!</b>
      {onReflect && <button className="ad-cta" onClick={onReflect}><PenLine size={20} strokeWidth={2.6} /> Write about your day</button>}
    </section>
  )
  return (
    <section className="anchors" aria-label="Daily anchors">
      <div className="anchors-head">
        <b role="img" aria-label={`${p.done} of ${p.total} done`}>{left > 0 ? `${left} ${left === 1 ? 'anchor' : 'anchors'} left for today` : 'All anchors done today!'}</b>
        <button className="linkbtn anchors-edit" onClick={onEdit}>Edit</button>
        {streakLine && <span className="muted small anchors-streak"><Emoji name="fire" size={14} style={{ verticalAlign: -2 }} /> {streakLine}</span>}
      </div>
      {shown.length > 0 && <ul className="anchor-list">
        {shown.map(item => <AnchorTile key={item.anchor.id} leaving={leaving.has(item.anchor.id)} item={item} onTick={e => tick(e, item.anchor.id, item.manual)} onSkip={() => skipAnchor(item.anchor.id)} onEdit={onEdit} />)}
      </ul>}
    </section>
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
