/**
 * Wobbi Pro: one optional monthly subscription (Apple In-App Purchase). Pure rules only; the purchase itself is StoreKit 2
 * (ios-native/MindfulPlugin.swift), the screens are components/Pro.tsx. Money design: docs/MONETIZATION.md.
 *
 * Ethics are part of the rules: anything that keeps someone safe, or is their own data, is NEVER behind the paywall (see ALWAYS_FREE).
 */
export const PRODUCT_ID = 'com.brainpal.app.pro.monthly'
export const FREE_ANCHORS = 3
/** If the phone can't reach the App Store, a subscription that ended less than this ago still counts (renewals can lag). */
export const GRACE_MS = 3 * 24 * 3600_000

export type ProFeature = 'sync' | 'guard' | 'sleep' | 'summary' | 'proof' | 'anchors'
export interface ProInfo { id: ProFeature; title: string; blurb: string; emoji: string }
export const PRO_FEATURES: ProInfo[] = [
  { id: 'sync', title: 'Sync across devices', blurb: 'An account that keeps your entries on every iPhone and iPad you own, and safe if you lose one.', emoji: 'cloud' },
  { id: 'guard', title: 'Focus guard', blurb: 'Keep the apps that eat your time paused until you do push-ups, a walk, or a minute of breathing.', emoji: 'shield' },
  { id: 'sleep', title: 'Sleep insights', blurb: 'Apple Watch sleep stages, your sleep rhythm, and how sleep and mood go together.', emoji: 'sleep' },
  { id: 'summary', title: 'Weekly & monthly summaries', blurb: 'Your week and month in plain words, ready to share with someone you trust.', emoji: 'memo' },
  { id: 'proof', title: 'Proof you’re improving', blurb: 'Before-and-after cards drawn from your own data, so progress is something you can see.', emoji: 'chart' },
  { id: 'anchors', title: `More than ${FREE_ANCHORS} daily anchors`, blurb: 'Up to five tiny daily habits instead of three.', emoji: 'target' },
]
export const featureInfo = (id: ProFeature) => PRO_FEATURES.find(f => f.id === id)!

/** The things that are free forever. Shown on the paywall and checked by tests: nobody pays to feel safe or to keep their own data. */
export const ALWAYS_FREE = [
  'The SOS siren, breathing, grounding and crisis support',
  'Mood check-ins, thought records, journal and worry time',
  'Reminders and your calendar',
  'Exporting or deleting your data',
] as const

export interface Entitlement { active: boolean; until: number | null; checkedAt: number }
export const NO_PRO: Entitlement = { active: false, until: null, checkedAt: 0 }

/** Unknown / corrupt cache → not Pro (never crashes, never grants by accident). */
export function normalizeEntitlement(raw: unknown): Entitlement {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Entitlement>
  const until = typeof r.until === 'number' && Number.isFinite(r.until) ? r.until : null
  return { active: r.active === true && until !== null, until, checkedAt: typeof r.checkedAt === 'number' ? r.checkedAt : 0 }
}
export const isPro = (e: Entitlement, now: number) => e.active && e.until !== null && e.until + GRACE_MS > now

/** Is a particular feature usable right now? Anchors depend on how many are already active. */
export function canUse(feature: ProFeature, pro: boolean, ctx: { anchors?: number } = {}): boolean {
  if (pro) return true
  if (feature === 'anchors') return (ctx.anchors ?? 0) < FREE_ANCHORS
  return false
}

/** "Free trial" / price copy from what the store returned. Never invents a price: without one the paywall says "see price in the App Store". */
export function priceLine(p: { price?: string; trialDays?: number } | null): string {
  if (!p?.price) return 'Price shown by the App Store'
  const trial = p.trialDays && p.trialDays > 0 ? `${p.trialDays}-day free trial, then ` : ''
  return `${trial}${p.price} per month`
}
export const DISCLOSURE = (price: string | null) =>
  `Wobbi Pro is a monthly auto-renewing subscription${price ? ` at ${price} per month` : ''}. Payment is charged to your Apple ID at confirmation of purchase. It renews automatically each month unless you cancel at least 24 hours before the end of the current period; your account is charged for renewal within 24 hours before the period ends. Manage or cancel any time in Settings → [your name] → Subscriptions. Any free-trial time that is not used is forfeited when you subscribe.`
