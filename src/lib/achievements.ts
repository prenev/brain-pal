import { dayKey, shift } from './dates.ts'
import type { PoseName } from './pal.ts'

/**
 * Achievements: milestones across everything Wobbi does. Like coins they are DERIVED from your own data (retroactive, nothing to sync,
 * can't be lost); only "which ones I have already been congratulated for" is remembered. Thresholds are deliberately reachable:
 * the first tier of each family is a first step, the last takes months of ordinary use.
 */
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
export const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
export const TIER_LABEL: Record<Tier, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond' }
/** Colours for cards and badges: [light, base, dark]. */
export const TIER_COLOR: Record<Tier, [string, string, string]> = {
  bronze: ['#f0b98a', '#cd7f32', '#8a4f1d'], silver: ['#f1f4fa', '#b4bccb', '#7b8499'], gold: ['#ffe27a', '#ffc21f', '#c78a00'],
  platinum: ['#d9fbff', '#7fe0ee', '#2fa3b8'], diamond: ['#f3e3ff', '#b88cff', '#7a4de0'],
}
/** Coins for unlocking a tier: small on purpose, a thank-you and not a reason to chase. */
export const TIER_COINS: Record<Tier, number> = { bronze: 10, silver: 20, gold: 40, platinum: 75, diamond: 150 }

export type FamilyId = 'checkin' | 'reframe' | 'calm' | 'journal' | 'focus' | 'worry' | 'anchors' | 'sleep' | 'streak' | 'days' | 'hours' | 'collector'
export interface FamilySpec { id: FamilyId; name: string; emoji: string; pose: PoseName; unit: string; unitOne: string; verb: string; tiers: { at: number; tier: Tier; title: string }[] }

