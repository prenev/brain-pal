import { EMOJI } from '../lib/emojiData'
import { moodOf } from '../lib/mood'

/** Mood face: Fluent emoji on a soft circle tinted with the mood colour. */
/** `bare`: just the emoji, no tinted circle (entry tiles). */
export default function Face({ mood, size = 48, bare = false }: { mood: number; size?: number; bare?: boolean }) {
  const m = moodOf(mood)
  return (
    <svg className="face" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={m.name}>
      {!bare && <circle cx="50" cy="50" r="48" fill={m.color} fillOpacity=".22" stroke={m.color} strokeWidth="4" />}
      <g transform={bare ? 'translate(2 2) scale(3)' : 'translate(15 15) scale(2.19)'} dangerouslySetInnerHTML={{ __html: EMOJI[`mood-${m.v}`] }} />
    </svg>
  )
}
