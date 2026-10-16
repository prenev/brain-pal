import Face from './Face'
import Pal from './Pal'
import { MOODS } from '../lib/mood'

/** Always the first thing on Home: pick how you feel and the thought-entry flow opens with that mood already chosen. */
export default function MoodCard({ onPick }: { onPick: (mood: number) => void }) {
  return (
    <div className="card today" aria-label="Today">
      <div className="row" style={{ gap: 10 }}><Pal pose="wave" motion="wave" size={52} /><b style={{ fontSize: 19 }}>How are you feeling?</b></div>
      <div className="quickmood" role="group" aria-label="How are you feeling?">
        {MOODS.map(m => (
          <button key={m.v} aria-label={`Log mood: ${m.name}`} onClick={() => onPick(m.v)} style={{ color: m.color }}>
            <Face mood={m.v} size={52} /><span>{m.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
