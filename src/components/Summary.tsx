import { PalTip } from './Pal'
import { ProGate } from './Pro'
import { usePro } from '../lib/proStore'
import { useMemo, useState } from 'react'
import { Share2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates.ts'
import { sentences, shareText, summarize } from '../lib/summaries.ts'

const RANGES = [
  { id: 'day', label: 'Today', days: 1, label2: 'today', prev: 'yesterday', title: 'My day' },
  { id: 'week', label: 'This week', days: 7, label2: 'this week', prev: 'last week', title: 'My week' },
  { id: 'month', label: 'This month', days: 30, label2: 'this month', prev: 'the month before', title: 'My month' },
] as const

/** Plain-language recap of today / the last 7 / the last 30 days, written from templates (no AI, works offline). */
export default function Summary() {
  const { thoughts, sessions, worries, anchorHistory, journal, focusSessions, sleepNights } = useStore()
  const { pro } = usePro()
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('day')
  const [msg, setMsg] = useState('')
  const r = RANGES.find(x => x.id === range)!
  const sum = useMemo(() => summarize({ thoughts, sessions, worries, journal, focus: focusSessions, sleep: sleepNights, anchorDays: anchorHistory }, dayKey(new Date()), r.days), [thoughts, sessions, worries, journal, focusSessions, sleepNights, anchorHistory, r.days])
  const lines = sentences(sum, r.label2, r.prev)

  async function share() {
    const text = shareText(r.title, sum, r.label2, r.prev)
    try {
      if (navigator.share) { await navigator.share({ title: r.title, text }); return }
      await navigator.clipboard.writeText(text); setMsg('Copied to your clipboard.')
    } catch { setMsg('Could not share from this browser.') }
  }

  return (
    <>
      <PalTip id="summary" pose="idle">Your day, week or month in plain words. Tap share to send it to someone you trust.</PalTip>
      <div className="seg" role="tablist" aria-label="Summary range" style={{ marginBottom: 14 }}>
        {RANGES.map(x => <button key={x.id} role="tab" aria-selected={range === x.id} className={range === x.id ? 'on' : ''} onClick={() => { setRange(x.id); setMsg('') }}>{x.label}</button>)}
      </div>
      {range !== 'day' && !pro ? <ProGate feature="analytics" compact>{null}</ProGate> : <div className="card summary" aria-label={`${r.label} summary`}>
        <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <button className="btn" onClick={share}><Share2 size={18} style={{ display: 'inline', verticalAlign: -3 }} /> Share</button>
        {msg && <p className="small" role="status" style={{ marginBottom: 0 }}>{msg}</p>}
      </div>}
      <p className="muted small">Self-help summary of what you logged, not medical advice. It stays on this device unless you share it.</p>
    </>
  )
}
