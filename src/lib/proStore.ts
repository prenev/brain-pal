import { useSyncExternalStore } from 'react'
import { isIOSApp, Mindful } from './native'
import { isPro, normalizeEntitlement, type Entitlement } from './pro.ts'

/** The cached subscription state (what StoreKit last told us). Offline, the app trusts this until it expires (plus a short grace period). */
const KEY = 'bp.pro'
const read = (): Entitlement => { try { return normalizeEntitlement(JSON.parse(localStorage.getItem(KEY) ?? 'null')) } catch { return normalizeEntitlement(null) } }
let ent = read()
const listeners = new Set<() => void>()
export function setEntitlement(e: Entitlement) { ent = e; try { localStorage.setItem(KEY, JSON.stringify(e)) } catch { /* ignore */ } listeners.forEach(l => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function usePro() {
  const e = useSyncExternalStore(subscribe, () => ent)
  return { pro: isPro(e, Date.now()), entitlement: e }
}

const fromStore = (r: { active?: boolean; until?: number } | undefined): Entitlement => ({ active: !!r?.active, until: typeof r?.until === 'number' ? r.until : null, checkedAt: Date.now() })

/** Ask the App Store what we own. If it can't be reached, keep what we had (never lock someone out because they are offline). */
export async function refreshPro(): Promise<void> {
  if (!isIOSApp()) return
  try { setEntitlement(fromStore(await Mindful.proStatus())) } catch { /* keep the cache */ }
}
export async function loadProduct(): Promise<{ price: string; trialDays?: number } | null> {
  if (!isIOSApp()) return null
  try { const r = await Mindful.proProducts(); const p = r.products?.[0]; return p ? { price: p.price, trialDays: p.trialDays } : null } catch { return null }
}
export type BuyResult = 'purchased' | 'pending' | 'cancelled' | 'failed'
export async function buyPro(): Promise<BuyResult> {
  try {
    const r = await Mindful.proPurchase()
    if (r.status === 'purchased' && r.active) { setEntitlement(fromStore(r)); return 'purchased' }
    if (r.status === 'pending') return 'pending'
    if (r.status === 'cancelled') return 'cancelled'
    return 'failed'
  } catch { return 'failed' }
}
export async function restorePro(): Promise<boolean> {
  try { const r = await Mindful.proRestore(); setEntitlement(fromStore(r)); return !!r.active } catch { return false }
}

/** Apple's "Redeem code" sheet (offer codes). The entitlement shows up through the normal status refresh afterwards. */
export async function redeemCode(): Promise<boolean> {
  try { const r = await Mindful.proRedeemCode(); if (r.shown) setTimeout(() => void refreshPro(), 4000); return r.shown } catch { return false }
}
