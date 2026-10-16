import type { Anchor } from './anchors.ts'
import type { JournalEntry } from './journal.ts'
import type { FocusSession } from './focus.ts'
import type { Night } from './sleep.ts'
import type { Purchase } from './rewards.ts'
import { migrateOldReminder, normalizeRituals, type Ritual } from './rituals.ts'

/**
 * Device-local storage for the wellbeing extras (anchors now; journal, sleep and coins later).
 * Cloud sync for these arrives in Phase 12; until then they stay on this device even when signed in.
 */
const K_ANCHORS = 'bp.anchors', K_CHECKS = 'bp.anchorChecks'

function read<T>(k: string, fallback: T): T {
  try { const v = JSON.parse(localStorage.getItem(k) ?? 'null'); return v ?? fallback } catch { return fallback }
}
function write(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full / private mode: keep working in memory */ } }

export const loadAnchors = (): Anchor[] => {
  const raw = read<unknown>(K_ANCHORS, [])
  if (!Array.isArray(raw)) return []
  return raw.filter((a): a is Anchor => !!a && typeof a.id === 'string' && typeof a.label === 'string')
    .map(a => ({ ...a, createdAt: a.createdAt ?? new Date().toISOString(), emoji: a.emoji ?? 'sparkles', link: a.link ?? null, order: a.order ?? 0, archivedAt: a.archivedAt ?? null }))
}
export const saveAnchors = (a: Anchor[]) => write(K_ANCHORS, a)

export const loadChecks = (): Set<string> => {
  const raw = read<unknown>(K_CHECKS, [])
  return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [])
}
export const saveChecks = (c: Set<string>) => write(K_CHECKS, [...c])

