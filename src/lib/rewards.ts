import { dayKey, shift } from './dates.ts'
import { achievements, type AchievementData } from './achievements.ts'
export { streakMilestoneDays } from './achievements.ts'

/**
 * Coins. Principles: reward *showing up*, never perfection; nothing is ever taken away; spending is optional and gentle.
 * Earnings are DERIVED from your own data (so they are retroactive, can't be farmed past a daily cap, and need no sync);
 * only purchases are stored. There are no timers, no losses, no real-money purchases.
 */
export type EarnReason = 'checkin' | 'calm' | 'journal' | 'focus' | 'worry' | 'anchor' | 'anchors-all' | 'sleep' | 'achievement'
export interface Earning { day: string; reason: EarnReason; coins: number; detail?: string }

/**
 * Coins per item, and how many items per day count. Tuned so a normal engaged day is worth about 10–15 coins (the most possible is 35),
 * a first small collectible takes about a week, and the rarest things take a couple of months.
 */
export const RULES: Record<'checkin' | 'calm' | 'journal' | 'focus' | 'worry' | 'anchor', { coins: number; cap: number }> = {
  checkin: { coins: 3, cap: 2 }, calm: { coins: 2, cap: 2 }, journal: { coins: 3, cap: 2 },
  focus: { coins: 2, cap: 4 }, worry: { coins: 1, cap: 2 }, anchor: { coins: 1, cap: 5 },
}
export const ALL_ANCHORS_BONUS = 3
export const SLEEP_COINS = 1
export const MAX_COINS_PER_DAY = Object.values(RULES).reduce((a, r) => a + r.coins * r.cap, 0) + ALL_ANCHORS_BONUS + SLEEP_COINS

export interface RewardData extends AchievementData {}

const perDay = (isos: string[]) => { const m = new Map<string, number>(); for (const i of isos) { const d = dayKey(i); m.set(d, (m.get(d) ?? 0) + 1) } return m }

export function earnings(d: RewardData): Earning[] {
  const out: Earning[] = []
  const add = (counts: Map<string, number>, reason: keyof typeof RULES) => {
    const { coins, cap } = RULES[reason]
    for (const [day, n] of counts) { const k = Math.min(n, cap); if (k > 0) out.push({ day, reason, coins: k * coins }) }
  }
  add(perDay(d.thoughts.map(t => t.createdAt)), 'checkin')
  add(perDay(d.sessions.filter(s => s.completed).map(s => s.createdAt)), 'calm')
  add(perDay(d.journal.map(j => j.createdAt)), 'journal')
  add(perDay(d.focus.filter(f => f.completed).map(f => f.createdAt)), 'focus')
  add(perDay(d.worries.filter(w => w.reviewedAt && (w.status === 'let-go' || w.status === 'actionable')).map(w => w.reviewedAt!)), 'worry')
  for (const a of d.anchorDays) {
    if (a.total <= 0 || a.done <= 0) continue
    const k = Math.min(a.done, RULES.anchor.cap)
    out.push({ day: a.day, reason: 'anchor', coins: k * RULES.anchor.coins })
    if (a.done >= a.total) out.push({ day: a.day, reason: 'anchors-all', coins: ALL_ANCHORS_BONUS })
  }
  for (const day of new Set(d.sleepDates)) out.push({ day, reason: 'sleep', coins: SLEEP_COINS })
  for (const a of achievements(d)) if (a.day) out.push({ day: a.day, reason: 'achievement', coins: a.coins, detail: a.title })
  return out.sort((a, b) => b.day.localeCompare(a.day) || b.coins - a.coins)
}

export const total = (e: Earning[]) => e.reduce((a, x) => a + x.coins, 0)

/* ---------------- shop (catalogue in shop.ts) ---------------- */
import { REST_DAYS_PER_MONTH, type Purchase, type ShopItem } from './shop.ts'
export { itemById, ownedThemes, REST_DAYS_PER_MONTH, SHOP, type Purchase, type ShopItem } from './shop.ts'

export const spent = (p: Purchase[]) => p.reduce((a, x) => a + x.cost, 0)
/** `floor` = the most this person has ever earned (deleting an entry or un-ticking an anchor must never make earned coins vanish, so spending can't push the balance below zero). */
export const balance = (e: Earning[], p: Purchase[], floor = 0) => Math.max(0, Math.max(total(e), floor) - spent(p))
export const restDays = (p: Purchase[]) => p.filter(x => x.itemId === 'restday' && x.forDay).map(x => x.forDay!)

export interface BuyCheck { ok: boolean; reason?: string }
/** Whether a purchase is allowed right now. `forDay` is required for a rest day; `note` for a treat. */
export function canBuy(item: ShopItem, coins: number, purchases: Purchase[], now: Date, opts: { forDay?: string; note?: string } = {}): BuyCheck {
  if (coins < item.cost) return { ok: false, reason: `You need ${item.cost - coins} more coins.` }
  if (!item.repeatable && purchases.some(p => p.itemId === item.id)) return { ok: false, reason: 'You already have this.' }
  if (item.kind === 'treat') {
    const note = (opts.note ?? '').trim()
    if (!note) return { ok: false, reason: 'Name your treat first.' }
    if (note.length > 60) return { ok: false, reason: 'Keep the name under 60 characters.' }
  }
  if (item.kind === 'restday') {
    const day = opts.forDay, today = dayKey(now), yesterday = shift(today, -1)
    if (!day || (day !== today && day !== yesterday)) return { ok: false, reason: 'A rest day can cover today or yesterday.' }
    const taken = restDays(purchases)
    if (taken.includes(day)) return { ok: false, reason: 'That day is already covered.' }
    if (taken.filter(d => d.slice(0, 7) === day.slice(0, 7)).length >= REST_DAYS_PER_MONTH) return { ok: false, reason: `Rest days are limited to ${REST_DAYS_PER_MONTH} a month.` }
  }
  return { ok: true }
}

export const REASON_LABEL: Record<EarnReason, string> = {
  checkin: 'Check-ins', calm: 'Calming sessions', journal: 'Journal entries', focus: 'Small steps', worry: 'Worries processed',
  anchor: 'Anchors', 'anchors-all': 'All anchors done', sleep: 'Sleep logged', achievement: 'Achievement',
}
