import { BatteryLow, CloudRain, Coffee, Confetti, EyeClosed, Fire, Gauge, Ghost, HandHeart, Hourglass, Leaf, Lifebuoy, PersonSimple, Question, Rainbow, Scales, Spiral, Sun, Waves, type Icon } from '@phosphor-icons/react'

/** Feelings shown as things that feel like them (a spiral, a rain cloud, a low battery), never as faces.
 *  Phosphor Icons (MIT), duotone, each in its own colour. */
const FEEL: Record<string, [Icon, string]> = {
  happy: [Sun, '#ffc83d'], excited: [Confetti, '#ff8fb1'], grateful: [HandHeart, '#ff7aa8'], relaxed: [Leaf, '#5fd39a'], content: [Coffee, '#ffa65c'], hopeful: [Rainbow, '#7cc4ff'],
  tired: [BatteryLow, '#ff6b6b'], unsure: [Question, '#b79cff'], bored: [Hourglass, '#e5c07b'], anxious: [Spiral, '#ff8fb1'], angry: [Fire, '#ff6b4a'], stressed: [Gauge, '#ffa63d'],
  sad: [CloudRain, '#6fb3ff'], lonely: [PersonSimple, '#a5b4d4'], overwhelmed: [Waves, '#4aa8ff'], ashamed: [EyeClosed, '#c8a2ff'], guilty: [Scales, '#b8c4e0'], afraid: [Ghost, '#e8ecf8'], desperate: [Lifebuoy, '#ff5d73'],
}

export const hasFeelIcon = (name: string) => name in FEEL

export default function FeelIcon({ name, size = 28 }: { name: string; size?: number }) {
  const f = FEEL[name]
  if (!f) return null
  const [I, color] = f
  return <I className="feel-icon" size={size} weight="duotone" color={color} aria-hidden="true" />
}
