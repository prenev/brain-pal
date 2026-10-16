// Renders Wobbi's poses and the Fluent emoji into the widget extension's asset catalog (ios-native/Widgets/Assets.xcassets).
// Widgets are SwiftUI and can't draw our SVGs, so they get PNGs made from the same drawings. Re-run after changing
// lib/pal.ts or adding emoji: `npm run widget:assets` (then `python3 scripts/ios-patch.py`). The output is committed.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { palSvg, POSE_NAMES } from '../src/lib/pal.ts'
import { EMOJI } from '../src/lib/emojiData.ts'

const out = new URL('../ios-native/Widgets/Assets.xcassets/', import.meta.url).pathname
const PAL_PX = 360, EMOJI_PX = 120

const art = [
  ...POSE_NAMES.map(p => ({ name: `pal-${p}`, px: PAL_PX, svg: palSvg(p, { size: PAL_PX, label: '' }) })),
  ...Object.keys(EMOJI).map(e => ({ name: `emoji-${e}`, px: EMOJI_PX, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${EMOJI_PX}" height="${EMOJI_PX}">${EMOJI[e]}</svg>` })),
]

for (const d of ['pal', 'emoji']) rmSync(`${out}${d}`, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
writeFileSync(`${out}Contents.json`, JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2) + '\n')
const browser = await chromium.launch({ executablePath: chromiumPath() })
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const a of art) {
  const folder = `${out}${a.name.split('-')[0]}/`
  mkdirSync(folder, { recursive: true })
  writeFileSync(`${folder}Contents.json`, JSON.stringify({ info: { author: 'xcode', version: 1 }, properties: { 'provides-namespace': false } }, null, 2) + '\n')
  await page.setViewportSize({ width: a.px, height: a.px })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${a.svg}</body></html>`)
  const set = `${folder}${a.name}.imageset/`
  mkdirSync(set, { recursive: true })
  await page.locator('svg').first().screenshot({ path: `${set}${a.name}.png`, omitBackground: true })
  writeFileSync(`${set}Contents.json`, JSON.stringify({ images: [{ idiom: 'universal', filename: `${a.name}.png` }], info: { author: 'xcode', version: 1 } }, null, 2) + '\n')
}
await browser.close()
console.log(`${art.length} widget images → ios-native/Widgets/Assets.xcassets`)
