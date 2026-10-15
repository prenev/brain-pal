import type { Anchor } from './anchors.ts'
import type { FocusSession } from './focus.ts'
import type { JournalEntry } from './journal.ts'
import type { Purchase } from './rewards.ts'
import { normalizeRituals, type Ritual } from './rituals.ts'
import type { Night } from './sleep.ts'
import { keyOf, stableHash, type Doc, type Item, type Meta } from './sync.ts'

/** The device-local "extras" that sync to the account. Pure conversion between those collections and sync documents. */
export interface Extras {
  journal: JournalEntry[]; anchors: Anchor[]; checks: Set<string>; focus: FocusSession[]
  manualNights: Night[]; purchases: Purchase[]; rituals: Ritual[]; themeId: string | null
}

export const ID_RITUALS = 'all', ID_THEME = 'theme'

export function collectItems(x: Extras): Item[] {
  return [
    ...x.journal.map(d => ({ kind: 'journal' as const, id: d.id, data: d })),
    ...x.anchors.map(d => ({ kind: 'anchor' as const, id: d.id, data: d })),
    ...[...x.checks].map(k => ({ kind: 'anchor_check' as const, id: k, data: { key: k } })),
    ...x.focus.map(d => ({ kind: 'focus' as const, id: d.id, data: d })),
    ...x.manualNights.map(d => ({ kind: 'manual_night' as const, id: d.date, data: d })),
    ...x.purchases.map(d => ({ kind: 'purchase' as const, id: d.id, data: d })),
    { kind: 'rituals' as const, id: ID_RITUALS, data: x.rituals },
    ...(x.themeId ? [{ kind: 'theme' as const, id: ID_THEME, data: { id: x.themeId } }] : []),
  ]
}

/** Only apply remote docs for items that haven't changed on this device since we looked (a newer local edit is never overwritten). */
export function unchangedSince(docs: Doc[], nowItems: Item[], metaAtDetect: Meta): Doc[] {
  const hashes = new Map(nowItems.map(i => [keyOf(i.kind, i.id), stableHash(i.data)]))
  return docs.filter(d => { const k = keyOf(d.kind, d.id), h = hashes.get(k); return h === undefined || h === metaAtDetect[k]?.hash })
}

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => typeof v === 'string'
const VALID: Record<'journal' | 'anchor' | 'focus' | 'manual_night' | 'purchase', (d: unknown) => boolean> = {
  journal: d => obj(d) && str(d.id) && str(d.createdAt),
  anchor: d => obj(d) && str(d.id) && str(d.label) && str(d.createdAt),
  focus: d => obj(d) && str(d.id) && str(d.createdAt),
  manual_night: d => obj(d) && str(d.date) && typeof d.asleepMin === 'number' && typeof d.start === 'number' && typeof d.end === 'number',
  purchase: d => obj(d) && str(d.id) && str(d.itemId) && typeof d.cost === 'number' && d.cost >= 0,
}

function merge<T>(cur: T[], idOf: (t: T) => string, docs: Doc[], valid: (d: unknown) => boolean): T[] {
  const m = new Map(cur.map(t => [idOf(t), t]))
  for (const d of docs) { if (d.deleted) m.delete(d.id); else if (valid(d.data)) m.set(d.id, d.data as T) }
  return [...m.values()]
}

/** Apply remote docs to the current collections; returns a new Extras (the input is not modified). Invalid remote data is ignored. */
export function applyDocs(cur: Extras, docs: Doc[]): Extras {
  const by = (kind: Doc['kind']) => docs.filter(d => d.kind === kind)
  const checks = new Set(cur.checks)
  for (const d of by('anchor_check')) { if (d.deleted) checks.delete(d.id); else if (str(d.id) && d.id.includes('|')) checks.add(d.id) }
  let rituals = cur.rituals
  const r = by('rituals').filter(d => !d.deleted).at(-1); if (r) rituals = normalizeRituals(r.data)
  let themeId = cur.themeId
  const t = by('theme').at(-1); if (t) themeId = t.deleted ? null : obj(t.data) && str(t.data.id) ? t.data.id : themeId
  return {
    journal: merge(cur.journal, e => e.id, by('journal'), VALID.journal),
    anchors: merge(cur.anchors, a => a.id, by('anchor'), VALID.anchor),
    checks,
    focus: merge(cur.focus, f => f.id, by('focus'), VALID.focus),
    manualNights: merge(cur.manualNights, n => n.date, by('manual_night'), VALID.manual_night),
    purchases: merge(cur.purchases, p => p.id, by('purchase'), VALID.purchase),
    rituals, themeId,
  }
}
