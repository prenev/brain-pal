import { useEffect } from 'react'
import { Emoji } from '../lib/emoji'
import { burst } from '../lib/confetti'
import { hapticSuccess } from '../lib/haptics'
import { useStore } from '../lib/store'

export interface Celebration { emoji: string; title: string; sub: string }

/** "Lesson complete"-style reward screen: big emoji, streak, one chunky button. */
export default function Celebrate({ c, onClose }: { c: Celebration; onClose: () => void }) {
  const { streak } = useStore()
  useEffect(() => { burst(); hapticSuccess() }, [])
  return (
    <div className="overlay celebrate" role="dialog" aria-modal aria-label={c.title}>
      <div className="inner" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div className="cel-body">
          <div className="pop"><Emoji name={c.emoji} size={150} /></div>
          <h1>{c.title}</h1>
          <p className="muted">{c.sub}</p>
          <div className="cel-stats">
            <div className="stat" style={{ borderColor: '#ffa63d', color: '#ffa63d' }}>
              <small>STREAK</small><b><Emoji name="fire" size={26} /> {streak.current}</b>
            </div>
            <div className="stat" style={{ borderColor: '#4aa8ff', color: '#4aa8ff' }}>
              <small>BEST</small><b><Emoji name="trophy" size={26} /> {streak.longest}</b>
            </div>
          </div>
        </div>
        <div className="cel-foot"><button className="btn primary block" onClick={onClose}>Continue</button></div>
      </div>
    </div>
  )
}
