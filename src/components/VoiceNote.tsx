import { useEffect, useRef, useState } from 'react'
import { Mic, Pause, Play, Square, Trash2, X } from 'lucide-react'
import Waveform from './Waveform'
import { fmtDuration, MAX_RECORD_SEC } from '../lib/audio'
import { MicError } from '../lib/recorder'
import { startVoice, voicePlayer, type PlayState, type VoicePlayer, type VoiceSession } from '../lib/voice'
import type { AudioClip } from '../lib/types'

/**
 * A voice memo inside a form: tap to record (waveform + clock), stop, then play it back or delete it.
 * Same engine as the voice journal (lib/voice: native on iPhone). `onWords` hands over what was heard, worked out on the phone.
 */
export default function VoiceNote({ clip, onChange, onWords }: { clip: AudioClip | null; onChange: (c: AudioClip | null) => void; onWords?: (text: string) => void }) {
  const [rec, setRec] = useState(false)
  const [sec, setSec] = useState(0)
  const [err, setErr] = useState('')
  const [play, setPlay] = useState<PlayState>({ playing: false, at: 0, duration: clip?.durationSec ?? 0 })
  const level = useRef(0)
  const session = useRef<VoiceSession | null>(null)
  const player = useRef<VoicePlayer | null>(null)

  useEffect(() => { if (!rec) return; const t0 = Date.now(); const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 500); return () => clearInterval(id) }, [rec])
  useEffect(() => () => { void session.current?.cancel(); player.current?.destroy() }, [])
  useEffect(() => {   // a fresh player for each take
    player.current?.destroy(); player.current = null
    setPlay({ playing: false, at: 0, duration: clip?.durationSec ?? 0 })
    if (!clip) return
    let off = false
    void voicePlayer(clip, { state: setPlay, level: v => { level.current = v } }).then(p => { if (off) p.destroy(); else player.current = p })
    return () => { off = true }
  }, [clip])

  async function start() {
    setErr(''); setSec(0)
    try { session.current = await startVoice({ onLevel: v => { level.current = v } }); setRec(true) }
    catch (e) { setErr(e instanceof MicError ? e.message : 'Couldn’t start recording.') }
  }
  async function stop() {
    const s = session.current; if (!s) return
    session.current = null; setRec(false); level.current = 0
    try { const take = await s.stop(); onChange(take.clip); if (take.clip.transcript) onWords?.(take.clip.transcript) } catch { setErr('Couldn’t save that recording.') }
  }
  function cancel() { void session.current?.cancel(); session.current = null; setRec(false); level.current = 0 }
  const toggle = async () => { const p = player.current; if (!p) return; try { if (play.playing) await p.pause(); else await p.play() } catch { setErr('Couldn’t play it back.') } }

  if (rec) return (
    <div className="vnote-box live" aria-label="Recording a voice memo">
      <button className="vn-round ghost" aria-label="Cancel recording" onClick={cancel}><X size={20} /></button>
      <div className="vn-wave"><Waveform level={level} active height={44} /></div>
      <span className="vn-time">{fmtDuration(sec)}</span>
      <button className="vn-round stop" aria-label="Stop recording" onClick={stop}><Square size={18} fill="currentColor" /></button>
    </div>
  )
  if (clip) return (
    <div className="vnote-box" aria-label="Your voice memo">
      <button className="vn-round play" aria-label={play.playing ? 'Pause' : 'Play'} onClick={toggle}>{play.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
      <div className="vn-wave"><Waveform level={level} active={play.playing} height={44} /></div>
      <span className="vn-time">{fmtDuration(Math.floor(play.playing || play.at > 0 ? play.at : play.duration || clip.durationSec))}</span>
      <button className="vn-round ghost" aria-label="Delete voice memo" onClick={() => onChange(null)}><Trash2 size={18} /></button>
    </div>
  )
  return (
    <>
      <button type="button" className="vn-start" onClick={start}><Mic size={18} /> Add a voice memo <small>up to {MAX_RECORD_SEC / 60} min</small></button>
      {err && <p role="alert" className="small" style={{ color: 'var(--danger)', margin: '6px 4px 0' }}>{err}</p>}
    </>
  )
}
