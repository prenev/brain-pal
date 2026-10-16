import { LocalNotifications } from '@capacitor/local-notifications'
import { planReminderDates, reminderText, REMINDER_BASE_ID, REMINDER_DAYS } from './nativeCore'
import { allRitualIds, type Planned } from './rituals.ts'

const ids = () => Array.from({ length: REMINDER_DAYS + 1 }, (_, i) => ({ id: REMINDER_BASE_ID + i }))

export async function requestNotificationPermission(): Promise<boolean> {
  const cur = await LocalNotifications.checkPermissions()
  if (cur.display === 'granted') return true
  return (await LocalNotifications.requestPermissions()).display === 'granted'
}

export const cancelNativeReminders = () => LocalNotifications.cancel({ notifications: ids() })

/**
 * Schedules the next two weeks of daily reminders. Called again whenever activity changes, so a reminder
 * is dropped for today once you've checked in (the "only nudge if you haven't" rule, without a server).
 */
export async function scheduleNativeReminders(hour: number, opts: { skipToday: boolean; streak: number }) {
  await cancelNativeReminders()
  const { title, body } = reminderText(opts.streak)
  const dates = planReminderDates(new Date(), hour, REMINDER_DAYS, opts.skipToday)
  if (!dates.length) return
  await LocalNotifications.schedule({
    notifications: dates.map((at, i) => ({ id: REMINDER_BASE_ID + i, title, body, schedule: { at, allowWhileIdle: true } })),
  })
}

export async function sendNativeTest() {
  await LocalNotifications.schedule({ notifications: [{ id: REMINDER_BASE_ID + 99, title: 'Wobbi', body: 'Reminders are working. 🌱', schedule: { at: new Date(Date.now() + 2000) } }] })
}

/** Replace everything we had scheduled (old single reminder + rituals) with this plan. Each notification carries a `route` so a tap opens the right tool. */
export async function scheduleNativeRituals(plan: Planned[]) {
  await LocalNotifications.cancel({ notifications: [...ids(), ...allRitualIds().map(id => ({ id }))] })
  if (!plan.length) return
  await LocalNotifications.schedule({
    notifications: plan.map(p => ({ id: p.id, title: p.title, body: p.body, schedule: { at: p.at, allowWhileIdle: true }, extra: { route: p.route } })),
  })
}
