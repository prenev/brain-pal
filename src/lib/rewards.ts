import { dayKey, shift } from './dates.ts'

/**
 * Coins. Principles: reward *showing up*, never perfection; nothing is ever taken away; spending is optional and gentle.
 * Earnings are DERIVED from your own data (so they are retroactive, can't be farmed past a daily cap, and need no sync);
 * only purchases are stored. There are no timers, no losses, no real-money purchases.
 */
export type EarnReason = 'checkin' | 'calm' | 'journal' | 'focus' | 'worry' | 'anchor' | 'anchors-all' | 'sleep' | 'streak'
export interface Earning { day: string; reason: EarnReason; coins: number; detail?: string }

/** coins per item, and how many items per day count */
export const RULES: Record<'checkin' | 'calm' | 'journal' | 'focus' | 'worry' | 'anchor', { coins: number; cap: number }> = {
  checkin: { coins: 5, cap: 3 }, calm: { coins: 3, cap: 3 }, journal: { coins: 4, cap: 2 },
  focus: { coins: 4, cap: 3 }, worry: { coins: 2, cap: 3 }, anchor: { coins: 2, cap: 5 },
}
export const ALL_ANCHORS_BONUS = 5
export const SLEEP_COINS = 2
export const MILESTONES = [{ days: 3, coins: 10 }, { days: 7, coins: 20 }, { days: 14, coins: 30 }, { days: 30, coins: 50 }, { days: 60, coins: 80 }, { days: 100, coins: 120 }]

export interface RewardData {
  thoughts: { createdAt: string }[]
  sessions: { createdAt: string; completed: boolean }[]
  journal: { createdAt: string }[]
  focus: { createdAt: string; completed: boolean }[]
  worries: { status: string; reviewedAt: string | null }[]
  anchorDays: { day: string; done: number; total: number }[]
  sleepDates: string[]
  /** Days that count towards the streak (activity plus any rest days). */
  streakDays: string[]
}

const perDay = (isos: string[]) => { const m = new Map<string, number>(); for (const i of isos) { const d = dayKey(i); m.set(d, (m.get(d) ?? 0) + 1) } return m }

/** Day on which a run of consecutive days first reaches `n`, for each n in `targets` (only those ever reached). */
export function streakMilestoneDays(days: string[], targets: number[]): Map<number, string> {
  const sorted = [...new Set(days)].sort(), out = new Map<number, string>()
  let run = 0, prev: string | null = null
  for (const d of sorted) {
    run = prev && shift(prev, 1) === d ? run + 1 : 1
    for (const t of targets) if (run >= t && !out.has(t)) out.set(t, d)
    prev = d
  }
  return out
}

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
  const reached = streakMilestoneDays(d.streakDays, MILESTONES.map(m => m.days))
  for (const m of MILESTONES) { const day = reached.get(m.days); if (day) out.push({ day, reason: 'streak', coins: m.coins, detail: `${m.days}-day streak` }) }
  return out.sort((a, b) => b.day.localeCompare(a.day) || b.coins - a.coins)
}

export const total = (e: Earning[]) => e.reduce((a, x) => a + x.coins, 0)

/* ---------------- shop ---------------- */
export interface Purchase { id: string; itemId: string; at: string; cost: number; forDay?: string; note?: string }
export type ItemKind = 'theme' | 'restday' | 'treat'
export interface ShopItem { id: string; kind: ItemKind; name: string; cost: number; blurb: string; repeatable: boolean; color?: string }
export const REST_DAYS_PER_MONTH = 2
export const SHOP: ShopItem[] = [
  { id: 'theme-ocean', kind: 'theme', name: 'Ocean', cost: 40, blurb: 'A calm blue accent.', repeatable: false, color: '#4aa8ff' },
  { id: 'theme-sunset', kind: 'theme', name: 'Sunset', cost: 40, blurb: 'A warm orange accent.', repeatable: false, color: '#ffa63d' },
  { id: 'theme-berry', kind: 'theme', name: 'Berry', cost: 40, blurb: 'A soft pink accent.', repeatable: false, color: '#ff6fa8' },
  { id: 'theme-lavender', kind: 'theme', name: 'Lavender', cost: 40, blurb: 'A gentle purple accent.', repeatable: false, color: '#9b8cff' },
  { id: 'restday', kind: 'restday', name: 'Rest day', cost: 30, blurb: `Cover one missed day so your streak keeps going (up to ${REST_DAYS_PER_MONTH} a month).`, repeatable: true },
  { id: 'treat', kind: 'treat', name: 'My treat', cost: 25, blurb: 'A small reward you name yourself — then actually enjoy it.', repeatable: true },
]
export const itemById = (id: string) => SHOP.find(i => i.id === id)

export const spent = (p: Purchase[]) => p.reduce((a, x) => a + x.cost, 0)
/** `floor` = the most this person has ever earned (deleting an entry or un-ticking an anchor must never make earned coins vanish, so spending can't push the balance below zero). */
export const balance = (e: Earning[], p: Purchase[], floor = 0) => Math.max(0, Math.max(total(e), floor) - spent(p))
export const restDays = (p: Purchase[]) => p.filter(x => x.itemId === 'restday' && x.forDay).map(x => x.forDay!)
export const ownedThemes = (p: Purchase[]) => p.filter(x => itemById(x.itemId)?.kind === 'theme').map(x => x.itemId)

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
  anchor: 'Anchors', 'anchors-all': 'All anchors done', sleep: 'Sleep logged', streak: 'Streak milestone',
}
