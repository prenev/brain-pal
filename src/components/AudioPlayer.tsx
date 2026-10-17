import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { voicePlayer, type PlayState, type VoicePlayer } from '../lib/voice'

const clock = (s: number) => { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }

/** Compact voice-memo player. Plays through lib/voice, like every other recording in the app (native AVAudioPlayer in the iPhone app). */
export default function AudioPlayer({ src, durationSec, label = 'Voice memo' }: { src: string; durationSec?: number; label?: string }) {
  const [st, setSt] = useState<PlayState>({ playing: false, at: 0, duration: durationSec ?? 0 })
  const [err, setErr] = useState(false)
  const p = useRef<VoicePlayer | null>(null)
  const loading = useRef<Promise<VoicePlayer> | null>(null)

  useEffect(() => { setSt({ playing: false, at: 0, duration: durationSec ?? 0 }); return () => { p.current?.destroy(); p.current = null; loading.current = null } }, [src, durationSec])
  const get = () => (loading.current ??= fetch(src).then(r => r.blob()).then(blob => voicePlayer({ blob, mime: blob.type || 'audio/mp4', durationSec: durationSec ?? 0 }, { state: setSt })).then(x => (p.current = x)))
  const toggle = async () => { try { const x = await get(); if (st.playing) await x.pause(); else await x.play() } catch { setErr(true) } }
  const total = st.duration || durationSec || 0
  const pct = total ? Math.min(100, (st.at / total) * 100) : 0

  return (
    <div className="player" role="group" aria-label={label}>
      <button type="button" className="player-btn" aria-label={st.playing ? 'Pause' : 'Play'} onClick={() => void toggle()}>{st.playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button>
      <input className="player-bar" type="range" min={0} max={100} step={0.5} aria-label="Position" value={pct}
        style={{ ['--p' as string]: `${pct}%` }} onChange={e => { const v = +e.target.value; void get().then(x => x.seek((v / 100) * total)) }} />
      <span className="player-time">{err ? '—' : clock(st.playing || st.at > 0 ? st.at : total)}</span>
    </div>
  )
}
