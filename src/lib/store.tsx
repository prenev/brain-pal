import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cloudRepo, localRepo, type Repo } from './repo'
import { supabase } from './supabase'
import { computeStreak, dayKey, type Streak } from './dates'
import { DEFAULT_TAGS } from './constants'
import { syncSession } from './health'
import { isNative } from './native'
import { scheduleNativeRituals } from './nativeReminders'
import { planRituals, type Ritual } from './rituals.ts'
import { deleteBlob, getBlob } from './blobstore'
import { activityFrom, anchorStreak, canAdd, checkKey, cleanLabel, dayProgress, reorder, type Anchor, type AnchorLink, type AnchorStreak, type DayProgress } from './anchors.ts'
import { skillLevels, type Level, type SkillId } from './levels.ts'
import { shift } from './dates.ts'
import { loadAnchors, loadChecks, loadFocus, loadHealthNights, loadJournal, loadManualNights, loadPurchases, loadRituals, loadTheme, saveAnchors, saveChecks, saveFocus, saveHealthNights, saveJournal, saveManualNights, savePurchases, saveRituals, saveTheme } from './extras'
import { cleanText, type JournalEntry } from './journal.ts'
import type { FocusSession } from './focus.ts'
import { balance as coinBalance, canBuy, earnings as computeEarnings, itemById, ownedThemes, restDays, type BuyCheck, type Earning, type Purchase } from './rewards.ts'
import { applyTheme } from './theme.ts'
import { detectLocal, dirtyCount, keyOf, markSynced, reconcile, uniqueDocs, type Meta } from './sync.ts'
import { applyDocs, collectItems, unchangedSince, type Extras } from './syncItems.ts'
import { pullDocs, pushDocs } from './cloudDocs'
import { normalizeRituals, DEFAULT_RITUALS } from './rituals.ts'
import { manualNight, mergeNights, type Night } from './sleep.ts'
import { connectSleep, disconnectSleep, lastSleepSync, readNights, sleepConnected, type ConnectResult } from './sleepHealth'
import type { BreathSession, NewSession, NewThought, Thought, Worry } from './types'

