import assert from 'node:assert/strict'
import { ALL_ANCHORS_BONUS, balance, canBuy, earnings, itemById, MILESTONES, ownedThemes, REST_DAYS_PER_MONTH, restDays, RULES, SHOP, spent, streakMilestoneDays, total } from '../src/lib/rewards.ts'

const at = (day, h = 12) => `${day}T${String(h).padStart(2, '0')}:00:00`
const data = (o = {}) => ({ thoughts: [], sessions: [], journal: [], focus: [], worries: [], anchorDays: [], sleepDates: [], streakDays: [], ...o })
const sum = e => e.reduce((a, x) => a + x.coins, 0)

// nothing in, nothing out
assert.deepEqual(earnings(data()), [])

// each source earns its coins; daily caps stop farming
assert.equal(sum(earnings(data({ thoughts: [{ createdAt: at('2026-10-15') }] }))), 5)
const many = n => Array.from({ length: n }, (_, i) => ({ createdAt: at('2026-10-15', 8 + i), completed: true }))
assert.equal(sum(earnings(data({ thoughts: many(10) }))), RULES.checkin.cap * RULES.checkin.coins, 'only 3 check-ins a day count')
assert.equal(sum(earnings(data({ sessions: many(9) }))), RULES.calm.cap * RULES.calm.coins)
assert.equal(sum(earnings(data({ journal: many(5) }))), RULES.journal.cap * RULES.journal.coins)
assert.equal(sum(earnings(data({ focus: many(5) }))), RULES.focus.cap * RULES.focus.coins)
// the cap is per day, not per history
assert.equal(sum(earnings(data({ thoughts: [...many(4), { createdAt: at('2026-10-16') }] }))), 15 + 5)
// unfinished things and open worries earn nothing
assert.equal(sum(earnings(data({ sessions: [{ createdAt: at('2026-10-15'), completed: false }], focus: [{ createdAt: at('2026-10-15'), completed: false }] }))), 0)
const worries = [{ status: 'let-go', reviewedAt: at('2026-10-15') }, { status: 'actionable', reviewedAt: at('2026-10-15') }, { status: 'open', reviewedAt: null }, { status: 'let-go', reviewedAt: null }]
assert.equal(sum(earnings(data({ worries }))), 2 * RULES.worry.coins)

// anchors: per anchor done, plus a bonus when every one is done; days with no anchors or none done earn nothing
const a = earnings(data({ anchorDays: [{ day: '2026-10-14', done: 2, total: 3 }, { day: '2026-10-15', done: 3, total: 3 }, { day: '2026-10-13', done: 0, total: 3 }, { day: '2026-10-12', done: 0, total: 0 }] }))
assert.equal(sum(a), 2 * 2 + 3 * 2 + ALL_ANCHORS_BONUS); assert.equal(a.filter(x => x.reason === 'anchors-all').length, 1)
// sleep: once per night, even if reported twice
assert.equal(sum(earnings(data({ sleepDates: ['2026-10-15', '2026-10-15', '2026-10-14'] }))), 4)

// streak milestones: dates are when the run first reached the length, awarded once, and need consecutive days
const run = n => Array.from({ length: n }, (_, i) => { const d = new Date(2026, 8, 1 + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })
const ms = streakMilestoneDays(run(8), MILESTONES.map(m => m.days))
assert.deepEqual([...ms.entries()], [[3, '2026-09-03'], [7, '2026-09-07']])
assert.deepEqual([...streakMilestoneDays(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05'], [3])], [], 'a gap resets the run')
assert.deepEqual([...streakMilestoneDays(['2026-12-30', '2026-12-31', '2027-01-01'], [3])], [[3, '2027-01-01']], 'across the year boundary')
assert.deepEqual([...streakMilestoneDays([], [3])], [])
const e100 = earnings(data({ streakDays: run(100) })).filter(x => x.reason === 'streak')
assert.deepEqual(e100.map(x => x.coins).sort((x, y) => x - y), MILESTONES.map(m => m.coins).sort((x, y) => x - y)); assert.equal(total(e100), 10 + 20 + 30 + 50 + 80 + 120)
assert.equal(earnings(data({ streakDays: run(2) })).length, 0)
// retroactive and idempotent: same data, same coins, newest day first
const full = data({ thoughts: many(2), streakDays: run(7), sleepDates: ['2026-09-07'] })
assert.deepEqual(earnings(full), earnings(full)); const days = earnings(full).map(x => x.day); assert.deepEqual(days, [...days].sort().reverse())

// ---- shop ----
const now = new Date(2026, 9, 15, 12)
const ocean = itemById('theme-ocean'), rest = itemById('restday'), treat = itemById('treat')
assert.ok(SHOP.every(i => i.cost > 0 && i.name && i.blurb)); assert.equal(new Set(SHOP.map(i => i.id)).size, SHOP.length)
assert.deepEqual(canBuy(ocean, 39, [], now), { ok: false, reason: 'You need 1 more coins.' })
assert.deepEqual(canBuy(ocean, 40, [], now), { ok: true })
const owned = [{ id: 'p1', itemId: 'theme-ocean', at: at('2026-10-10'), cost: 40 }]
assert.deepEqual(canBuy(ocean, 500, owned, now), { ok: false, reason: 'You already have this.' }); assert.deepEqual(ownedThemes(owned), ['theme-ocean'])
// treat needs a name; repeatable
assert.equal(canBuy(treat, 100, [], now).ok, false); assert.equal(canBuy(treat, 100, [], now, { note: '  ' }).ok, false); assert.equal(canBuy(treat, 100, [], now, { note: 'x'.repeat(61) }).ok, false)
assert.equal(canBuy(treat, 100, [{ id: 't', itemId: 'treat', at: 'x', cost: 25, note: 'tea' }], now, { note: 'a long walk' }).ok, true)
// rest day: today or yesterday only, once per day, limited per month
assert.equal(canBuy(rest, 100, [], now, { forDay: '2026-10-15' }).ok, true); assert.equal(canBuy(rest, 100, [], now, { forDay: '2026-10-14' }).ok, true)
for (const bad of [undefined, '2026-10-13', '2026-10-16', '2025-10-15']) assert.equal(canBuy(rest, 100, [], now, { forDay: bad }).ok, false, String(bad))
const taken = [{ id: 'r1', itemId: 'restday', at: 'x', cost: 30, forDay: '2026-10-14' }]
assert.deepEqual(canBuy(rest, 100, taken, now, { forDay: '2026-10-14' }), { ok: false, reason: 'That day is already covered.' }); assert.equal(canBuy(rest, 100, taken, now, { forDay: '2026-10-15' }).ok, true)
const two = [...taken, { id: 'r2', itemId: 'restday', at: 'x', cost: 30, forDay: '2026-10-10' }]
assert.match(canBuy(rest, 100, two, now, { forDay: '2026-10-15' }).reason, new RegExp(`limited to ${REST_DAYS_PER_MONTH} a month`))
// month boundary: yesterday = Oct 31 is a different month from the two taken in November? (taken are October)
assert.equal(canBuy(rest, 100, two, new Date(2026, 10, 1, 9), { forDay: '2026-11-01' }).ok, true, 'a new month resets the allowance')
assert.deepEqual(restDays(two), ['2026-10-14', '2026-10-10'])
// balance never goes negative from rules alone, and spending only reduces it
const earned = earnings(data({ thoughts: many(3) })); assert.equal(balance(earned, []), 15); assert.equal(balance(earned, owned), -25, 'purchases are checked by canBuy; balance is just the arithmetic')
assert.equal(spent(owned), 40)
console.log('rewards: all tests passed')
