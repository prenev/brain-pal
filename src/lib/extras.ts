import type { Anchor } from './anchors.ts'
import type { JournalEntry } from './journal.ts'
import type { FocusSession } from './focus.ts'
import type { Night } from './sleep.ts'
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
    .map(a => ({ ...a, emoji: a.emoji ?? 'sparkles', link: a.link ?? null, order: a.order ?? 0, archivedAt: a.archivedAt ?? null }))
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
