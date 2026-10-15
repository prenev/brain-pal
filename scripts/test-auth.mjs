import assert from 'node:assert/strict'
import { enabledProviders, fetchEnabledProviders, friendlyOAuthError, appleDisplayName } from '../src/lib/authCore.ts'

// enabledProviders: only google/apple, only when strictly true, stable order
assert.deepEqual(enabledProviders({ external: { email: true, apple: true, google: true, github: true } }), ['google', 'apple'])
assert.deepEqual(enabledProviders({ external: { google: false, apple: 'true' } }), [])
for (const bad of [null, undefined, 5, {}, { external: null }, 'x']) assert.deepEqual(enabledProviders(bad), [])

// fetchEnabledProviders never throws, hits the right URL with the key
let seen
const ok = async (u, init) => { seen = [u, init.headers.apikey]; return { ok: true, json: async () => ({ external: { google: true } }) } }
assert.deepEqual(await fetchEnabledProviders('https://x.supabase.co/', 'K', ok), ['google'])
assert.deepEqual(seen, ['https://x.supabase.co/auth/v1/settings', 'K'])
assert.deepEqual(await fetchEnabledProviders('https://x', 'K', async () => ({ ok: false })), [])
assert.deepEqual(await fetchEnabledProviders('https://x', 'K', async () => { throw new Error('offline') }), [])
assert.deepEqual(await fetchEnabledProviders('https://x', 'K', async () => ({ ok: true, json: async () => { throw new Error('bad json') } })), [])

// friendly errors
assert.match(friendlyOAuthError('Unsupported provider: provider is not enabled', 'google'), /Google sign-in isn’t switched on/)
assert.match(friendlyOAuthError('requested path is invalid: redirect URL not allowed', 'google'), /allow-list/)
assert.match(friendlyOAuthError('Unacceptable audience in id_token', 'apple'), /Apple rejected/)
assert.match(friendlyOAuthError('Failed to fetch', 'google'), /connection/)
assert.equal(friendlyOAuthError('something odd', 'google'), 'something odd')
assert.match(friendlyOAuthError('', 'apple'), /Apple sign-in didn’t complete/)

assert.equal(appleDisplayName('Ada', 'Lovelace'), 'Ada Lovelace')
assert.equal(appleDisplayName('Ada', null), 'Ada')
assert.equal(appleDisplayName(undefined, undefined), '')
console.log('auth: all tests passed')
