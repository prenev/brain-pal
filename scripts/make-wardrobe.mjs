// npm run wardrobe → Wobbi's wardrobe as art you can look at and ship
//   assets/wobbi-wardrobe.png          every accessory on Wobbi, transparent, 6 columns of 256 px cells
//   assets/wobbi-wardrobe-preview.png  the same on a dark card with names (for reviewing the art)
//   assets/wobbi-looks.png             complete outfits on different poses
//   assets/wobbi-wardrobe.json         cell coordinates, slot and rarity of every piece
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { writeFileSync } from 'node:fs'
import { palSvg } from '../src/lib/pal.ts'
import { ACCESSORIES, LOOKS } from '../src/lib/outfits.ts'
import { SHOP } from '../src/lib/shop.ts'

const root = new URL('../', import.meta.url).pathname
const out = process.argv[2] ?? `${root}assets/`
const CELL = 256, COLS = 6
const browser = await chromium.launch({ executablePath: chromiumPath() })
const render = async (file, cols, cells, { labels = false, bg = 'transparent' } = {}) => {
  const rows = Math.ceil(cells.length / cols), h = labels ? CELL + 34 : CELL
  const p = await browser.newPage({ viewport: { width: cols * CELL, height: rows * h } })
  await p.setContent(`<body style="margin:0;background:${bg};display:grid;grid-template-columns:repeat(${cols},${CELL}px);grid-auto-rows:${h}px;font-family:Nunito,Arial,sans-serif">${cells.map(c => `<div style="position:relative;${labels ? 'background:#161d2e;outline:1px solid #263250;outline-offset:-1px' : ''}">${palSvg(c.pose ?? 'idle', { size: CELL, label: '', outfit: c.outfit })}${labels ? `<div style="position:absolute;left:0;right:0;bottom:6px;text-align:center;color:#c9d6f2;font-weight:800;font-size:15px">${c.name}</div>` : ''}</div>`).join('')}</body>`)
  await p.screenshot({ path: `${out}${file}`, omitBackground: bg === 'transparent' }); await p.close()
}
const cells = ACCESSORIES.map(a => ({ name: a.name, outfit: { [a.slot]: a.id } }))
await render('wobbi-wardrobe.png', COLS, cells)
await render('wobbi-wardrobe-preview.png', COLS, cells, { labels: true, bg: '#0b101b' })
await render('wobbi-looks.png', 4, LOOKS.map(l => ({ name: l.name, pose: l.pose, outfit: l.outfit })), { labels: true, bg: '#0b101b' })
await browser.close()
const rarity = Object.fromEntries(SHOP.filter(i => i.kind === 'outfit').map(i => [i.id.replace('outfit-', ''), i.rarity]))
writeFileSync(`${out}wobbi-wardrobe.json`, JSON.stringify({ cell: CELL, columns: COLS, image: 'wobbi-wardrobe.png', pieces: Object.fromEntries(ACCESSORIES.map((a, i) => [a.id, { name: a.name, slot: a.slot, rarity: rarity[a.id] ?? null, x: (i % COLS) * CELL, y: Math.floor(i / COLS) * CELL, w: CELL, h: CELL }])), looks: LOOKS.map(l => ({ id: l.id, name: l.name, pose: l.pose, outfit: l.outfit })) }, null, 2) + '\n')
console.log(`wardrobe written: ${ACCESSORIES.length} pieces, ${LOOKS.length} looks`)
