import assert from 'node:assert/strict'
import { inkFor, isHex, shade, themeVars } from '../src/lib/theme.ts'
assert.equal(shade('#808080', 0), '#808080'); assert.equal(shade('#ffffff', -0.5), '#808080'); assert.equal(shade('#000000', 0.5), '#808080')
assert.equal(shade('#35d07f', -1), '#000000'); assert.equal(shade('#35d07f', 1), '#ffffff'); assert.equal(shade('#35d07f', 9), '#ffffff', 'factor is clamped')
assert.match(shade('#4aa8ff', -0.3), /^#[0-9a-f]{6}$/)
assert.equal(inkFor('#ffffff'), '#0b1a14'); assert.equal(inkFor('#000000'), '#ffffff'); assert.equal(inkFor('#ffa63d'), '#0b1a14'); assert.equal(inkFor('#35d07f'), '#0b1a14')
assert.deepEqual(themeVars(null), null); assert.deepEqual(themeVars('red'), null); assert.deepEqual(themeVars('#12345'), null); assert.equal(themeVars('javascript:alert(1)'), null)
assert.deepEqual(Object.keys(themeVars('#4aa8ff')), ['--accent', '--accent-dark', '--accent-ink']); assert.equal(themeVars('#4AA8FF')['--accent'], '#4AA8FF')
assert.equal(isHex('#abcdef'), true); assert.equal(isHex('#abcdeg'), false); assert.equal(isHex(5), false)
console.log('theme: all tests passed')