const t = (at: number, tier: Tier, title: string) => ({ at, tier, title })
export const FAMILIES: FamilySpec[] = [
  { id: 'checkin', name: 'Check-ins', emoji: 'mood-4', pose: 'cheer', unit: 'check-ins', unitOne: 'check-in', verb: 'Logged', tiers: [t(1, 'bronze', 'First check-in'), t(10, 'silver', 'Getting to know me'), t(50, 'gold', 'Regular check-in'), t(150, 'platinum', 'Self-aware'), t(500, 'diamond', 'Mood master')] },
  { id: 'reframe', name: 'Reframing', emoji: 'bulb', pose: 'think', unit: 'thoughts reframed', unitOne: 'thought reframed', verb: 'Reframed', tiers: [t(1, 'bronze', 'A kinder thought'), t(10, 'silver', 'Thought detective'), t(30, 'gold', 'Balanced thinker'), t(100, 'platinum', 'Mind gardener'), t(250, 'diamond', 'Reframe legend')] },
  { id: 'calm', name: 'Calming', emoji: 'wind', pose: 'breatheIn', unit: 'calming sessions', unitOne: 'calming session', verb: 'Finished', tiers: [t(1, 'bronze', 'First deep breath'), t(10, 'silver', 'Steady breather'), t(30, 'gold', 'Calm habit'), t(100, 'platinum', 'Zen regular'), t(250, 'diamond', 'Master of calm')] },
  { id: 'journal', name: 'Journaling', emoji: 'notebook', pose: 'read', unit: 'journal entries', unitOne: 'journal entry', verb: 'Wrote', tiers: [t(1, 'bronze', 'First page'), t(7, 'silver', 'A week of words'), t(30, 'gold', 'Chapter one'), t(100, 'platinum', 'Storyteller'), t(250, 'diamond', 'Keeper of the diary')] },
  { id: 'focus', name: 'Focus', emoji: 'rocket', pose: 'focus', unit: 'focus blocks', unitOne: 'focus block', verb: 'Finished', tiers: [t(1, 'bronze', 'First block'), t(10, 'silver', 'In the zone'), t(50, 'gold', 'Deep worker'), t(150, 'platinum', 'Flow state'), t(400, 'diamond', 'Focus legend')] },
  { id: 'worry', name: 'Worries', emoji: 'worry', pose: 'stretch', unit: 'worries processed', unitOne: 'worry processed', verb: 'Processed', tiers: [t(1, 'bronze', 'Parked one'), t(5, 'silver', 'Letting go'), t(20, 'gold', 'Worry tamer'), t(50, 'platinum', 'Calm under pressure'), t(120, 'diamond', 'Worry whisperer')] },
  { id: 'anchors', name: 'Anchors', emoji: 'target', pose: 'champ', unit: 'days with every anchor done', unitOne: 'day with every anchor done', verb: 'Completed', tiers: [t(1, 'bronze', 'Anchored'), t(7, 'silver', 'Anchor week'), t(30, 'gold', 'Anchor month'), t(100, 'platinum', 'Rock solid'), t(300, 'diamond', 'Unshakeable')] },
  { id: 'sleep', name: 'Sleep', emoji: 'sleep', pose: 'nap', unit: 'nights logged', unitOne: 'night logged', verb: 'Logged', tiers: [t(1, 'bronze', 'First night'), t(7, 'silver', 'Sleep week'), t(30, 'gold', 'Sleep tracker'), t(100, 'platinum', 'Rested regular'), t(300, 'diamond', 'Dream keeper')] },
  { id: 'streak', name: 'Streak', emoji: 'fire', pose: 'celebrate', unit: 'day streak', unitOne: 'day streak', verb: 'Reached a', tiers: [t(3, 'bronze', 'Warming up'), t(7, 'silver', 'One week'), t(14, 'gold', 'Two weeks strong'), t(30, 'platinum', 'A whole month'), t(100, 'diamond', 'Hundred-day club')] },
  { id: 'days', name: 'Showing up', emoji: 'seedling', pose: 'wave', unit: 'active days', unitOne: 'active day', verb: 'Showed up on', tiers: [t(7, 'bronze', 'Seedling'), t(30, 'silver', 'Sprout'), t(100, 'gold', 'Growing strong'), t(250, 'platinum', 'Deep roots'), t(365, 'diamond', 'A full year')] },
  { id: 'hours', name: 'Focus time', emoji: 'hourglass', pose: 'focus', unit: 'hours', unitOne: 'hour', verb: 'Focused for', tiers: [t(1, 'bronze', 'First hour'), t(5, 'silver', 'Five hours in'), t(20, 'gold', 'Deep diver'), t(50, 'platinum', 'Flow master'), t(100, 'diamond', 'Hundred hours')] },
  { id: 'collector', name: 'Collector', emoji: 'star', pose: 'party', unit: 'collectibles', unitOne: 'collectible', verb: 'Collected', tiers: [t(1, 'bronze', 'First find'), t(5, 'silver', 'Starter collection'), t(12, 'gold', 'Collector'), t(24, 'platinum', 'Curator'), t(36, 'diamond', 'Completionist')] },
]
export const familyById = (id: FamilyId) => FAMILIES.find(f => f.id === id)!

export interface AchievementData {
  thoughts: { createdAt: string; alternateThought: string }[]
  sessions: { createdAt: string; completed: boolean }[]
  journal: { createdAt: string }[]
  focus: { createdAt: string; completed: boolean; actualSec?: number }[]
  worries: { status: string; reviewedAt: string | null }[]
  anchorDays: { day: string; done: number; total: number }[]
  sleepDates: string[]
  /** Days (YYYY-MM-DD) on which a collectible was bought, one entry per item. */
  collectDays: string[]
  /** Days that count towards the streak (activity plus rest days). */
  streakDays: string[]
}

export interface Achievement {
  id: string; family: FamilyId; tier: Tier; tierIndex: number; tiersInFamily: number
  title: string; text: string; emoji: string; pose: PoseName; at: number; coins: number
  /** Where the family count stands now. */
  count: number; progress: number
  unlocked: boolean; day: string | null
}

const days = (isos: string[]) => isos.map(dayKey).sort()
/** Entry n is the day the n-th full hour of finished focus time was reached. */
function hoursReached(focus: AchievementData['focus']): string[] {
  const done = focus.filter(f => f.completed && (f.actualSec ?? 0) > 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), out: string[] = []
  let sec = 0
  for (const f of done) { sec += f.actualSec!; while (out.length < Math.floor(sec / 3600)) out.push(dayKey(f.createdAt)) }
  return out
}

