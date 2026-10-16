// Renders the mascot (public/icon.svg) into every icon / splash the app and the App Store need.
//   public/            PWA icons (192, 512, apple-touch 180)
//   ios/.../AppIcon    the single 1024 App Store icon (iOS draws the rounded corners; it must have NO alpha channel)
//   ios/.../Splash     launch image (mascot on the dark background)
//   assets/            sources for `capacitor-assets`
// Run: npm run icons   (needs python3 + Pillow only to strip the alpha channel)
import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { readFileSync, copyFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const root = new URL('../', import.meta.url).pathname
const svg = readFileSync(`${root}public/icon.svg`, 'utf8')
const BG = '#0e1726'
const browser = await chromium.launch({ executablePath: chromiumPath() })
const written = []
const shot = async (path, size, html) => {
  const p = await browser.newPage({ viewport: { width: size, height: size } })
  await p.setContent(`<style>*{margin:0}body{background:${BG}}svg{display:block}</style>${html}`)
  await p.screenshot({ path: `${root}${path}` }); await p.close(); written.push(path)
}
const full = size => svg.replace('<svg ', `<svg width="${size}" height="${size}" `)

for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) await shot(`public/${name}.png`, size, full(size))
await shot('assets/icon-only.png', 1024, full(1024))
await shot('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024, full(1024))
// splash: the mascot (rounded like an app icon) centred on the dark background
await shot('assets/splash.png', 2732, `<div style="width:2732px;height:2732px;display:grid;place-items:center">${svg.replace('<svg ', '<svg width="760" height="760" style="border-radius:170px" ')}</div>`)
copyFileSync(`${root}assets/splash.png`, `${root}assets/splash-dark.png`); written.push('assets/splash-dark.png')
const splashDir = 'ios/App/App/Assets.xcassets/Splash.imageset/'
for (const f of readdirSync(`${root}${splashDir}`).filter(f => f.endsWith('.png'))) { copyFileSync(`${root}assets/splash.png`, `${root}${splashDir}${f}`); written.push(splashDir + f) }
await browser.close()

// Apple rejects app icons with an alpha channel; Chromium always writes one, so flatten everything we made.
execFileSync('python3', ['-c', `
import sys
from PIL import Image
for p in sys.argv[1:]:
    im = Image.open(p); bg = Image.new('RGB', im.size, (14, 23, 38)); bg.paste(im, mask=im.split()[3] if im.mode == 'RGBA' else None); bg.save(p)
`, ...written.map(w => root + w)])
console.log(`${written.length} images written`)
