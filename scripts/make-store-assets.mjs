// Renders assets/icon-only.png (1024) + assets/splash.png (2732, dark) from public/icon.svg for `capacitor-assets`.
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { readFileSync, readdirSync } from 'node:fs'
const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
const exe = chromiumPath()
const browser = await chromium.launch({ executablePath: exe })
const shot = async (name, size, html) => {
  const p = await browser.newPage({ viewport: { width: size, height: size } })
  await p.setContent(`<style>*{margin:0}body{background:#0e1726}svg{display:block}</style>${html}`)
  await p.screenshot({ path: new URL(`../assets/${name}.png`, import.meta.url).pathname }); await p.close()
}
await shot('icon-only', 1024, svg.replace('<svg ', '<svg width="1024" height="1024" '))                        // iOS icons must be opaque (no alpha)
await shot('splash', 2732, `<div style="width:2732px;height:2732px;display:grid;place-items:center">${svg.replace('<svg ', '<svg width="720" height="720" style="border-radius:160px" ')}</div>`)
await browser.close()
console.log('assets/icon-only.png, assets/splash.png written')
