import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { Check, Pencil, Plus, SkipForward, SlidersHorizontal, Trash2, Undo2 } from 'lucide-react'
import CuteIcon from './CuteIcon'
import { PalSays } from './Pal'
import { sfx } from '../lib/sound'
import { hapticSuccess } from '../lib/haptics'
import { burstAt } from '../lib/confetti'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { activeAnchors, ANCHOR_EMOJI, canAdd, MAX_ANCHORS, MAX_LABEL, STARTERS, type Anchor, type AnchorLink, type DayItem } from '../lib/anchors.ts'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'

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

export function AnchorCard({ onEdit, onAllDone }: { onEdit: () => void; onAllDone: () => void }) {
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
      <button className="ad-cta" onClick={onEdit}><SlidersHorizontal size={17} strokeWidth={2.8} /> Edit anchors</button>
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
/** One anchor in the editor: drag the handle to move it. */
function SortableAnchor({ a, onRemove }: { a: Anchor; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: a.id })
  return (
    <li ref={setNodeRef} className={`aman-tile ${isDragging ? 'dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform ? { ...transform, scaleX: isDragging ? 1.02 : 1, scaleY: isDragging ? 1.02 : 1 } : null), transition }}>
      <span className="aman-grip" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Drag to reorder ${a.label}`}><i /><i /><i /><i /><i /><i /></span>
      <span className="ablob"><Emoji name={a.emoji} size={30} /></span>
      <span className="aman-text"><b>{a.label}</b>{a.link && <small>Ticks itself after {LINK_LABEL[a.link]}</small>}</span>
      <button className="aman-del" aria-label={`Remove ${a.label}`} onClick={onRemove}><Trash2 size={18} /></button>
    </li>
  )
}

export function AnchorsManager() {
  const { anchors, addAnchor, removeAnchor, moveAnchor } = useStore()
  const list = activeAnchors(anchors)
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState(ANCHOR_EMOJI[0])
  const [link, setLink] = useState<AnchorLink | ''>('')
  const [picking, setPicking] = useState(false)
  const full = !canAdd(anchors)
  const left = STARTERS.filter(s => !list.some(a => a.label.toLowerCase() === s.label.toLowerCase()))
  const add = () => { if (addAnchor(label, emoji, link || null)) { setLabel(''); setLink(''); setPicking(false) } }
  // drag to reorder (dnd-kit): smooth sorting, neighbours glide aside; one drop = a few moveAnchor steps
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = list.findIndex(a => a.id === active.id), to = list.findIndex(a => a.id === over.id)
    for (let k = 0; k < Math.abs(to - from); k++) moveAnchor(String(active.id), to > from ? 1 : -1)
    hapticSuccess()
  }

  return (
    <div className="aman">
      <PalSays pose="wave" size={78} motion="still">
        <b>Anchors</b> are a few small things that steady your day: water, a walk, a minute of breathing. Do them and the day counts. Keep it short, this isn’t a to-do list.
      </PalSays>

      <div className="aman-slots" aria-label={`${list.length} of ${MAX_ANCHORS} anchors`}>
        <span>{list.length} of {MAX_ANCHORS}</span>
        <span className="aman-dots">{Array.from({ length: MAX_ANCHORS }, (_, i) => <i key={i} className={i < list.length ? 'on' : ''} />)}</span>
      </div>

      {list.length > 0 && <section>
        <h3 className="aman-h">Your anchors</h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={onDragEnd}>
          <SortableContext items={list.map(a => a.id)} strategy={verticalListSortingStrategy}>
            <ul className="aman-list">{list.map(a => <SortableAnchor key={a.id} a={a} onRemove={() => removeAnchor(a.id)} />)}</ul>
          </SortableContext>
        </DndContext>
      </section>}

      {full ? <p className="aman-full" role="status">That’s {MAX_ANCHORS}, the most on purpose. Remove one to add another.</p> : <>
        <section>
          <h3 className="aman-h">Add your own</h3>
          <form className="aman-compose" onSubmit={e => { e.preventDefault(); add() }}>
            <div className="aman-row">
              <button type="button" className="aman-icon" aria-label="Choose an icon" aria-expanded={picking} onClick={() => setPicking(!picking)}><Emoji name={emoji} size={30} /></button>
              <input className="aman-input" maxLength={MAX_LABEL} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Call a friend" aria-label="Anchor name" />
              <button className="aman-add" type="submit" disabled={!label.trim()} aria-label="Add anchor"><Plus size={22} strokeWidth={3} /></button>
            </div>
            {picking && <div className="aman-emojis" role="radiogroup" aria-label="Icon">
              {ANCHOR_EMOJI.map(n => <button type="button" key={n} role="radio" aria-checked={emoji === n} aria-label={`Icon ${n}`} className={emoji === n ? 'on' : ''} onClick={() => { setEmoji(n); setPicking(false) }}><Emoji name={n} size={26} /></button>)}
            </div>}
            <div className="aman-auto">
              <span>Ticks itself after</span>
              <div className="aman-chips" role="radiogroup" aria-label="Tick it automatically after">
                <button type="button" role="radio" aria-checked={link === ''} className={link === '' ? 'on' : ''} onClick={() => setLink('')}>Nothing</button>
                {(Object.keys(LINK_LABEL) as AnchorLink[]).map(k => <button type="button" key={k} role="radio" aria-checked={link === k} className={link === k ? 'on' : ''} onClick={() => setLink(k)}>{LINK_LABEL[k]}</button>)}
              </div>
            </div>
          </form>
        </section>
        {left.length > 0 && <section>
          <h3 className="aman-h">Ideas</h3>
          <div className="aman-ideas">
            {left.map(s => <button key={s.label} className="aman-idea" onClick={() => addAnchor(s.label, s.emoji, s.link)}><Emoji name={s.emoji} size={26} /><span>{s.label}</span><Plus size={18} strokeWidth={3} className="plus" /></button>)}
          </div>
        </section>}
      </>}
    </div>
  )
}
