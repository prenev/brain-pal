// Pure scheduling logic for reminders (no Deno/Supabase imports, so it is unit-testable in Node).

export const localDay = (d: Date | string, tz: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(d)) // YYYY-MM-DD

export const localHour = (d: Date, tz: string): number =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(d))

const shiftDay = (day: string, n: number): string => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Consecutive-day streak; stays alive until the end of the day after the last activity. */
export function streakFrom(days: Set<string>, today: string) {
  const activeToday = days.has(today)
  let cursor = activeToday ? today : shiftDay(today, -1), current = 0
  while (days.has(cursor)) { current++; cursor = shiftDay(cursor, -1) }
  return { current, activeToday }
}

export interface PlanInput {
  now: Date
  tz: string
  reminderHour: number
  lastSentOn: string | null
  activityDays: Set<string> // local YYYY-MM-DD days with any entry or breathing session
}

/** Returns the notification to send now, or null. Sends at most once per local day, inside a 3-hour window. */
export function planNotification(i: PlanInput): { title: string; body: string } | null {
  const today = localDay(i.now, i.tz)
  const hour = localHour(i.now, i.tz)
  if (i.lastSentOn === today) return null
  if (hour < i.reminderHour || hour >= i.reminderHour + 3) return null
  const { current, activeToday } = streakFrom(i.activityDays, today)
  if (activeToday) return null
  return current > 0
    ? { title: `Keep your ${current}-day streak 🔥`, body: 'A quick check-in before the day ends keeps it alive.' }
    : { title: 'How are you feeling?', body: 'A quick check-in takes about a minute.' }
}
