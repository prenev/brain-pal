import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Plus, Trash2, X } from 'lucide-react'
import { Balloon, Jar } from '@phosphor-icons/react'
import Pal, { PalSays } from './Pal'
import NoteField from './NoteField'
import { burst } from '../lib/confetti'
import { haptic, hapticSuccess } from '../lib/haptics'
import { useStore } from '../lib/store'
import { reviewQueue, worryStats } from '../lib/worries'

/** Worry postponement with Wobbi: park worries during the day, then go through them together in one calm sitting. */
export default function WorryTime({ onClose }: { onClose: () => void }) {
  const { worries, addWorry, updateWorry, deleteWorry } = useStore()
  const [text, setText] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [queue, setQueue] = useState<string[]>([])
  const [step, setStep] = useState<'ask' | 'act'>('ask')
  const [action, setAction] = useState('')
  const [err, setErr] = useState('')
  const stats = worryStats(worries)
  const byId = useMemo(() => new Map(worries.map(w => [w.id, w])), [worries])
  const current = reviewing ? byId.get(queue[0]) : undefined
  const total = useMemo(() => queue.length, [reviewing]) // eslint-disable-line react-hooks/exhaustive-deps

  const guard = async (fn: () => Promise<void>) => { setErr(''); try { await fn() } catch { setErr('Couldn’t save that. Please try again.') } }
  const add = () => guard(async () => { const t = text.trim(); if (!t) return; await addWorry(t); setText(''); haptic(20) })
  const next = () => { setStep('ask'); setAction(''); setQueue(q => q.slice(1)) }
  const letGo = () => guard(async () => { await updateWorry(current!.id, { status: 'let-go', reviewedAt: new Date().toISOString() }); haptic(30); next() })
  const saveAction = () => guard(async () => { await updateWorry(current!.id, { status: 'actionable', action: action.trim() || null, reviewedAt: new Date().toISOString() }); hapticSuccess(); next() })
  const start = () => { setQueue(reviewQueue(worries).map(w => w.id)); setReviewing(true); setStep('ask') }
  const finished = reviewing && queue.length === 0
  const at = total - queue.length

  if (reviewing) return (
    <div className="overlay wt"><div className="inner wt-inner">
      <div className="wiz-head">
        <button className="glass round" aria-label="Close" onClick={() => setReviewing(false)}><X size={24} /></button>
        <div className="wiz-prog wt-prog" aria-label={finished ? 'All done' : `${at + 1} of ${total}`}>{Array.from({ length: total }, (_, i) => <i key={i} className={i < at || finished ? 'on' : i === at ? 'now' : ''} />)}</div>
        <span className="wt-count">{finished ? '✓' : `${at + 1}/${total}`}</span>
      </div>

      {current && step === 'ask' && <div className="wt-step" key={current.id}>
        <PalSays pose="think" size={78} motion="still">Can you do something about this one?</PalSays>
        <blockquote className="wt-quote">{current.text}</blockquote>
        <div className="wt-choices">
          <button className="wt-choice yes" onClick={() => setStep('act')}><span className="wt-ic"><Check size={22} strokeWidth={3} /></span><span><b>Yes, I can take a step</b><small>Plan one small thing, then it’s handled</small></span></button>
          <button className="wt-choice no" onClick={letGo}><span className="wt-ic"><Balloon size={24} weight="duotone" /></span><span><b>No, it’s out of my control</b><small>Let it float away</small></span></button>
        </div>
        <button className="linkbtn wt-skip" onClick={next}>Not sure yet, skip for now</button>
      </div>}

      {current && step === 'act' && <div className="wt-step" key={`${current.id}-act`}>
        <PalSays pose="cheer" size={78} motion="still">Nice. What’s one small next step?</PalSays>
        <blockquote className="wt-quote small">{current.text}</blockquote>
        <NoteField big autoFocus label="Your next step" value={action} onChange={setAction} max={140} placeholder="e.g. Email the landlord tomorrow morning" />
        <button className="b-start" onClick={saveAction}><Check size={22} strokeWidth={3} /> Save plan</button>
        <p className="b-note">Then it’s handled, and your mind can stop carrying it.</p>
      </div>}

      {finished && <div className="wt-step wt-done">
        <Pal pose="party" size={170} motion="still" />
        <h1>Worry time done</h1>
        <div className="wt-pills">
          <span><Balloon size={20} weight="duotone" /> {stats.letGo} let go</span>
          <span><Check size={18} strokeWidth={3} /> {stats.actionable} planned</span>
          {stats.open > 0 && <span><Jar size={20} weight="duotone" /> {stats.open} parked</span>}
        </div>
        <button className="b-start" onClick={() => { burst(); setReviewing(false) }}>Done</button>
      </div>}
      {err && <p role="alert" style={{ color: 'var(--danger)' }}>{err}</p>}
    </div></div>
  )

  const parked = reviewQueue(worries)
  const done = worries.filter(w => w.status !== 'open')
  return (
    <div className="overlay wt"><div className="inner">
      <div className="topbar" style={{ background: 'linear-gradient(var(--bg) 70%, transparent)' }}>
        <button className="glass round green" aria-label="Back" onClick={onClose}><ArrowLeft /></button>
        <span className="title">Worry time</span><span style={{ width: 48 }} />
      </div>

      <div className="jwobbi bwob" role="note">
        <span className="jw-pal"><Pal pose={parked.length ? 'think' : 'cheer'} size={74} motion="still" /></span>
        <span className="jw-bubble">
          <small>{parked.length ? `${parked.length} parked${stats.letGo ? ` · ${stats.letGo} let go so far` : ''}` : 'Nothing parked, nice and clear'}</small>
          <b>Park a worry here and get on with your day. Later we look at them together, calmly.</b>
        </span>
      </div>

      <form className="aman-compose wt-compose" onSubmit={e => { e.preventDefault(); void add() }}>
        <div className="aman-row">
          <span className="aman-icon wt-jar" aria-hidden="true"><Jar size={28} weight="duotone" color="#b79cff" /></span>
          <input className="aman-input" aria-label="Park a worry" maxLength={200} value={text} onChange={e => setText(e.target.value)} placeholder="What’s worrying you?" />
          <button className="aman-add" type="submit" disabled={!text.trim()} aria-label="Park it"><Plus size={22} strokeWidth={3} /></button>
        </div>
      </form>
      {err && <p role="alert" style={{ color: 'var(--danger)' }}>{err}</p>}

      {parked.length > 0 && <section>
        <h3 className="aman-h">Parked</h3>
        <ul className="aman-list">
          {parked.map(w => (
            <li className="aman-tile" key={w.id}>
              <span className="ablob"><Jar size={26} weight="duotone" color="#b79cff" /></span>
              <span className="aman-text"><b>{w.text}</b></span>
              <button className="aman-del" aria-label={`Delete worry: ${w.text}`} onClick={() => guard(() => deleteWorry(w.id))}><Trash2 size={18} /></button>
            </li>
          ))}
        </ul>
        <button className="b-start wt-start" onClick={start}>Start worry time · {parked.length}</button>
      </section>}

      {done.length > 0 && <section style={{ marginTop: 22 }}>
        <h3 className="aman-h">Looked at</h3>
        {stats.reviewed >= 3 && stats.letGoPct !== null && <div className="jwobbi bwob wt-insight" role="note">
          <span className="jw-pal"><Pal pose="love" size={56} motion="still" /></span>
          <span className="jw-bubble"><b>{stats.letGoPct}% of the worries you looked at were out of your control.</b><small>That’s a lot of energy you got back.</small></span>
        </div>}
        <ul className="aman-list">
          {done.map(w => (
            <li className="aman-tile" key={w.id}>
              <span className="ablob">{w.status === 'let-go' ? <Balloon size={26} weight="duotone" color="#7cc4ff" /> : <Check size={24} strokeWidth={3} color="#35d07f" />}</span>
              <span className="aman-text"><b>{w.text}</b>{w.action ? <small>Next step: {w.action}</small> : w.status === 'let-go' ? <small>Let go</small> : null}</span>
            </li>
          ))}
        </ul>
      </section>}
    </div></div>
  )
}