const K_JOURNAL = 'bp.journal', K_DRAFT = 'bp.journal.draft'
export const loadJournal = (): JournalEntry[] => {
  const raw = read<unknown>(K_JOURNAL, [])
  if (!Array.isArray(raw)) return []
  return raw.filter((e): e is JournalEntry => !!e && typeof e.id === 'string' && typeof e.createdAt === 'string')
    .map(e => ({ ...e, title: e.title ?? '', body: e.body ?? '', mood: e.mood ?? null, tags: Array.isArray(e.tags) ? e.tags : [], prompt: e.prompt ?? null, updatedAt: e.updatedAt ?? e.createdAt }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export const saveJournal = (j: JournalEntry[]) => write(K_JOURNAL, j)

export interface JournalDraft { title: string; body: string; mood: number | null; tags: string[]; prompt: string | null }
export const loadDraft = (): JournalDraft | null => {
  const d = read<Partial<JournalDraft> | null>(K_DRAFT, null)
  return d && typeof d === 'object' && (typeof d.body === 'string' || typeof d.title === 'string')
    ? { title: d.title ?? '', body: d.body ?? '', mood: d.mood ?? null, tags: Array.isArray(d.tags) ? d.tags : [], prompt: d.prompt ?? null } : null
}
export const saveDraft = (d: JournalDraft) => write(K_DRAFT, d)
export const clearDraft = () => { try { localStorage.removeItem(K_DRAFT) } catch { /* ignore */ } }

const K_FOCUS = 'bp.focus'
export const loadFocus = (): FocusSession[] => {
  const raw = read<unknown>(K_FOCUS, [])
  if (!Array.isArray(raw)) return []
  return raw.filter((f): f is FocusSession => !!f && typeof f.id === 'string' && typeof f.createdAt === 'string')
    .map(f => ({ ...f, minutes: f.minutes ?? 5, actualSec: f.actualSec ?? 0, completed: !!f.completed, worryId: f.worryId ?? null, step: f.step ?? '' }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export const saveFocus = (f: FocusSession[]) => write(K_FOCUS, f)

const K_RITUALS = 'bp.rituals'
/** Rituals, or — for people who already had the single daily reminder — that reminder carried over as the "Daily check-in". */
export const loadRituals = (): Ritual[] => {
  const raw = read<unknown>(K_RITUALS, null)
  return raw === null ? migrateOldReminder(read<{ enabled?: boolean; hour?: number } | null>('bp.reminder', null)) : normalizeRituals(raw)
}
export const saveRituals = (r: Ritual[]) => write(K_RITUALS, r)

const K_NIGHTS = 'bp.sleep.nights', K_MANUAL = 'bp.sleep.manual'
const validNight = (n: unknown): n is Night => !!n && typeof (n as Night).date === 'string' && typeof (n as Night).asleepMin === 'number' && typeof (n as Night).start === 'number' && typeof (n as Night).end === 'number'
/** Measured nights (from Apple Health), cached so the Sleep screen works offline. */
export const loadHealthNights = (): Night[] => { const r = read<unknown>(K_NIGHTS, []); return Array.isArray(r) ? r.filter(validNight) : [] }
export const saveHealthNights = (n: Night[]) => write(K_NIGHTS, n)
export const loadManualNights = (): Night[] => { const r = read<unknown>(K_MANUAL, []); return Array.isArray(r) ? r.filter(validNight) : [] }
export const saveManualNights = (n: Night[]) => write(K_MANUAL, n)

const K_PURCHASES = 'bp.purchases', K_THEME = 'bp.theme'
export const loadPurchases = (): Purchase[] => {
  const r = read<unknown>(K_PURCHASES, [])
  return Array.isArray(r) ? r.filter((p): p is Purchase => !!p && typeof p.id === 'string' && typeof p.itemId === 'string' && typeof p.cost === 'number' && p.cost >= 0) : []
}
export const savePurchases = (p: Purchase[]) => write(K_PURCHASES, p)
export const loadTheme = (): string | null => { const t = read<unknown>(K_THEME, null); return typeof t === 'string' ? t : null }
export const saveTheme = (t: string | null) => { try { t === null ? localStorage.removeItem(K_THEME) : localStorage.setItem(K_THEME, JSON.stringify(t)) } catch { /* ignore */ } }

// Focus guard: device-only (the app selection is a device-specific token and never leaves the phone)
import { normalizeGuard, normalizeEvents, type GuardConfig, type GuardEvent } from './guard.ts'
const K_GUARD = 'bp.guard', K_GUARD_EVENTS = 'bp.guard.events'
export const loadGuard = (): GuardConfig => normalizeGuard(read<unknown>(K_GUARD, null))
export const saveGuard = (g: GuardConfig) => write(K_GUARD, g)
export const loadGuardEvents = (): GuardEvent[] => normalizeEvents(read<unknown>(K_GUARD_EVENTS, []))
export const saveGuardEvents = (e: GuardEvent[]) => write(K_GUARD_EVENTS, e)

// Rating prompt bookkeeping (device-only)
import type { ReviewState } from './review.ts'
const K_REVIEW = 'bp.review'
export const loadReview = (): ReviewState => { const r = read<Partial<ReviewState> | null>(K_REVIEW, null); return { firstSeen: r?.firstSeen ?? null, lastAsked: r?.lastAsked ?? null, asks: r?.asks ?? 0 } }
export const saveReview = (r: ReviewState) => write(K_REVIEW, r)

// Sound + haptic feedback preferences (device-only)
import { normalizeFx, type FxSettings } from './sfx.ts'
const K_FX = 'bp.fx'
export const loadFx = (): FxSettings => normalizeFx(read<unknown>(K_FX, null))
export const saveFx = (f: FxSettings) => write(K_FX, f)

// Most coins ever earned (earnings are derived from your data; this keeps them from shrinking when something is deleted)
const K_COIN_HW = 'bp.coins.hw'
export const loadCoinHighWater = (): number => { const v = read<unknown>(K_COIN_HW, 0); return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0 }
export const saveCoinHighWater = (n: number) => write(K_COIN_HW, n)

// Focus: pomodoro settings + to-dos (device-only for now)
import { normalizePomo, normalizeTodos, type PomoSettings, type Todo } from './pomodoro.ts'
const K_POMO = 'bp.pomo', K_TODOS = 'bp.todos'
export const loadPomo = (): PomoSettings => normalizePomo(read<unknown>(K_POMO, null))
export const savePomo = (s: PomoSettings) => write(K_POMO, s)
export const loadTodos = (): Todo[] => normalizeTodos(read<unknown>(K_TODOS, []))
export const saveTodos = (t: Todo[]) => write(K_TODOS, t)

// the pomodoro run in progress (so leaving the screen or restarting the app keeps the clock)
import { IDLE_RUN, normalizeRun, type PomoRun } from './pomodoro.ts'
const K_RUN = 'bp.pomo.run'
export const loadRun = (): PomoRun => normalizeRun(read<unknown>(K_RUN, IDLE_RUN))
export const saveRun = (r: PomoRun) => write(K_RUN, r)
