import { supabase } from './supabase'
import { isNative, Mindful } from './native'
import { completeAuthLink } from './authLink'
import { appleDisplayName, friendlyOAuthError, type OAuthProvider } from './authCore'

export const NATIVE_REDIRECT = 'brainpal://auth'

export interface SignInResult { error?: string; cancelled?: boolean }
const cancelled = (e: unknown) => (e as { code?: string } | null)?.code === 'CANCELLED'

/**
 * Social sign-in.
 *  - Web: normal OAuth redirect.
 *  - iPhone app, Google: the system web-auth sheet (Google blocks embedded web views), returning a one-time code.
 *  - iPhone app, Apple: Apple's native sheet → identity token → Supabase `signInWithIdToken` (no web key rotation needed).
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<SignInResult> {
  if (!supabase) return { error: 'Not connected to Supabase' }
  try {
    if (!isNative()) {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin } })
      return error ? { error: friendlyOAuthError(error.message, provider) } : {}
    }

    if (provider === 'apple') {
      const apple = await Mindful.appleSignIn()
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: apple.idToken, nonce: apple.nonce })
      if (error) return { error: friendlyOAuthError(error.message, provider) }
      const name = appleDisplayName(apple.givenName, apple.familyName)   // Apple only sends the name the first time
      if (name) await supabase.auth.updateUser({ data: { name } }).catch(() => {})
      return {}
    }

    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true } })
    if (error || !data?.url) return { error: friendlyOAuthError(error?.message ?? '', provider) }
    const { url } = await Mindful.webAuth({ url: data.url, callbackScheme: 'brainpal' })
    const problem = await completeAuthLink(url)
    return problem ? { error: friendlyOAuthError(problem, provider) } : {}
  } catch (e) {
    if (cancelled(e)) return { cancelled: true }
    const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)
    return { error: provider === 'apple' && isNative() && /1000|unknown|not (supported|available)|entitlement/i.test(msg)
      ? 'Sign in with Apple isn’t enabled in this build. It needs a paid Apple Developer account — see docs/IOS.md.'
      : friendlyOAuthError(msg, provider) }
  }
}
