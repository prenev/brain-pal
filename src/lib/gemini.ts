import { createClient, extractJson, looksLikeCrisis, PROMPTS, sanitizeReframes, sanitizeStructured, AiError, type Allowed, type Reframes, type Structured } from './aiCore'
import { blobToWav16k, toBase64 } from './audio'
import { DEFAULT_TAGS, EMOTIONS, TRAPS } from './constants'

export { AiError, looksLikeCrisis }
export type { Structured, Reframes }

const K = { key: 'bp.gemini.key', model: 'bp.gemini.model', consent: 'bp.gemini.consent' }
const get = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const set = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* private mode */ } }

export const allowed: Allowed = { emotions: EMOTIONS, traps: TRAPS.map(t => t.name), tags: DEFAULT_TAGS }

export const aiSettings = {
  get: () => ({ key: get(K.key) ?? '', model: get(K.model) ?? '', consent: get(K.consent) === '1' }),
  save: (s: { key?: string; model?: string; consent?: boolean }) => {
    if (s.key !== undefined) set(K.key, s.key.trim() || null)
    if (s.model !== undefined) set(K.model, s.model.trim() || null)
    if (s.consent !== undefined) set(K.consent, s.consent ? '1' : null)
  },
  clear: () => { set(K.key, null); set(K.model, null); set(K.consent, null) },
}

/** AI features are on only with the user's own key AND explicit consent to the privacy terms. */
export const aiEnabled = () => { const s = aiSettings.get(); return !!s.key && s.consent }

const client = () => {
  const s = aiSettings.get()
  if (!s.key) throw new AiError('auth', 'Add your Gemini API key in More → AI helper.')
  if (!s.consent) throw new AiError('auth', 'Turn on the AI helper in More first.')
  return createClient({ key: s.key, model: s.model || null, fetch: (...a) => fetch(...a), onModel: m => aiSettings.save({ model: m }) })
}

/** Validates the key and picks a working model; returns its name. */
export async function connect(): Promise<string> { return client().autoSelect() }

export async function transcribe(blob: Blob): Promise<string> {
  let part
  try { part = { inline_data: { mime_type: 'audio/wav', data: toBase64(await blobToWav16k(blob)) } } }
  catch { part = { inline_data: { mime_type: (blob.type || 'audio/webm').split(';')[0], data: toBase64(new Uint8Array(await blob.arrayBuffer())) } } } // decode failed: send as recorded
  return (await client().generate(PROMPTS.transcribe, [part])).trim()
}

export async function structureEntry(transcript: string): Promise<Structured> {
  if (looksLikeCrisis(transcript)) throw new AiError('blocked', 'crisis')
  const text = await client().generate(PROMPTS.structure(allowed), [{ text: transcript.slice(0, 8000) }], true)
  return sanitizeStructured(extractJson(text), allowed)
}

export async function suggestReframes(input: { thought: string; situation?: string; emotions?: string[] }): Promise<Reframes> {
  const all = [input.thought, input.situation ?? ''].join(' ')
  if (looksLikeCrisis(all)) return { distortions: [], reframes: [], crisis: true }
  const msg = `Thought: ${input.thought}\n${input.situation ? `Situation: ${input.situation}\n` : ''}${input.emotions?.length ? `Feeling: ${input.emotions.join(', ')}` : ''}`
  return sanitizeReframes(extractJson(await client().generate(PROMPTS.reframe(allowed), [{ text: msg.slice(0, 4000) }], true)), allowed)
}
