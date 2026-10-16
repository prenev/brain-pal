import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

/** A calm writing field: grows with the text (no box-in-a-box scrolling), shows how much room is left, and keeps the
 *  limit visible so it's clear what the field is for. 16px+ text so iOS never zooms in. */
export default function NoteField({ label, value, onChange, max, placeholder, autoFocus = false, big = false, tools }: {
  label: string; value: string; onChange: (v: string) => void; max: number; placeholder: string; autoFocus?: boolean; big?: boolean; tools?: ReactNode
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => { const t = ref.current; if (!t) return; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px` }, [value])
  useEffect(() => { if (autoFocus) ref.current?.focus({ preventScroll: true }) }, [autoFocus])
  const left = max - value.length
  return (
    <label className={`note ${big ? 'big' : ''} ${value ? 'has' : ''}`}>
      <span className="note-label">{label}</span>
      <textarea ref={ref} className="note-input" rows={big ? 4 : 1} value={value} maxLength={max} placeholder={placeholder} aria-label={label}
        autoCapitalize="sentences" autoCorrect="on" spellCheck enterKeyHint={big ? 'enter' : 'done'}
        onChange={e => onChange(e.target.value.slice(0, max))} />
      <span className="note-foot">
        {tools ?? <span />}
        <span className={`note-count ${left <= 0 ? 'full' : left < max * 0.12 ? 'low' : ''}`} aria-live="polite" aria-label={`${value.length} of ${max} characters`}>{value.length}/{max}</span>
      </span>
    </label>
  )
}

/** iOS draws the keyboard over the page: expose its height as --kb so the sticky footer (Save) rides above it. */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return
    const set = () => document.documentElement.style.setProperty('--kb', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`)
    set(); vv.addEventListener('resize', set); vv.addEventListener('scroll', set)
    return () => { vv.removeEventListener('resize', set); vv.removeEventListener('scroll', set); document.documentElement.style.removeProperty('--kb') }
  }, [])
}