/** Family → the day of every qualifying event, oldest first (so the n-th entry is the day the n-th one happened). */
export function familyDays(d: AchievementData): Record<Exclude<FamilyId, 'streak'>, string[]> {
  const active = new Set<string>()
  const add = (xs: string[]) => xs.forEach(x => active.add(x))
  const checkin = days(d.thoughts.map(x => x.createdAt)), calm = days(d.sessions.filter(s => s.completed).map(s => s.createdAt))
  const journal = days(d.journal.map(x => x.createdAt)), focus = days(d.focus.filter(f => f.completed).map(f => f.createdAt))
  const worry = days(d.worries.filter(w => w.reviewedAt && (w.status === 'let-go' || w.status === 'actionable')).map(w => w.reviewedAt!))
  add(checkin); add(calm); add(journal); add(focus); add(worry)
  return {
    checkin, calm, journal, focus, worry,
    reframe: days(d.thoughts.filter(x => x.alternateThought.trim()).map(x => x.createdAt)),
    anchors: d.anchorDays.filter(a => a.total > 0 && a.done >= a.total).map(a => a.day).sort(),
    sleep: [...new Set(d.sleepDates)].sort(),
    days: [...active].sort(),
    hours: hoursReached(d.focus),
    collector: [...d.collectDays].sort(),
  }
}

/** Every achievement with its unlock day (the day the threshold was crossed) or null. */
export function achievements(d: AchievementData): Achievement[] {
  const fd = familyDays(d), out: Achievement[] = []
  for (const fam of FAMILIES) {
    const streak = fam.id === 'streak' ? streakMilestoneDays(d.streakDays, fam.tiers.map(x => x.at)) : null
    const list = fam.id === 'streak' ? [] : fd[fam.id]
    // "Streak" counts the best run ever reached, so progress doesn't fall back after a gap.
    const count = fam.id === 'streak' ? longestRun(d.streakDays) : list.length
    fam.tiers.forEach((tier, i) => {
      const day = streak ? streak.get(tier.at) ?? null : list.length >= tier.at ? list[tier.at - 1] : null
      out.push({
        id: `${fam.id}-${tier.at}`, family: fam.id, tier: tier.tier, tierIndex: i, tiersInFamily: fam.tiers.length,
        title: tier.title, text: fam.id === 'streak' ? `Kept a ${tier.at}-day streak` : `${fam.verb} ${tier.at} ${tier.at === 1 ? fam.unitOne : fam.unit}`, emoji: fam.emoji, pose: fam.pose, at: tier.at,
        coins: TIER_COINS[tier.tier], count, progress: Math.min(1, count / tier.at), unlocked: day !== null, day,
      })
    })
  }
  return out
}

/** Day on which a run of consecutive days first reaches `n`, for each n in `targets` (only those ever reached). */
export function streakMilestoneDays(days: string[], targets: number[]): Map<number, string> {
  const sorted = [...new Set(days)].sort(), out = new Map<number, string>()
  let run = 0, prev: string | null = null
  for (const d of sorted) {
    run = prev && shift(prev, 1) === d ? run + 1 : 1
    for (const t of targets) if (run >= t && !out.has(t)) out.set(t, d)
    prev = d
  }
  return out
}

/** Longest run of consecutive days. */
export function longestRun(daysList: string[]): number {
  const m = streakMilestoneDays(daysList, Array.from({ length: 400 }, (_, i) => i + 1))
  return m.size ? Math.max(...m.keys()) : 0
}

/** Newly unlocked since `seen` (ids already congratulated), the most valuable first. `seen === null` means first run: nothing to celebrate. */
export function newlyUnlocked(all: Achievement[], seen: string[] | null): Achievement[] {
  if (!seen) return []
  const have = new Set(seen)
  return all.filter(a => a.unlocked && !have.has(a.id)).sort((a, b) => b.tierIndex - a.tierIndex || b.at - a.at)
}

/** Per family: the unlocked tiers and the next one to aim for. */
export function familyProgress(all: Achievement[]) {
  return FAMILIES.map(fam => {
    const mine = all.filter(a => a.family === fam.id), got = mine.filter(a => a.unlocked), next = mine.find(a => !a.unlocked) ?? null
    return { fam, got, next, count: mine[0]?.count ?? 0, total: mine.length }
  })
}
