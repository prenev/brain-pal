import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, Mic, Pause, Play, RotateCcw, Square, X } from 'lucide-react'
import Support from './Support'
import Waveform from './Waveform'
import { fmtDuration, MAX_RECORD_SEC } from '../lib/audio'
import { MicError } from '../lib/recorder'
import { captionSource, type CaptionSource } from '../lib/liveSpeech'
import { type Captions } from '../lib/speechText.ts'
import { looksLikeCrisis } from '../lib/gemini'
import { isNative, Mindful } from '../lib/native'
import { startVoice, voicePlayer, type PlayState, type VoicePlayer, type VoiceSession } from '../lib/voice'
import { putBlob } from '../lib/blobstore'
import { useStore } from '../lib/store'
import type { AudioClip } from '../lib/types'

type Phase = 'idle' | 'recording' | 'review'

/**
 * Full-screen voice journal: tap, talk, stop, then listen back, fix the words and save, all on this screen.
 * Recording and playback go through lib/voice (native on iPhone, on-device words only).
 */
export default function VoiceJournal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { addJournal } = useStore()
  const [source, setSource] = useState<CaptionSource | 'checking'>('checking')
  const [phase, setPhase] = useState<Phase>('idle')
  const [sec, setSec] = useState(0)
  const [caps, setCaps] = useState<Captions>({ final: '', interim: '' })
  const [text, setText] = useState('')
  const [clip, setClip] = useState<AudioClip | null>(null)
  const [play, setPlay] = useState<PlayState>({ playing: false, at: 0, duration: 0 })
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const level = useRef(0)
  const session = useRef<VoiceSession | null>(null)
  const player = useRef<VoicePlayer | null>(null)
  const path = useRef<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const edit = useRef<HTMLTextAreaElement>(null)
  const spoken = `${caps.final} ${caps.interim}`.trim()

  useEffect(() => { let off = false; void captionSource().then(s => { if (!off) setSource(s) }); return () => { off = true } }, [])
  useEffect(() => { const s = scroller.current; if (s) s.scrollTop = s.scrollHeight }, [caps])
  useLayoutEffect(() => { const t = edit.current; if (t) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px` } }, [text, phase])
  useEffect(() => { if (phase !== 'recording') return; const t0 = Date.now(); const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 500); return () => clearInterval(id) }, [phase])
  useEffect(() => () => { void session.current?.cancel(); player.current?.destroy(); if (path.current && isNative()) void Mindful.voiceDiscard({ path: path.current }).catch(() => {}) }, [])

  async function start() {
    setErr(''); setNote(''); setSec(0); setCaps({ final: '', interim: '' }); setText(''); setClip(null)
    player.current?.destroy(); player.current = null
    try {
      session.current = await startVoice({ onWords: setCaps, onLevel: v => { level.current = v }, onNote: setNote })
      if (!session.current.captions) setNote('Recording. Words appear live only where the phone can recognise speech on its own; you can type them after.')
      setPhase('recording')
    } catch (e) { setErr(e instanceof MicError ? e.message : 'Couldn’t start recording. Please try again.') }
  }

  async function stop() {
    const s = session.current; if (!s) return
    session.current = null; level.current = 0
    try {
      const take = await s.stop()
      path.current = take.path
      setClip(take.clip); setText(take.clip.transcript ?? ''); setPlay({ playing: false, at: 0, duration: take.clip.durationSec }); setPhase('review')
      player.current = await voicePlayer({ ...take.clip, path: take.path }, { state: setPlay, level: v => { level.current = v } })
    } catch { setErr('Couldn’t save that recording. Please try again.'); setPhase('idle') }
  }

  async function togglePlay() {
    const p = player.current; if (!p) return
    try { if (play.playing) await p.pause(); else await p.play() } catch { setErr('Couldn’t play it back.') }
  }

  async function redo() {
    player.current?.destroy(); player.current = null
    if (path.current && isNative()) await Mindful.voiceDiscard({ path: path.current }).catch(() => {})
    path.current = null; setClip(null); setText(''); setCaps({ final: '', interim: '' }); setPhase('idle')
  }

  async function save() {
    if (!clip) return
    setSaving(true)
    try {
      const ref = `jaudio-${crypto.randomUUID()}`
      await putBlob(ref, clip.blob)
      const words = text.trim()
      addJournal({ title: '', body: words, mood: null, tags: [], prompt: null, audio: { ref, durationSec: clip.durationSec, mime: clip.mime, transcript: words || null } })
      player.current?.destroy(); player.current = null
      if (path.current && isNative()) void Mindful.voiceDiscard({ path: path.current }).catch(() => {})
      path.current = null
      onSaved()
    } catch { setErr('Couldn’t save. Please try again.'); setSaving(false) }
  }

  function leave() {
    if (phase === 'review' && !confirm('Discard this recording?')) return
    void session.current?.cancel(); session.current = null
    onClose()
  }

  const total = play.duration || clip?.durationSec || 0
  const words = (t: string) => t.split(/\s+/).filter(Boolean)
  const done = words(caps.final), open = words(caps.interim)
  const shownText = phase === 'review' ? text : spoken

  return (
    <div className="voicej" data-state={phase === 'recording' ? 'live' : phase} role="dialog" aria-modal aria-label="Voice journal">
      <i className="vj-bg vj-bg-idle" /><i className="vj-bg vj-bg-live" />
      <div className="vj-top"><button className="glass round" aria-label="Close voice journal" onClick={leave}><X size={22} /></button><span className="vj-title">Voice journal</span><span className="round" aria-hidden="true" /></div>

      <div className="vj-wave"><Waveform level={level} active={phase === 'recording' || play.playing} /></div>
      <p className="vj-say">{phase === 'recording' ? 'I’m listening. Take your time.' : phase === 'review' ? 'Here’s what you said. Tap the words to fix any.' : 'Just talk. Say whatever is on your mind.'}</p>

      <div className="vj-caps" ref={scroller} role={phase === 'review' ? undefined : 'log'} aria-live={phase === 'review' ? undefined : 'polite'} aria-label={phase === 'review' ? undefined : 'Live captions'}>
        {phase === 'review'
          ? <textarea ref={edit} className="vj-edit" aria-label="Your words" value={text} rows={1} onChange={e => setText(e.target.value)} placeholder="No words were caught. Type what you said, or just save the recording." />
          : shownText
            ? <p>{done.map((w, i) => <span key={i} className="w">{w} </span>)}{open.map((w, i) => <span key={`o${i}`} className="w interim">{w} </span>)}</p>
            : <p className="vj-hint">{phase === 'recording' ? 'Your words will appear here as you speak…' : source === 'checking' ? '' : source ? 'Your words unfold here as you speak, worked out on your phone only.' : 'Your voice is recorded and saved. There are no live captions on this device, and you can type the words after.'}</p>}
      </div>
      {looksLikeCrisis(shownText) && <div role="alert" className="vj-support"><Support /></div>}
      {note && phase === 'recording' && <p className="vj-note" role="status">{note}</p>}
      {err && <p role="alert" className="vj-note" style={{ color: '#ff9aa8' }}>{err}</p>}

      {phase === 'review' && clip && <div className="vj-player" aria-label="Your recording">
        <input className="vj-scrub" type="range" min={0} max={Math.max(1, total)} step={0.1} value={Math.min(play.at, total)} aria-label="Position" style={{ ['--p' as string]: `${total ? (play.at / total) * 100 : 0}%` }} onChange={e => void player.current?.seek(+e.target.value)} />
        <span>{fmtDuration(Math.floor(play.at))} / {fmtDuration(Math.round(total))}</span>
      </div>}

      <div className="vj-bar">
        {phase === 'review'
          ? <>
            <button className="vj-side vj-act" onClick={redo} aria-label="Record again"><RotateCcw size={22} /><small>Redo</small></button>
            <button className="vj-btn play" aria-label={play.playing ? 'Pause' : 'Play'} onClick={togglePlay}>{play.playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}</button>
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
