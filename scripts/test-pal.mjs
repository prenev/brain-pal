import assert from 'node:assert/strict'
import { POSES, POSE_NAMES, POSE_LABEL, ANIMATIONS, palSvg, palBody, iconSvg, spriteSymbols, poseSpec } from '../src/lib/pal.ts'

assert.ok(POSE_NAMES.length >= 14)
for (const n of POSE_NAMES) {
  const svg = palSvg(n)
  assert.doesNotMatch(svg, /NaN|undefined|null|Infinity/, `${n}: no broken numbers`)
  const open = (svg.match(/<g[\s>]/g) ?? []).length, close = (svg.match(/<\/g>/g) ?? []).length
  assert.equal(open, close, `${n}: balanced <g>`)
  assert.match(svg, /^<svg [^>]*viewBox="0 0 200 200"/); assert.match(svg, /<\/svg>$/)
  assert.ok(POSE_LABEL[n], `${n} has an accessible label`)
  assert.match(svg, /role="img" aria-label="Wobbi/, `${n} is labelled by default`)
  assert.match(palSvg(n, { label: '' }), /aria-hidden="true"/); assert.doesNotMatch(palSvg(n, { label: '' }), /aria-label/)
  assert.ok(palBody(n).includes('class="arm armR"') && palBody(n).includes('class="arm armL"'), `${n} has arms the CSS can animate`)
  assert.ok(palBody(n).includes('class="eyes"'), `${n} has eyes the CSS can blink`)
}
assert.equal(new Set(POSE_NAMES.map(n => palBody(n))).size, POSE_NAMES.length, 'every pose looks different')
assert.deepEqual(Object.keys(POSE_LABEL).sort(), [...POSE_NAMES].sort(), 'a label for every pose and nothing extra')
assert.match(palSvg('idle', { label: 'a "quoted" label' }), /aria-label="a &quot;quoted&quot; label"/, 'labels are escaped')
assert.match(palSvg('idle', { size: 64 }), /width="64" height="64"/)

// arms: 0 hangs down, 90 is out sideways, 180 is up; left and right mirror each other
const endOf = (svg, cls) => { const m = svg.match(new RegExp(`class="arm ${cls}"><line x1="([\\d.-]+)" y1="([\\d.-]+)" x2="([\\d.-]+)" y2="([\\d.-]+)"`)); return m.slice(1).map(Number) }
const [rx0, ry0, rx1, ry1] = endOf(palBody('cheer'), 'armR'), [lx0, , lx1, ly1] = endOf(palBody('cheer'), 'armL')
assert.ok(ry1 < ry0, 'cheering raises the arm (hand above the shoulder)'); assert.ok(rx1 > rx0 && lx1 < lx0, 'arms swing outward on their own side')
const [, hy0, , hy1] = endOf(palBody('worried'), 'armR'); assert.ok(hy1 > hy0, 'a relaxed arm hangs down'); void ly1
assert.equal(poseSpec('squat').legs, 'squat'); assert.equal(poseSpec('idle').eyes, 'open')
for (const [k, spec] of Object.entries(POSES)) for (const key of ['armL', 'armR']) if (key in spec) assert.ok(spec[key] >= -60 && spec[key] <= 180, `${k}.${key} is a sane angle`)

// animations only use real poses and have 4 frames (the sprite sheet is 4 columns wide)
for (const [name, frames] of Object.entries(ANIMATIONS)) { assert.equal(frames.length, 4, name); for (const f of frames) assert.ok(POSE_NAMES.includes(f), `${name} → ${f}`) }
assert.ok(ANIMATIONS.breathe.includes('breatheIn') && ANIMATIONS.breathe.includes('breatheOut'))

// icon + sprite
const icon = iconSvg(); assert.match(icon, /viewBox="0 0 512 512"/); assert.ok(icon.includes(palBody('idle'))); assert.doesNotMatch(icon, /NaN/)
const sprite = spriteSymbols(); for (const n of POSE_NAMES) assert.ok(sprite.includes(`id="pal-${n}"`), n)
console.log('pal: all tests passed')
