// npm run site → site/  (static pages: home, privacy, terms, support, open-source notices). Deployed by .github/workflows/pages.yml.
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { renderSite } from './site-core.mjs'
const out = new URL('../site/', import.meta.url)
mkdirSync(out, { recursive: true })
for (const [name, html] of Object.entries(renderSite())) writeFileSync(new URL(name, out), html)
copyFileSync(new URL('../public/icon-192.png', import.meta.url), new URL('icon.png', out))
console.log('site/ written')
