#!/usr/bin/env node
// One command from code to App Store Connect:
//   npm run release                  build → TestFlight → listing text, age rating, screenshots
//   npm run release -- --submit      … and submit that build for App Review (waits for Apple to process it first)
//   npm run release -- --screentime  include app blocking (needs Apple's approved Family Controls entitlement)
//   npm run release -- --no-meta     only the build
// Settings live in .env.release (git-ignored):  ASC_KEY_ID=…  ASC_ISSUER_ID=…  ASC_KEY_FILE=AuthKey_XXXX.p8  APPLE_TEAM_ID=…
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2), has = f => args.includes(`--${f}`)
const env = {}
if (fs.existsSync('.env.release')) for (const l of fs.readFileSync('.env.release', 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
const need = ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_FILE']
const missing = need.filter(k => !env[k])
if (missing.length) { console.error(`Missing in .env.release: ${missing.join(', ')}\nCreate the API key in App Store Connect → Users and Access → Integrations → Team Keys (Admin), put the .p8 in this folder, then:\n  ASC_KEY_ID=…\n  ASC_ISSUER_ID=…\n  ASC_KEY_FILE=AuthKey_XXXX.p8\n  APPLE_TEAM_ID=ZY687MSU74`); process.exit(1) }
if (!fs.existsSync(env.ASC_KEY_FILE)) { console.error(`Can't find the key file ${env.ASC_KEY_FILE}`); process.exit(1) }

const run = (cmd, extra = {}) => { console.log(`\n▶ ${cmd}`); execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...extra } }) }
const lane = (name, extra = {}) => run(`fastlane ios ${name}`, { ASC_KEY_ID: env.ASC_KEY_ID, ASC_ISSUER_ID: env.ASC_ISSUER_ID, ASC_KEY_P8: fs.readFileSync(env.ASC_KEY_FILE, 'utf8'), APPLE_TEAM_ID: env.APPLE_TEAM_ID || 'ZY687MSU74', FASTLANE_SKIP_UPDATE_CHECK: '1', FASTLANE_HIDE_CHANGELOG: '1', ...extra })

try {
  run('npm run store:check')                                   // the legal pages + listing must be complete
} catch { console.error('\nFill in what store:check lists first (it is what App Review reads).'); process.exit(1) }

const flags = ['--apple-signin', ...(has('screentime') ? ['--screentime'] : [])]
try {
  run('npm run ios:sync')
  run(`python3 scripts/ios-patch.py ${flags.join(' ')}`)
  lane('beta', has('submit') ? { WAIT_FOR_PROCESSING: '1' } : {})
  if (!has('no-meta')) { lane('metadata'); if (fs.existsSync('store/screenshots')) lane('screenshots') }
  if (has('submit')) lane('submit')
  console.log(has('submit') ? '\n✓ Uploaded and submitted for review.' : '\n✓ Uploaded to TestFlight. Run with --submit to send it to App Review.')
} finally {
  try { execSync('git checkout ios/App/App/App.entitlements', { stdio: 'ignore' }) } catch { /* nothing to restore */ }
}
