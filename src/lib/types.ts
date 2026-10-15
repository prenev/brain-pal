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
  /** Displayable URLs (data: URLs locally, signed URLs on Supabase). */
  photos: string[]
}

export interface BreathPattern { inhale: number; hold1: number; exhale: number; hold2: number }

export interface BreathSession {
  id: string
  createdAt: string
  pattern: BreathPattern
  cycles: number
  durationSec: number
  completed: boolean
}

export type NewThought = Omit<Thought, 'id' | 'createdAt' | 'photos'> & { photoFiles: File[]; createdAt?: string }
