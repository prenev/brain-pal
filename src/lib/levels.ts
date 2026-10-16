import { dayKey } from './dates.ts'

/** Skill levels from consistent practice. Levels only ever go up. Thresholds are the counts needed for level 1…10. */
export const LEVEL_THRESHOLDS = [1, 3, 7, 15, 30, 50, 80, 120, 180, 250]
export const MAX_LEVEL = LEVEL_THRESHOLDS.length

export type SkillId = 'calming' | 'reframing' | 'worry' | 'consistency' | 'journaling' | 'focus'
export interface SkillDef { id: SkillId; name: string; emoji: string; unit: string; unitOne: string; blurb: string }
export const SKILLS: SkillDef[] = [
  { id: 'calming', name: 'Calming', emoji: 'wind', unit: 'calming sessions', unitOne: 'calming session', blurb: 'Breathing and grounding sessions you finished.' },
  { id: 'reframing', name: 'Reframing', emoji: 'bulb', unit: 'thoughts reframed', unitOne: 'thought reframed', blurb: 'Entries where you wrote a more balanced thought.' },
  { id: 'worry', name: 'Worry mastery', emoji: 'worry', unit: 'worries processed', unitOne: 'worry processed', blurb: 'Parked worries you let go of or made a plan for.' },
  { id: 'consistency', name: 'Showing up', emoji: 'seedling', unit: 'active days', unitOne: 'active day', blurb: 'Days you did anything in Wobbi.' },
  { id: 'journaling', name: 'Journaling', emoji: 'notebook', unit: 'journal entries', unitOne: 'journal entry', blurb: 'Times you wrote in your journal.' },
  { id: 'focus', name: 'Small steps', emoji: 'rocket', unit: 'focus sessions', unitOne: 'focus session', blurb: 'Tiny steps you started and finished.' },
]

export interface Level { level: number; count: number; next: number | null; toNext: number | null; progress: number }

/** Level for a count: 0 until the first threshold. `progress` is 0..1 toward the next level (1 at max). */
export function levelFor(count: number): Level {
  const c = Math.max(0, Math.floor(count))
  let level = 0
  while (level < MAX_LEVEL && c >= LEVEL_THRESHOLDS[level]) level++
  if (level >= MAX_LEVEL) return { level, count: c, next: null, toNext: null, progress: 1 }
  const prev = level === 0 ? 0 : LEVEL_THRESHOLDS[level - 1], next = LEVEL_THRESHOLDS[level]
  return { level, count: c, next, toNext: next - c, progress: (c - prev) / (next - prev) }
}

export interface LevelData {
  thoughts: { createdAt: string; alternateThought: string }[]
  sessions: { createdAt: string; completed: boolean }[]
  worries: { createdAt: string; status: string; reviewedAt: string | null }[]
  journal?: { createdAt: string }[]
  focus?: { createdAt: string; completed: boolean }[]
}

export function skillCounts(d: LevelData): Record<SkillId, number> {
  const days = new Set<string>()
  d.thoughts.forEach(t => days.add(dayKey(t.createdAt))); d.sessions.forEach(s => days.add(dayKey(s.createdAt)))
  d.worries.forEach(w => w.reviewedAt && days.add(dayKey(w.reviewedAt))); (d.journal ?? []).forEach(j => days.add(dayKey(j.createdAt)))
  ;(d.focus ?? []).forEach(f => f.completed && days.add(dayKey(f.createdAt)))
  return {
    calming: d.sessions.filter(s => s.completed).length,
    reframing: d.thoughts.filter(t => t.alternateThought.trim()).length,
    worry: d.worries.filter(w => w.status === 'let-go' || w.status === 'actionable').length,
    consistency: days.size,
    journaling: (d.journal ?? []).length,
    focus: (d.focus ?? []).filter(f => f.completed).length,
  }
}

export const skillLevels = (d: LevelData): Record<SkillId, Level> =>
  Object.fromEntries(Object.entries(skillCounts(d)).map(([k, v]) => [k, levelFor(v)])) as Record<SkillId, Level>

export interface LevelUp { skill: SkillId; from: number; to: number; count: number }
/** Skills whose level rose since `seen`. A skill with no remembered level counts from 0 only if `seen` is non-null (first run stays quiet). */
export function levelUps(seen: Partial<Record<SkillId, number>> | null, now: Record<SkillId, Level>): LevelUp[] {
  if (!seen) return []
  return (Object.keys(now) as SkillId[]).filter(k => now[k].level > (seen[k] ?? 0)).map(k => ({ skill: k, from: seen[k] ?? 0, to: now[k].level, count: now[k].count }))
}
/** Plain evidence line for a level-up, e.g. "You've rewritten 15 thoughts." */
export function evidenceLine(skill: SkillId, count: number): string {
  const n = (one: string, many: string) => `${count} ${count === 1 ? one : many}`
  switch (skill) {
    case 'calming': return `You’ve finished ${n('calming session', 'calming sessions')}.`
    case 'reframing': return `You’ve written a more balanced thought on ${n('entry', 'entries')}.`
    case 'worry': return `You’ve processed ${n('parked worry', 'parked worries')}.`
    case 'consistency': return `You’ve shown up on ${n('day', 'different days')}.`
    case 'journaling': return `You’ve written ${n('journal entry', 'journal entries')}.`
    case 'focus': return `You’ve finished ${n('small step', 'small steps')}.`
  }
}
