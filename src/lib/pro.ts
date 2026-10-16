/**
 * Wobbi Pro: one optional monthly subscription (Apple In-App Purchase). Pure rules only; the purchase itself is StoreKit 2
 * (ios-native/MindfulPlugin.swift), the screens are components/Pro.tsx. Money design: docs/MONETIZATION.md.
 *
 * Ethics are part of the rules: anything that keeps someone safe, or is their own data, is NEVER behind the paywall (see ALWAYS_FREE).
 */
export const PRODUCT_ID = 'com.brainpal.app.pro.monthly'
/** If the phone can't reach the App Store, a subscription that ended less than this ago still counts (renewals can lag). */
export const GRACE_MS = 3 * 24 * 3600_000

/** For now the paywall guards ONE thing: advanced analytics. Everything else is free (Focus guard, sleep, sync, anchors, ...). Add ids here to gate more later. */
export type ProFeature = 'analytics'
export interface ProInfo { id: ProFeature; title: string; blurb: string; emoji: string }
export const PRO_FEATURES: ProInfo[] = [
  { id: 'analytics', title: 'Advanced analytics', blurb: 'Before-and-after proof of your progress, drawn from your own data, plus weekly and monthly summaries you can share with someone you trust.', emoji: 'chart' },
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

/** Is a particular feature usable right now? */
export const canUse = (_feature: ProFeature, pro: boolean): boolean => pro

/** "Free trial" / price copy from what the store returned. Never invents a price: without one the paywall says "see price in the App Store". */
export function priceLine(p: { price?: string; trialDays?: number } | null): string {
  if (!p?.price) return 'Price shown by the App Store'
  const trial = p.trialDays && p.trialDays > 0 ? `${p.trialDays}-day free trial, then ` : ''
  return `${trial}${p.price} per month`
}
export const DISCLOSURE = (price: string | null) =>
  `Wobbi Pro is a monthly auto-renewing subscription${price ? ` at ${price} per month` : ''}. Payment is charged to your Apple ID at confirmation of purchase. It renews automatically each month unless you cancel at least 24 hours before the end of the current period; your account is charged for renewal within 24 hours before the period ends. Manage or cancel any time in Settings → [your name] → Subscriptions. Any free-trial time that is not used is forfeited when you subscribe.`
