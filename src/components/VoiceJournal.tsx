import { useEffect, useRef, useState } from 'react'
import { Mic, Square, X } from 'lucide-react'
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

  return (
    <div className="overlay voicej" role="dialog" aria-modal aria-label="Voice journal"><div className="inner">
      <div className="vj-bar"><button className="glass round" aria-label="Close voice journal" onClick={leave}><X size={22} /></button><span className="title">Voice journal</span><span className="round" aria-hidden="true" /></div>

      <div className="vj-stage">
        <div className={`vj-ring ${recording ? 'live' : ''}`} ref={ring}><Pal pose={recording ? 'think' : 'wave'} size={150} motion={recording ? 'none' : 'bob'} /></div>
        <div className="vj-time" role="timer" aria-label={`Recording time ${fmtDuration(sec)}`}>{recording ? fmtDuration(sec) : '0:00'}<span className="muted small"> / {fmtDuration(MAX_RECORD_SEC)}</span></div>
        <p className="vj-say">{recording ? 'I’m listening. Take your time.' : 'Just talk. Say whatever is on your mind.'}</p>
      </div>

      <div className="vj-caps" ref={scroller} role="log" aria-live="polite" aria-label="Live captions">
        {spoken ? <p><span>{caps.final}</span>{caps.interim && <span className="interim"> {caps.interim}</span>}</p>
          : <p className="muted small">{source === 'checking' ? '' : source ? (recording ? 'Captions will appear here as you speak…' : 'Captions appear here as you speak, worked out on your phone only.') : 'Your voice is recorded and saved. There are no live captions on this device, and you can type or transcribe it afterwards.'}</p>}
      </div>
      {looksLikeCrisis(spoken) && <div role="alert"><Support /></div>}
      {note && <p className="muted small" role="status" style={{ textAlign: 'center', margin: '6px 0' }}>{note}</p>}
      {err && <p role="alert" style={{ color: 'var(--danger)', textAlign: 'center', margin: '6px 0' }}>{err}</p>}

      <div className="vj-foot">
        {recording
          ? <button className="vj-btn stop" aria-label="Stop and keep" onClick={stop}><Square size={30} fill="currentColor" /></button>
          : <button className="vj-btn" aria-label="Start recording" onClick={start}><Mic size={34} /></button>}
        <span className="muted small">{recording ? 'Tap to stop' : 'Tap to start'}</span>
      </div>
    </div></div>
  )
}
