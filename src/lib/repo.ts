import { supabase } from './supabase'
import { blobToDataUrl, shrinkImage } from './image'
import type { BreathSession, NewThought, Thought } from './types'

/** Storage abstraction: same API for local-only mode and Supabase. */
export interface Repo {
  mode: 'local' | 'cloud'
  listThoughts(): Promise<Thought[]>
  addThought(t: NewThought): Promise<Thought>
  deleteThought(id: string): Promise<void>
  listSessions(): Promise<BreathSession[]>
  addSession(s: Omit<BreathSession, 'id' | 'createdAt'>): Promise<BreathSession>
}

const uid = () => crypto.randomUUID()

/* ---------- Local (localStorage) ---------- */
const K_T = 'bp.thoughts', K_S = 'bp.sessions'
const read = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) ?? '[]') } catch { return [] } }
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v))

export const localRepo: Repo = {
  mode: 'local',
  async listThoughts() { return read<Thought>(K_T).map(t => ({ ...t, mood: t.mood ?? 3 })) },
  async addThought({ photoFiles, ...rest }) {
    const photos = await Promise.all(photoFiles.map(async f => blobToDataUrl(await shrinkImage(f, 1000, 0.7))))
    const t: Thought = { ...rest, id: uid(), createdAt: rest.createdAt ?? new Date().toISOString(), photos }
    write(K_T, [t, ...read<Thought>(K_T)])
    return t
  },
  async deleteThought(id) { write(K_T, read<Thought>(K_T).filter(t => t.id !== id)) },
  async listSessions() { return read<BreathSession>(K_S) },
  async addSession(s) {
    const x: BreathSession = { ...s, id: uid(), createdAt: new Date().toISOString() }
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
  alternateThought: r.alternate_thought, outcomeIntensity: r.outcome_intensity, tags: r.tags,
  photos: await signPhotos(r.photos),
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
      tags: t.tags, photos: paths,
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
    return data.map(r => ({ id: r.id, createdAt: r.created_at, pattern: r.pattern, cycles: r.cycles, durationSec: r.duration_sec, completed: r.completed }))
  },
  async addSession(s) {
    const { data, error } = await sb().from('breath_sessions')
      .insert({ pattern: s.pattern, cycles: s.cycles, duration_sec: s.durationSec, completed: s.completed }).select().single()
    if (error) throw error
    return { id: data.id, createdAt: data.created_at, pattern: data.pattern, cycles: data.cycles, durationSec: data.duration_sec, completed: data.completed }
  },
}
