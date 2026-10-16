import { chromium } from 'playwright-core'
import { chromiumPath } from './chromium.mjs'
import { palSvg, POSE_NAMES } from '../src/lib/pal.ts'
const b = await chromium.launch({ executablePath: chromiumPath() })
const p = await b.newPage({ viewport: { width: 1100, height: 760 } })
await p.setContent(`<body style="margin:0;background:#171d2b;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:8px">${POSE_NAMES.map(n => `<div style="color:#fff;font:12px sans-serif;text-align:center">${palSvg(n, { size: 170 })}<br>${n}</div>`).join('')}</body>`)
await p.screenshot({ path: process.argv[2] ?? '/tmp/pal-preview.png' }); await b.close()
