import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { dayKey, lastNDays } from '../lib/dates'
import { MOODS } from '../lib/mood'
import { worryStats } from '../lib/worries'
import { reliefStats, timeOfDay, trapStats, triggerStats } from '../lib/insights'
import { NameIcon } from '../lib/icons'
import { Emoji } from '../lib/emoji'
import Face from '../components/Face'
import { monthLabel } from '../components/ui'

function MoodChart({ points, days }: { points: Map<number, number>; days: number }) {
  const W = 320, H = 200, L = 34, T = 14, B = 26
  const x = (d: number) => L + ((d - 1) / Math.max(1, days - 1)) * (W - L - 4)
  const y = (v: number) => T + ((5 - v) / 4) * (H - T - B)
  const pts = [...points.entries()].sort((a, b) => a[0] - b[0]).map(([d, v]) => [x(d), y(v)] as const)
  let path = ''
  pts.forEach(([px, py], i) => {
    if (i === 0) { path = `M${px},${py}`; return }
    const [qx, qy] = pts[i - 1], cx = (qx + px) / 2
    path += ` C${cx},${qy} ${cx},${py} ${px},${py}`
  })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Mood chart">
      <defs>
        <linearGradient id="mg" gradientUnits="userSpaceOnUse" x1="0" y1={T} x2="0" y2={H - B}>
          {MOODS.map((m, i) => <stop key={m.v} offset={i / 4} stopColor={m.color} />)}
        </linearGradient>
      </defs>
      {MOODS.map(m => <g key={m.v}>
        <line x1={L} x2={W - 2} y1={y(m.v)} y2={y(m.v)} stroke="#38383a" strokeWidth="1" />
        <foreignObject x={0} y={y(m.v) - 11} width="24" height="24"><Face mood={m.v} size={22} /></foreignObject>
      </g>)}
      {pts.length > 1 && <path d={path} fill="none" stroke="url(#mg)" strokeWidth="4" strokeLinecap="round" />}
      {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={pts.length > 1 ? 3.5 : 6} fill="#fff" />)}
      {Array.from({ length: days }, (_, i) => i + 1).filter(d => d === 1 || d % 5 === 0).map(d =>
        <text key={d} x={x(d)} y={H - 6} fill="#8e8e93" fontSize="11" textAnchor="middle">{d}</text>)}
    </svg>
  )
}

