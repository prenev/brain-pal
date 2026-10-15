import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cloudRepo, localRepo, type Repo } from './repo'
import { supabase } from './supabase'
import { computeStreak, dayKey, type Streak } from './dates'
import { DEFAULT_TAGS } from './constants'
import { syncSession } from './health'
import { isNative } from './native'
import { getReminder } from './push'
import { scheduleNativeReminders } from './nativeReminders'
import { deleteBlob, getBlob } from './blobstore'
import type { BreathSession, NewSession, NewThought, Thought, Worry } from './types'

interface Ctx {
  ready: boolean
  mode: Repo['mode']
  needsLogin: boolean
  session: Session | null
  recovery: boolean
  clearRecovery(): void
  importLocal(): Promise<number>
  thoughts: Thought[]
  sessions: BreathSession[]
  worries: Worry[]
  streak: Streak
  allTags: string[]
  setTranscript(thoughtId: string, transcript: string): Promise<void>
  addWorry(text: string): Promise<void>
  updateWorry(id: string, patch: Parameters<Repo['updateWorry']>[1]): Promise<void>
  deleteWorry(id: string): Promise<void>
  addThought(t: NewThought): Promise<void>
  deleteThought(id: string): Promise<void>
  addSession(s: NewSession): Promise<void>
  signOut(): Promise<void>
}

const StoreCtx = createContext<Ctx>(null!)
export const useStore = () => useContext(StoreCtx)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [authSession, setAuthSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(!supabase)
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [sessions, setSessions] = useState<BreathSession[]>([])
  const [worries, setWorries] = useState<Worry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setAuthSession(data.session); setAuthChecked(true) })
    const { data } = supabase.auth.onAuthStateChange((e, s) => { setAuthSession(s); if (e === 'PASSWORD_RECOVERY') setRecovery(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  const repo: Repo = supabase ? cloudRepo : localRepo
  const needsLogin = !!supabase && !authSession

  const refresh = useCallback(async () => {
    const [t, s, w] = await Promise.all([repo.listThoughts(), repo.listSessions(), repo.listWorries()])
    setThoughts(t); setSessions(s); setWorries(w); setLoaded(true)
  }, [repo])

  useEffect(() => {
    if (!authChecked || needsLogin) return
    refresh().catch(e => { console.error(e); setLoaded(true) })
  }, [authChecked, needsLogin, refresh])

  const streak = useMemo(() => {
    const days = new Set<string>()
    thoughts.forEach(t => days.add(dayKey(t.createdAt)))
    sessions.forEach(s => days.add(dayKey(s.createdAt)))
    return computeStreak(days)
  }, [thoughts, sessions])

  // iPhone app: keep on-device reminders in step with your activity (drops today's nudge once you've checked in).
  const act = useRef({ activeToday: false, current: 0 })
  act.current = { activeToday: streak.activeToday, current: streak.current }
  useEffect(() => {
    if (!loaded || !isNative()) return
    const run = () => { const r = getReminder(); if (r.enabled) scheduleNativeReminders(r.hour, { skipToday: act.current.activeToday, streak: act.current.current }).catch(e => console.warn('reminder schedule failed', e)) }
    run(); window.addEventListener('bp:reminder', run)
    return () => window.removeEventListener('bp:reminder', run)
  }, [loaded, streak.activeToday, streak.current])

  useEffect(() => {
    const on = () => setRecovery(true)
    window.addEventListener('bp:recovery', on); return () => window.removeEventListener('bp:recovery', on)
  }, [])

  const allTags = useMemo(() => {
    const custom = thoughts.flatMap(t => t.tags).filter(t => !DEFAULT_TAGS.includes(t))
    return [...DEFAULT_TAGS, ...new Set(custom)]
  }, [thoughts])

  const value: Ctx = {
    ready: authChecked && (needsLogin || loaded),
    mode: repo.mode, needsLogin, session: authSession, recovery, clearRecovery: () => setRecovery(false),
    async importLocal() {
      const lt = await localRepo.listThoughts(), ls = await localRepo.listSessions(), lw = await localRepo.listWorries()
      const stored: { id: string; photoRefs?: string[]; audio?: { ref: string } | null }[] = JSON.parse(localStorage.getItem('bp.thoughts') ?? '[]')
      for (const t of [...lt].reverse()) {
        const photoFiles = await Promise.all(t.photos.map(async (p, i) => new File([await (await fetch(p)).blob()], `p${i}.jpg`, { type: 'image/jpeg' })))
        const blob = t.audio ? await getBlob(t.audio.ref) : undefined
        await cloudRepo.addThought({ ...t, photoFiles, audioClip: t.audio && blob ? { blob, durationSec: t.audio.durationSec, mime: t.audio.mime, transcript: t.audio.transcript } : null })
      }
      for (const x of [...ls].reverse()) await cloudRepo.addSession(x)
      for (const w of [...lw].reverse()) { const n = await cloudRepo.addWorry(w.text); if (w.status !== 'open') await cloudRepo.updateWorry(n.id, { status: w.status, action: w.action, reviewedAt: w.reviewedAt }) }
      for (const t of stored) for (const ref of [...(t.photoRefs ?? []), ...(t.audio ? [t.audio.ref] : [])]) await deleteBlob(ref).catch(() => {})
      for (const k of ['bp.thoughts', 'bp.sessions', 'bp.worries']) localStorage.removeItem(k)
      await refresh()
      return lt.length + ls.length + lw.length
    }, thoughts, sessions, worries, streak, allTags,
    async setTranscript(id, transcript) {
      await repo.setTranscript(id, transcript)
      setThoughts(p => p.map(t => (t.id === id && t.audio ? { ...t, audio: { ...t.audio, transcript } } : t)))
    },
    async addWorry(text) { const w = await repo.addWorry(text); setWorries(p => [w, ...p]) },
    async updateWorry(id, patch) { const w = await repo.updateWorry(id, patch); setWorries(p => p.map(x => (x.id === id ? w : x))) },
    async deleteWorry(id) { await repo.deleteWorry(id); setWorries(p => p.filter(w => w.id !== id)) },
    async addThought(t) { const n = await repo.addThought(t); setThoughts(p => [n, ...p].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) },
    async deleteThought(id) { await repo.deleteThought(id); setThoughts(p => p.filter(t => t.id !== id)) },
    async addSession(s) { const n = await repo.addSession(s); setSessions(p => [n, ...p]); void syncSession(n) },
    async signOut() { await supabase?.auth.signOut() },
  }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}
