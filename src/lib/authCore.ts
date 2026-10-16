/** Pure sign-in helpers (no DOM / Capacitor imports) so they are unit-testable in Node. */

export type OAuthProvider = 'google' | 'apple'
const ORDER: OAuthProvider[] = ['google', 'apple']
export const PROVIDER_LABEL: Record<OAuthProvider, string> = { google: 'Google', apple: 'Apple' }

/** Social providers switched on in the project, from the public /auth/v1/settings response. Unknown / malformed → none. */
export function enabledProviders(settings: unknown): OAuthProvider[] {
  const ext = (settings as { external?: Record<string, unknown> } | null)?.external
  return ORDER.filter(p => ext?.[p] === true)
}

/** Asks Supabase which providers are enabled. Never throws: if anything goes wrong, show no social buttons. */
export async function fetchEnabledProviders(url: string, key: string, doFetch: typeof fetch): Promise<OAuthProvider[]> {
  try {
    const res = await doFetch(`${url.replace(/\/+$/, '')}/auth/v1/settings`, { headers: { apikey: key } })
    return res.ok ? enabledProviders(await res.json()) : []
  } catch { return [] }
}

/** Turns raw provider / Supabase errors into something a person can act on. */
export function friendlyOAuthError(raw: string, provider: OAuthProvider): string {
  const name = PROVIDER_LABEL[provider]
  if (/not enabled|unsupported provider|provider is disabled/i.test(raw)) return `${name} sign-in isn’t switched on for this project yet. Enable it under Supabase → Authentication → Sign In / Providers.`
  if (/redirect/i.test(raw) && /(allow|match|invalid)/i.test(raw)) return 'The app’s redirect address isn’t on Supabase’s allow-list. Add brainpal://auth under Authentication → URL Configuration.'
  if (/audience|client.?id|invalid.*(token|nonce)/i.test(raw)) return `${name} rejected the sign-in (client ID mismatch). Check the ${name} settings in Supabase against your bundle ID.`
  if (/network|failed to fetch|offline/i.test(raw)) return 'Couldn’t reach the sign-in service. Check your connection and try again.'
  return raw || `${name} sign-in didn’t complete. Please try again.`
}

/** Display name from Apple's one-time name fields. */
export const appleDisplayName = (given?: string | null, family?: string | null): string => [given, family].filter(Boolean).join(' ').trim()
