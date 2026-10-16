import { isIOSApp, Mindful } from './native'

/** Thin, failure-proof wrapper around the Screen Time calls: every function resolves, never throws (a broken plugin must never break the app). */
export interface GuardStatus { available: boolean; authorized: boolean; appCount: number; unlockedUntil: number | null }
const NONE: GuardStatus = { available: false, authorized: false, appCount: 0, unlockedUntil: null }

export const guardSupported = () => isIOSApp()

export async function guardStatus(): Promise<GuardStatus> {
  if (!isIOSApp()) return NONE
  try { const r = await Mindful.screenTimeStatus(); return { available: !!r.available, authorized: !!r.authorized, appCount: r.appCount ?? 0, unlockedUntil: typeof r.unlockedUntil === 'number' ? r.unlockedUntil : null } } catch { return NONE }
}
export async function guardRequestAuth(): Promise<{ authorized: boolean; error?: string }> {
  try { return await Mindful.screenTimeRequestAuth() } catch (e: any) { return { authorized: false, error: e?.message ?? 'Could not ask for Screen Time access' } }
}
export async function guardPickApps(): Promise<number | null> {
  try { return (await Mindful.screenTimePickApps()).count } catch { return null }
}
export async function guardLock(): Promise<boolean> { try { return (await Mindful.screenTimeLock()).locked } catch { return false } }
export async function guardUnlock(minutes: number): Promise<number | null> {
  try { const r = await Mindful.screenTimeUnlock({ minutes }); return r.until > 0 ? r.until : Date.now() + minutes * 60_000 } catch { return null }
}
export async function guardClear(): Promise<void> { try { await Mindful.screenTimeClear() } catch { /* nothing to clear */ } }
