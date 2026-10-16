import assert from 'node:assert/strict'
import { SCORES, scoreLength, normalizeFx, DEFAULT_FX, touchKind } from '../src/lib/sfx.ts'

// every effect is a short, quiet, audible score
for (const [name, notes] of Object.entries(SCORES)) {
  assert.ok(notes.length >= 1, name)
  for (const n of notes) { assert.ok(n.hz >= 200 && n.hz <= 4000, `${name} hz ${n.hz}`); assert.ok(n.dur > 0 && n.at >= 0, name); assert.ok((n.vol ?? 0.12) > 0 && (n.vol ?? 0.12) <= 0.2, `${name} stays quiet`) }
}
assert.deepEqual(Object.keys(SCORES).sort(), ['celebrate', 'levelup', 'oops', 'success'], 'sounds exist only for achievements, never for taps'); assert.ok(scoreLength('celebrate') < 1.5 && scoreLength('levelup') < 1.6, 'fanfares stay short')
assert.ok(scoreLength('levelup') > scoreLength('success'), 'bigger moment, bigger sound')
assert.ok(SCORES.success.every((n, i, a) => i === 0 || n.hz > a[i - 1].hz), 'success rises (a lift, never a drop)')
assert.ok(SCORES.oops.every((n, i, a) => i === 0 || n.hz < a[i - 1].hz), 'oops falls, softly')

// settings: on unless explicitly off; junk never crashes
assert.deepEqual(DEFAULT_FX, { sound: true, haptics: true })
for (const junk of [null, undefined, 'x', 5, [], {}]) assert.deepEqual(normalizeFx(junk), DEFAULT_FX)
assert.deepEqual(normalizeFx({ sound: false }), { sound: false, haptics: true }); assert.deepEqual(normalizeFx({ haptics: false, sound: 'no' }), { sound: true, haptics: false })

// which touches get feedback
const b = (classes = [], extra = {}) => touchKind({ tag: 'button', classes, ...extra })
assert.equal(b(['btn', 'primary']), 'press'); assert.equal(touchKind({ tag: 'button', classes: ['fab'] }), 'press')
for (const c of ['chip', 'ig', 'tab', 'sticker', 'qbtn']) assert.equal(b([c]), 'select', c)
assert.equal(b(['btn']), 'select'); assert.equal(touchKind({ tag: 'button', role: 'switch', classes: ['switch'] }), 'select'); assert.equal(touchKind({ tag: 'div', role: 'tab', classes: [] }), 'select')
assert.equal(touchKind({ tag: 'input', inputType: 'checkbox', classes: [] }), 'select'); assert.equal(touchKind({ tag: 'input', inputType: 'range', classes: [] }), null); assert.equal(touchKind({ tag: 'input', inputType: 'text', classes: [] }), null)
assert.equal(b(['btn', 'primary'], { disabled: true }), null, 'disabled = silent'); assert.equal(b(['btn', 'primary'], { off: true }), null, 'data-fx=off opts out')
assert.equal(touchKind({ tag: 'div', classes: ['card'] }), null)
console.log('sfx ok')
