import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { parseAuthLink } from './nativeCore'
import { supabase } from './supabase'

/** One-time setup inside the iPhone app. Every step is best-effort: a missing plugin must never stop the app booting. */
export async function initNative() {
  try { await StatusBar.setStyle({ style: Style.Dark }) } catch { /* light status-bar text on our dark UI */ }
  try {
    await App.addListener('appUrlOpen', async ({ url }) => {
      const link = parseAuthLink(url)            // brainpal://auth#access_token=… from a magic / recovery email
      if (!link || !supabase) return
      try {
        if (link.kind === 'tokens') {
          await supabase.auth.setSession({ access_token: link.access_token, refresh_token: link.refresh_token })
          if (link.type === 'recovery') window.dispatchEvent(new Event('bp:recovery'))
        } else if (link.kind === 'code') await supabase.auth.exchangeCodeForSession(link.code)
      } catch (e) { console.warn('auth link failed', e) }
    })
  } catch { /* App plugin unavailable */ }
}
