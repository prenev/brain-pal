import { Emoji, hasEmoji } from './emoji'

/** Emotion / tag glyph: a Fluent emoji, with sparkles for custom entries. */
export function NameIcon({ name, size = 28 }: { name: string; size?: number }) {
  return <Emoji name={hasEmoji(name) ? name : 'sparkles'} size={size} />
}
