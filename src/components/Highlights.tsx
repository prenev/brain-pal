import { ChevronRight } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/dates.ts'
import { stepChoices } from '../lib/focus.ts'
import { highlights, type Highlight } from '../lib/today.ts'

/** A few quiet lines about today: last night's sleep, worries waiting, a planned small step. Renders nothing when there is nothing to say. */
export default function Highlights({ onGo }: { onGo: (go: Highlight['go']) => void }) {
  const { sleepNights, worries, focusSessions, streak, thoughts } = useStore()
  const today = dayKey(new Date())
  const loggedToday = thoughts.some(t => dayKey(t.createdAt) === today)
  const list = highlights({
    today, night: sleepNights[0] ? { date: sleepNights[0].date, asleepMin: sleepNights[0].asleepMin } : null,
    openWorries: worries.filter(w => w.status === 'open').length,
    plannedStep: stepChoices(worries, focusSessions).fromWorries[0]?.text ?? null,
    streakEndsTonight: !streak.activeToday && !loggedToday && streak.current > 0 && new Date().getHours() >= 17 ? streak.current : null,
  })
  if (!list.length) return null
  return (
    <div className="card highlights" role="list" aria-label="Today’s highlights">
      {list.map(h => (
        <button key={h.id} role="listitem" className={`hl ${h.tone}`} onClick={() => onGo(h.go)}>
          <Emoji name={h.emoji} size={26} /><span>{h.text}</span><ChevronRight size={18} />
        </button>
      ))}
    </div>
  )
}
