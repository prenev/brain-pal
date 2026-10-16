import { PalTip } from './Pal'
import { useMemo, useState } from 'react'
import Face from './Face'
import { useStore } from '../lib/store'
import { isNative } from '../lib/native'
import { MOODS } from '../lib/mood'
import { dayKey } from '../lib/dates.ts'
import { fmtDuration, sleepMoodLink, summarizeSleep, type Night } from '../lib/sleep.ts'

const STAGES = [
  { key: 'deepMin', label: 'Deep', color: '#6a5cff' }, { key: 'remMin', label: 'REM', color: '#4aa8ff' },
  { key: 'coreMin', label: 'Core', color: '#5ad1c8' }, { key: 'unspecifiedMin', label: 'Asleep', color: '#8ea0c8' },
] as const
const clock = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const dow = (date: string, style: 'short' | 'narrow' = 'short') => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: style })
const eveningToClock = (m: number) => { const t = (m + 18 * 60) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }

/** Last night, the week at a glance, consistency, and (with enough data) how sleep and mood relate. Apple Watch data via Apple Health, or a manual log. */
export default function Sleep() { return <SleepView /> }

function SleepView() {
  const { sleepNights, sleepOn, connectSleepNow, disconnectSleepNow, syncSleepNow, addManualNight, deleteManualNight, thoughts } = useStore()
  const native = isNative()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [bed, setBed] = useState('23:00'), [wake, setWake] = useState('07:00'), [morning, setMorning] = useState(() => dayKey(new Date())), [quality, setQuality] = useState<number | null>(null)
  const last: Night | undefined = sleepNights[0]
  const week = useMemo(() => [...sleepNights.slice(0, 7)].reverse(), [sleepNights])
  const sum = useMemo(() => summarizeSleep(sleepNights), [sleepNights])
  const link = useMemo(() => sleepMoodLink(sleepNights, thoughts), [sleepNights, thoughts])

  async function connect() {
    setBusy(true); setMsg('')
    const r = await connectSleepNow()
    setMsg(r === 'ok' ? 'Connected. If nothing shows up, check Settings → Health → Data Access → Wobbi, and that your Apple Watch has sleep tracking on.' : r === 'unavailable' ? 'Apple Health isn’t available on this device.' : 'Could not connect to Apple Health. Please try again.')
    setBusy(false)
  }
  async function refresh() { setBusy(true); const n = await syncSleepNow(); setMsg(n === null ? 'Could not read Apple Health right now.' : n ? `Found ${n} ${n === 1 ? 'night' : 'nights'} of sleep.` : 'No sleep data found yet — check Health permissions and that your Watch tracks sleep.'); setBusy(false) }
  function saveManual(e: React.FormEvent) {
    e.preventDefault(); setMsg('')
    const [wy, wm, wd] = morning.split('-').map(Number), [wh, wmin] = wake.split(':').map(Number), [bh, bmin] = bed.split(':').map(Number)
    const wakeAt = new Date(wy, wm - 1, wd, wh, wmin).getTime()
    const bedAt = new Date(wy, wm - 1, wd - (bh * 60 + bmin > wh * 60 + wmin ? 1 : 0), bh, bmin).getTime()
    if (!addManualNight(bedAt, wakeAt, quality)) { setMsg('That doesn’t look like one night — check the times.'); return }
    setMsg('Saved.'); setQuality(null)
  }

  return (
    <>
      <PalTip id="sleep" pose="sleepy">{native ? 'Connect Apple Health to see last night next to your mood.' : 'Log last night by hand and I’ll show how sleep and mood go together.'}</PalTip>
      {native && !sleepOn && <div className="card">
        <b>Show your sleep from Apple Health</b>
        <p className="muted small">Wobbi can read your sleep (for example from your Apple Watch) to show it next to your mood. It reads <i>only</i> sleep, keeps it on this device, and never sends it anywhere. You can disconnect any time.</p>
        <button className="btn primary block" disabled={busy} onClick={connect}>{busy ? 'Connecting…' : 'Connect Apple Health sleep'}</button>
      </div>}
      {native && sleepOn && <div className="card row spread">
        <span className="muted small">Synced from Apple Health</span>
        <span className="row" style={{ gap: 6 }}><button className="linkbtn" disabled={busy} onClick={refresh}>Refresh</button><button className="linkbtn" onClick={() => { disconnectSleepNow(); setMsg('Disconnected. Your Health data is untouched.') }}>Disconnect</button></span>
      </div>}

      <div className="card" aria-label="Last night">
        {last ? <>
          <div className="muted small">Last night · {dow(last.date, 'short')}</div>
          <div style={{ fontSize: 40, fontWeight: 900, margin: '4px 0' }}>{fmtDuration(last.asleepMin)}</div>
          <div className="muted">{clock(last.start)} → {clock(last.end)} <span className="chip" style={{ marginLeft: 6 }}>{last.source === 'health' ? 'Apple Health' : 'logged by hand'}</span></div>
          {STAGES.some(s => last[s.key] > 0) && last.source === 'health' && <>
            <div className="stagebar" role="img" aria-label="Sleep stages">{STAGES.map(s => last[s.key] > 0 && <i key={s.key} style={{ width: `${(last[s.key] / last.asleepMin) * 100}%`, background: s.color }} />)}</div>
            <div className="chips">{STAGES.filter(s => last[s.key] > 0).map(s => <span key={s.key} className="chip" style={{ borderColor: s.color }}>{s.label} {fmtDuration(last[s.key])}</span>)}</div>
          </>}
          {last.efficiency !== null && <p className="muted small" style={{ marginBottom: 0 }}>Asleep for {last.efficiency}% of the time in bed{last.awakeMin ? ` · ${last.awakeMin} min awake` : ''}.</p>}
        </> : <p style={{ margin: 0 }} className="muted">No sleep logged yet. {native ? 'Connect Apple Health above, or log last night below.' : 'Log last night below — it takes ten seconds.'}</p>}
      </div>

      {week.length > 0 && <div className="card">
        <b>Last {week.length} {week.length === 1 ? 'night' : 'nights'}</b>
        <div className="sleep-bars" role="list">
          {week.map(n => <div key={n.date} className="col" role="listitem" aria-label={`${dow(n.date)}: ${fmtDuration(n.asleepMin)}`}>
            <i style={{ height: Math.max(4, Math.min(100, (n.asleepMin / 600) * 100)), opacity: n.source === 'manual' ? 0.6 : 1 }} /><span>{dow(n.date, 'narrow')}</span></div>)}
        </div>
        {sum.avgAsleepMin !== null && <p style={{ margin: '14px 0 0' }}>On average you slept <b>{fmtDuration(sum.avgAsleepMin)}</b>, going to bed around <b>{eveningToClock(sum.avgBedEvening!)}</b>.
          {sum.bedtimeSpreadMin !== null && <span className="muted"> Your bedtime varies by about {sum.bedtimeSpreadMin} minutes.</span>}</p>}
      </div>}

      <div className="card" aria-label="Sleep and mood">
        <b>Sleep and mood</b>
        <p style={{ marginBottom: 0 }} className={link ? '' : 'muted'}>{link ? link.sentence : 'Log your mood on a week or so of mornings that also have sleep data and Wobbi will show how the two relate for you.'}</p>
      </div>

      <form className="card" onSubmit={saveManual}>
        <b>Log a night by hand</b>
        <div className="row" style={{ gap: 10, margin: '12px 0' }}>
          <label className="field" style={{ flex: 1, margin: 0 }}><span>Bedtime</span><input className="input" type="time" aria-label="Bedtime" value={bed} onChange={e => setBed(e.target.value)} required /></label>
          <label className="field" style={{ flex: 1, margin: 0 }}><span>Woke up</span><input className="input" type="time" aria-label="Woke up" value={wake} onChange={e => setWake(e.target.value)} required /></label>
        </div>
        <label className="field"><span>Morning of</span><input className="input" type="date" aria-label="Morning of" max={dayKey(new Date())} value={morning} onChange={e => setMorning(e.target.value)} required /></label>
        <div className="row" style={{ justifyContent: 'space-between', margin: '0 0 14px' }} role="group" aria-label="How rested do you feel">
          {MOODS.map(m => <button type="button" key={m.v} aria-pressed={quality === m.v} aria-label={`Rested: ${m.name}`} onClick={() => setQuality(quality === m.v ? null : m.v)} style={{ opacity: quality === null || quality === m.v ? 1 : .35 }}><Face mood={m.v} size={40} /></button>)}
        </div>
        <button className="btn primary block" type="submit">Save night</button>
      </form>

      {sleepNights.some(n => n.source === 'manual') && <div className="card">
        <b>Nights you logged</b>
        <ul className="anchor-edit">{sleepNights.filter(n => n.source === 'manual').slice(0, 7).map(n => (
          <li key={n.date} className="row"><span style={{ flex: 1 }}>{dow(n.date)} {n.date.slice(5)} · {fmtDuration(n.asleepMin)}</span>
            <button className="linkbtn" aria-label={`Delete night ${n.date}`} onClick={() => deleteManualNight(n.date)}>Delete</button></li>))}</ul>
      </div>}
      {msg && <p className="small" role="status" style={{ textAlign: 'center' }}>{msg}</p>}
      <p className="muted small">Sleep numbers are an estimate from your devices (or your own entry). This is self-help information, not a medical assessment.</p>
    </>
  )
}
