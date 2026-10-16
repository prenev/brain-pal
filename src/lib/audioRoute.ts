import { isIOSApp, Mindful } from './native'

/** iPhone app: put iOS's audio session in the right mode (memo playback = loudspeaker; everything else = ambient, so UI sounds respect the silent switch). Never throws. */
export function audioMode(mode: 'playback' | 'ambient') {
  if (!isIOSApp()) return
  try { void Mindful.audioSession({ mode }).catch(() => {}) } catch { /* plugin missing in an older build */ }
}
