import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { completeAuthLink } from './authLink'

/** One-time setup inside the iPhone app. Every step is best-effort: a missing plugin must never stop the app booting. */
export async function initNative() {
  try { await StatusBar.setStyle({ style: Style.Dark }) } catch { /* light status-bar text on our dark UI */ }
  try {
    // brainpal://auth… opened from an email link (confirm / magic link / password reset)
    await App.addListener('appUrlOpen', async ({ url }) => {
      const problem = await completeAuthLink(url)
      if (problem) console.warn('auth link failed:', problem)
    })
  } catch { /* App plugin unavailable */ }
}
