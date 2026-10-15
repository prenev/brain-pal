import { useStore } from '../lib/store'
import { dayKey, lastNDays } from '../lib/dates'
import Entry from '../components/Entry'

export default function Today({ onNew, goBreathe }: { onNew: () => void; goBreathe: () => void }) {
  const { thoughts, sessions, streak } = useStore()
  const active = new Set([...thoughts.map(t => dayKey(t.createdAt)), ...sessions.map(s => dayKey(s.createdAt))])
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const week = lastNDays(7)
  const weekMin = Math.round(sessions.filter(s => week.includes(dayKey(s.createdAt))).reduce((a, s) => a + s.durationSec, 0) / 60)

  return (
    <>
      <h1>{hello}</h1>
      <p className="sub">{streak.activeToday ? "You've checked in today. 🌱" : 'A minute for your mind?'}</p>

      <div className="glass card">
        <div className="row spread">
          <div>
            <div className="streak-num">{streak.current}</div>
            <div className="muted">day streak · best {streak.longest}</div>
          </div>
          <div style={{ fontSize: 44 }} aria-hidden>🔥</div>
        </div>
        <div className="dots">
          {week.map(d => (
            <div key={d} className={`dot ${active.has(d) ? 'on' : ''}`}>
              <i /> {new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'narrow' })}
            </div>
          ))}
        </div>
      </div>

      <div className="grid2">
        <button className="glass card" style={{ textAlign: 'left' }} onClick={onNew}>
          <div style={{ fontSize: 28 }}>📝</div><b>Log a thought</b><div className="muted small">{thoughts.length} {thoughts.length === 1 ? "entry" : "entries"}</div>
        </button>
        <button className="glass card" style={{ textAlign: 'left' }} onClick={goBreathe}>
          <div style={{ fontSize: 28 }}>🫧</div><b>Box breathing</b><div className="muted small">{weekMin} min this week</div>
        </button>
      </div>

      <h2>Recent</h2>
      {thoughts.length === 0
        ? <div className="glass card empty">Nothing yet. Log your first thought — it takes about a minute.</div>
        : thoughts.slice(0, 3).map(t => <Entry key={t.id} t={t} />)}
    </>
  )
}
