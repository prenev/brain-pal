import { isNative, Mindful } from './native'
import { buildNights, type Night, type Segment, type SegmentKind } from './sleep.ts'

/** Apple Health sleep (iPhone app only). Read-only, opt-in, never throws: a failed sync must never break the app. */
const K_ON = 'bp.sleep.health', K_AT = 'bp.sleep.synced'
const get = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const set = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* private mode */ } }

export const sleepConnected = () => isNative() && get(K_ON) === '1'
export const disconnectSleep = () => { set(K_ON, null); set(K_AT, null) }

const KINDS: SegmentKind[] = ['inBed', 'asleep', 'core', 'deep', 'rem', 'awake']
export const DAYS_BACK = 45

export type ConnectResult = 'ok' | 'unavailable' | 'error'
export async function connectSleep(): Promise<ConnectResult> {
  if (!isNative()) return 'unavailable'
  try {
    if (!(await Mindful.isAvailable()).available) return 'unavailable'
    await Mindful.requestSleepAuthorization()
    set(K_ON, '1'); return 'ok'
  } catch (e) { console.warn('sleep connect failed', e); return 'error' }
}

/** Reads the last ~6 weeks of sleep and turns it into nights. Returns null if Health isn't connected or the read failed (callers keep their cache). */
export async function readNights(now = Date.now()): Promise<Night[] | null> {
  if (!sleepConnected()) return null
  try {
    const { segments } = await Mindful.readSleep({ from: now - DAYS_BACK * 864e5, to: now })
    const segs: Segment[] = (segments ?? []).filter(s => KINDS.includes(s.kind as SegmentKind)).map(s => ({ start: s.start, end: s.end, kind: s.kind as SegmentKind }))
    set(K_AT, String(now))
    return buildNights(segs).nights
  } catch (e) { console.warn('sleep read failed', e); return null }
}
export const lastSleepSync = (): number | null => { const v = Number(get(K_AT)); return v > 0 ? v : null }
