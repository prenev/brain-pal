import { SCORES, type Note, type SfxName } from './sfx.ts'
import { loadFx } from './extras'

let ctx: AudioContext | null = null
let master: GainNode | null = null

/** Browsers only allow audio after a touch: call from a gesture (feedback.ts does this on the first tap). */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    if (!master) { master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination) }
  } catch { /* no audio: the app is fine without it */ }
}

function voice(c: AudioContext, out: AudioNode, n: Note, t0: number) {
  const o = c.createOscillator(), g = c.createGain(), t = t0 + n.at, v = n.vol ?? 0.12
  o.type = n.wave ?? 'triangle'; o.frequency.setValueAtTime(n.hz, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(v, t + 0.012)                    // soft attack: no clicks
  g.gain.exponentialRampToValueAtTime(0.0001, t + n.dur)
  o.connect(g).connect(out); o.start(t); o.stop(t + n.dur + 0.03)
}

/** Play a sound effect (no-op when sounds are off, the browser has no audio, or the tab is hidden). */
export function sfx(name: SfxName) {
  if (!loadFx().sound || document.visibilityState === 'hidden') return
  try {
    unlockAudio()
    if (!ctx || !master || ctx.state !== 'running') return
    const t0 = ctx.currentTime + 0.01
    for (const n of SCORES[name]) voice(ctx, master, n, t0)
  } catch { /* ignore */ }
}
