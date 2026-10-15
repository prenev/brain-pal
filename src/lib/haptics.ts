/**
 * Best-effort haptics.
 * - Android / desktop Chrome: navigator.vibrate.
 * - iOS Safari has no Vibration API. Safari 17.4+ fires a tap when an
 *   <input type="checkbox" switch> is toggled, so we click one as a fallback.
 *   iOS may ignore it outside a user gesture; a native (Capacitor) build fixes that.
 */
let iosLabel: HTMLLabelElement | null = null

function iosTap() {
  if (!iosLabel) {
    iosLabel = document.createElement('label')
    iosLabel.style.cssText = 'position:fixed;left:-100px;top:-100px;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    iosLabel.appendChild(input)
    document.body.appendChild(iosLabel)
  }
  iosLabel.click()
}

export const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

export function haptic(pattern: number | number[]) {
  if (canVibrate) { navigator.vibrate(pattern); return }
  const taps = Array.isArray(pattern) ? Math.ceil(pattern.filter((_, i) => i % 2 === 0).length) : 1
  for (let i = 0; i < Math.min(taps, 3); i++) setTimeout(iosTap, i * 120)
}

export const stopHaptic = () => { if (canVibrate) navigator.vibrate(0) }

let ctx: AudioContext | null = null
/** Soft sine chime so the timer still works with the phone muted-haptic. */
export function chime(freq = 528, ms = 160) {
  try {
    ctx ??= new AudioContext()
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000)
    o.connect(g).connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + ms / 1000)
  } catch { /* audio unavailable */ }
}
