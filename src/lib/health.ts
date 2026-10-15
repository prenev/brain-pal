import { isNative, Mindful } from './native'
import { pendingHealthSessions } from './nativeCore'
import type { BreathSession } from './types'

const K_ON = 'bp.health', K_SYNCED = 'bp.health.synced'
const get = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const set = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* private mode */ } }

export const healthEnabled = () => isNative() && get(K_ON) === '1'
const syncedIds = (): Set<string> => { try { return new Set(JSON.parse(get(K_SYNCED) ?? '[]')) } catch { return new Set() } }
const saveSynced = (s: Set<string>) => set(K_SYNCED, JSON.stringify([...s].slice(-500)))

export async function healthAvailable(): Promise<boolean> {
  if (!isNative()) return false
  try { return (await Mindful.isAvailable()).available } catch { return false }
}

export type ConnectResult = 'ok' | 'denied' | 'unavailable'
export async function connectHealth(): Promise<ConnectResult> {
  if (!(await healthAvailable())) return 'unavailable'
  const { granted } = await Mindful.requestAuthorization()
  if (!granted) { set(K_ON, null); return 'denied' }
  set(K_ON, '1'); return 'ok'
}

/** Turns the sync off in the app. (iOS only lets the user revoke the permission itself in Settings → Health.) */
export const disconnectHealth = () => set(K_ON, null)

/** Writes one finished session to Apple Health as Mindful Minutes. Never throws — a failed sync must not break logging. */
export async function syncSession(s: BreathSession): Promise<boolean> {
  if (!healthEnabled()) return false
  const [p] = pendingHealthSessions([s], syncedIds())
  if (!p) return false
  try {
    await Mindful.saveSession({ start: p.start, end: p.end })
    const ids = syncedIds(); ids.add(s.id); saveSynced(ids)
    return true
  } catch (e) { console.warn('Apple Health sync failed', e); return false }
}

/** Writes every session not yet synced. Returns how many were saved. */
export async function syncAll(sessions: BreathSession[]): Promise<number> {
  if (!healthEnabled()) return 0
  let n = 0
  for (const p of pendingHealthSessions(sessions, syncedIds())) if (await syncSession(p.session)) n++
  return n
}
