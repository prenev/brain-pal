import FeelIcon, { hasFeelIcon } from '../components/FeelIcon'
import { Emoji, hasEmoji } from './emoji'

/** Emotion / tag glyph: a Fluent emoji, with sparkles for custom entries. */
export function NameIcon({ name, size = 28 }: { name: string; size?: number }) {
  if (hasFeelIcon(name)) return <FeelIcon name={name} size={size} />   // feelings are drawn as things, never faces
  return <Emoji name={hasEmoji(name) ? name : 'sparkles'} size={size} />
}
