import { createClient } from '@supabase/supabase-js'
import { isNative } from './native'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseUrl = url
export const supabaseKey = key

/**
 * PKCE: links and OAuth redirects carry a one-time `code` that is useless without the verifier kept on this device,
 * instead of putting session tokens in the URL (which another app registered for the same custom scheme could read).
 * In the iPhone app the URL is handled by our own listener, so the library's URL detection stays off there.
 */
export const supabase = url && key
  ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: !isNative(), persistSession: true, autoRefreshToken: true } })
  : null
export const cloudEnabled = supabase !== null
