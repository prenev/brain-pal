import { EMOJI } from '../lib/emojiData'
import { moodOf } from '../lib/mood'

/** Mood face: Fluent emoji on a soft circle tinted with the mood colour. */
export default function Face({ mood, size = 48 }: { mood: number; size?: number }) {
  const m = moodOf(mood)
  return (
    <svg className="face" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={m.name}>
      <circle cx="50" cy="50" r="48" fill={m.color} fillOpacity=".22" stroke={m.color} strokeWidth="4" />
      <g transform="translate(15 15) scale(2.19)" dangerouslySetInnerHTML={{ __html: EMOJI[`mood-${m.v}`] }} />
    </svg>
  )
}
