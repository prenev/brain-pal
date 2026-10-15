import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cloudRepo, localRepo, type Repo } from './repo'
import { supabase } from './supabase'
import { computeStreak, dayKey, type Streak } from './dates'
import { DEFAULT_TAGS } from './constants'
import type { BreathSession, NewSession, NewThought, Thought } from './types'

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
  streak: Streak
  allTags: string[]
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
    const [t, s] = await Promise.all([repo.listThoughts(), repo.listSessions()])
    setThoughts(t); setSessions(s); setLoaded(true)
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

  const allTags = useMemo(() => {
    const custom = thoughts.flatMap(t => t.tags).filter(t => !DEFAULT_TAGS.includes(t))
    return [...DEFAULT_TAGS, ...new Set(custom)]
  }, [thoughts])

  const value: Ctx = {
    ready: authChecked && (needsLogin || loaded),
    mode: repo.mode, needsLogin, session: authSession, recovery, clearRecovery: () => setRecovery(false),
    async importLocal() {
      const lt = await localRepo.listThoughts(), ls = await localRepo.listSessions()
      for (const t of [...lt].reverse()) {
        const photoFiles = await Promise.all(t.photos.map(async (p, i) => new File([await (await fetch(p)).blob()], `p${i}.jpg`, { type: 'image/jpeg' })))
        await cloudRepo.addThought({ ...t, photoFiles })
      }
      for (const x of [...ls].reverse()) await cloudRepo.addSession(x)
      localStorage.removeItem('bp.thoughts'); localStorage.removeItem('bp.sessions')
      await refresh()
      return lt.length + ls.length
    }, thoughts, sessions, streak, allTags,
    async addThought(t) { const n = await repo.addThought(t); setThoughts(p => [n, ...p].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) },
    async deleteThought(id) { await repo.deleteThought(id); setThoughts(p => p.filter(t => t.id !== id)) },
    async addSession(s) { const n = await repo.addSession(s); setSessions(p => [n, ...p]) },
    async signOut() { await supabase?.auth.signOut() },
  }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}
