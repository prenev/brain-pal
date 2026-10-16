import assert from 'node:assert/strict'
import { PRODUCT_ID, GRACE_MS, PRO_FEATURES, ALWAYS_FREE, NO_PRO, normalizeEntitlement, isPro, canUse, priceLine, DISCLOSURE, featureInfo } from '../src/lib/pro.ts'

assert.equal(PRODUCT_ID, 'com.brainpal.app.pro.monthly')
assert.equal(new Set(PRO_FEATURES.map(f => f.id)).size, PRO_FEATURES.length)
for (const f of PRO_FEATURES) assert.ok(f.title && f.blurb && f.emoji, f.id)
assert.deepEqual(PRO_FEATURES.map(f => f.id), ['analytics'], 'for now the paywall guards advanced analytics only')
assert.equal(featureInfo('analytics').title, 'Advanced analytics')

// ethics: safety and your own data are never sold
const everything = JSON.stringify(PRO_FEATURES).toLowerCase()
for (const never of ['sos', 'crisis', 'breath', 'export', 'delete', 'support']) assert.ok(!PRO_FEATURES.some(f => f.id === never), `${never} is not a Pro feature id`)
assert.ok(!/\b(sos|crisis|export|delete)\b/.test(everything.replace(/\bsos siren\b/g, '')), 'no Pro blurb sells safety or data rights')
assert.ok(ALWAYS_FREE.some(t => /SOS/.test(t)) && ALWAYS_FREE.some(t => /crisis/i.test(t)) && ALWAYS_FREE.some(t => /Exporting or deleting/.test(t)))

// entitlement parsing never grants by accident
assert.deepEqual(normalizeEntitlement(null), NO_PRO); assert.deepEqual(normalizeEntitlement('yes'), NO_PRO); assert.deepEqual(normalizeEntitlement({ active: true }), NO_PRO, 'active without an end date is not Pro')
assert.deepEqual(normalizeEntitlement({ active: 'true', until: 5 }).active, false); assert.equal(normalizeEntitlement({ active: true, until: NaN }).active, false)
assert.equal(normalizeEntitlement({ active: true, until: 1000, checkedAt: 3 }).active, true)

// grace window
const now = Date.UTC(2026, 9, 16)
const live = { active: true, until: now + 86400000, checkedAt: now }
assert.equal(isPro(live, now), true)
assert.equal(isPro({ ...live, until: now - 1000 }, now), true, 'just expired: still inside the grace window (offline renewals lag)')
assert.equal(isPro({ ...live, until: now - GRACE_MS - 1 }, now), false, 'long expired: not Pro')
assert.equal(isPro({ ...live, active: false }, now), false); assert.equal(isPro(NO_PRO, now), false)

// gating: advanced analytics needs Pro; nothing else is a Pro id any more
assert.equal(canUse('analytics', false), false); assert.equal(canUse('analytics', true), true)

// copy never invents prices
assert.equal(priceLine(null), 'Price shown by the App Store'); assert.equal(priceLine({}), 'Price shown by the App Store')
assert.equal(priceLine({ price: '$4.99' }), '$4.99 per month'); assert.equal(priceLine({ price: '$4.99', trialDays: 7 }), '7-day free trial, then $4.99 per month')
assert.match(DISCLOSURE('$4.99'), /auto-renewing/); assert.match(DISCLOSURE('$4.99'), /24 hours/); assert.match(DISCLOSURE('$4.99'), /\$4\.99 per month/); assert.match(DISCLOSURE(null), /Subscriptions/); assert.doesNotMatch(DISCLOSURE(null), /undefined|null/)
console.log('pro: all tests passed')
