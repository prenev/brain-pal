// Renders public/icon.svg to the PNG sizes iOS/Android need, using Playwright's Chromium.
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch({ executablePath: chromiumPath() })
for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>*{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`)
  await page.screenshot({ path: new URL(`../public/${name}.png`, import.meta.url).pathname })
}
await browser.close()
