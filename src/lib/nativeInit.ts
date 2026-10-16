import { Keyboard } from '@capacitor/keyboard'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { LocalNotifications } from '@capacitor/local-notifications'
import { completeAuthLink } from './authLink'
import { parseRouteLink } from './nativeCore'
import type { Route } from './rituals.ts'

export const ROUTES: (Route | 'focus')[] = ['breathe', 'checkin', 'journal', 'anchors', 'focus']
export const routeEvent = 'bp:route'

/** One-time setup inside the iPhone app. Every step is best-effort: a missing plugin must never stop the app booting. */
export async function initNative() {
  try { await StatusBar.setStyle({ style: Style.Dark }) } catch { /* light status-bar text on our dark UI */ }
  try { await Keyboard.setAccessoryBarVisible({ isVisible: false }) } catch { /* the ↑ ↓ ✓ bar only takes room from the writing */ }
  try {
    // brainpal://auth… opened from an email link (confirm / magic link / password reset)
    await App.addListener('appUrlOpen', async ({ url }) => {
      const go = parseRouteLink(url)
      if (go) { window.dispatchEvent(new CustomEvent(routeEvent, { detail: go })); return }
      const problem = await completeAuthLink(url)
      if (problem) console.warn('auth link failed:', problem)
    })
  } catch { /* App plugin unavailable */ }
  try {
    // tapping a reminder opens the matching tool (the route comes from our own scheduled notification, but is still allow-listed)
    await LocalNotifications.addListener('localNotificationActionPerformed', ev => {
      const route = (ev.notification?.extra as { route?: string } | undefined)?.route
      if (route && (ROUTES as string[]).includes(route)) window.dispatchEvent(new CustomEvent(routeEvent, { detail: route }))
    })
  } catch { /* notifications plugin unavailable */ }
}
