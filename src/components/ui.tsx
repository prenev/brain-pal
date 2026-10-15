import type { ReactNode } from 'react'
import { NameIcon } from '../lib/icons'

/** Round icon + label, used for emotion and tag grids. */
export function IconGrid({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o])
  return (
    <div className="icon-grid">
      {options.map(o => (
        <button type="button" key={o} className={`ig ${value.includes(o) ? 'on' : ''}`} aria-pressed={value.includes(o)} onClick={() => toggle(o)}>
          <span><NameIcon name={o} /></span><em className="lbl">{o}</em>
        </button>
      ))}
    </div>
  )
}

export function Toggle({ label, on, onChange, hint }: { label: string; on: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="toggle">
      <div>{label}{hint && <div className="muted small">{hint}</div>}</div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
    </div>
  )
}

/** Glass bottom sheet. */
export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet glass" role="dialog" aria-modal onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}

export const monthLabel = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
