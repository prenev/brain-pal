/** Sound + haptic design as data (no DOM): note scores for the sound effects, the on/off settings and which touches get a tick. Tested in scripts/test-sfx.mjs. */
export type SfxName = 'success' | 'celebrate' | 'levelup' | 'oops'
export interface Note { at: number; hz: number; dur: number; vol?: number; wave?: 'sine' | 'triangle' | 'square' }

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093
const seq = (hz: number[], gap: number, dur: number, vol = 0.14, wave: Note['wave'] = 'triangle'): Note[] => hz.map((f, i) => ({ at: i * gap, hz: f, dur, vol, wave }))

/** Bright, short, major-key. Kept quiet on purpose: this is a calm app, the sounds are a pat on the back, not a siren. */
export const SCORES: Record<SfxName, Note[]> = {
  success: seq([C5, E5, G5, C6], 0.085, 0.2, 0.14),
  celebrate: [...seq([C5, E5, G5, C6, E6], 0.09, 0.26, 0.15), { at: 0.5, hz: G6, dur: 0.5, vol: 0.12, wave: 'sine' }, { at: 0.5, hz: C7, dur: 0.5, vol: 0.06, wave: 'sine' }],
  levelup: [...seq([C5, G5, C6, E6, G6], 0.1, 0.3, 0.15), { at: 0.6, hz: C7, dur: 0.7, vol: 0.1, wave: 'sine' }, { at: 0.6, hz: G5, dur: 0.7, vol: 0.08, wave: 'triangle' }],
  oops: seq([330, 247], 0.11, 0.18, 0.1, 'sine'),
}
export const scoreLength = (n: SfxName) => Math.max(...SCORES[n].map(x => x.at + x.dur))

export interface FxSettings { sound: boolean; haptics: boolean }
export const DEFAULT_FX: FxSettings = { sound: true, haptics: true }
/** Junk never crashes; anything that isn't an explicit `false` keeps the default (on). */
export function normalizeFx(raw: unknown): FxSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<FxSettings>
  return { sound: r.sound !== false, haptics: r.haptics !== false }
}

export interface TouchInfo { tag: string; role?: string | null; classes: string[]; disabled?: boolean; off?: boolean; inputType?: string }
/**
 * What a touch should feel/sound like: 'select' = tiny tick (chips, emotion icons, tabs, switches, checkboxes),
 * 'press' = firmer tap (primary buttons, the + button), null = nothing (plain text, disabled, opted out, sliders/text fields).
 */
export function touchKind(t: TouchInfo): 'select' | 'press' | null {
  if (t.off || t.disabled) return null
  const has = (c: string) => t.classes.includes(c)
  if (t.tag === 'input') return t.inputType === 'checkbox' || t.inputType === 'radio' ? 'select' : null
  if (has('fab') || (t.tag === 'button' && has('primary'))) return 'press'
  if (t.role === 'switch' || t.role === 'checkbox' || t.role === 'tab' || has('chip') || has('ig') || has('tab') || has('sticker') || has('qbtn')) return 'select'
  if (t.tag === 'button') return 'select'
  return null
}
