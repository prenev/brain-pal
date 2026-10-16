// npm run check:supabase  — verifies the live Supabase project the app is configured for (reads .env).
// Optional: CHECK_EMAIL / CHECK_PASSWORD = a throwaway test account (confirmed) for a full signed-in round trip.
import { existsSync } from 'node:fs'
import { runChecks, summarize } from './check-supabase-core.mjs'

if (existsSync('.env')) process.loadEnvFile('.env')
const results = await runChecks({ url: process.env.VITE_SUPABASE_URL, key: process.env.VITE_SUPABASE_ANON_KEY, fetch, email: process.env.CHECK_EMAIL, password: process.env.CHECK_PASSWORD })
const icon = { ok: '✓', warn: '!', fail: '✗' }
for (const r of results) console.log(`${icon[r.level]} ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
const { fail, warn } = summarize(results)
console.log(fail ? `\n${fail} problem(s) to fix${warn ? `, ${warn} note(s)` : ''}.` : `\nSupabase connection looks good${warn ? ` (${warn} note(s) above)` : ''}.`)
process.exit(fail ? 1 : 0)
