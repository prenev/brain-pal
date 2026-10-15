import { supabase } from './supabase'
import { isNative } from './native'
import { cancelNativeReminders, requestNotificationPermission, scheduleNativeReminders, sendNativeTest } from './nativeReminders'

const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
const K = 'bp.reminder'

export const pushSupported = () =>
  isNative() || 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** iOS only exposes Web Push to PWAs added to the Home Screen (iOS 16.4+). */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

export const isIOS = () => /iPhone|iPad/.test(navigator.userAgent)

const b64ToU8 = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export interface ReminderState { enabled: boolean; hour: number }

export function getReminder(): ReminderState {
  try {
    const v = JSON.parse(localStorage.getItem(K) ?? 'null')
    if (v && typeof v.hour === 'number') {
      if (isNative()) return { enabled: !!v.enabled, hour: v.hour } // permission is managed by iOS Settings
      // Permission can be revoked in system settings; reflect that.
      return { enabled: !!v.enabled && 'Notification' in window && Notification.permission === 'granted', hour: v.hour }
    }
  } catch { /* ignore */ }
  return { enabled: false, hour: 20 }
}
const save = (s: ReminderState) => { localStorage.setItem(K, JSON.stringify(s)); window.dispatchEvent(new Event('bp:reminder')) }

export const fmtHour = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'am' : 'pm'}`

export type EnableResult = 'ok' | 'denied' | 'unconfigured' | 'unsupported'

/** Subscribe this device and store the chosen hour. Also used to change the hour of an existing subscription. */
export async function enablePush(hour: number): Promise<EnableResult> {
  if (isNative()) {
    // iPhone app: reminders are scheduled on-device (no server, VAPID or Supabase needed)
    if (!(await requestNotificationPermission())) return 'denied'
    save({ enabled: true, hour })
    await scheduleNativeReminders(hour, { skipToday: false, streak: 0 })
    return 'ok'
  }
  if (!pushSupported()) return 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'denied'
  save({ enabled: true, hour })
  if (!vapid || !supabase) return 'unconfigured'
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(vapid) }))
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint,
    subscription: sub.toJSON(),
    reminder_hour: hour,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    last_sent_on: null,
  })
  if (error) throw error
  return 'ok'
}

export async function disablePush(): Promise<void> {
  const cur = getReminder()
  save({ enabled: false, hour: cur.hour })
  if (isNative()) { await cancelNativeReminders(); return }
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}

/** Local notification through the service worker — verifies permission + display without any server. */
export async function sendTest(): Promise<boolean> {
  if (isNative()) { try { await sendNativeTest(); return true } catch { return false } }
  if (!pushSupported() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Brain Pal', { body: 'Reminders are working. 🌱', icon: '/icon-192.png', badge: '/icon-192.png' })
  return true
}
