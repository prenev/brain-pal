import type { Anchor } from './anchors.ts'

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
