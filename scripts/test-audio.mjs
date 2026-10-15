import assert from 'node:assert/strict'
import { downmixToMono, encodeWav, extFor, fmtDuration, pickMime, resample, toBase64 } from '../src/lib/audio.ts'

assert.equal(fmtDuration(0), '0:00'); assert.equal(fmtDuration(65), '1:05'); assert.equal(fmtDuration(300), '5:00'); assert.equal(fmtDuration(-4), '0:00'); assert.equal(fmtDuration(59.6), '1:00')

// Chrome/Firefox prefer webm/opus; Safari only has mp4; nothing supported -> '' (let the browser choose)
assert.equal(pickMime(m => m.startsWith('audio/webm')), 'audio/webm;codecs=opus')
assert.equal(pickMime(m => m === 'audio/webm'), 'audio/webm')
assert.equal(pickMime(m => m === 'audio/mp4'), 'audio/mp4')
assert.equal(pickMime(() => false), '')

assert.equal(extFor('audio/webm;codecs=opus'), 'webm'); assert.equal(extFor('audio/mp4'), 'm4a'); assert.equal(extFor('audio/aac'), 'm4a')
assert.equal(extFor('audio/ogg;codecs=opus'), 'ogg'); assert.equal(extFor('audio/wav'), 'wav'); assert.equal(extFor('x/y'), 'bin')

assert.deepEqual([...downmixToMono([new Float32Array([1, 0.5]), new Float32Array([0, 0.5])])], [0.5, 0.5])
const solo = new Float32Array([0.1, 0.2]); assert.equal(downmixToMono([solo]), solo)

const r = resample(new Float32Array(48000), 48000, 16000); assert.equal(r.length, 16000)
const ramp = resample(Float32Array.from({ length: 100 }, (_, i) => i / 99), 100, 50)
assert.equal(ramp.length, 50); assert.ok(Math.abs(ramp[0]) < 1e-6 && Math.abs(ramp[49] - 1) < 0.03)
assert.equal(resample(solo, 8000, 8000), solo)

// WAV: valid RIFF/PCM header, correct sizes, clipping
const wav = encodeWav(new Float32Array([0, 1, -1, 2, -2, 0.5]), 16000), v = new DataView(wav.buffer)
const tag = (o) => String.fromCharCode(...wav.slice(o, o + 4))
assert.equal(tag(0), 'RIFF'); assert.equal(tag(8), 'WAVE'); assert.equal(tag(12), 'fmt '); assert.equal(tag(36), 'data')
assert.equal(wav.length, 44 + 12); assert.equal(v.getUint32(4, true), 36 + 12); assert.equal(v.getUint32(40, true), 12)
assert.equal(v.getUint16(20, true), 1); assert.equal(v.getUint16(22, true), 1); assert.equal(v.getUint32(24, true), 16000); assert.equal(v.getUint32(28, true), 32000); assert.equal(v.getUint16(34, true), 16)
assert.deepEqual([...Array(6)].map((_, i) => v.getInt16(44 + i * 2, true)), [0, 32767, -32768, 32767, -32768, 16383])

// 5 min @ 16 kHz mono fits comfortably under Gemini's 20 MB inline limit even after base64
assert.ok(((44 + 300 * 16000 * 2) * 4) / 3 < 20 * 1024 * 1024)

assert.equal(toBase64(new Uint8Array([72, 105])), 'SGk=')
const big = new Uint8Array(200000).fill(65); assert.equal(atob(toBase64(big)).length, 200000)  // chunked path
console.log('audio: all tests passed')
