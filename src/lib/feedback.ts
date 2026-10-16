/** App-wide touch feedback: one delegated listener gives buttons, chips, tabs and switches a Taptic tick / small sound; sliders tick as you drag. Opt out with data-fx="off". */
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { isNative } from './native'
import { loadFx } from './extras'
import { touchKind, type TouchInfo } from './sfx.ts'
import { unlockAudio } from './sound'
import { canVibrate } from './haptics'

const SEL = 'button, [role=switch], [role=tab], [role=checkbox], input[type=checkbox], input[type=radio], .fab, .chip, .ig'

/** A soft tap on the Taptic Engine (iPhone app) or a very short buzz (Android); on iPhone web there is nothing we may trigger outside a switch. */
export function uiTap(strong = false) {
  if (!loadFx().haptics) return
  if (isNative()) { Haptics.impact({ style: strong ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {}); return }
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  if (canVibrate && ua?.hasBeenActive !== false) navigator.vibrate(strong ? 14 : 7)
}

const infoOf = (el: Element): TouchInfo => ({
  tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), classes: [...el.classList],
  disabled: (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true',
  off: !!el.closest('[data-fx=off]'), inputType: (el as HTMLInputElement).type,
})

export function touch(el: Element | null) {
  const target = el?.closest(SEL); if (!target) return
  const kind = touchKind(infoOf(target)); if (!kind) return
  uiTap(kind === 'press')                       // taps are felt, not heard: sound is kept for celebrations
}

/** Call once at startup. Returns a cleanup. */
export function installFeedback(): () => void {
  const down = (e: Event) => { unlockAudio(); touch(e.target as Element | null) }
  let lastStep = -1
  const slide = (e: Event) => {                      // a tick at every 10% while dragging a slider
    const r = e.target as HTMLInputElement
    if (r?.tagName !== 'INPUT' || r.type !== 'range' || r.closest('[data-fx=off]')) return
    const step = Math.round(((+r.value - +r.min) / ((+r.max - +r.min) || 1)) * 10)
    if (step !== lastStep) { lastStep = step; uiTap() }
  }
  document.addEventListener('pointerdown', down, { capture: true, passive: true })
  document.addEventListener('input', slide, { capture: true, passive: true })
  return () => { document.removeEventListener('pointerdown', down, true); document.removeEventListener('input', slide, true) }
}
