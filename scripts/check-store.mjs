// npm run store:check [-- --online]  → what is still blank before you can press "Submit for Review". Exit 1 while anything is missing.
import { OWNER, SITE_URL } from '../src/lib/legal.ts'
import { APP, REVIEW, LISTING } from './store-metadata.mjs'

const todo = []
const need = (ok, what, where) => { if (!ok) todo.push(`  ✗ ${what}\n      → ${where}`) }
need(OWNER.developerName, 'developer name', 'src/lib/legal.ts → OWNER.developerName (your legal name or company, as on your Apple Developer account)')
need(OWNER.contactEmail, 'public contact e-mail', 'src/lib/legal.ts → OWNER.contactEmail (shown in the privacy policy, terms and support page)')
need(OWNER.governingLaw, 'governing law for the Terms', 'src/lib/legal.ts → OWNER.governingLaw, e.g. "the laws of England and Wales"')
need(!APP.copyright.includes('['), 'copyright line', 'scripts/store-metadata.mjs → APP.copyright, e.g. "2026 Jane Doe"')
need(REVIEW.first_name && REVIEW.last_name && REVIEW.email_address && REVIEW.phone_number, 'App Review contact (name, e-mail, phone)', 'scripts/store-metadata.mjs → REVIEW')
console.log('Mechanical content is generated and tested; these are the things only you can fill in:\n')
if (todo.length) console.log(todo.join('\n') + '\n\nThen run: npm run site && npm run store:meta   (and commit)')

if (process.argv.includes('--online')) {
  for (const u of [LISTING.privacy_url, LISTING.support_url, LISTING.marketing_url]) {
    try { const r = await fetch(u); console.log(`${r.ok ? '  ✓' : '  ✗'} ${u} → ${r.status}`); if (!r.ok) todo.push(u) } catch (e) { console.log(`  ✗ ${u} → ${e.message}`); todo.push(u) }
  }
} else console.log(`(run with -- --online to check ${SITE_URL} is live; enable GitHub Pages first)`)
console.log(todo.length ? `\n${todo.length} thing(s) left.` : '\nAll set.')
process.exit(todo.length ? 1 : 0)