export default function Stats() {
  const { thoughts, sessions, worries, streak } = useStore()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const isNow = dayKey(month).slice(0, 7) === dayKey(new Date()).slice(0, 7)
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const inMonth = (iso: string) => { const d = new Date(iso); return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth() }

  const active = useMemo(() => new Set([...thoughts.map(t => dayKey(t.createdAt)), ...sessions.map(s => dayKey(s.createdAt))]), [thoughts, sessions])
  const mt = thoughts.filter(t => inMonth(t.createdAt))
  const ms = sessions.filter(s => inMonth(s.createdAt))
  const points = useMemo(() => {
    const by = new Map<number, number[]>()
    mt.forEach(t => { const d = new Date(t.createdAt).getDate(); by.set(d, [...(by.get(d) ?? []), t.mood]) })
    return new Map([...by].map(([d, v]) => [d, v.reduce((a, b) => a + b, 0) / v.length]))
  }, [mt])

  const emoCounts = useMemo(() => {
    const c = new Map<string, number>()
    mt.forEach(t => t.emotions.forEach(e => c.set(e.name, (c.get(e.name) ?? 0) + 1)))
    return [...c].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [mt])

  const reframed = mt.filter(t => t.outcomeIntensity !== null && t.emotions.length)
  const drop = reframed.length
    ? Math.round(reframed.reduce((a, t) => a + (Math.max(...t.emotions.map(e => e.intensity)) - t.outcomeIntensity!), 0) / reframed.length) : null
  const breathMin = Math.round(ms.reduce((a, s) => a + s.durationSec, 0) / 60)
  const week = lastNDays(5)
  const relief = reliefStats(sessions)
  const ws = worryStats(worries)
  const triggers = triggerStats(thoughts)
  const traps = trapStats(thoughts)
  const tod = timeOfDay(thoughts)
  const todMax = Math.max(1, ...tod.map(x => x.count))

  const badges = [
    { em: 'fire', label: '3-day streak', ok: streak.longest >= 3 },
    { em: 'star', label: '7-day streak', ok: streak.longest >= 7 },
    { em: 'trophy', label: '30-day streak', ok: streak.longest >= 30 },
    { em: 'memo', label: '10 entries', ok: thoughts.length >= 10 },
    { em: 'bulb', label: '5 reframes', ok: thoughts.filter(t => t.alternateThought).length >= 5 },
    { em: 'bubbles', label: '30 min breathing', ok: sessions.reduce((a, s) => a + s.durationSec, 0) >= 1800 },
  ]

  return (
    <>
      <div className="topbar">
        <button className="glass round green" aria-label="Previous" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></button>
        <span className="title">{monthLabel(month)}</span>
        <button className="glass round green" aria-label="Next" disabled={isNow} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></button>
      </div>

      <div className="card">
        <div className="card-head"><h3>Days in a Row</h3></div>
        <div className="chain">
          {week.map((d, i) => (
            <div className="d" key={d}>
              <div className={`c ${active.has(d) ? 'done' : i === week.length - 1 ? 'today' : ''}`}>
                {active.has(d) ? <Check size={22} /> : i === week.length - 1 ? '?' : <Plus size={20} />}
              </div>
              {i === week.length - 1 ? 'Today' : new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
          ))}
          <div className="d"><div className="total">{streak.current}</div></div>
        </div>
        <div className="hr" />
        <div className="row"><Emoji name="trophy" size={26} />Longest chain: {streak.longest}</div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Mood Chart</h3></div>
        {points.size ? <MoodChart points={points} days={days} /> : <p className="muted">No entries this month yet.</p>}
      </div>

      <div className="card">
        <div className="card-head"><h3>Top Emotions</h3></div>
        {emoCounts.length === 0 && <p className="muted">Tag emotions on your entries to see them here.</p>}
        {emoCounts.map(([n, c]) => (
          <div key={n} className="row" style={{ marginBottom: 12 }}>
            <NameIcon name={n} size={28} />
            <span style={{ width: 96 }}>{n}</span>
            <div className="bar" style={{ flex: 1 }}><i style={{ width: `${(c / emoCounts[0][1]) * 100}%` }} /></div>
            <b>{c}</b>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h3>Anxiety Insights</h3></div>
        <div className="muted small" style={{ marginBottom: 6 }}>What helps</div>
        {relief
          ? <p style={{ margin: '0 0 14px' }}><b style={{ color: 'var(--accent)', fontSize: 28 }}>−{relief.avgDrop}</b> points on average (0–10) after calming exercises — helped {relief.helped} of {relief.n} times.</p>
          : <p className="muted" style={{ margin: '0 0 14px' }}>Use “Anxious right now?” and rate before/after to see which tools work for you.</p>}
        <div className="muted small" style={{ marginBottom: 6 }}>Likely triggers</div>
        {triggers.length ? triggers.map(t => <div key={t.tag} className="row spread" style={{ marginBottom: 6 }}><span>#{t.tag}</span><span className="muted">avg {t.avg}% · {t.n} entries</span></div>)
          : <p className="muted" style={{ margin: '0 0 14px' }}>Tag anxious entries (work, sleep, social…) — patterns appear after a few.</p>}
        <div className="muted small" style={{ margin: '14px 0 6px' }}>Your common thinking traps</div>
        {traps.length ? <div className="chips">{traps.map(([n, c]) => <span key={n} className="chip">{n} · {c}</span>)}</div>
          : <p className="muted" style={{ margin: 0 }}>Spot traps in the thought record to see which ones you fall into most.</p>}
        <div className="muted small" style={{ margin: '14px 0 6px' }}>When anxiety shows up</div>
        {tod.map(x => <div key={x.label} className="row" style={{ marginBottom: 6 }}><span style={{ width: 84 }}>{x.label}</span><div className="bar" style={{ flex: 1 }}><i style={{ width: `${(x.count / todMax) * 100}%` }} /></div><b style={{ width: 20, textAlign: 'right' }}>{x.count}</b></div>)}
      </div>

      {worries.length > 0 && <div className="card">
        <div className="card-head"><h3>Worry Box</h3><Emoji name="worry" size={30} /></div>
        <div className="row spread">
          <div><div style={{ fontSize: 34, fontWeight: 900 }}>{ws.open}</div><div className="muted">parked</div></div>
          <div><div style={{ fontSize: 34, fontWeight: 900, color: 'var(--accent)' }}>{ws.letGo}</div><div className="muted">let go</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 34, fontWeight: 900, color: 'var(--blue)' }}>{ws.actionable}</div><div className="muted">with a plan</div></div>
        </div>
        {ws.letGoPct !== null && ws.reviewed >= 3 && <p className="muted" style={{ margin: '12px 0 0' }}>{ws.letGoPct}% of reviewed worries were out of your control.</p>}
      </div>}

      <div className="card">
        <div className="card-head"><h3>Reframe Effect</h3></div>
        {drop === null ? <p className="muted">Add an alternate thought and re-rate the feeling to see how much it helps.</p>
          : <><div style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent)' }}>−{drop}%</div>
            <p className="muted" style={{ margin: 0 }}>average drop in feeling intensity across {reframed.length} reframed {reframed.length === 1 ? 'entry' : 'entries'}</p></>}
      </div>

      <div className="card">
        <div className="card-head"><h3>Breathing</h3></div>
        <div className="row spread">
          <div><div style={{ fontSize: 40, fontWeight: 800 }}>{breathMin}<span className="muted" style={{ fontSize: 18 }}> min</span></div><div className="muted">this month</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 40, fontWeight: 800 }}>{ms.length}</div><div className="muted">sessions</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Achievements</h3></div>
        <div className="badges">{badges.map(b => <div key={b.label} className={`badge ${b.ok ? '' : 'locked'}`}><div className="em"><Emoji name={b.em} size={40} /></div>{b.label}</div>)}</div>
      </div>
    </>
  )
}
