/** Pure logic for the iPhone app (no Capacitor / DOM imports) so it is unit-testable in Node. */

export type ImpactStyle = 'LIGHT' | 'MEDIUM' | 'HEAVY'
export interface Impact { at: number; style: ImpactStyle }

const styleFor = (ms: number): ImpactStyle => (ms <= 35 ? 'LIGHT' : ms <= 60 ? 'MEDIUM' : 'HEAVY')

/**
 * Translate a web vibration pattern ([on, off, on, …] in ms) into Taptic Engine taps.
 * iOS can't do long buzzes from JS, but a run of taps whose strength follows the "on" durations
 * feels like a swell (inhale: light→heavy) or a fade (exhale: heavy→light).
 */
export function toImpactSequence(pattern: number | number[]): Impact[] {
  if (typeof pattern === 'number') return [{ at: 0, style: styleFor(pattern) }]
  const out: Impact[] = []
  let t = 0
  pattern.forEach((ms, i) => { if (i % 2 === 0 && ms > 0) out.push({ at: t, style: styleFor(ms) }); t += ms })
  return out
}

export const REMINDER_BASE_ID = 7000
export const REMINDER_DAYS = 14   // iOS keeps at most 64 pending local notifications; we use 14

/** Local-time reminder moments for the next `days` days, skipping times already past (and today if already active). */
export function planReminderDates(now: Date, hour: number, days = REMINDER_DAYS, skipToday = false): Date[] {
  const out: Date[] = []
  for (let d = 0; d < days; d++) {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour, 0, 0, 0)
    if (t.getTime() <= now.getTime()) continue
    if (d === 0 && skipToday) continue
    out.push(t)
  }
  return out
}

export function reminderText(streak: number): { title: string; body: string } {
  return streak > 0
    ? { title: 'Keep your streak going 🔥', body: 'A quick check-in before the day ends keeps it alive.' }
    : { title: 'How are you feeling?', body: 'A quick check-in takes about a minute.' }
}

export type AuthLink = { kind: 'tokens'; access_token: string; refresh_token: string; type: string | null } | { kind: 'code'; code: string } | { kind: 'error'; message: string }

/** Parse brainpal://auth#access_token=…&refresh_token=… (magic link) or ?code=… (PKCE / OAuth). Null if not an auth link. */
export function parseAuthLink(raw: string): AuthLink | null {
  let u: URL
  try { u = new URL(raw) } catch { return null }
  if (u.protocol !== 'brainpal:' || u.hostname !== 'auth') return null
  const frag = new URLSearchParams(u.hash.replace(/^#/, ''))
  const q = u.searchParams
  const err = frag.get('error_description') ?? q.get('error_description') ?? frag.get('error') ?? q.get('error')
  if (err) return { kind: 'error', message: err }
  const access_token = frag.get('access_token'), refresh_token = frag.get('refresh_token')
  if (access_token && refresh_token) return { kind: 'tokens', access_token, refresh_token, type: frag.get('type') }
  const code = q.get('code') ?? frag.get('code')
  return code ? { kind: 'code', code } : null
}

/** Sessions that haven't been written to Apple Health yet, oldest first, with their start/end times (ms). */
export function pendingHealthSessions<T extends { id: string; createdAt: string; durationSec: number }>(sessions: T[], synced: Set<string>) {
  return sessions
    .filter(s => !synced.has(s.id) && s.durationSec >= 10)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(s => { const end = new Date(s.createdAt).getTime(); return { session: s, start: end - s.durationSec * 1000, end } })
}
