export interface EmotionRating { name: string; intensity: number }

export interface Thought {
  id: string
  createdAt: string
  /** 1 (awful) … 5 (rad) */
  mood: number
  situation: string
  thought: string
  emotions: EmotionRating[]
  internalBehaviour: string
  externalBehaviour: string
  alternateThought: string
  outcomeIntensity: number | null
  tags: string[]
  /** Cognitive-distortion names, see TRAPS in constants.ts */
  distortions: string[]
  /** Displayable URLs (object URLs locally, signed URLs on Supabase). */
  photos: string[]
  /** Optional voice memo, with transcript once transcribed. */
  audio: AudioNote | null
}

export interface AudioNote {
  /** IndexedDB key (local) or storage path (cloud). */
  ref: string
  /** Playable URL; transient, never persisted. */
  url: string
  durationSec: number
  mime: string
  transcript: string | null
}

export interface AudioClip { blob: Blob; durationSec: number; mime: string; transcript: string | null }

export type WorryStatus = 'open' | 'actionable' | 'let-go'
export interface Worry {
  id: string
  createdAt: string
  text: string
  status: WorryStatus
  /** The next small step, for worries marked actionable. */
  action: string | null
  reviewedAt: string | null
}

export interface BreathPattern { inhale: number; hold1: number; exhale: number; hold2: number }

export interface BreathSession {
  id: string
  createdAt: string
  pattern: BreathPattern
  cycles: number
  durationSec: number
  completed: boolean
  kind: 'breathing' | 'grounding'
  /** 0–10 self-rated anxiety before/after an SOS session (null when not rated) */
  anxietyBefore: number | null
  anxietyAfter: number | null
}

export type NewSession = Omit<BreathSession, 'id' | 'createdAt' | 'kind' | 'anxietyBefore' | 'anxietyAfter'> &
  Partial<Pick<BreathSession, 'kind' | 'anxietyBefore' | 'anxietyAfter'>> & { createdAt?: string }

export type NewThought = Omit<Thought, 'id' | 'createdAt' | 'photos' | 'audio'> & { photoFiles: File[]; createdAt?: string; audioClip?: AudioClip | null }
