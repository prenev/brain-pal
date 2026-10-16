import assert from 'node:assert/strict'
import { RELEASES, compareVersions, unseenReleases } from '../src/lib/whatsnew.ts'
import { APP_VERSION } from '../src/lib/appInfo.ts'

assert.equal(compareVersions('1.0.0', '1.0.0'), 0); assert.equal(compareVersions('1.2.0', '1.10.0'), -1); assert.equal(compareVersions('2.0', '1.9.9'), 1); assert.equal(compareVersions('1.0', '1.0.0'), 0)
const R = [{ version: '1.2.0', items: [] }, { version: '1.1.0', items: [] }, { version: '1.0.0', items: [] }, { version: '2.0.0', items: [] }]
assert.deepEqual(unseenReleases(null, '1.2.0', R), [], 'a fresh install announces nothing')
assert.deepEqual(unseenReleases('1.0.0', '1.2.0', R).map(r => r.version), ['1.2.0', '1.1.0'], 'everything you missed, newest first, never a version you do not run yet')
assert.deepEqual(unseenReleases('1.2.0', '1.2.0', R), [], 'nothing new once seen')
assert.deepEqual(unseenReleases('1.5.0', '1.2.0', R), [], 'a downgrade shows nothing')
// the shipped list is sane and covers the version being built
assert.ok(RELEASES.length >= 1 && RELEASES.some(r => r.version === APP_VERSION), 'RELEASES must contain notes for the current version')
for (const r of RELEASES) { assert.match(r.version, /^\d+\.\d+\.\d+$/); assert.ok(r.items.length >= 1 && r.items.length <= 5, 'short lists only'); for (const i of r.items) assert.ok(i.emoji && i.title && i.text.length < 140, i.title) }
assert.deepEqual(RELEASES.map(r => r.version), [...RELEASES.map(r => r.version)].sort((a, b) => compareVersions(b, a)), 'newest first')
console.log('whatsnew: all tests passed')
