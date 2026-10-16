import { useEffect, useState } from 'react'
import { ShareCardSheet } from './ShareSheet'
import { streakCard, type ShareCard } from '../lib/share.ts'
import { Emoji } from '../lib/emoji'
import Pal from './Pal'
import { burst } from '../lib/confetti'
import { hapticSuccess } from '../lib/haptics'
import { sfx } from '../lib/sound'
import { useStore } from '../lib/store'

export interface Celebration { emoji: string; title: string; sub: string; card?: ShareCard; sound?: 'celebrate' | 'levelup' }

/** "Lesson complete"-style reward screen: big emoji, streak, one chunky button. */
export default function Celebrate({ c, onClose }: { c: Celebration; onClose: () => void }) {
  const { streak } = useStore()
  const [sharing, setSharing] = useState(false)
  const card = c.card ?? (streak.current >= 3 ? streakCard(streak.current) : null)
  useEffect(() => { burst(); hapticSuccess(); sfx(c.sound ?? 'celebrate') }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="overlay celebrate" role="dialog" aria-modal aria-label={c.title}>
      <div className="inner" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div className="cel-body">
          <div className="pop"><Pal pose="celebrate" size={190} motion="jump" /></div>
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
        <div className="cel-foot">{card && <button className="btn block" style={{ marginBottom: 10 }} onClick={() => setSharing(true)}>Share</button>}<button className="btn primary block" onClick={onClose}>Continue</button></div>
      {sharing && card && <ShareCardSheet card={card} onClose={() => setSharing(false)} />}
      </div>
    </div>
  )
}
