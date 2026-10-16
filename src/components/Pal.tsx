import { useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { palSvg, POSE_LABEL, type PoseName } from '../lib/pal.ts'

export type PalMotion = 'bob' | 'wave' | 'breathe' | 'jump' | 'none'

/** Pal, the mascot. The pose is data (lib/pal.ts → SVG); the motion is CSS (and switched off for "reduce motion"). Decorative unless `label` is given. */
export default function Pal({ pose = 'idle', size = 96, motion = 'bob', label = '', className = '' }: { pose?: PoseName; size?: number; motion?: PalMotion; label?: string | true; className?: string }) {
  const html = useMemo(() => palSvg(pose, { label: label === true ? POSE_LABEL[pose] : label }), [pose, label])
  return <span className={`pal pal-${motion} ${className}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: html }} />
}

/** Wobbi with a speech bubble: the friendly way to say one short thing. */
export function PalSays({ pose = 'idle', size = 84, motion = 'bob', children }: { pose?: PoseName; size?: number; motion?: PalMotion; children: ReactNode }) {
  return <div className="pal-says"><Pal pose={pose} size={size} motion={motion} /><div className="bubble">{children}</div></div>
}

/** Empty state: Wobbi and one kind sentence instead of a grey box. */
export function PalEmpty({ pose = 'think', children }: { pose?: PoseName; children: ReactNode }) {
  return <div className="card pal-empty"><Pal pose={pose} size={88} /><p>{children}</p></div>
}

const TIPS_KEY = 'bp.tips.off'
const tipsOff = (): string[] => { try { const v = JSON.parse(localStorage.getItem(TIPS_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }
export const resetTips = () => { try { localStorage.removeItem(TIPS_KEY) } catch { /* ignore */ } }

/** Wobbi says what to do in this section, once: dismiss it and it stays away (More → "Show Wobbi's tips again" brings them back). */
export function PalTip({ id, pose = 'think', children }: { id: string; pose?: PoseName; children: ReactNode }) {
  const [off, setOff] = useState(() => tipsOff().includes(id))
  if (off) return null
  const hide = () => { try { localStorage.setItem(TIPS_KEY, JSON.stringify([...new Set([...tipsOff(), id])])) } catch { /* ignore */ } setOff(true) }
  return (
    <div className="pal-tip" role="note" aria-label="Tip from Wobbi">
      <Pal pose={pose} size={54} />
      <span className="bubble">{children}</span>
      <button className="x" aria-label="Hide this tip" onClick={hide}><X size={16} /></button>
    </div>
  )
}
