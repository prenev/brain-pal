import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import { fmtDuration, MAX_RECORD_SEC } from '../lib/audio'
import { MicError, startRecording, type Recording } from '../lib/recorder'
import { AiError, aiEnabled, structureEntry, transcribe, type Structured } from '../lib/gemini'
import AudioPlayer from './AudioPlayer'
import type { AudioClip } from '../lib/types'

const msg = (e: unknown) => (e instanceof AiError || e instanceof MicError ? e.message : 'Something went wrong. Please try again.')

/** Record a voice memo, optionally transcribe it, and optionally turn it into a thought record (AI is opt-in). */
export default function VoiceRecorder({ clip, onChange, onFill }: {
  clip: AudioClip | null
  onChange: (c: AudioClip | null) => void
  onFill: (s: Structured) => void
}) {
  const [recording, setRecording] = useState(false)
  const [sec, setSec] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<'' | 'transcribe' | 'fill'>('')
  const rec = useRef<Recording | null>(null)
  const meter = useRef<HTMLDivElement>(null)
  const url = useMemo(() => (clip ? URL.createObjectURL(clip.blob) : null), [clip?.blob]) // eslint-disable-line react-hooks/exhaustive-deps
  const ai = aiEnabled()

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  useEffect(() => () => rec.current?.cancel(), [])
  useEffect(() => {
    if (!recording) return
    const t0 = performance.now(); let raf = 0
    const tick = () => {
      setSec(Math.floor((performance.now() - t0) / 1000))
      meter.current?.style.setProperty('--lvl', String(rec.current?.level() ?? 0))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [recording])

  async function start() {
    setErr(''); setSec(0)
    try {
      rec.current = await startRecording(c => { rec.current = null; setRecording(false); onChange(c) })
      setRecording(true)
    } catch (e) { setErr(msg(e)) }
  }
  async function stop() {
    const r = rec.current; if (!r) return
    rec.current = null; setRecording(false)
    try { onChange(await r.stop()) } catch (e) { setErr(msg(e)) }
  }
  function cancel() { rec.current?.cancel(); rec.current = null; setRecording(false) }

  async function doTranscribe() {
    if (!clip) return
    setErr(''); setBusy('transcribe')
    try {
      const t = await transcribe(clip.blob)
      if (!t) setErr('No speech was detected in that recording.'); else onChange({ ...clip, transcript: t })
    } catch (e) { setErr(msg(e)) } finally { setBusy('') }
  }
  async function doFill() {
    if (!clip?.transcript) return
    setErr(''); setBusy('fill')
    try { onFill(await structureEntry(clip.transcript)) }
    catch (e) { setErr(e instanceof AiError && e.message === 'crisis' ? 'Please see the support options above — you don’t have to handle this alone.' : msg(e)) }
    finally { setBusy('') }
  }

  return (
    <div className="card voice">
      <div className="card-head"><h3 style={{ fontWeight: 500 }}>Voice memo</h3><Emoji name="mic" size={30} /></div>

      {recording && <div className="rec-live">
        <div className="rec-meter" ref={meter}><span className="rec-dot" /></div>
        <div className="rec-time">{fmtDuration(sec)} <span className="muted small">/ {fmtDuration(MAX_RECORD_SEC)}</span></div>
        <div className="row" style={{ width: '100%' }}>
          <button className="btn" onClick={cancel}>Cancel</button>
          <button className="btn primary" style={{ flex: 1 }} onClick={stop}>Stop</button>
        </div>
      </div>}

      {!recording && !clip && <>
        <p className="muted" style={{ marginTop: 0 }}>Talk it out — sometimes that’s easier than typing. Up to {MAX_RECORD_SEC / 60} minutes.</p>
        <button className="btn block" onClick={start}>● Record</button>
      </>}

      {!recording && clip && <>
        {url && <AudioPlayer src={url} durationSec={clip.durationSec} label="Your voice memo" />}
        <div className="row" style={{ margin: '8px 2px 12px', justifyContent: 'flex-end' }}>
          <button className="icon-btn" aria-label="Delete voice memo" onClick={() => { onChange(null); setErr('') }}><Trash2 size={18} /></button>
        </div>
        <label className="field"><span>Transcript</span>
          <textarea className="input" value={clip.transcript ?? ''} placeholder={ai ? 'Tap “Transcribe” — or type it yourself' : 'Type it yourself, or turn on the AI helper in More to transcribe'}
            onChange={e => onChange({ ...clip, transcript: e.target.value })} />
        </label>
        {ai && <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn" disabled={!!busy} onClick={doTranscribe}>{busy === 'transcribe' ? 'Transcribing…' : clip.transcript ? 'Re-transcribe' : 'Transcribe'}</button>
          {clip.transcript && <button className="btn primary" disabled={!!busy} onClick={doFill}>{busy === 'fill' ? 'Working…' : 'Fill my thought record'}</button>}
        </div>}
      </>}
      {err && <p role="alert" style={{ color: 'var(--danger)', margin: '12px 0 0' }}>{err}</p>}
    </div>
  )
}
