import { MAX_RECORD_SEC, pickMime } from './audio'
import type { AudioClip } from './types'

export interface Recording {
  /** Stops and resolves with the finished clip. */
  stop(): Promise<AudioClip>
  /** Stops and discards. */
  cancel(): void
  /** Current input level 0..1 (for the meter). */
  level(): number
}

export const recordingSupported = () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

export class MicError extends Error {}

/** Starts recording; `onAutoStop` fires with the clip if the time cap is reached. */
export async function startRecording(onAutoStop: (clip: AudioClip) => void): Promise<Recording> {
  if (!recordingSupported()) throw new MicError('Voice recording isn’t supported in this browser.')
  let stream: MediaStream
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }) }
  catch (e: any) {
    throw new MicError(e?.name === 'NotAllowedError' || e?.name === 'SecurityError'
      ? 'Microphone access is blocked. Allow it in your browser or iOS settings and try again.'
      : 'No microphone found.')
  }

  const mime = pickMime(m => MediaRecorder.isTypeSupported(m))
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }

  // level meter
  const ctx = new AudioContext(), analyser = ctx.createAnalyser(); analyser.fftSize = 256
  ctx.createMediaStreamSource(stream).connect(analyser)
  const buf = new Uint8Array(analyser.fftSize)
  const t0 = performance.now()
  let done = false, timer = 0

  const finish = (): Promise<AudioClip> => new Promise(res => {
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop()); void ctx.close(); clearTimeout(timer)
      const type = rec.mimeType || mime || 'audio/webm'
      res({ blob: new Blob(chunks, { type }), durationSec: Math.min(MAX_RECORD_SEC, Math.max(1, Math.round((performance.now() - t0) / 1000))), mime: type, transcript: null })
    }
    if (rec.state !== 'inactive') rec.stop(); else rec.onstop?.(new Event('stop'))
  })

  rec.start(1000)
  timer = window.setTimeout(() => { if (!done) { done = true; void finish().then(onAutoStop) } }, MAX_RECORD_SEC * 1000)

  return {
    async stop() { if (done) throw new MicError('already stopped'); done = true; return finish() },
    cancel() { done = true; rec.ondataavailable = null; void finish() },
    level() {
      analyser.getByteTimeDomainData(buf)
      let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
      return Math.min(1, peak / 64)
    },
  }
}
