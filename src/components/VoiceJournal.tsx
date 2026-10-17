import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Mic, Pause, Play, RotateCcw, Square, X } from 'lucide-react'
import Pal from './Pal'
import Support from './Support'
import { fmtDuration, MAX_RECORD_SEC } from '../lib/audio'
import { MicError, startRecording, type Recording } from '../lib/recorder'
import { captionSource, startCaptions, type CaptionSource, type LiveSession } from '../lib/liveSpeech'
import { CaptionBuffer, finishTranscript, type Captions } from '../lib/speechText.ts'
import { looksLikeCrisis } from '../lib/gemini'
import { isNative, Mindful } from '../lib/native'
import { putBlob } from '../lib/blobstore'
import { useStore } from '../lib/store'
import type { AudioClip } from '../lib/types'

type Phase = 'idle' | 'recording' | 'review'
const fromBase64 = (b64: string, mime: string) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }) }

/**
 * Full-screen voice journal: tap, talk, stop, then listen back, fix the words and save, all on this screen.
 * iPhone app: native recording (one microphone stream feeds the .m4a and Apple's ON-DEVICE recogniser) and native playback.
 * Browsers: MediaRecorder + a local recogniser where the browser has one. Nothing is sent anywhere.
 */
export default function VoiceJournal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { addJournal } = useStore()
  const native = isNative()
  const [source, setSource] = useState<CaptionSource | 'checking'>('checking')
  const [phase, setPhase] = useState<Phase>('idle')
  const [sec, setSec] = useState(0)
  const [caps, setCaps] = useState<Captions>({ final: '', interim: '' })
  const [text, setText] = useState('')
  const [clip, setClip] = useState<AudioClip | null>(null)
  const [path, setPath] = useState<string | null>(null)
  const [play, setPlay] = useState<{ on: boolean; at: number }>({ on: false, at: 0 })
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const webRec = useRef<Recording | null>(null)
  const webLive = useRef<LiveSession | null>(null)
  const subs = useRef<{ remove: () => Promise<void> }[]>([])
  const buf = useRef(new CaptionBuffer())
  const audio = useRef<HTMLAudioElement | null>(null)
  const url = useMemo(() => (clip && !native ? URL.createObjectURL(clip.blob) : null), [clip, native])
  const spoken = `${caps.final} ${caps.interim}`.trim()

  useEffect(() => { let off = false; void captionSource().then(s => { if (!off) setSource(s) }); return () => { off = true } }, [])
  useEffect(() => { const s = scroller.current; if (s) s.scrollTop = s.scrollHeight }, [caps])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  // the clock: twice a second is plenty (re-rendering every frame is what made it stutter)
  useEffect(() => { if (phase !== 'recording') return; const t0 = Date.now(); const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 500); return () => clearInterval(id) }, [phase])
  // the rings follow your voice through a CSS variable (no React render); CSS eases between readings
  const level = (v: number) => stage.current?.style.setProperty('--lvl', v.toFixed(3))
  useEffect(() => {
    if (phase !== 'recording' || native) return
    let raf = 0, last = 0
    const tick = (t: number) => { if (t - last > 80) { last = t; level(webRec.current?.level() ?? 0) } raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [phase, native])
  useEffect(() => () => { void cleanup(true) }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  async function cleanup(discard: boolean) {
    for (const s of subs.current) void s.remove()
    subs.current = []
    webRec.current?.cancel(); webRec.current = null
    void webLive.current?.stop(); webLive.current = null
    audio.current?.pause()
    if (native && discard) await Mindful.voiceDiscard({ path: path ?? undefined }).catch(() => {})
  }

  async function start() {
    setErr(''); setNote(''); setSec(0); setCaps({ final: '', interim: '' }); setText(''); setClip(null); setPlay({ on: false, at: 0 }); buf.current = new CaptionBuffer()
    if (native) {
      try {
        subs.current = [
          await Mindful.addListener('speechResult', e => setCaps(buf.current.push(e.text, e.isFinal))),
          await Mindful.addListener('voiceLevel', e => level(e.level)),
        ]
        const r = await Mindful.voiceStart({ locale: navigator.language })
        if (!r.captions) setNote('Recording. Live words need on-device speech recognition, so they’re off on this phone; you can type them after.')
        setPhase('recording')
      } catch (e) { await cleanup(false); setErr((e as { message?: string })?.message || 'Couldn’t start recording. Please try again.') }
      return
    }
    if (source === 'web') { try { webLive.current = await startCaptions(setCaps, m => setNote(m)) } catch (e) { setNote((e as Error).message) } }
    try {
      webRec.current = await startRecording(c => { webRec.current = null; void finished(c) })
      setPhase('recording')
    } catch (e) { void webLive.current?.stop(); webLive.current = null; setErr(e instanceof MicError ? e.message : 'Couldn’t start recording. Please try again.') }
  }

  async function finished(c: AudioClip, at?: string) {
    const last = (await webLive.current?.stop()) ?? buf.current.captions(); webLive.current = null
    const words = finishTranscript(last) || finishTranscript(caps)
    setText(words); setClip({ ...c, transcript: words || null }); setPath(at ?? null); setPhase('review'); level(0)
  }

  async function stop() {
    if (native) {
      try {
        const r = await Mindful.voiceStop()
        for (const s of subs.current) void s.remove()
        subs.current = [await Mindful.addListener('voicePlayback', e => setPlay({ on: e.state === 'playing', at: e.state === 'ended' ? 0 : e.at }))]
        await finished({ blob: fromBase64(r.base64, r.mime), durationSec: Math.round(r.durationSec), mime: r.mime, transcript: null }, r.path)
      } catch { setErr('Couldn’t save that recording. Please try again.'); setPhase('idle') }
      return
    }
    const r = webRec.current; if (!r) return
    webRec.current = null
    try { await finished(await r.stop()) } catch { setErr('Couldn’t save that recording. Please try again.'); setPhase('idle') }
  }

  async function togglePlay() {
    if (native && path) { if (play.on) await Mindful.voicePause().catch(() => {}); else await Mindful.voicePlay({ path }).catch(() => setErr('Couldn’t play it back.')); return }
    const a = audio.current; if (!a) return
    if (a.paused) void a.play().catch(() => setErr('Couldn’t play it back.')); else a.pause()
  }

  async function redo() {
    if (native) await Mindful.voiceDiscard({ path: path ?? undefined }).catch(() => {})
    setPath(null); setClip(null); setPhase('idle'); setText(''); setCaps({ final: '', interim: '' })
  }

  async function save() {
    if (!clip) return
    setSaving(true)
    try {
      const ref = `jaudio-${crypto.randomUUID()}`
      await putBlob(ref, clip.blob)
      const words = text.trim()
      addJournal({ title: '', body: words, mood: null, tags: [], prompt: null, audio: { ref, durationSec: clip.durationSec, mime: clip.mime, transcript: words || null } })
      await cleanup(true)
      onSaved()
    } catch { setErr('Couldn’t save. Please try again.'); setSaving(false) }
  }

  function leave() {
    if (phase === 'review' && !confirm('Discard this recording?')) return
    if (native && phase === 'recording') void Mindful.voiceStop().then(r => Mindful.voiceDiscard({ path: r.path })).catch(() => {})
    void cleanup(true); onClose()
  }

  const total = clip?.durationSec ?? 0
  const words = (t: string) => t.split(/\s+/).filter(Boolean)
  const done = words(caps.final), open = words(caps.interim)
  const showText = phase === 'review' ? text : spoken

  return (
    <div className="voicej" data-state={phase === 'recording' ? 'live' : phase} role="dialog" aria-modal aria-label="Voice journal" ref={stage} style={{ ['--lvl' as string]: 0 }}>
      <i className="vj-bg vj-bg-idle" /><i className="vj-bg vj-bg-live" />
      <div className="vj-top"><button className="glass round" aria-label="Close voice journal" onClick={leave}><X size={22} /></button><span className="vj-title">Voice journal</span><span className="round" aria-hidden="true" /></div>

      <div className="vj-core">
        <i className="vj-ringl r3" /><i className="vj-ringl r2" /><i className="vj-ringl r1" /><i className="vj-glow" />
        <div className="vj-pal"><Pal pose={phase === 'recording' ? 'think' : phase === 'review' ? 'love' : 'wave'} size={170} motion="still" /></div>
      </div>
      <p className="vj-say">{phase === 'recording' ? 'I’m listening. Take your time.' : phase === 'review' ? 'Here’s what you said. Fix any words, then save.' : 'Just talk. Say whatever is on your mind.'}</p>

      {phase === 'review'
        ? <textarea className="vj-edit" aria-label="Your words" value={text} onChange={e => setText(e.target.value)} placeholder="No words were caught. Type what you said, or just save the recording." />
        : <div className="vj-caps" ref={scroller} role="log" aria-live="polite" aria-label="Live captions">
          {showText
            ? <p>{done.map((w, i) => <span key={i} className="w">{w} </span>)}{open.map((w, i) => <span key={`o${i}`} className="w interim">{w} </span>)}</p>
            : <p className="vj-hint">{phase === 'recording' ? 'Your words will appear here as you speak…' : source === 'checking' ? '' : source ? 'Your words unfold here as you speak, worked out on your phone only.' : 'Your voice is recorded and saved. There are no live captions on this device, and you can type the words after.'}</p>}
        </div>}
      {looksLikeCrisis(showText) && <div role="alert" className="vj-support"><Support /></div>}
      {note && phase !== 'review' && <p className="vj-note" role="status">{note}</p>}
      {err && <p role="alert" className="vj-note" style={{ color: '#ff9aa8' }}>{err}</p>}

      {phase === 'review' && clip && <div className="vj-player" aria-label="Your recording">
        <div className="vj-track"><i style={{ width: `${total ? Math.min(100, (play.at / total) * 100) : 0}%` }} /></div>
        <span>{fmtDuration(Math.floor(play.at))} / {fmtDuration(total)}</span>
        {!native && url && <audio ref={audio} src={url} preload="auto" onPlay={() => setPlay(p => ({ ...p, on: true }))} onPause={() => setPlay(p => ({ ...p, on: false }))} onEnded={() => setPlay({ on: false, at: 0 })} onTimeUpdate={e => setPlay(p => ({ ...p, at: e.currentTarget.currentTime }))} />}
      </div>}

      <div className="vj-bar">
        {phase === 'review'
          ? <>
            <button className="vj-side vj-act" onClick={redo} aria-label="Record again"><RotateCcw size={22} /><small>Redo</small></button>
            <button className="vj-btn play" aria-label={play.on ? 'Pause' : 'Play'} onClick={togglePlay}>{play.on ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}</button>
            <button className="vj-side vj-act save" onClick={save} disabled={saving} aria-label="Save to journal"><Check size={24} strokeWidth={3} /><small>{saving ? 'Saving' : 'Save'}</small></button>
          </>
          : <>
            <div className="vj-side" aria-hidden="true" />
            <button className={`vj-btn ${phase === 'recording' ? 'stop' : ''}`} aria-label={phase === 'recording' ? 'Stop' : 'Start recording'} onClick={phase === 'recording' ? stop : start}>{phase === 'recording' ? <Square size={28} fill="currentColor" /> : <Mic size={34} />}</button>
            <div className="vj-side vj-clock" role="timer" aria-label={`Recording time ${fmtDuration(sec)}`}><span>{phase === 'recording' ? fmtDuration(sec) : fmtDuration(MAX_RECORD_SEC)}</span><small>{phase === 'recording' ? 'recording' : 'max'}</small></div>
          </>}
      </div>
    </div>
  )
}
