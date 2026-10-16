import assert from 'node:assert/strict'
import { cardSvg, guardCard, guardTotals, canShareGuard, inviteMessage, inviteUrl, levelCard, stickerSvg, streakCard, APP_STORE_URL } from '../src/lib/share.ts'
import { markAsked, shouldAskReview, REVIEW_MAX_ASKS } from '../src/lib/review.ts'
import { parseRouteLink } from '../src/lib/nativeCore.ts'
import { POSE_NAMES } from '../src/lib/pal.ts'
import { SITE_URL } from '../src/lib/legal.ts'

// cards: numbers only, well-formed SVG, text escaped, plural right
const s1 = streakCard(1), s9 = streakCard(9)
assert.equal(s1.unit, 'day'); assert.equal(s9.unit, 'days'); assert.equal(s9.big, '9')
for (const c of [s1, s9, levelCard('Calming & <focus>', 3), guardCard({ challenges: 4, reps: 55, minutes: 40 }), guardCard({ challenges: 1, reps: 0, minutes: 5 })]) {
  const svg = cardSvg(c)
  assert.match(svg, /^<svg [^>]*viewBox="0 0 1080 1350"/); assert.ok(svg.endsWith('</svg>'))
  assert.ok(!/<text[^>]*>[^<]*[<>][^<]*<\/text>/.test(svg.replace(/&[lg]t;/g, '')), 'text is escaped')
  assert.match(svg, /Wobbi/)
}
assert.match(cardSvg(levelCard('Calming & <focus>', 3)), /CALMING &amp; &lt;FOCUS&gt;/)
assert.match(cardSvg(guardCard({ challenges: 4, reps: 55, minutes: 40 })), />55</)
assert.equal(guardCard({ challenges: 1, reps: 0, minutes: 5 }).unit, 'challenge')

// guard totals from events (bad numbers ignored)
const ev = (reps, minutes) => ({ id: 'x', at: '2026-10-01T10:00:00Z', challenge: 'pushups', reps, minutes })
assert.deepEqual(guardTotals([]), { challenges: 0, reps: 0, minutes: 0 }); assert.equal(canShareGuard(guardTotals([])), false)
assert.deepEqual(guardTotals([ev(10, 10), ev(0, 5), ev(NaN, 5)]), { challenges: 3, reps: 10, minutes: 20 })
assert.equal(canShareGuard(guardTotals([ev(1, 1)])), true)

// stickers exist for every pose, transparent (no background rect)
for (const p of POSE_NAMES) { const s = stickerSvg(p); assert.match(s, /viewBox="0 0 200 200"/); assert.ok(!/<rect[^>]*width="(100%|200|512)"/.test(s), p) }

// invite points at the site until an App Store link is set
assert.equal(inviteUrl(), APP_STORE_URL || SITE_URL); assert.ok(inviteMessage().includes(inviteUrl()))
assert.ok(!/notification|tracking|ads!/i.test(inviteMessage()) || /no ads/i.test(inviteMessage()))

// rating prompt: happy moment only, not in week one, rarely, at most 3 times
const day = 86_400_000, t0 = new Date('2026-01-01T00:00:00Z'), at = d => new Date(t0.getTime() + d * day)
const fresh = { firstSeen: t0.toISOString(), lastAsked: null, asks: 0 }
assert.equal(shouldAskReview(fresh, at(10), false), false, 'not at a neutral moment')
assert.equal(shouldAskReview(fresh, at(3), true), false, 'not in the first week')
assert.equal(shouldAskReview({ ...fresh, firstSeen: null }, at(30), true), false)
assert.equal(shouldAskReview(fresh, at(8), true), true)
const asked = markAsked(fresh, at(8)); assert.equal(asked.asks, 1)
assert.equal(shouldAskReview(asked, at(60), true), false, '120-day gap'); assert.equal(shouldAskReview(asked, at(130), true), true)
assert.equal(shouldAskReview({ ...asked, asks: REVIEW_MAX_ASKS }, at(900), true), false)

// Siri / Shortcuts links
assert.equal(parseRouteLink('brainpal://sos'), 'sos'); assert.equal(parseRouteLink(' BRAINPAL://Breathe/ '), 'breathe')
assert.equal(parseRouteLink('brainpal://checkin'), 'checkin'); assert.equal(parseRouteLink('brainpal://journal'), 'journal')
for (const bad of ['brainpal://auth', 'brainpal://auth?code=1', 'brainpal://sos?x=1', 'https://sos', 'brainpal://', 'brainpal://delete']) assert.equal(parseRouteLink(bad), null, bad)
console.log('share/review/links ok')
