import {
  Smile, PartyPopper, HeartHandshake, TreePalm, HandHeart, Sunrise, BedDouble, CircleHelp, Leaf, CloudLightning,
  Flame, Wrench, Droplets, Frown, Layers, Eye, Ghost, Waves, Briefcase, Users, Heart, Activity, Wallet,
  MessageCircle, Moon, Star, Telescope, History, Scale, Target, Tag, type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  happy: Smile, excited: PartyPopper, grateful: HeartHandshake, relaxed: TreePalm, content: HandHeart, hopeful: Sunrise,
  tired: BedDouble, unsure: CircleHelp, bored: Leaf, anxious: CloudLightning, angry: Flame, stressed: Wrench,
  sad: Droplets, lonely: Frown, overwhelmed: Layers, ashamed: Eye, guilty: Scale, afraid: Ghost, desperate: Waves,
  work: Briefcase, family: Users, relationships: Heart, health: Activity, money: Wallet, social: MessageCircle,
  sleep: Moon, 'self-worth': Star, future: Telescope, past: History, perfectionism: Target, comparison: Scale,
}

export function NameIcon({ name, size = 28 }: { name: string; size?: number }) {
  const I = MAP[name] ?? Tag
  return <I size={size} strokeWidth={2} />
}
