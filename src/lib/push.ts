import { supabase } from './supabase'

const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** iOS only exposes Web Push to PWAs added to the Home Screen (iOS 16.4+). */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

const b64ToU8 = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export async function enablePush(hour: number): Promise<'ok' | 'denied' | 'unconfigured' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'denied'
  if (!vapid || !supabase) return 'unconfigured'
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(vapid) }))
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint,
    subscription: sub.toJSON(),
    reminder_hour: hour,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  if (error) throw error
  return 'ok'
}
