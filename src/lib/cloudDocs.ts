import { supabase } from './supabase'
import type { Doc, DocKind } from './sync.ts'

/** Thin network layer for the `user_docs` table. Never throws: a failed sync is retried later, local data is untouched. */
const PAGE = 1000, CHUNK = 100

/** Every doc the account has (small: a few hundred rows). Returns null if anything went wrong, so a partial list is never trusted. */
export async function pullDocs(): Promise<Doc[] | null> {
  if (!supabase) return null
  try {
    const out: Doc[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from('user_docs').select('kind, id, data, deleted, updated_at').order('updated_at', { ascending: true }).order('id').range(from, from + PAGE - 1)
      if (error || !data) return null
      for (const r of data) out.push({ kind: r.kind as DocKind, id: r.id, data: r.data, deleted: !!r.deleted, updatedAt: Date.parse(r.updated_at) })
      if (data.length < PAGE) return out
    }
  } catch { return null }
}

export async function pushDocs(docs: Doc[]): Promise<boolean> {
  if (!docs.length) return true
  if (!supabase) return false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user.id
    if (!uid) return false
    for (let i = 0; i < docs.length; i += CHUNK) {
      const rows = docs.slice(i, i + CHUNK).map(d => ({ user_id: uid, kind: d.kind, id: d.id, data: d.deleted ? null : d.data, deleted: d.deleted, updated_at: new Date(d.updatedAt).toISOString() }))
      const { error } = await supabase.from('user_docs').upsert(rows, { onConflict: 'user_id,kind,id' })
      if (error) return false
    }
    return true
  } catch { return false }
}
