export const MAX_RECORD_SEC = 300

export const fmtDuration = (sec: number): string => {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Best MediaRecorder mime this browser can record: webm/opus (Chrome, Firefox), mp4/AAC (Safari). */
export function pickMime(isSupported: (m: string) => boolean): string {
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg']) if (isSupported(m)) return m
  return ''
}

export const extFor = (mime: string): string =>
  mime.includes('webm') ? 'webm' : mime.includes('mp4') || mime.includes('aac') ? 'm4a' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'bin'

export function downmixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]
  const out = new Float32Array(channels[0].length)
  for (const c of channels) for (let i = 0; i < out.length; i++) out[i] += c[i] / channels.length
  return out
}

/** Linear-interpolation resampler; good enough for speech. */
export function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input
  const n = Math.max(1, Math.round((input.length * to) / from)), out = new Float32Array(n), ratio = from / to
  for (let i = 0; i < n; i++) {
    const pos = i * ratio, i0 = Math.floor(pos), i1 = Math.min(i0 + 1, input.length - 1), f = pos - i0
    out[i] = input[i0] * (1 - f) + input[i1] * f
  }
  return out
}

/** 16-bit PCM mono WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true)
  }
  return new Uint8Array(buf)
}

export function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** Decode any browser-playable recording and re-encode it as 16 kHz mono WAV for transcription. */
export async function blobToWav16k(blob: Blob): Promise<Uint8Array> {
  const ctx = new AudioContext()
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    const mono = downmixToMono(Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)))
    return encodeWav(resample(mono, buf.sampleRate, 16000), 16000)
  } finally { void ctx.close() }
}
