/**
 * Sync for the "extras" (journal, anchors, focus sessions, hand-logged sleep, purchases, rituals, theme) between this device
 * and the signed-in account. Pure logic only: every item is a small document; the newest edit wins per item; deleting an item
 * leaves a tombstone so it stays deleted on your other devices. Nothing here touches the network or storage.
 */
export type DocKind = 'journal' | 'anchor' | 'anchor_check' | 'focus' | 'manual_night' | 'purchase' | 'rituals' | 'theme'
export const DOC_KINDS: DocKind[] = ['journal', 'anchor', 'anchor_check', 'focus', 'manual_night', 'purchase', 'rituals', 'theme']

export interface Item { kind: DocKind; id: string; data: unknown }
export interface Doc { kind: DocKind; id: string; data: unknown; deleted: boolean; updatedAt: number }
export interface MetaEntry { hash: string; updatedAt: number; deleted: boolean; synced: boolean }
export type Meta = Record<string, MetaEntry>

export const keyOf = (kind: DocKind, id: string) => `${kind}|${id}`

/** Deterministic JSON (sorted keys) -> short FNV-1a hash. Equal data always hashes equal, whatever the key order. */
export function stableHash(v: unknown): string {
  const s = canon(v); let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(16).padStart(8, '0')
}
function canon(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`
}

const TOMB = ''   // hash of a deleted item
/** Does `a` beat `b`? Newer edit wins; equal times break the tie by hash so every device picks the same winner. */
const beats = (a: { updatedAt: number; hash: string }, b: { updatedAt: number; hash: string }) => a.updatedAt > b.updatedAt || (a.updatedAt === b.updatedAt && a.hash > b.hash)

export interface Local { meta: Meta; dirty: Doc[] }
/**
 * Compare what's on this device now with what we knew last time. New or changed items get `updatedAt = now`; items that
 * disappeared become tombstones. `dirty` is everything not yet confirmed on the server (so a failed push is retried).
 */
export function detectLocal(meta: Meta, current: Item[], now: number): Local {
  const next: Meta = { ...meta }, seen = new Set<string>(), data = new Map<string, unknown>()
  for (const it of current) {
    const k = keyOf(it.kind, it.id), hash = stableHash(it.data), m = next[k]
    seen.add(k); data.set(k, it.data)
    if (!m || m.hash !== hash || m.deleted) next[k] = { hash, updatedAt: now, deleted: false, synced: false }
  }
  for (const [k, m] of Object.entries(next)) if (!seen.has(k) && !m.deleted) next[k] = { hash: TOMB, updatedAt: now, deleted: true, synced: false }
  const dirty: Doc[] = []
  for (const [k, m] of Object.entries(next)) {
    if (m.synced) continue
    const [kind, ...rest] = k.split('|')
    dirty.push({ kind: kind as DocKind, id: rest.join('|'), data: m.deleted ? null : data.get(k) ?? null, deleted: m.deleted, updatedAt: m.updatedAt })
  }
  return { meta: next, dirty }
}

export interface Reconciled { meta: Meta; apply: Doc[]; push: Doc[] }
/**
 * Merge what the server has (`remote`) into what we know. `current` are the items on this device (after detectLocal).
 * - a remote doc that beats ours is applied (a tombstone deletes the local item)
 * - a local change that beats the server's is pushed
 * Idempotent: running it twice with the same inputs changes nothing the second time.
 */
export function reconcile(meta: Meta, current: Item[], remote: Doc[]): Reconciled {
  const next: Meta = { ...meta }, apply: Doc[] = [], push: Doc[] = []
  const have = new Map(current.map(i => [keyOf(i.kind, i.id), i.data]))
  for (const d of remote) {
    const k = keyOf(d.kind, d.id), m = next[k], rHash = d.deleted ? TOMB : stableHash(d.data)
    if (!m) {
      next[k] = { hash: rHash, updatedAt: d.updatedAt, deleted: d.deleted, synced: true }
      if (!d.deleted) apply.push(d)
      continue
    }
    if (beats({ updatedAt: d.updatedAt, hash: rHash }, m)) {
      next[k] = { hash: rHash, updatedAt: d.updatedAt, deleted: d.deleted, synced: true }
      if (!d.deleted || have.has(k)) apply.push(d)
    } else if (d.updatedAt === m.updatedAt && rHash === m.hash) {
      next[k] = { ...m, synced: true }                 // already identical on both sides
    } else if (!m.synced || m.updatedAt > d.updatedAt) {
      push.push({ kind: d.kind, id: d.id, data: m.deleted ? null : have.get(k) ?? null, deleted: m.deleted, updatedAt: m.updatedAt })
    }
  }
  // Something we believe is on the server but isn't (it was lost or wiped there): send it again.
  const onServer = new Set(remote.map(d => keyOf(d.kind, d.id)))
  for (const [k, m] of Object.entries(next)) {
    if (!m.synced || m.deleted || onServer.has(k) || !have.has(k)) continue
    next[k] = { ...m, synced: false }
    const [kind, ...rest] = k.split('|')
    push.push({ kind: kind as DocKind, id: rest.join('|'), data: have.get(k) ?? null, deleted: false, updatedAt: m.updatedAt })
  }
  return { meta: next, apply, push }
}

/** Record a successful push: only docs whose version is still the one we sent are marked synced. */
export function markSynced(meta: Meta, sent: Doc[]): Meta {
  const next: Meta = { ...meta }
  for (const d of sent) { const k = keyOf(d.kind, d.id), m = next[k]; if (m && m.updatedAt === d.updatedAt) next[k] = { ...m, synced: true } }
  return next
}

/** Unique docs by key, last one wins (used to combine "dirty" and "needs re-push"). */
export function uniqueDocs(docs: Doc[]): Doc[] { const m = new Map<string, Doc>(); for (const d of docs) m.set(keyOf(d.kind, d.id), d); return [...m.values()] }

export const dirtyCount = (meta: Meta) => Object.values(meta).filter(m => !m.synced).length
