// Writes the legal documents as Markdown for the website repo (wobbi.app/privacy/ …).
// Usage: node scripts/export-legal-md.mjs <out-dir>
// The text comes from src/lib/legal.ts so the app, the App Store listing and the site never disagree.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOCS, LEGAL_UPDATED, OWNER } from '../src/lib/legal.ts'

const out = process.argv[2]
if (!out) { console.error('usage: node scripts/export-legal-md.mjs <out-dir>'); process.exit(1) }
// The website publishes under the product name until the owner puts a legal name in OWNER.developerName.
if (!OWNER.developerName) OWNER.developerName = 'Wobbi'
if (!OWNER.governingLaw) OWNER.governingLaw = 'the laws that apply where Wobbi’s publisher is based'
mkdirSync(out, { recursive: true })
for (const id of ['privacy', 'terms', 'support', 'licenses']) {
  const d = DOCS[id]()
  const md = [`# ${d.title}`, '', `**Last updated: ${LEGAL_UPDATED}**`, '', d.intro, '']
  for (const s of d.sections) {
    md.push(`## ${s.h}`, '')
    for (const p of s.p ?? []) md.push(p, '')
    if (s.li) { for (const l of s.li) md.push(`- ${l}`); md.push('') }
  }
  writeFileSync(join(out, `${id}.md`), md.join('\n'))
}
console.log('wrote', out)