interface Ctx {
  ready: boolean
  mode: Repo['mode']
  /** Offline first: the app never needs an account. These only drive the optional "sync across devices" sign-in. */
  cloudAvailable: boolean
  loginOpen: boolean
  openLogin(): void
  closeLogin(): void
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
  addThought(t: NewThought): Promise<Thought>
  deleteThought(id: string): Promise<void>
  addSession(s: NewSession): Promise<void>
  sync: { status: 'idle' | 'syncing' | 'ok' | 'error'; at: number | null; pending: number }
  syncNow(): Promise<void>
  coins: number
  earned: Earning[]
  purchases: Purchase[]
  themeId: string | null
  buy(itemId: string, opts?: { forDay?: string; note?: string }): BuyCheck
  setTheme(id: string | null): void
  sleepNights: Night[]
  sleepOn: boolean
  connectSleepNow(): Promise<ConnectResult>
  disconnectSleepNow(): void
  syncSleepNow(): Promise<number | null>
  addManualNight(bed: number, wake: number, quality: number | null): boolean
  deleteManualNight(date: string): void
  rituals: Ritual[]
  setRituals(next: Ritual[]): void
  focusSessions: FocusSession[]
  addFocus(d: Omit<FocusSession, 'id' | 'createdAt'>): FocusSession
  journal: JournalEntry[]
  addJournal(d: { title: string; body: string; mood: number | null; tags: string[]; prompt: string | null }): JournalEntry
  updateJournal(id: string, d: { title: string; body: string; mood: number | null; tags: string[] }): void
  deleteJournal(id: string): void
  anchors: Anchor[]
  anchorsToday: DayProgress
  anchorHistory: { day: string; done: number; total: number }[]
  levels: Record<SkillId, Level>
  anchorStreak: AnchorStreak
  addAnchor(label: string, emoji: string, link: AnchorLink | null): boolean
  renameAnchor(id: string, label: string): void
  removeAnchor(id: string): void
  moveAnchor(id: string, dir: -1 | 1): void
  toggleAnchor(id: string): void
  /** Signs out. In cloud mode it first syncs; returns how many changes could not be saved to the account (0 = clean). Pass force to sign out anyway. */
  signOut(force?: boolean): Promise<number>
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
  const [loginOpen, setLoginOpen] = useState(false)
  const [anchors, setAnchors] = useState<Anchor[]>(loadAnchors)
  const [checks, setChecks] = useState<Set<string>>(loadChecks)
  const [journal, setJournal] = useState<JournalEntry[]>(loadJournal)
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(loadFocus)
  const [rituals, setRitualsState] = useState<Ritual[]>(loadRituals)
  const [purchases, setPurchases] = useState<Purchase[]>(loadPurchases)
  const [themeId, setThemeId] = useState<string | null>(loadTheme)
  const [healthNights, setHealthNights] = useState<Night[]>(loadHealthNights)
  const [manualNights, setManualNights] = useState<Night[]>(loadManualNights)
  const [sleepOn, setSleepOn] = useState(sleepConnected)
  const sleepNights = useMemo(() => mergeNights(healthNights, manualNights), [healthNights, manualNights])
  const syncSleepNow = useCallback(async () => {
    const n = await readNights(); if (!n) return null
    setHealthNights(n); saveHealthNights(n); return n.length
  }, [])
  // Keep measured sleep fresh: on launch and when the app comes back to the foreground (at most every 10 minutes).
  useEffect(() => {
    if (!loaded || !sleepOn) return
    const run = () => { const last = lastSleepSync(); if (!last || Date.now() - last > 10 * 60_000) void syncSleepNow() }
    run(); document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [loaded, sleepOn, syncSleepNow])
  const updateJournalList = (next: JournalEntry[]) => { const sorted = [...next].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); setJournal(sorted); saveJournal(sorted) }
  const [today, setToday] = useState(() => dayKey(new Date()))
  useEffect(() => { // roll "today" over at midnight, and when the app comes back to the foreground
    const tick = () => setToday(dayKey(new Date()))
    const t = setInterval(tick, 60_000); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick) }
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setAuthSession(data.session); setAuthChecked(true) })
    const { data } = supabase.auth.onAuthStateChange((e, s) => { setAuthSession(s); if (e === 'PASSWORD_RECOVERY') setRecovery(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  // Offline first: everything lives on the device until the person chooses to sign in; then the account is the source of truth.
  const repo: Repo = supabase && authSession ? cloudRepo : localRepo

  const refresh = useCallback(async () => {
    const [t, s, w] = await Promise.all([repo.listThoughts(), repo.listSessions(), repo.listWorries()])
    setThoughts(t); setSessions(s); setWorries(w); setLoaded(true)
  }, [repo])

  useEffect(() => {
    if (!authChecked) return
    refresh().catch(e => { console.error(e); setLoaded(true) })
  }, [authChecked, refresh])
  useEffect(() => { if (authSession) setLoginOpen(false) }, [authSession])      // signed in: close the sign-in screen

  const streak = useMemo(() => {
    const days = new Set<string>()
    thoughts.forEach(t => days.add(dayKey(t.createdAt)))
    sessions.forEach(s => days.add(dayKey(s.createdAt)))
    restDays(purchases).forEach(d => days.add(d))     // a rest day you bought covers a missed day
    return computeStreak(days)
  }, [thoughts, sessions, purchases])

  const act = useMemo(() => activityFrom({ thoughts, sessions, worries, journal, focus: focusSessions }), [thoughts, sessions, worries, journal, focusSessions])
  const anchorsToday = useMemo(() => dayProgress(anchors, today, checks, act), [anchors, today, checks, act])
  const anchorStreakVal = useMemo(() => anchorStreak(anchors, checks, act, new Date()), [anchors, checks, act, today])
  const anchorHistory = useMemo(() => Array.from({ length: 400 }, (_, i) => shift(today, i - 399)).map(day => { const p = dayProgress(anchors, day, checks, act); return { day, done: p.done, total: p.total } }), [anchors, checks, act, today])
  const levels = useMemo(() => skillLevels({ thoughts, sessions, worries, journal, focus: focusSessions }), [thoughts, sessions, worries, journal, focusSessions])
  const anchorsRef = useRef(anchors); anchorsRef.current = anchors
  // The ref is updated immediately so several changes in the same tick (e.g. the first-run picks) build on each other instead of overwriting.
  const updateAnchors = (next: Anchor[]) => { anchorsRef.current = next; setAnchors(next); saveAnchors(next) }

  const earned = useMemo(() => computeEarnings({
    thoughts, sessions, journal, focus: focusSessions, worries, anchorDays: anchorHistory,
    sleepDates: sleepNights.map(n => n.date),
    streakDays: [...new Set([...thoughts.map(t => dayKey(t.createdAt)), ...sessions.map(s => dayKey(s.createdAt)), ...restDays(purchases)])],
  }), [thoughts, sessions, journal, focusSessions, worries, anchorHistory, sleepNights, purchases])
  const coins = coinBalance(earned, purchases)
  // Apply the chosen accent theme (only if you actually own it).
  useEffect(() => { const item = themeId && ownedThemes(purchases).includes(themeId) ? itemById(themeId) : null; applyTheme(item?.color ?? null) }, [themeId, purchases])

  /* ---------------- account sync for the extras (journal, anchors, focus, hand-logged sleep, purchases, rituals, theme) ---------------- */
  const [syncState, setSyncState] = useState<{ status: 'idle' | 'syncing' | 'ok' | 'error'; at: number | null; pending: number }>({ status: 'idle', at: null, pending: 0 })
  const extrasRef = useRef<Extras>(null!)
  extrasRef.current = { journal, anchors, checks, focus: focusSessions, manualNights, purchases, rituals, themeId }
  const syncing = useRef(false)
  const loadMeta = (): Meta => { try { const m = JSON.parse(localStorage.getItem('bp.sync.meta') ?? '{}'); return m && typeof m === 'object' ? m : {} } catch { return {} } }
  const saveMeta = (m: Meta) => { try { localStorage.setItem('bp.sync.meta', JSON.stringify(m)) } catch { /* ignore */ } }
  const applyExtras = (x: Extras) => {
    setJournal(x.journal); saveJournal(x.journal); setAnchors(x.anchors); saveAnchors(x.anchors); setChecks(x.checks); saveChecks(x.checks)
    setFocusSessions(x.focus); saveFocus(x.focus); setManualNights(x.manualNights); saveManualNights(x.manualNights)
    setPurchases(x.purchases); savePurchases(x.purchases); setRitualsState(x.rituals); saveRituals(x.rituals); setThemeId(x.themeId); saveTheme(x.themeId)
  }
  const syncNow = useCallback(async () => {
    if (!supabase || !authSession || syncing.current) return
    syncing.current = true; setSyncState(s => ({ ...s, status: 'syncing' }))
    try {
      const items0 = collectItems(extrasRef.current)
      const l = detectLocal(loadMeta(), items0, Date.now())
      const remote = await pullDocs()
      if (!remote) { saveMeta(l.meta); setSyncState(s => ({ ...s, status: 'error', pending: dirtyCount(l.meta) })); return }
      const rec = reconcile(l.meta, items0, remote)
      const safe = unchangedSince(rec.apply, collectItems(extrasRef.current), l.meta)   // never overwrite something edited while we were pulling
      if (safe.length) applyExtras(applyDocs(extrasRef.current, safe))
      const toSend = uniqueDocs([...l.dirty, ...rec.push]).filter(d => { const m = rec.meta[keyOf(d.kind, d.id)]; return m && !m.synced && m.updatedAt === d.updatedAt })
      const ok = await pushDocs(toSend)
      const meta = ok ? markSynced(rec.meta, toSend) : rec.meta
      saveMeta(meta); setSyncState({ status: ok ? 'ok' : 'error', at: ok ? Date.now() : null, pending: dirtyCount(meta) })
    } catch (e) { console.warn('sync failed', e); setSyncState(s => ({ ...s, status: 'error' })) }
    finally { syncing.current = false }
  }, [authSession])
  // Sync on sign-in, shortly after you change something, when the app returns to the foreground, and when the network comes back.
  useEffect(() => {
    if (!supabase || !authSession || !loaded) return
    const t = setTimeout(() => { void syncNow() }, 1200)
    return () => clearTimeout(t)
  }, [authSession, loaded, syncNow, journal, anchors, checks, focusSessions, manualNights, purchases, rituals, themeId])
  useEffect(() => {
    if (!supabase || !authSession || !loaded) return
    let last = Date.now()
    const again = () => { if (document.visibilityState !== 'hidden' && Date.now() - last > 60_000) { last = Date.now(); void syncNow() } }
    const online = () => { last = Date.now(); void syncNow() }
    document.addEventListener('visibilitychange', again); window.addEventListener('online', online)
    return () => { document.removeEventListener('visibilitychange', again); window.removeEventListener('online', online) }
  }, [authSession, loaded, syncNow])

  // iPhone app: keep on-device rituals in step with what you've already done today (a ritual is dropped for today once it's redundant).
  const doneKey = useMemo(() => {
    const hr = (iso: string) => new Date(iso).getHours()
    const todaySessions = sessions.filter(s => dayKey(s.createdAt) === today)
    return JSON.stringify({
      checkin: act.checkin.has(today), journaled: act.journal.has(today), anchorsComplete: anchorsToday.complete,
      breathedAm: todaySessions.some(s => hr(s.createdAt) < 12), breathedPm: todaySessions.some(s => hr(s.createdAt) >= 12),
    })
  }, [sessions, act, anchorsToday.complete, today])
  useEffect(() => {
    if (!loaded || !isNative()) return
    scheduleNativeRituals(planRituals(new Date(), rituals, JSON.parse(doneKey))).catch(e => console.warn('ritual schedule failed', e))
  }, [loaded, rituals, doneKey])

  useEffect(() => {
    const on = () => setRecovery(true)
    window.addEventListener('bp:recovery', on); return () => window.removeEventListener('bp:recovery', on)
  }, [])

  const allTags = useMemo(() => {
    const custom = thoughts.flatMap(t => t.tags).filter(t => !DEFAULT_TAGS.includes(t))
    return [...DEFAULT_TAGS, ...new Set(custom)]
  }, [thoughts])

  const value: Ctx = {
    ready: authChecked && loaded,
    mode: repo.mode, cloudAvailable: !!supabase, loginOpen, openLogin: () => setLoginOpen(true), closeLogin: () => setLoginOpen(false), session: authSession, recovery, clearRecovery: () => setRecovery(false),
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
    async addThought(t) { const n = await repo.addThought(t); setThoughts(p => [n, ...p].sort((a, b) => b.createdAt.localeCompare(a.createdAt))); return n },
    async deleteThought(id) { await repo.deleteThought(id); setThoughts(p => p.filter(t => t.id !== id)) },
    async addSession(s) { const n = await repo.addSession(s); setSessions(p => [n, ...p]); void syncSession(n) },
    coins, earned, purchases, themeId,
    buy(itemId, opts = {}) {
      const item = itemById(itemId); if (!item) return { ok: false, reason: 'Unknown item.' }
      const check = canBuy(item, coins, purchases, new Date(), opts); if (!check.ok) return check
      const p: Purchase = { id: crypto.randomUUID(), itemId, at: new Date().toISOString(), cost: item.cost, ...(opts.forDay && { forDay: opts.forDay }), ...(opts.note && { note: opts.note.trim() }) }
      const next = [...purchases, p]; setPurchases(next); savePurchases(next)
      if (item.kind === 'theme') { setThemeId(itemId); saveTheme(itemId) }
      return { ok: true }
    },
    setTheme(id) { if (id === null || ownedThemes(purchases).includes(id)) { setThemeId(id); saveTheme(id) } },
    sleepNights, sleepOn, syncSleepNow,
    async connectSleepNow() { const r = await connectSleep(); if (r === 'ok') { setSleepOn(true); await syncSleepNow() } return r },
    disconnectSleepNow() { disconnectSleep(); setSleepOn(false); setHealthNights([]); saveHealthNights([]) },
    addManualNight(bed, wake, quality) {
      const n = manualNight(bed, wake, quality); if (!n) return false
      const next = [n, ...manualNights.filter(x => x.date !== n.date)]; setManualNights(next); saveManualNights(next); return true
    },
    deleteManualNight(date) { const next = manualNights.filter(x => x.date !== date); setManualNights(next); saveManualNights(next) },
    rituals,
    setRituals(next) { setRitualsState(next); saveRituals(next) },
    focusSessions,
    addFocus(d) {
      const f: FocusSession = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...d, step: d.step.trim().slice(0, 140) }
      const next = [f, ...focusSessions]; setFocusSessions(next); saveFocus(next); return f
    },
    journal,
    addJournal(d) {
      const c = cleanText(d.title, d.body, d.tags), now = new Date().toISOString()
      const e: JournalEntry = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...c, mood: d.mood, prompt: d.prompt }
      updateJournalList([e, ...journal]); return e
    },
    updateJournal(id, d) { const c = cleanText(d.title, d.body, d.tags); updateJournalList(journal.map(e => (e.id === id ? { ...e, ...c, mood: d.mood, updatedAt: new Date().toISOString() } : e))) },
    deleteJournal(id) { updateJournalList(journal.filter(e => e.id !== id)) },
    anchors, anchorsToday, anchorHistory, levels, anchorStreak: anchorStreakVal,
    addAnchor(label, emoji, link) {
      const cur = anchorsRef.current, clean = cleanLabel(label)
      if (!clean || !canAdd(cur)) return false
      const order = cur.reduce((m, a) => Math.max(m, a.order), 0) + 1
      updateAnchors([...cur, { id: crypto.randomUUID(), label: clean, emoji, link, order, createdAt: new Date().toISOString(), archivedAt: null }])
      return true
    },
    renameAnchor(id, label) { const clean = cleanLabel(label); if (clean) updateAnchors(anchorsRef.current.map(a => (a.id === id ? { ...a, label: clean } : a))) },
    removeAnchor(id) { updateAnchors(anchorsRef.current.map(a => (a.id === id && !a.archivedAt ? { ...a, archivedAt: new Date().toISOString() } : a))) },
    moveAnchor(id, dir) { updateAnchors(reorder(anchorsRef.current, id, dir)) },
    toggleAnchor(id) {
      const k = checkKey(id, today), next = new Set(checks)
      if (next.has(k)) next.delete(k); else next.add(k)
      setChecks(next); saveChecks(next)
    },
    sync: syncState, syncNow,
    async signOut(force = false) {
      if (!supabase) return 0
      if (authSession) {
        await syncNow()
        const pending = dirtyCount(loadMeta())
        if (pending > 0 && !force) return pending
      }
      // The account is the source of truth in cloud mode: clear this device's copies so the next person on this browser never sees them.
      for (const k of ['bp.anchors', 'bp.anchorChecks', 'bp.journal', 'bp.journal.draft', 'bp.focus', 'bp.sleep.nights', 'bp.sleep.manual', 'bp.sleep.health', 'bp.sleep.synced', 'bp.purchases', 'bp.theme', 'bp.rituals', 'bp.sync.meta', 'bp.levels.seen'])
        try { localStorage.removeItem(k) } catch { /* ignore */ }
      setJournal([]); setAnchors([]); setChecks(new Set()); setFocusSessions([]); setManualNights([]); setHealthNights([]); setSleepOn(false)
      setPurchases([]); setRitualsState(normalizeRituals(DEFAULT_RITUALS)); setThemeId(null); setSyncState({ status: 'idle', at: null, pending: 0 })
      await supabase.auth.signOut()
      return 0
    },
  }
  // Signing in for the first time: move what is already on this device into the account (once, automatically).
  const importing = useRef(false)
  useEffect(() => {
    if (!supabase || !authSession || !loaded || importing.current) return
    const has = ['bp.thoughts', 'bp.sessions', 'bp.worries'].some(k => { try { return JSON.parse(localStorage.getItem(k) ?? '[]').length > 0 } catch { return false } })
    if (!has) return
    importing.current = true
    value.importLocal().catch(console.error).finally(() => { importing.current = false })
  }, [authSession, loaded])      // eslint-disable-line react-hooks/exhaustive-deps
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}
