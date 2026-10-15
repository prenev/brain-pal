import type { CSSProperties } from 'react'
import { EMOJI } from './emojiData'

/** Microsoft Fluent Emoji (MIT), bundled as inline SVG so it works offline. */
export function Emoji({ name, size = 24, label, style }: { name: string; size?: number; label?: string; style?: CSSProperties }) {
  const body = EMOJI[name] ?? EMOJI.sparkles
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ flex: 'none', ...style }} dangerouslySetInnerHTML={{ __html: body }} />
  )
}

/** Emoji for an emotion or tag name; unknown (custom) names get sparkles. */
export const hasEmoji = (name: string) => name in EMOJI
