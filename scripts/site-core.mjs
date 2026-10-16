// Renders the legal documents (src/lib/legal.ts) into small standalone HTML pages for App Store Connect links.
import { APP_NAME, DOCS, SITE_URL } from '../src/lib/legal.ts'

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const linkify = s => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" rel="noopener">$1</a>')

const CSS = `
:root{--bg:#fff;--fg:#1b2340;--mut:#5b6785;--card:#f3f6fb;--acc:#1f9d63}
@media (prefers-color-scheme:dark){:root{--bg:#0e1726;--fg:#e8edf8;--mut:#9aa8c7;--card:#16233b;--acc:#35d07f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:28px 18px 64px}header{display:flex;align-items:center;gap:12px;margin-bottom:6px}header img{width:44px;height:44px;border-radius:11px}
header a{color:var(--fg);font-weight:800;text-decoration:none;font-size:20px}h1{font-size:30px;margin:18px 0 8px}h2{font-size:20px;margin:28px 0 6px}p,li{color:var(--fg)}
.intro{color:var(--mut)}a{color:var(--acc)}nav{display:flex;flex-wrap:wrap;gap:14px;margin:12px 0 0}nav a{font-weight:700}footer{margin-top:40px;color:var(--mut);font-size:14px}
.card{background:var(--card);border-radius:16px;padding:16px 18px;margin:12px 0}`

const NAV = [['privacy', 'Privacy Policy'], ['terms', 'Terms of Service'], ['support', 'Support'], ['licenses', 'Open-source notices']]

const shell = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${esc(APP_NAME)}</title><meta name="color-scheme" content="light dark"><link rel="icon" href="icon.png"><style>${CSS}</style></head>
<body><main><header><img src="icon.png" alt=""><a href="index.html">${esc(APP_NAME)}</a></header>
<nav aria-label="Pages">${NAV.map(([id, t]) => `<a href="${id}.html">${t}</a>`).join('')}</nav>
${body}
<footer>© 2026 · ${esc(APP_NAME)} is a self-help tool, not medical care. If you might be in danger call your local emergency number.</footer></main></body></html>`

export function renderDoc(doc) {
  const secs = doc.sections.map(s => `<h2>${esc(s.h)}</h2>${(s.p ?? []).map(p => `<p>${linkify(p)}</p>`).join('')}${s.li ? `<ul>${s.li.map(l => `<li>${linkify(l)}</li>`).join('')}</ul>` : ''}`).join('\n')
  return shell(doc.title, `<h1>${esc(doc.title)}</h1><p class="intro">${linkify(doc.intro)}</p>\n${secs}`)
}

export function renderIndex() {
  return shell(APP_NAME, `<h1>${esc(APP_NAME)}</h1><p class="intro">A gentle diary, thought records and an anxiety toolkit: mood check-ins, journaling, breathing, grounding, worry time and small daily anchors. Works on your device without an account.</p>
<div class="card"><b>Legal & help</b><ul>${NAV.map(([id, t]) => `<li><a href="${id}.html">${t}</a></li>`).join('')}</ul></div>
<p class="intro">Site: ${esc(SITE_URL)}</p>`)
}

export function renderSite() {
  const files = { 'index.html': renderIndex() }
  for (const id of ['privacy', 'terms', 'support', 'licenses']) files[`${id}.html`] = renderDoc(DOCS[id]())
  return files
}
