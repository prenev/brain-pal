import { PalEmpty } from './Pal'
import { useMemo, useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import { burst } from '../lib/confetti'
import { haptic } from '../lib/haptics'
import { useStore } from '../lib/store'
import { reviewQueue, worryStats } from '../lib/worries'

/** Worry postponement: park worries during the day, then review them in one calm sitting. */
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
  const add = () => guard(async () => { const t = text.trim(); if (!t) return; await addWorry(t); setText('') })
  const next = () => { setStep('ask'); setAction(''); setQueue(q => q.slice(1)) }
  const letGo = () => guard(async () => { await updateWorry(current!.id, { status: 'let-go', reviewedAt: new Date().toISOString() }); haptic(30); next() })
  const saveAction = () => guard(async () => { await updateWorry(current!.id, { status: 'actionable', action: action.trim() || null, reviewedAt: new Date().toISOString() }); next() })
  const start = () => { setQueue(reviewQueue(worries).map(w => w.id)); setReviewing(true); setStep('ask') }
  const finished = reviewing && queue.length === 0

  if (reviewing) return (
    <div className="overlay"><div className="inner" style={{ paddingTop: 'calc(var(--safe-t) + 14px)' }}>
      <div className="row spread" style={{ marginBottom: 10 }}>
        <span className="muted" style={{ fontWeight: 800 }}>{finished ? 'All done' : `${total - queue.length + 1} of ${total}`}</span>
        <button className="glass round" aria-label="Close" onClick={() => setReviewing(false)}><X size={24} /></button>
      </div>

      {current && step === 'ask' && <>
        <h1 style={{ fontSize: 26, margin: '8px 0 16px' }}>Is this something you can do something about?</h1>
        <div className="card worry-focus"><Emoji name="worry" size={44} /><p>{current.text}</p></div>
        <button className="btn primary block" style={{ marginBottom: 10 }} onClick={() => setStep('act')}>Yes — I can take a step</button>
        <button className="btn block" style={{ marginBottom: 10 }} onClick={letGo}>No — it’s out of my control. Let it go</button>
        <button className="btn block" style={{ background: 'none', color: 'var(--muted)' }} onClick={next}>
          Not sure yet — skip
        </button>
      </>}

      {current && step === 'act' && <>
        <h1 style={{ fontSize: 26, margin: '8px 0 16px' }}>What’s one small next step?</h1>
        <div className="card worry-focus"><p>{current.text}</p></div>
        <textarea className="input" autoFocus value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. Email the landlord tomorrow morning" />
        <button className="btn primary block" style={{ marginTop: 12 }} onClick={saveAction}>Save plan</button>
        <p className="muted small" style={{ textAlign: 'center' }}>Then it’s handled — your mind can stop carrying it.</p>
      </>}

      {finished && <div className="card" style={{ textAlign: 'center', padding: 26 }}>
        <Emoji name="balloon" size={90} />
        <h1 style={{ fontSize: 28, margin: '10px 0 6px' }}>Worry time complete</h1>
        <p className="muted" style={{ margin: '0 0 16px' }}>{stats.letGo} let go · {stats.actionable} with a plan{stats.open ? ` · ${stats.open} still parked` : ''}</p>
        <button className="btn primary block" onClick={() => { burst(); setReviewing(false) }}>Done</button>
      </div>}
      {err && <p role="alert" style={{ color: 'var(--danger)' }}>{err}</p>}
    </div></div>
  )

  const parked = reviewQueue(worries)
  const done = worries.filter(w => w.status !== 'open')
  return (
    <div className="overlay"><div className="inner">
      <div className="topbar" style={{ background: 'linear-gradient(var(--bg) 70%, transparent)' }}>
        <button className="glass round green" aria-label="Back" onClick={onClose}><ArrowLeft /></button>
        <span className="title">Worry time</span><span style={{ width: 48 }} />
      </div>

      <div className="card">
        <p style={{ margin: 0 }}>Worries feel urgent in the moment. <b>Park them here</b>, get on with your day, then look at them together in one calm sitting. Most lose their grip by then.</p>
      </div>

      <form className="row" onSubmit={e => { e.preventDefault(); void add() }} style={{ marginBottom: 14 }}>
        <input className="input" aria-label="Park a worry" value={text} onChange={e => setText(e.target.value)} placeholder="What’s on your mind?" />
        <button className="btn primary" type="submit" disabled={!text.trim()}>Park</button>
      </form>
      {err && <p role="alert" style={{ color: 'var(--danger)' }}>{err}</p>}

      <h2 className="section" style={{ margin: '8px 4px' }}>Parked ({parked.length})</h2>
      {parked.length === 0 && <PalEmpty pose="cheer">Nothing parked. Nice and clear. ✨</PalEmpty>}
      {parked.map(w => (
        <div className="card row" key={w.id} style={{ padding: 14 }}>
          <Emoji name="worry" size={28} /><span style={{ flex: 1 }}>{w.text}</span>
          <button className="icon-btn" aria-label={`Delete worry: ${w.text}`} onClick={() => guard(() => deleteWorry(w.id))}><X size={18} /></button>
        </div>
      ))}
      {parked.length > 0 && <button className="btn primary block" onClick={start}>Start worry time · {parked.length}</button>}

      {done.length > 0 && <>
        <h2 className="section" style={{ margin: '22px 4px 8px' }}>Reviewed</h2>
        {stats.reviewed >= 3 && stats.letGoPct !== null && <div className="card" style={{ background: 'rgba(53,208,127,.1)', borderColor: 'rgba(53,208,127,.4)' }}>
          <b>{stats.letGoPct}%</b> of the worries you’ve reviewed were things you couldn’t control. That’s a lot of energy saved.</div>}
        {done.map(w => (
          <div className="card" key={w.id} style={{ padding: 14 }}>
            <div className="row"><Emoji name={w.status === 'let-go' ? 'balloon' : 'check'} size={26} /><span style={{ flex: 1 }}>{w.text}</span></div>
            {w.action && <div className="muted small" style={{ marginTop: 6 }}>Next step: {w.action}</div>}
          </div>
        ))}
      </>}
    </div></div>
  )
}
