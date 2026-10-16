import { dayKey } from './dates.ts'

/**
 * Rituals: a handful of gentle, purposeful reminders (e.g. breathe at 07:00 and at 21:30) scheduled on the iPhone.
 * Pure planning only. Each ritual opens the matching tool when tapped, and is skipped for today once you've already done it.
 */
export type RitualKind = 'breathe' | 'checkin' | 'journal' | 'anchors'
export type Route = 'breathe' | 'checkin' | 'journal' | 'anchors'

export interface Ritual {
  id: string
  kind: RitualKind
  label: string
  hour: number
  minute: number
  /** 0 = Sunday … 6 = Saturday */
  days: number[]
  enabled: boolean
}

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
export const DAYS_AHEAD = 14
/** iOS keeps at most 64 pending local notifications: 4 rituals x 14 days = 56, leaving headroom. */
export const MAX_RITUALS = 4
export const MAX_SCHEDULED = 60
export const RITUAL_BASE_ID = 8000
export const ID_STRIDE = 20

export const DEFAULT_RITUALS: Ritual[] = [
  { id: 'morning-breathe', kind: 'breathe', label: 'Morning breathe', hour: 7, minute: 0, days: ALL_DAYS, enabled: false },
  { id: 'evening-breathe', kind: 'breathe', label: 'Evening breathe', hour: 21, minute: 30, days: ALL_DAYS, enabled: false },
  { id: 'checkin', kind: 'checkin', label: 'Daily check-in', hour: 20, minute: 0, days: ALL_DAYS, enabled: false },
  { id: 'anchors', kind: 'anchors', label: 'Anchors nudge', hour: 12, minute: 0, days: ALL_DAYS, enabled: false },
]

/** What you've already done *today*, used to skip a ritual that would be redundant. */
export interface TodayDone { checkin: boolean; breathedAm: boolean; breathedPm: boolean; anchorsComplete: boolean; journaled: boolean }

export interface Planned { id: number; at: Date; ritualId: string; title: string; body: string; route: Route }

const half = (hour: number): 'am' | 'pm' => (hour < 12 ? 'am' : 'pm')

function skippedToday(r: Ritual, done: TodayDone): boolean {
  switch (r.kind) {
    case 'checkin': return done.checkin
    case 'journal': return done.journaled
    case 'anchors': return done.anchorsComplete
    case 'breathe': return half(r.hour) === 'am' ? done.breathedAm : done.breathedPm
  }
}

const COPY: Record<RitualKind, { title: string; bodies: string[] }> = {
  breathe: { title: 'A slow minute', bodies: ['Three slow breaths — in for 4, out for 6.', 'Let your shoulders drop. One calm minute?', 'Pause and breathe out longer than you breathe in.'] },
  checkin: { title: 'How are you feeling?', bodies: ['A quick check-in takes about a minute.', 'One tap is enough to log how today is going.'] },
  journal: { title: 'A few lines?', bodies: ['Write whatever is on your mind — it doesn’t have to be good.', 'Three things that went okay today?'] },
  anchors: { title: 'Your anchors', bodies: ['A small step on your anchors keeps the day on track.', 'Which anchor is the easiest one to tick next?'] },
}

/** Varied but deterministic wording (same day → same text). */
export function ritualText(kind: RitualKind, day: string): { title: string; body: string } {
  const c = COPY[kind]; let h = 0
  for (const ch of day + kind) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return { title: c.title, body: c.bodies[h % c.bodies.length] }
}

/** The next DAYS_AHEAD days of notifications, skipping the past, disabled rituals, other weekdays and today's already-done ones. */
export function planRituals(now: Date, rituals: Ritual[], done: TodayDone): Planned[] {
  const out: Planned[] = []
  rituals.slice(0, MAX_RITUALS).forEach((r, ri) => {
    if (!r.enabled) return
    for (let d = 0; d < DAYS_AHEAD; d++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, r.hour, r.minute, 0, 0)
      if (at.getTime() <= now.getTime() || !r.days.includes(at.getDay())) continue
      if (d === 0 && skippedToday(r, done)) continue
      const { title, body } = ritualText(r.kind, dayKey(at))
      out.push({ id: RITUAL_BASE_ID + ri * ID_STRIDE + d, at, ritualId: r.id, title, body, route: r.kind })
    }
  })
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED)
}

/** Every id a plan could ever use, so a reschedule can cancel the lot. */
export const allRitualIds = (): number[] => Array.from({ length: MAX_RITUALS * ID_STRIDE }, (_, i) => RITUAL_BASE_ID + i)

/** Existing users keep their single daily reminder as the "Daily check-in" ritual. */
export function migrateOldReminder(old: { enabled?: boolean; hour?: number } | null): Ritual[] {
  return DEFAULT_RITUALS.map(r => (r.id === 'checkin' && old && typeof old.hour === 'number' ? { ...r, hour: Math.min(23, Math.max(0, Math.floor(old.hour))), enabled: !!old.enabled } : { ...r }))
}

/** Sanitise stored rituals (corrupt or old data → defaults for anything invalid). */
export function normalizeRituals(raw: unknown): Ritual[] {
  if (!Array.isArray(raw)) return DEFAULT_RITUALS.map(r => ({ ...r }))
  return DEFAULT_RITUALS.map(def => {
    const s = raw.find((x): x is Partial<Ritual> => !!x && (x as Ritual).id === def.id)
    if (!s) return { ...def }
    const hour = Number.isInteger(s.hour) && s.hour! >= 0 && s.hour! <= 23 ? s.hour! : def.hour
    const minute = Number.isInteger(s.minute) && s.minute! >= 0 && s.minute! <= 59 ? s.minute! : def.minute
    const days = Array.isArray(s.days) ? [...new Set(s.days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : def.days
    return { ...def, hour, minute, days: days.length ? days : def.days, enabled: !!s.enabled }
  })
}

export const fmtTime = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
