import type { PoseName } from './pal.ts'
import { dayKey } from './dates.ts'

/**
 * Focus guard ("anti brain rot"): apps you pick stay paused until you earn a few minutes with a quick activity.
 * Pure rules only; the actual blocking is iOS Screen Time (ios-native/MindfulPlugin.swift), its only UI now is "Block apps during focus" (components/FocusHub.tsx); the challenge rules are kept for old data.
 * Honest by design: reps are an honour system (we can't watch you), so we only stop the cheapest cheating (tapping fast).
 */
export type ChallengeId = 'pushups' | 'squats' | 'plank' | 'walk' | 'breathe' | 'journal'
export interface Challenge { id: ChallengeId; label: string; kind: 'reps' | 'timer' | 'breathe' | 'journal'; target: number; unit: string; pose: PoseName; how: string }

export const CHALLENGES: Challenge[] = [
  { id: 'pushups', label: 'Push-ups', kind: 'reps', target: 10, unit: 'reps', pose: 'flex', how: 'Do a push-up, then tap. One tap per rep.' },
  { id: 'squats', label: 'Squats', kind: 'reps', target: 15, unit: 'reps', pose: 'squat', how: 'Do a squat, then tap. One tap per rep.' },
  { id: 'plank', label: 'Plank', kind: 'timer', target: 30, unit: 'seconds', pose: 'flex', how: 'Hold a plank (or a wall sit) until the clock ends.' },
  { id: 'walk', label: 'Walk', kind: 'timer', target: 120, unit: 'seconds', pose: 'walkA', how: 'Get up and walk around for two minutes.' },
  { id: 'breathe', label: 'Slow breathing', kind: 'breathe', target: 60, unit: 'seconds', pose: 'breatheIn', how: 'One minute of slow breathing with Wobbi.' },
  { id: 'journal', label: 'Write a line', kind: 'journal', target: 12, unit: 'characters', pose: 'think', how: 'Write one honest line about how you feel.' },
]
export const challengeOf = (id: string) => CHALLENGES.find(c => c.id === id)

export const UNLOCK_OPTIONS = [5, 10, 15, 30] as const
export const MIN_REP_GAP_MS = 900          // one rep per ~second: tapping faster than that is not exercise

export interface GuardConfig { enabled: boolean; challenges: ChallengeId[]; unlockMinutes: number; appCount: number }
export const DEFAULT_GUARD: GuardConfig = { enabled: false, challenges: ['pushups', 'breathe'], unlockMinutes: 10, appCount: 0 }

export interface GuardEvent { id: string; at: string; challenge: ChallengeId; minutes: number; reps: number }

/** Old / corrupt data never crashes the app: anything unexpected falls back to the defaults. */
export function normalizeGuard(raw: unknown): GuardConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<GuardConfig>
  const ids = new Set(CHALLENGES.map(c => c.id))
  const challenges = Array.isArray(r.challenges) ? [...new Set(r.challenges.filter((c): c is ChallengeId => ids.has(c as ChallengeId)))] : DEFAULT_GUARD.challenges
  return {
    enabled: r.enabled === true,
    challenges: challenges.length ? challenges : DEFAULT_GUARD.challenges,
    unlockMinutes: (UNLOCK_OPTIONS as readonly number[]).includes(r.unlockMinutes as number) ? (r.unlockMinutes as number) : DEFAULT_GUARD.unlockMinutes,
    appCount: Number.isInteger(r.appCount) && (r.appCount as number) >= 0 ? (r.appCount as number) : 0,
  }
}
export function normalizeEvents(raw: unknown): GuardEvent[] {
  if (!Array.isArray(raw)) return []
  const ids = new Set(CHALLENGES.map(c => c.id))
  return raw.filter((e): e is GuardEvent => !!e && typeof e.id === 'string' && typeof e.at === 'string' && ids.has(e.challenge))
    .map(e => ({ ...e, minutes: Number.isFinite(e.minutes) ? e.minutes : 0, reps: Number.isFinite(e.reps) ? e.reps : 0 })).slice(-200)
}

/** Can the setup be switched on? Needs apps chosen and at least one way to earn time. */
export const canEnable = (c: GuardConfig, native: boolean) => native && c.appCount > 0 && c.challenges.length > 0

/* ---- rep counting ---- */
export interface RepState { reps: number; lastAt: number | null }
export const newReps = (): RepState => ({ reps: 0, lastAt: null })
/** A tap counts only if it is at least MIN_REP_GAP_MS after the previous counted one. */
export function addRep(s: RepState, now: number): { state: RepState; counted: boolean } {
  if (s.lastAt !== null && now - s.lastAt < MIN_REP_GAP_MS) return { state: s, counted: false }
  return { state: { reps: s.reps + 1, lastAt: now }, counted: true }
}
export const repsDone = (s: RepState, target: number) => s.reps >= target

/* ---- unlock window ---- */
export const unlockUntil = (now: number, minutes: number) => now + Math.max(0, minutes) * 60_000
export const isUnlocked = (until: number | null | undefined, now: number) => typeof until === 'number' && until > now
export const minutesLeft = (until: number, now: number) => Math.max(0, Math.ceil((until - now) / 60_000))

/* ---- this week ---- */
export function weekStats(events: GuardEvent[], now: Date) {
  const start = new Date(now); start.setDate(start.getDate() - 6); const from = dayKey(start)
  const mine = events.filter(e => dayKey(e.at) >= from && dayKey(e.at) <= dayKey(now))
  return { challenges: mine.length, reps: mine.reduce((a, e) => a + e.reps, 0), minutesEarned: mine.reduce((a, e) => a + e.minutes, 0) }
}
