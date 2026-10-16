// npm run sprites → the mascot's art kit
//   assets/pal-poses.png        every pose on a transparent background (4 × 4 grid of 256 px cells)
//   assets/pal-animations.png   one row per animation, 4 frames each (breathe, wave, cheer, walk, workout, sleep)
//   assets/pal-sprites.json     frame coordinates for both sheets
//   public/pal-sprites.svg      SVG <symbol> sprite (one per pose)
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { writeFileSync } from 'node:fs'
import { palSvg, POSE_NAMES, ANIMATIONS, spriteSymbols } from '../src/lib/pal.ts'

const root = new URL('../', import.meta.url).pathname
const CELL = 256, COLS = 4
const browser = await chromium.launch({ executablePath: chromiumPath() })
const sheet = async (file, cols, rows, cells) => {
  const p = await browser.newPage({ viewport: { width: cols * CELL, height: rows * CELL } })
  await p.setContent(`<body style="margin:0;background:transparent;display:grid;grid-template-columns:repeat(${cols},${CELL}px);grid-auto-rows:${CELL}px">${cells.map(c => `<div>${palSvg(c, { size: CELL, label: '' })}</div>`).join('')}</body>`)
  await p.screenshot({ path: `${root}assets/${file}`, omitBackground: true }); await p.close()
}
const poseRows = Math.ceil(POSE_NAMES.length / COLS)
await sheet('pal-poses.png', COLS, poseRows, POSE_NAMES)
const anims = Object.entries(ANIMATIONS)
await sheet('pal-animations.png', 4, anims.length, anims.flatMap(([, frames]) => frames))
await browser.close()
const json = {
  cell: CELL,
  poses: { image: 'pal-poses.png', frames: Object.fromEntries(POSE_NAMES.map((n, i) => [n, { x: (i % COLS) * CELL, y: Math.floor(i / COLS) * CELL, w: CELL, h: CELL }])) },
  animations: { image: 'pal-animations.png', fps: 6, rows: Object.fromEntries(anims.map(([n, frames], r) => [n, frames.map((pose, i) => ({ pose, x: i * CELL, y: r * CELL, w: CELL, h: CELL }))])) },
}
writeFileSync(`${root}assets/pal-sprites.json`, JSON.stringify(json, null, 2) + '\n')
writeFileSync(`${root}public/pal-sprites.svg`, spriteSymbols())
console.log(`pal sprites written: ${POSE_NAMES.length} poses, ${anims.length} animations`)
