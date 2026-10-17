import { isNative, Mindful } from './native'
import { MicError, startRecording } from './recorder'
import { captionSource, startCaptions, type LiveSession } from './liveSpeech'
import { finishTranscript, type Captions } from './speechText.ts'
import { audioMode } from './audioRoute'
import type { AudioClip } from './types'

/**
 * One way to record and play voice, used by every screen (voice journal, voice memos, journal notes, entry cards).
 * iPhone app: native AVAudioEngine recording (one mic stream → .m4a + Apple's ON-DEVICE recogniser) and AVAudioPlayer playback
 * through the speaker, with live levels for the waveform. Browsers: MediaRecorder + a local recogniser if the browser has one.
 * Nothing here touches the network.
 */
export interface VoiceHandlers { onWords?: (c: Captions) => void; onLevel?: (v: number) => void; onNote?: (message: string) => void }
export interface VoiceTake { clip: AudioClip; path: string | null }
export interface VoiceSession { captions: boolean; stop(): Promise<VoiceTake>; cancel(): Promise<void> }

const toBlob = (b64: string, mime: string) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }) }
const toBase64 = (blob: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] ?? ''); r.onerror = () => no(r.error); r.readAsDataURL(blob) })

export async function startVoice(h: VoiceHandlers = {}): Promise<VoiceSession> {
  if (isNative()) {
    let caps: Captions = { final: '', interim: '' }
    const subs = [
      await Mindful.addListener('voiceTranscript', e => { caps = { final: e.final, interim: e.interim }; h.onWords?.(caps) }),
      await Mindful.addListener('voiceLevel', e => h.onLevel?.(e.level)),
    ]
    const off = () => { for (const s of subs) void s.remove() }
    try {
      const r = await Mindful.voiceStart({ locale: navigator.language })
      return {
        captions: r.captions,
        async stop() {
          const x = await Mindful.voiceStop(); off()
          const words = finishTranscript({ final: x.transcript || `${caps.final} ${caps.interim}`, interim: '' })
          return { clip: { blob: toBlob(x.base64, x.mime), durationSec: Math.max(1, Math.round(x.durationSec)), mime: x.mime, transcript: words || null }, path: x.path }
        },
        async cancel() { off(); try { const x = await Mindful.voiceStop(); await Mindful.voiceDiscard({ path: x.path }) } catch { /* nothing recorded */ } },
      }
    } catch (e) { off(); throw new MicError((e as { message?: string })?.message || 'Couldn’t start recording.') }
  }

  let live: LiveSession | null = null, caps: Captions = { final: '', interim: '' }
  if (await captionSource() === 'web') { try { live = await startCaptions(c => { caps = c; h.onWords?.(c) }, m => h.onNote?.(m)) } catch (e) { h.onNote?.((e as Error).message) } }
  let resolveAuto: ((c: AudioClip) => void) | null = null
  const auto = new Promise<AudioClip>(ok => { resolveAuto = ok })
  let rec
  try { rec = await startRecording(c => resolveAuto?.(c)) } catch (e) { void live?.stop(); throw e }
  let raf = 0, last = 0
  const tick = (t: number) => { if (t - last > 80) { last = t; h.onLevel?.(rec.level()) } raf = requestAnimationFrame(tick) }
  raf = requestAnimationFrame(tick)
  return {
    captions: !!live,
    async stop() {
      cancelAnimationFrame(raf)
      const clip = await Promise.race([rec.stop(), auto])
      const c = (await live?.stop()) ?? caps
      const words = finishTranscript(c)
      return { clip: { ...clip, transcript: words || clip.transcript || null }, path: null }
    },
    async cancel() { cancelAnimationFrame(raf); rec.cancel(); await live?.stop() },
  }
}

/* ---------------- playback ---------------- */
export interface PlayState { playing: boolean; at: number; duration: number }
export interface VoicePlayer { play(): Promise<void>; pause(): Promise<void>; seek(at: number): Promise<void>; destroy(): void }

/** A player for a clip (blob, or the native file of a take just recorded). `onLevel` drives the waveform while it plays. */
export async function voicePlayer(src: { blob: Blob; mime: string; durationSec: number; path?: string | null }, on: { state: (s: PlayState) => void; level?: (v: number) => void }): Promise<VoicePlayer> {
  if (isNative()) {
    let path = src.path ?? null, temp = false
    const subs = [
      // one native player is shared by the whole app: only listen to our own file
      await Mindful.addListener('voicePlayback', e => { if (e.path === path) on.state({ playing: e.state === 'playing', at: e.state === 'ended' ? 0 : e.at, duration: e.duration || src.durationSec }) }),
      await Mindful.addListener('voiceLevel', e => { if (e.path && e.path === path) on.level?.(e.level) }),
    ]
    const ensure = async () => { if (!path) { path = (await Mindful.voiceLoad({ base64: await toBase64(src.blob), mime: src.mime })).path; temp = true } return path }
    return {
      async play() { await Mindful.voicePlay({ path: await ensure() }) },
      async pause() { await Mindful.voicePause() },
      async seek(at) { await ensure(); await Mindful.voiceSeek({ at }) },
      destroy() { for (const s of subs) void s.remove(); if (path) void Mindful.voicePause().catch(() => {}); if (temp && path) void Mindful.voiceDiscard({ path }).catch(() => {}) },
    }
  }
  const url = URL.createObjectURL(src.blob), a = new Audio(url)
  a.preload = 'auto'
  let raf = 0
  const report = () => on.state({ playing: !a.paused, at: a.currentTime, duration: Number.isFinite(a.duration) && a.duration > 0 ? a.duration : src.durationSec })
  const pulse = (t: number) => { on.level?.(0.35 + 0.3 * Math.abs(Math.sin(t / 180)) * Math.abs(Math.sin(t / 470))); raf = requestAnimationFrame(pulse) }   // browsers: a gentle stand-in level
  a.onplay = () => { report(); raf = requestAnimationFrame(pulse) }
  a.onpause = () => { report(); cancelAnimationFrame(raf); on.level?.(0) }
  a.onended = () => { cancelAnimationFrame(raf); on.level?.(0); on.state({ playing: false, at: 0, duration: a.duration || src.durationSec }) }
  a.ontimeupdate = report
  return {
    async play() { audioMode('playback'); await a.play() },
    async pause() { a.pause() },
    async seek(at) { a.currentTime = at; report() },
    destroy() { a.pause(); cancelAnimationFrame(raf); URL.revokeObjectURL(url) },
  }
}
