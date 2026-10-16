import { useMemo, type ReactNode } from 'react'
import { palSvg, POSE_LABEL, type PoseName } from '../lib/pal.ts'

export type PalMotion = 'bob' | 'wave' | 'breathe' | 'jump' | 'none'

/** Pal, the mascot. The pose is data (lib/pal.ts → SVG); the motion is CSS (and switched off for "reduce motion"). Decorative unless `label` is given. */
export default function Pal({ pose = 'idle', size = 96, motion = 'bob', label = '', className = '' }: { pose?: PoseName; size?: number; motion?: PalMotion; label?: string | true; className?: string }) {
  const html = useMemo(() => palSvg(pose, { label: label === true ? POSE_LABEL[pose] : label }), [pose, label])
  return <span className={`pal pal-${motion} ${className}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: html }} />
}

/** Pal with a speech bubble: the friendly way to say one short thing. */
export function PalSays({ pose = 'idle', size = 84, motion = 'bob', children }: { pose?: PoseName; size?: number; motion?: PalMotion; children: ReactNode }) {
  return <div className="pal-says"><Pal pose={pose} size={size} motion={motion} /><div className="bubble">{children}</div></div>
}

/** Empty state: Pal and one kind sentence instead of a grey box. */
export function PalEmpty({ pose = 'think', children }: { pose?: PoseName; children: ReactNode }) {
  return <div className="card pal-empty"><Pal pose={pose} size={88} /><p>{children}</p></div>
}
