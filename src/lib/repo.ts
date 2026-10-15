import { supabase } from './supabase'
import { blobToDataUrl, shrinkImage } from './image'
import type { BreathSession, NewSession, NewThought, Thought } from './types'

/** Storage abstraction: same API for local-only mode and Supabase. */
export interface Repo {
  mode: 'local' | 'cloud'
  listThoughts(): Promise<Thought[]>
  addThought(t: NewThought): Promise<Thought>
  deleteThought(id: string): Promise<void>
  listSessions(): Promise<BreathSession[]>
  addSession(s: NewSession): Promise<BreathSession>
}

const uid = () => crypto.randomUUID()

/* ---------- Local (localStorage) ---------- */
const K_T = 'bp.thoughts', K_S = 'bp.sessions'
const read = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) ?? '[]') } catch { return [] } }
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v))

export const localRepo: Repo = {
  mode: 'local',
  async listThoughts() { return read<Thought>(K_T).map(t => ({ ...t, mood: t.mood ?? 3, distortions: t.distortions ?? [] })) },
  async addThought({ photoFiles, ...rest }) {
    const photos = await Promise.all(photoFiles.map(async f => blobToDataUrl(await shrinkImage(f, 1000, 0.7))))
    const t: Thought = { ...rest, id: uid(), createdAt: rest.createdAt ?? new Date().toISOString(), photos }
    write(K_T, [t, ...read<Thought>(K_T)])
    return t
  },
  async deleteThought(id) { write(K_T, read<Thought>(K_T).filter(t => t.id !== id)) },
  async listSessions() { return read<BreathSession>(K_S).map(x => ({ ...x, kind: x.kind ?? 'breathing', anxietyBefore: x.anxietyBefore ?? null, anxietyAfter: x.anxietyAfter ?? null })) },
  async addSession(s) {
    const x: BreathSession = { kind: 'breathing', anxietyBefore: null, anxietyAfter: null, ...s, id: uid(), createdAt: s.createdAt ?? new Date().toISOString() }
    write(K_S, [x, ...read<BreathSession>(K_S)])
    return x
  },
}

/* ---------- Supabase ---------- */
const sb = () => supabase!

async function signPhotos(paths: string[]): Promise<string[]> {
  if (!paths.length) return []
  const { data } = await sb().storage.from('photos').createSignedUrls(paths, 3600)
  return (data ?? []).map(d => d.signedUrl ?? '').filter(Boolean)
}

const rowToThought = async (r: any): Promise<Thought> => ({
  id: r.id, createdAt: r.created_at, mood: r.mood ?? 3, situation: r.situation, thought: r.thought,
  emotions: r.emotions, internalBehaviour: r.internal_behaviour, externalBehaviour: r.external_behaviour,
  alternateThought: r.alternate_thought, outcomeIntensity: r.outcome_intensity, tags: r.tags, distortions: r.distortions ?? [],
  photos: await signPhotos(r.photos),
})

const sessionRow = (r: any): BreathSession => ({
  id: r.id, createdAt: r.created_at, pattern: r.pattern, cycles: r.cycles, durationSec: r.duration_sec, completed: r.completed,
  kind: r.kind ?? 'breathing', anxietyBefore: r.anxiety_before, anxietyAfter: r.anxiety_after,
})

export const cloudRepo: Repo = {
  mode: 'cloud',
  async listThoughts() {
    const { data, error } = await sb().from('thoughts').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return Promise.all(data.map(rowToThought))
  },
  async addThought({ photoFiles, ...t }) {
    const { data: { user } } = await sb().auth.getUser()
    const paths: string[] = []
    for (const f of photoFiles) {
      const path = `${user!.id}/${uid()}.jpg`
      const { error } = await sb().storage.from('photos').upload(path, await shrinkImage(f), { contentType: 'image/jpeg' })
      if (error) throw error
      paths.push(path)
    }
    const { data, error } = await sb().from('thoughts').insert({
      mood: t.mood, ...(t.createdAt && { created_at: t.createdAt }), situation: t.situation, thought: t.thought, emotions: t.emotions,
      internal_behaviour: t.internalBehaviour, external_behaviour: t.externalBehaviour,
      alternate_thought: t.alternateThought, outcome_intensity: t.outcomeIntensity,
      tags: t.tags, distortions: t.distortions, photos: paths,
    }).select().single()
    if (error) throw error
    return rowToThought(data)
  },
  async deleteThought(id) {
    const { data } = await sb().from('thoughts').select('photos').eq('id', id).single()
    if (data?.photos?.length) await sb().storage.from('photos').remove(data.photos)
    const { error } = await sb().from('thoughts').delete().eq('id', id)
    if (error) throw error
  },
  async listSessions() {
    const { data, error } = await sb().from('breath_sessions').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data.map(sessionRow)
  },
  async addSession(s) {
    const { data, error } = await sb().from('breath_sessions')
      .insert({ ...(s.createdAt && { created_at: s.createdAt }), pattern: s.pattern, cycles: s.cycles, duration_sec: s.durationSec, completed: s.completed, kind: s.kind ?? 'breathing', anxiety_before: s.anxietyBefore ?? null, anxiety_after: s.anxietyAfter ?? null }).select().single()
    if (error) throw error
    return sessionRow(data)
  },
}
