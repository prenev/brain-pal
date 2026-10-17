import { useEffect, useRef } from 'react'

/**
 * A smooth, flowing waveform: three soft sine lines, tapered at the ends, whose height follows the voice.
 * Drawn on a canvas in its own animation loop (no React renders); the level is read from a ref and eased, so it never jumps.
 */
const PINK = ['#ffb3d9', '#b79cff', '#7cc4ff']

export default function Waveform({ level, active, colors = PINK, height = 150 }: {
  level: { current: number }; active: boolean; colors?: [string, string, string] | string[]; height?: number
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const live = useRef(active); live.current = active
  useEffect(() => {
    const c = canvas.current, holder = box.current; if (!c || !holder) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0, amp = 0.05, phase = 0, w = 0, h = 0
    // measure the box, never the canvas: the canvas is out of the layout, so drawing at a new size can't make its parent grow (that loop crashed the page)
    const size = () => { const r = holder.getBoundingClientRect(), d = Math.min(3, devicePixelRatio || 1); w = Math.round(r.width); h = Math.round(r.height); c.width = Math.max(1, w * d); c.height = Math.max(1, h * d); ctx.setTransform(d, 0, 0, d, 0, 0) }
    size(); const ro = new ResizeObserver(size); ro.observe(holder)
    const layers = [{ f: 1.6, s: 1, a: 1, lw: 3.4 }, { f: 2.3, s: -1.35, a: .72, lw: 2.6 }, { f: 3.1, s: .8, a: .5, lw: 2 }]
    const draw = () => {
      const target = live.current ? 0.1 + Math.min(1, level.current) * 0.9 : 0.06
      amp += (target - amp) * (target > amp ? 0.2 : 0.07)                   // rise quickly, settle gently
      phase += still ? 0 : 0.03 + amp * 0.06
      ctx.clearRect(0, 0, w, h)
      const mid = h / 2
      layers.forEach((L, k) => {
        const g = ctx.createLinearGradient(0, 0, w, 0)
        g.addColorStop(0, colors[(k + 2) % 3]); g.addColorStop(0.5, colors[k % 3]); g.addColorStop(1, colors[(k + 1) % 3])
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const t = x / w, env = Math.pow(Math.sin(Math.PI * t), 2)
          const y = mid + Math.sin(t * L.f * Math.PI * 2 + phase * L.s + k * 1.7) * amp * h * 0.44 * env * L.a
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = g; ctx.lineWidth = L.lw; ctx.lineCap = 'round'
        ctx.globalAlpha = 0.95 - k * 0.22; ctx.shadowColor = colors[k % 3]; ctx.shadowBlur = 14 * amp + 4
        ctx.stroke()
      })
      ctx.globalAlpha = 1; ctx.shadowBlur = 0
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [level, colors])
  return <div ref={box} className="waveform" style={{ position: 'relative', width: '100%', height }} aria-hidden="true"><canvas ref={canvas} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} /></div>
}
