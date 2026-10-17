import { useEffect, useRef, useState } from 'react'
import { Pause, PenLine, Play, RotateCcw, RotateCw, X } from 'lucide-react'
import Waveform from './Waveform'
import { fmtDuration } from '../lib/audio'
import { getBlob } from '../lib/blobstore'
import { voicePlayer, type PlayState, type VoicePlayer } from '../lib/voice'
import type { JournalEntry } from '../lib/journal.ts'

/** A saved voice journal, opened full screen: the scene, the waveform moving with the playback, and every word you said. */
export default function VoiceNoteView({ entry, onClose, onEdit }: { entry: JournalEntry; onClose: () => void; onEdit: () => void }) {
  const a = entry.audio!
  const [play, setPlay] = useState<PlayState>({ playing: false, at: 0, duration: a.durationSec })
  const [missing, setMissing] = useState(false)
  const [err, setErr] = useState('')
  const level = useRef(0)
  const player = useRef<VoicePlayer | null>(null)
  const words = (entry.body || a.transcript || '').trim()
  const d = new Date(entry.createdAt)

  useEffect(() => {
    let off = false
    void getBlob(a.ref).then(async blob => {
      if (off) return
      if (!blob) { setMissing(true); return }
      player.current = await voicePlayer({ blob, mime: a.mime, durationSec: a.durationSec }, { state: setPlay, level: v => { level.current = v } })
      if (off) player.current.destroy()
    }).catch(() => setMissing(true))
    return () => { off = true; player.current?.destroy(); player.current = null }
  }, [a.ref, a.mime, a.durationSec])

  const toggle = async () => { const p = player.current; if (!p) return; try { if (play.playing) await p.pause(); else await p.play() } catch { setErr('Couldn’t play it back.') } }
  const jump = (by: number) => void player.current?.seek(Math.max(0, Math.min(total, play.at + by)))
  const total = play.duration || a.durationSec

  return (
    <div className="voicej vnote" data-state={play.playing ? 'live' : 'review'} role="dialog" aria-modal aria-label="Voice journal entry">
      <i className="vj-bg vj-bg-idle" /><i className="vj-bg vj-bg-live" />
      <div className="vj-top">
        <button className="glass round" aria-label="Close" onClick={onClose}><X size={22} /></button>
        <span className="vj-title vn-when">{d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}<small>{d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</small></span>
        <button className="glass round" aria-label="Edit entry" onClick={onEdit}><PenLine size={20} /></button>
      </div>
      {entry.title && <h2 className="vn-title">{entry.title}</h2>}

      <div className="vj-wave"><Waveform level={level} active={play.playing} /></div>

      <div className="vj-caps vn-words">{words ? <p className="vn-text">{words}</p> : <p className="vj-hint">No words were written down for this one. Just listen.</p>}</div>
      {missing && <p className="vj-note">This voice note was recorded on another device, so only the words are here.</p>}
      {err && <p role="alert" className="vj-note" style={{ color: '#ff9aa8' }}>{err}</p>}

      {!missing && <div className="vj-player" aria-label="Playback">
        <input className="vj-scrub" type="range" min={0} max={Math.max(1, total)} step={0.1} value={Math.min(play.at, total)} aria-label="Position" style={{ ['--p' as string]: `${total ? (play.at / total) * 100 : 0}%` }} onChange={e => void player.current?.seek(+e.target.value)} />
        <span>{fmtDuration(Math.floor(play.at))} / {fmtDuration(Math.round(total))}</span>
      </div>}
      <div className="vj-bar">
        <button className="vj-side vj-act" aria-label="Back 10 seconds" disabled={missing} onClick={() => jump(-10)}><RotateCcw size={22} /><small>10s</small></button>
        <button className="vj-btn play" aria-label={play.playing ? 'Pause' : 'Play'} disabled={missing} onClick={toggle}>{play.playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}</button>
        <button className="vj-side vj-act" aria-label="Forward 10 seconds" disabled={missing} onClick={() => jump(10)}><RotateCw size={22} /><small>10s</small></button>
      </div>
    </div>
  )
}
