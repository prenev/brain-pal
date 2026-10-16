import { isNative, Mindful } from './native'

/** Lock-screen / Dynamic Island timer for breathing and focus (iPhone, iOS 16.2+). Fire-and-forget: a failure never touches the session. */
type Seg = { title: string; subtitle: string; startsAt: number; endsAt: number; phase?: string }
/** `next`: phases that start by themselves after this one (pomodoro), so the lock screen moves on while the app sleeps. */
type Live = Seg & { remainingSec?: number; next?: Seg[] }
export const liveStart = (kind: 'breathe' | 'focus', o: Live) => { if (isNative()) Mindful.liveActivityStart({ kind, ...o }).catch(() => {}) }
export const liveUpdate = (o: Live) => { if (isNative()) Mindful.liveActivityUpdate(o).catch(() => {}) }
export const liveEnd = () => { if (isNative()) Mindful.liveActivityEnd().catch(() => {}) }
