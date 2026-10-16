import type { CSSProperties } from 'react'
import { Emoji } from '../lib/emoji'
import { TIER_COLOR, type Tier } from '../lib/achievements.ts'

/** Round metal badge for an achievement tier; greyed out until it is earned. */
export default function Medal({ tier, emoji, locked = false, size = 56 }: { tier: Tier; emoji: string; locked?: boolean; size?: number }) {
  const [l, b, d] = TIER_COLOR[tier]
  return (
    <span className={`medal ${locked ? 'locked' : ''}`} style={{ '--l': l, '--b': b, '--d': d, width: size, height: size } as CSSProperties} aria-hidden="true">
      <span className="medal-disc"><Emoji name={emoji} size={Math.round(size * 0.52)} /></span>
    </span>
  )
}
