import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

const clock = (s: number) => { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }

/** Our own voice-memo player (the browser's grey bar doesn't fit the app). The real <audio> element stays in the page, hidden, so playback is native. */
export default function AudioPlayer({ src, durationSec, label = 'Voice memo' }: { src: string; durationSec?: number; label?: string }) {
  const el = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(durationSec ?? 0)

  useEffect(() => { setT(0); setPlaying(false); if (durationSec) setDur(durationSec) }, [src, durationSec])
  const total = Number.isFinite(el.current?.duration) && (el.current?.duration ?? 0) > 0 ? el.current!.duration : dur

  const toggle = () => { const a = el.current; if (!a) return; if (a.paused) void a.play().catch(() => setPlaying(false)); else a.pause() }
  const seek = (v: number) => { const a = el.current; if (!a || !total) return; a.currentTime = (v / 100) * total; setT(a.currentTime) }

  return (
    <div className="player" role="group" aria-label={label}>
      <audio ref={el} src={src} preload="metadata" hidden
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setT(0) }}
        onTimeUpdate={e => setT(e.currentTarget.currentTime)}
        onLoadedMetadata={e => { if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) setDur(e.currentTarget.duration) }} />
      <button type="button" className="player-btn" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>{playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button>
      <input className="player-bar" type="range" min={0} max={100} step={0.5} aria-label="Position" value={total ? Math.min(100, (t / total) * 100) : 0}
        style={{ ['--p' as string]: `${total ? Math.min(100, (t / total) * 100) : 0}%` }} onChange={e => seek(+e.target.value)} />
      <span className="player-time">{clock(playing || t > 0 ? t : total)}</span>
    </div>
  )
}
