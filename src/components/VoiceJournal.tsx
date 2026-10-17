import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Timer, X } from 'lucide-react'
import Pal from './Pal'
import Support from './Support'
import { fmtDuration, MAX_RECORD_SEC } from '../lib/audio'
import { MicError, startRecording, type Recording } from '../lib/recorder'
import { captionSource, startCaptions, type CaptionSource, type LiveSession } from '../lib/liveSpeech'
import { finishTranscript, type Captions } from '../lib/speechText.ts'
import { looksLikeCrisis } from '../lib/gemini'
import type { AudioClip } from '../lib/types'

/**
 * Full-screen voice journal: tap, talk, tap. Live captions appear as you speak when the phone can recognise speech on the device
 * (nothing is sent anywhere); the audio is recorded too. On stop it opens the journal editor with the words filled in, so you can tidy and save.
 */
export default function VoiceJournal({ onClose, onDone }: { onClose: () => void; onDone: (r: { transcript: string; clip: AudioClip }) => void }) {
  const [source, setSource] = useState<CaptionSource | 'checking'>('checking')
  const [recording, setRecording] = useState(false)
  const [sec, setSec] = useState(0)
  const [caps, setCaps] = useState<Captions>({ final: '', interim: '' })
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const rec = useRef<Recording | null>(null)
  const live = useRef<LiveSession | null>(null)
  const ring = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const finished = useRef(false)
  const spoken = `${caps.final} ${caps.interim}`.trim()

  useEffect(() => { let off = false; void captionSource().then(s => { if (!off) setSource(s) }); return () => { off = true } }, [])
  useEffect(() => () => { rec.current?.cancel(); void live.current?.stop() }, [])
  useEffect(() => { const s = scroller.current; if (s) s.scrollTop = s.scrollHeight }, [caps])
  useEffect(() => {
    if (!recording) return
    const t0 = performance.now(); let raf = 0
    const tick = () => { setSec(Math.floor((performance.now() - t0) / 1000)); ring.current?.style.setProperty('--lvl', String(rec.current?.level() ?? 0)); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [recording])

  async function finish(clip: AudioClip) {
    if (finished.current) return
    finished.current = true; setRecording(false)
    const last = (await live.current?.stop()) ?? caps; live.current = null
    const transcript = finishTranscript(last)
    onDone({ transcript, clip: { ...clip, transcript: transcript || null } })
  }

  async function start() {
    setErr(''); setNote(''); setSec(0); setCaps({ final: '', interim: '' }); finished.current = false
    if (source === 'native' || source === 'web') {
      try { live.current = await startCaptions(setCaps, m => setNote(m)) }
      catch (e) { setNote((e as Error).message || 'Live captions are not available right now.') }       // the recording still works without captions
    }
    try {
      rec.current = await startRecording(clip => { rec.current = null; void finish(clip) })
      setRecording(true)
    } catch (e) {
      void live.current?.stop(); live.current = null
      setErr(e instanceof MicError ? e.message : 'Couldn’t start recording. Please try again.')
    }
  }
  async function stop() {
    const r = rec.current; if (!r) return
    rec.current = null
    try { await finish(await r.stop()) } catch { setErr('Couldn’t save that recording. Please try again.'); setRecording(false) }
  }
  function leave() { finished.current = true; rec.current?.cancel(); rec.current = null; void live.current?.stop(); live.current = null; onClose() }

  const words = (t: string) => t.split(/\s+/).filter(Boolean)
  const done = words(caps.final), open = words(caps.interim)

  return (
    <div className="voicej" data-state={recording ? 'live' : 'idle'} role="dialog" aria-modal aria-label="Voice journal" ref={ring} style={{ ['--lvl' as string]: 0 }}>
      <i className="vj-bg vj-bg-idle" /><i className="vj-bg vj-bg-live" />
      <div className="vj-top"><button className="glass round" aria-label="Close voice journal" onClick={leave}><X size={22} /></button><span className="vj-title">Voice journal</span><span className="round" aria-hidden="true" /></div>

      <div className="vj-core">
        <i className="vj-ringl r3" /><i className="vj-ringl r2" /><i className="vj-ringl r1" /><i className="vj-glow" />
        <div className="vj-pal"><Pal pose={recording ? 'think' : 'wave'} size={190} motion={recording ? 'none' : 'bob'} /></div>
      </div>
      <p className="vj-say">{recording ? 'I’m listening. Take your time.' : 'Just talk. Say whatever is on your mind.'}</p>

      <div className="vj-caps" ref={scroller} role="log" aria-live="polite" aria-label="Live captions">
        {spoken
          ? <p>{done.map((w, i) => <span key={i} className="w">{w} </span>)}{open.map((w, i) => <span key={`o${i}`} className="w interim">{w} </span>)}</p>
          : <p className="vj-hint">{source === 'checking' ? '' : source ? (recording ? 'Your words will unfold here as you speak…' : 'Your words unfold here as you speak, worked out on your phone only.') : 'Your voice is recorded and saved. There are no live captions on this device, and you can type or transcribe it afterwards.'}</p>}
      </div>
      {looksLikeCrisis(spoken) && <div role="alert" className="vj-support"><Support /></div>}
      {note && <p className="vj-note" role="status">{note}</p>}
      {err && <p role="alert" className="vj-note" style={{ color: '#ff9aa8' }}>{err}</p>}

      <div className="vj-bar">
        <div className="vj-side" aria-hidden="true" />
        <button className={`vj-btn ${recording ? 'stop' : ''}`} aria-label={recording ? 'Stop and keep' : 'Start recording'} onClick={recording ? stop : start}>{recording ? <Square size={30} fill="currentColor" /> : <Mic size={34} />}</button>
        <div className="vj-side vj-clock" role="timer" aria-label={`Recording time ${fmtDuration(sec)}`}><Timer size={24} /><span>{recording ? fmtDuration(sec) : fmtDuration(MAX_RECORD_SEC)}</span><small>{recording ? 'recording' : 'max'}</small></div>
      </div>
    </div>
  )
}
