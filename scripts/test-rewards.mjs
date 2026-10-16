import assert from 'node:assert/strict'
import { ALL_ANCHORS_BONUS, balance, canBuy, earnings, itemById, MAX_COINS_PER_DAY, ownedThemes, REST_DAYS_PER_MONTH, restDays, RULES, SHOP, spent, total } from '../src/lib/rewards.ts'

const at = (day, h = 12) => `${day}T${String(h).padStart(2, '0')}:00:00`
const data = (o = {}) => ({ thoughts: [], sessions: [], journal: [], focus: [], worries: [], anchorDays: [], sleepDates: [], guardAt: [], collectDays: [], streakDays: [], ...o })
const sum = e => e.reduce((a, x) => a + x.coins, 0)
const thought = (createdAt, alternateThought = '') => ({ createdAt, alternateThought })
const noAch = e => e.filter(x => x.reason !== 'achievement')   // achievements are tested in test-achievements.mjs

// nothing in, nothing out
assert.deepEqual(earnings(data()), [])

// the economy is gentle: a day is worth a handful of coins, never dozens
assert.ok(MAX_COINS_PER_DAY <= 40, `the most you can earn in a day is ${MAX_COINS_PER_DAY}`)
for (const r of Object.values(RULES)) assert.ok(r.coins <= 3 && r.cap <= 5)

// each source earns its coins; daily caps stop farming
assert.equal(sum(noAch(earnings(data({ thoughts: [thought(at('2026-10-15'))] })))), RULES.checkin.coins)
const many = n => Array.from({ length: n }, (_, i) => ({ createdAt: at('2026-10-15', 8 + i), completed: true, alternateThought: '' }))
assert.equal(sum(noAch(earnings(data({ thoughts: many(10) })))), RULES.checkin.cap * RULES.checkin.coins, 'only a few check-ins a day count')
assert.equal(sum(noAch(earnings(data({ sessions: many(9) })))), RULES.calm.cap * RULES.calm.coins)
assert.equal(sum(noAch(earnings(data({ journal: many(5) })))), RULES.journal.cap * RULES.journal.coins)
assert.equal(sum(noAch(earnings(data({ focus: many(9) })))), RULES.focus.cap * RULES.focus.coins)
// the cap is per day, not per history
assert.equal(sum(noAch(earnings(data({ thoughts: [...many(4), thought(at('2026-10-16'))] })))), RULES.checkin.cap * RULES.checkin.coins + RULES.checkin.coins)
// unfinished things and open worries earn nothing
assert.equal(sum(noAch(earnings(data({ sessions: [{ createdAt: at('2026-10-15'), completed: false }], focus: [{ createdAt: at('2026-10-15'), completed: false }] })))), 0)
const worries = [{ status: 'let-go', reviewedAt: at('2026-10-15') }, { status: 'actionable', reviewedAt: at('2026-10-15') }, { status: 'open', reviewedAt: null }, { status: 'let-go', reviewedAt: null }]
assert.equal(sum(noAch(earnings(data({ worries })))), 2 * RULES.worry.coins)

// anchors: per anchor done, plus a bonus when every one is done; days with no anchors or none done earn nothing
const a = noAch(earnings(data({ anchorDays: [{ day: '2026-10-14', done: 2, total: 3 }, { day: '2026-10-15', done: 3, total: 3 }, { day: '2026-10-13', done: 0, total: 3 }, { day: '2026-10-12', done: 0, total: 0 }] })))
assert.equal(sum(a), (2 + 3) * RULES.anchor.coins + ALL_ANCHORS_BONUS); assert.equal(a.filter(x => x.reason === 'anchors-all').length, 1)
// sleep: once per night, even if reported twice
assert.equal(sum(noAch(earnings(data({ sleepDates: ['2026-10-15', '2026-10-15', '2026-10-14'] })))), 2)

// unlocking an achievement pays its coins once, on the day it was reached
const first = earnings(data({ thoughts: [thought(at('2026-10-15'))] })).filter(x => x.reason === 'achievement')
assert.deepEqual(first.map(x => [x.day, x.coins, x.detail]), [['2026-10-15', 10, 'First check-in']])

