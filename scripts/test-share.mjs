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
for (const r of ['anchors', 'worry', 'park', 'guard', 'sleep', 'progress', 'coins', 'grounding']) assert.equal(parseRouteLink(`brainpal://${r}`), r, 'widget link ' + r)
for (const bad of ['brainpal://auth', 'brainpal://auth?code=1', 'brainpal://sos?x=1', 'https://sos', 'brainpal://', 'brainpal://delete']) assert.equal(parseRouteLink(bad), null, bad)
console.log('share/review/links ok')

// ---- achievement cards ----
{
  const { achievements } = await import('../src/lib/achievements.ts')
  const { achievementCardSvg, lookFromEquip } = await import('../src/lib/cards.ts')
  const { achievementShareCard, cardSvg: cs } = await import('../src/lib/share.ts')
  const { EMPTY_EQUIP } = await import('../src/lib/shop.ts')
  const all = achievements({ thoughts: Array.from({ length: 10 }, (_, i) => ({ createdAt: `2026-09-${String(i + 1).padStart(2, '0')}T10:00:00`, alternateThought: '' })), sessions: [], journal: [], focus: [], worries: [], anchorDays: [], sleepDates: [], guardAt: [], collectDays: [], streakDays: [] })
  const a = all.find(x => x.id === 'checkin-10')
  const svg = achievementCardSvg(a)
  assert.ok(svg.startsWith('<svg') && svg.includes('viewBox="0 0 1080 1350"') && svg.endsWith('</svg>'))
  for (const t of ['ACHIEVEMENT UNLOCKED', 'SILVER', 'Getting to know me', 'Logged 10 check-ins', 'Sep 10, 2026']) assert.ok(svg.includes(t), t)
  assert.equal((svg.match(/<svg/g) ?? []).length, 1, 'one svg: the emoji is inlined as a group')
  // text is escaped (nothing a person wrote is ever on a card, but be safe), the equipped title/outfit/card style appear
  assert.ok(!achievementCardSvg({ ...a, title: '<b>&"x' }).includes('<b>&"'))
  const look = lookFromEquip({ ...EMPTY_EQUIP, outfit: { head: 'crown' }, card: 'card-galaxy', title: 'title-captain' })
  const dressed = achievementCardSvg(a, look)
  for (const t of ['Calm Captain', 'acc-crown', '#2b1f5c']) assert.ok(dressed.includes(t), t)
  assert.ok(dressed.includes('<circle') && dressed.includes('opacity'), 'galaxy has stars')
  assert.ok(!svg.includes('acc-crown') && svg.includes('free · private'), 'default look has no outfit and the plain footer')
  // the share card wrapper dispatches to it; locked achievements are not shared (the UI only shares unlocked ones)
  assert.equal(cs(achievementShareCard(a), look), dressed); assert.equal(achievementShareCard(a).kind, 'achievement')
  // every achievement renders a card
  for (const x of all) assert.ok(achievementCardSvg(x).includes(x.title.replace(/&/g, '&amp;')), x.id)
}
