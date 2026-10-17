import { supabase } from './supabase'
import { blobToDataUrl, shrinkImage } from './image'
import { blobUrl, deleteBlob, putBlob } from './blobstore'
import { extFor } from './audio'
import type { AudioNote, BreathSession, NewSession, NewThought, Thought, Worry } from './types'

/** Storage abstraction: same API for local-only mode and Supabase. */
export interface Repo {
  mode: 'local' | 'cloud'
  listThoughts(): Promise<Thought[]>
  addThought(t: NewThought): Promise<Thought>
  /** Edit the words and ratings of an entry (photos and voice stay as they are). */
  updateThought(id: string, patch: ThoughtPatch): Promise<void>
  deleteThought(id: string): Promise<void>
  listSessions(): Promise<BreathSession[]>
  addSession(s: NewSession): Promise<BreathSession>
  setTranscript(thoughtId: string, transcript: string): Promise<void>
  listWorries(): Promise<Worry[]>
  addWorry(text: string): Promise<Worry>
  updateWorry(id: string, patch: Partial<Pick<Worry, 'status' | 'action' | 'reviewedAt' | 'text'>>): Promise<Worry>
  deleteWorry(id: string): Promise<void>
}

export type ThoughtPatch = Partial<Pick<Thought, 'mood' | 'situation' | 'thought' | 'emotions' | 'alternateThought' | 'outcomeIntensity' | 'tags' | 'distortions'>>

const uid = () => crypto.randomUUID()

/* ---------- Local (localStorage + IndexedDB for media) ---------- */
const K_T = 'bp.thoughts', K_S = 'bp.sessions', K_W = 'bp.worries'
const read = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) ?? '[]') } catch { return [] } }
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v))

/** What actually lives in localStorage: media are referenced by IndexedDB key, never inlined. */
type StoredThought = Omit<Thought, 'photos' | 'audio'> & {
  photos?: string[]                      // legacy entries (inline data URLs)
  photoRefs?: string[]
  audio?: Omit<AudioNote, 'url'> | null
}

async function hydrate(t: StoredThought): Promise<Thought> {
  const fromRefs = (await Promise.all((t.photoRefs ?? []).map(blobUrl))).filter((u): u is string => !!u)
  let audio: AudioNote | null = null
  // Keep the note (and its transcript) even if the audio file can't be read; the player just won't show.
  if (t.audio) audio = { ...t.audio, url: (await blobUrl(t.audio.ref)) ?? '' }
  const { photoRefs: _p, ...rest } = t
  return { ...rest, mood: t.mood ?? 3, distortions: t.distortions ?? [], photos: [...(t.photos ?? []), ...fromRefs], audio }
}

export const localRepo: Repo = {
  mode: 'local',
  async listThoughts() { return Promise.all(read<StoredThought>(K_T).map(hydrate)) },
  async addThought({ photoFiles, audioClip, ...rest }) {
    const id = uid()
    const photoRefs: string[] = [], photos: string[] = []
    for (const f of photoFiles) {
      const small = await shrinkImage(f, 1400, 0.78)
      const ref = `photo-${uid()}`
      try { await putBlob(ref, small); photoRefs.push(ref) } catch { photos.push(await blobToDataUrl(small)) } // IndexedDB unavailable
    }
    let audio: StoredThought['audio'] = null
    if (audioClip) {
      const ref = `audio-${uid()}`
      await putBlob(ref, audioClip.blob)   // no fallback: audio is too big for localStorage, so surface the error
      audio = { ref, durationSec: audioClip.durationSec, mime: audioClip.mime, transcript: audioClip.transcript }
    }
    const stored: StoredThought = { ...rest, id, createdAt: rest.createdAt ?? new Date().toISOString(), photos, photoRefs, audio }
    write(K_T, [stored, ...read<StoredThought>(K_T)])
    return hydrate(stored)
  },
  async deleteThought(id) {
    const all = read<StoredThought>(K_T), t = all.find(x => x.id === id)
    write(K_T, all.filter(x => x.id !== id))
    for (const ref of [...(t?.photoRefs ?? []), ...(t?.audio ? [t.audio.ref] : [])]) await deleteBlob(ref).catch(() => {})
  },
  async setTranscript(id, transcript) {
    write(K_T, read<StoredThought>(K_T).map(t => (t.id === id && t.audio ? { ...t, audio: { ...t.audio, transcript } } : t)))
  },
  async updateThought(id, patch) {
    write(K_T, read<StoredThought>(K_T).map(t => (t.id === id ? { ...t, ...patch } : t)))
  },
  async listSessions() { return read<BreathSession>(K_S).map(x => ({ ...x, kind: x.kind ?? 'breathing', anxietyBefore: x.anxietyBefore ?? null, anxietyAfter: x.anxietyAfter ?? null })) },
  async addSession(s) {
    const x: BreathSession = { kind: 'breathing', anxietyBefore: null, anxietyAfter: null, ...s, id: uid(), createdAt: s.createdAt ?? new Date().toISOString() }
    write(K_S, [x, ...read<BreathSession>(K_S)])
    return x
  },
  async listWorries() { return read<Worry>(K_W) },
  async addWorry(text) {
    const w: Worry = { id: uid(), createdAt: new Date().toISOString(), text, status: 'open', action: null, reviewedAt: null }
    write(K_W, [w, ...read<Worry>(K_W)]); return w
  },
  async updateWorry(id, patch) {
    const all = read<Worry>(K_W).map(w => (w.id === id ? { ...w, ...patch } : w)); write(K_W, all)
    return all.find(w => w.id === id)!
  },
  async deleteWorry(id) { write(K_W, read<Worry>(K_W).filter(w => w.id !== id)) },
}

