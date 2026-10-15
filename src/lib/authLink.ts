import { parseAuthLink } from './nativeCore'
import { supabase } from './supabase'

/** Finishes a sign-in from a brainpal://auth link. Returns an error message, or null on success / when it isn't ours. */
export async function completeAuthLink(url: string): Promise<string | null> {
  const link = parseAuthLink(url)
  if (!link || !supabase) return null
  try {
    if (link.kind === 'error') return link.message
    if (link.kind === 'tokens') {
      const { error } = await supabase.auth.setSession({ access_token: link.access_token, refresh_token: link.refresh_token })
      if (error) return error.message
      if (link.type === 'recovery') window.dispatchEvent(new Event('bp:recovery'))
    } else {
      const { error } = await supabase.auth.exchangeCodeForSession(link.code)   // recovery codes also fire PASSWORD_RECOVERY
      if (error) return error.message
    }
    return null
  } catch (e) { return e instanceof Error ? e.message : 'Sign-in link failed' }
}