// retroactive and idempotent: same data, same coins, newest day first
const full = data({ thoughts: many(2), sleepDates: ['2026-09-07'] })
assert.deepEqual(earnings(full), earnings(full)); const days = earnings(full).map(x => x.day); assert.deepEqual(days, [...days].sort().reverse())

// ---- shop rules ----
const now = new Date(2026, 9, 15, 12)
const ocean = itemById('theme-ocean'), rest = itemById('restday'), treat = itemById('treat')
assert.ok(SHOP.every(i => i.cost > 0 && i.name && i.blurb)); assert.equal(new Set(SHOP.map(i => i.id)).size, SHOP.length)
assert.deepEqual(canBuy(ocean, ocean.cost - 1, [], now), { ok: false, reason: 'You need 1 more coins.' })
assert.deepEqual(canBuy(ocean, ocean.cost, [], now), { ok: true })
const owned = [{ id: 'p1', itemId: 'theme-ocean', at: at('2026-10-10'), cost: ocean.cost }]
assert.deepEqual(canBuy(ocean, 5000, owned, now), { ok: false, reason: 'You already have this.' }); assert.deepEqual(ownedThemes(owned), ['theme-ocean'])
// treat needs a name; repeatable
assert.equal(canBuy(treat, 100, [], now).ok, false); assert.equal(canBuy(treat, 100, [], now, { note: '  ' }).ok, false); assert.equal(canBuy(treat, 100, [], now, { note: 'x'.repeat(61) }).ok, false)
assert.equal(canBuy(treat, 100, [{ id: 't', itemId: 'treat', at: 'x', cost: 30, note: 'tea' }], now, { note: 'a long walk' }).ok, true)
// rest day: today or yesterday only, once per day, limited per month
assert.equal(canBuy(rest, 100, [], now, { forDay: '2026-10-15' }).ok, true); assert.equal(canBuy(rest, 100, [], now, { forDay: '2026-10-14' }).ok, true)
for (const bad of [undefined, '2026-10-13', '2026-10-16', '2025-10-15']) assert.equal(canBuy(rest, 100, [], now, { forDay: bad }).ok, false, String(bad))
const taken = [{ id: 'r1', itemId: 'restday', at: 'x', cost: 40, forDay: '2026-10-14' }]
assert.deepEqual(canBuy(rest, 100, taken, now, { forDay: '2026-10-14' }), { ok: false, reason: 'That day is already covered.' }); assert.equal(canBuy(rest, 100, taken, now, { forDay: '2026-10-15' }).ok, true)
const two = [...taken, { id: 'r2', itemId: 'restday', at: 'x', cost: 40, forDay: '2026-10-10' }]
assert.match(canBuy(rest, 100, two, now, { forDay: '2026-10-15' }).reason, new RegExp(`limited to ${REST_DAYS_PER_MONTH} a month`))
assert.equal(canBuy(rest, 100, two, new Date(2026, 10, 1, 9), { forDay: '2026-11-01' }).ok, true, 'a new month resets the allowance')
assert.deepEqual(restDays(two), ['2026-10-14', '2026-10-10'])
// balance never goes negative from rules alone, and spending only reduces it
const earned = noAch(earnings(data({ thoughts: many(3) }))); assert.equal(balance(earned, []), 6); assert.equal(balance(earned, owned), 0, 'the balance is never negative (purchases are checked by canBuy)')
// regression: coins once went negative. Earnings are derived from your data, so deleting entries after spending used to shrink them. The high-water mark keeps what you earned.
const spentSome = [{ id: 'p1', itemId: 'ocean', at: new Date().toISOString(), cost: 4 }]
const afterDelete = noAch(earnings(data({ thoughts: many(1) })))   // 3 coins left after deleting an entry
assert.equal(balance(afterDelete, spentSome), 0, 'without a floor it would be -1: clamped')
assert.equal(balance(afterDelete, spentSome, 6), 2, 'with the 6 coins ever earned as the floor you still have 6 - 4')
assert.equal(balance(earned, [], 2), 6, 'the floor never lowers what you really have')
assert.equal(spent(owned), ocean.cost); assert.equal(total([]), 0)
console.log('rewards: all tests passed')