/* ---------- Supabase ---------- */
const sb = () => supabase!

async function signPhotos(paths: string[]): Promise<string[]> {
  if (!paths.length) return []
  const { data } = await sb().storage.from('photos').createSignedUrls(paths, 3600)
  return (data ?? []).map(d => d.signedUrl ?? '').filter(Boolean)
}

async function signOne(path: string | null): Promise<string | null> {
  if (!path) return null
  const { data } = await sb().storage.from('photos').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

const worryRow = (r: any): Worry => ({ id: r.id, createdAt: r.created_at, text: r.text, status: r.status, action: r.action, reviewedAt: r.reviewed_at })

const rowToThought = async (r: any): Promise<Thought> => ({
  id: r.id, createdAt: r.created_at, mood: r.mood ?? 3, situation: r.situation, thought: r.thought,
  emotions: r.emotions, internalBehaviour: r.internal_behaviour, externalBehaviour: r.external_behaviour,
  alternateThought: r.alternate_thought, outcomeIntensity: r.outcome_intensity, tags: r.tags, distortions: r.distortions ?? [],
  photos: await signPhotos(r.photos),
  audio: r.audio_path ? { ref: r.audio_path, url: (await signOne(r.audio_path)) ?? '', durationSec: r.audio_duration ?? 0, mime: r.audio_mime ?? 'audio/webm', transcript: r.transcript } : null,
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
  async addThought({ photoFiles, audioClip, ...t }) {
    const { data: { user } } = await sb().auth.getUser()
    const paths: string[] = []
    for (const f of photoFiles) {
      const path = `${user!.id}/${uid()}.jpg`
      const { error } = await sb().storage.from('photos').upload(path, await shrinkImage(f), { contentType: 'image/jpeg' })
      if (error) throw error
      paths.push(path)
    }
    let audioPath: string | null = null
    if (audioClip) {
      audioPath = `${user!.id}/${uid()}.${extFor(audioClip.mime)}`
      const { error } = await sb().storage.from('photos').upload(audioPath, audioClip.blob, { contentType: audioClip.mime.split(';')[0] })
      if (error) throw error
    }
    const { data, error } = await sb().from('thoughts').insert({
      ...(audioClip && { audio_path: audioPath, audio_duration: audioClip.durationSec, audio_mime: audioClip.mime, transcript: audioClip.transcript }),
      mood: t.mood, ...(t.createdAt && { created_at: t.createdAt }), situation: t.situation, thought: t.thought, emotions: t.emotions,
      internal_behaviour: t.internalBehaviour, external_behaviour: t.externalBehaviour,
      alternate_thought: t.alternateThought, outcome_intensity: t.outcomeIntensity,
      tags: t.tags, distortions: t.distortions, photos: paths,
    }).select().single()
    if (error) throw error
    return rowToThought(data)
  },
  async deleteThought(id) {
    const { data } = await sb().from('thoughts').select('photos, audio_path').eq('id', id).single()
    const files = [...(data?.photos ?? []), ...(data?.audio_path ? [data.audio_path] : [])]
    if (files.length) await sb().storage.from('photos').remove(files)
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
  async setTranscript(id, transcript) {
    const { error } = await sb().from('thoughts').update({ transcript }).eq('id', id)
    if (error) throw error
  },
  async updateThought(id, p) {
    const row: Record<string, unknown> = {}
    if (p.mood !== undefined) row.mood = p.mood
    if (p.situation !== undefined) row.situation = p.situation
    if (p.thought !== undefined) row.thought = p.thought
    if (p.emotions !== undefined) row.emotions = p.emotions
    if (p.alternateThought !== undefined) row.alternate_thought = p.alternateThought
    if (p.outcomeIntensity !== undefined) row.outcome_intensity = p.outcomeIntensity
    if (p.tags !== undefined) row.tags = p.tags
    if (p.distortions !== undefined) row.distortions = p.distortions
    const { error } = await sb().from('thoughts').update(row).eq('id', id)
    if (error) throw error
  },
  async listWorries() {
    const { data, error } = await sb().from('worries').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data.map(worryRow)
  },
  async addWorry(text) {
    const { data, error } = await sb().from('worries').insert({ text }).select().single()
    if (error) throw error
    return worryRow(data)
  },
  async updateWorry(id, patch) {
    const { data, error } = await sb().from('worries').update({
      ...(patch.status !== undefined && { status: patch.status }), ...(patch.action !== undefined && { action: patch.action }),
      ...(patch.reviewedAt !== undefined && { reviewed_at: patch.reviewedAt }), ...(patch.text !== undefined && { text: patch.text }),
    }).eq('id', id).select().single()
    if (error) throw error
    return worryRow(data)
  },
  async deleteWorry(id) {
    const { error } = await sb().from('worries').delete().eq('id', id)
    if (error) throw error
  },
}
