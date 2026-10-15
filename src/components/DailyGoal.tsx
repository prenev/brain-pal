import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates'

/** Two tiny daily goals with a chunky progress bar. */
export default function DailyGoal() {
  const { thoughts, sessions } = useStore()
  const today = dayKey(new Date())
  const goals = [
    { emoji: 'memo', label: 'Log a mood', done: thoughts.some(t => dayKey(t.createdAt) === today) },
    { emoji: 'bubbles', label: 'Breathe', done: sessions.some(s => dayKey(s.createdAt) === today) },
  ]
  const n = goals.filter(g => g.done).length
  return (
    <div className="card goal">
      <div className="row spread" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: 18 }}>Daily goals</b><span className="muted" style={{ fontWeight: 800 }}>{n}/2</span>
      </div>
      <div className="bar"><i style={{ width: `${(n / 2) * 100}%` }} /></div>
      <div className="goal-list">
        {goals.map(g => (
          <div key={g.label} className={`goal-item ${g.done ? 'done' : ''}`}>
            <Emoji name={g.done ? 'check' : g.emoji} size={26} /><span>{g.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
