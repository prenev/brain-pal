import { Keyboard } from '@capacitor/keyboard'
import { isNative } from '../lib/native'
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

/** iOS draws the keyboard over the page: expose its height as --kb (room to scroll to the buttons), and close it when you drag the page, like Notes or Messages do. */
export function useKeyboardInset() {
  useEffect(() => {
    const root = document.documentElement
    const setKb = (px: number) => root.style.setProperty('--kb', `${Math.max(0, Math.round(px))}px`)
    const subs: { remove: () => Promise<void> }[] = []
    if (isNative()) {
      void Keyboard.addListener('keyboardWillShow', i => setKb(i.keyboardHeight)).then(h => subs.push(h)).catch(() => {})
      void Keyboard.addListener('keyboardWillHide', () => setKb(0)).then(h => subs.push(h)).catch(() => {})
    }
    const vv = window.visualViewport
    const fromViewport = () => { if (vv && !isNative()) setKb(window.innerHeight - vv.height - vv.offsetTop) }
    vv?.addEventListener('resize', fromViewport)
    // a drag on the page (not inside the text) puts the keyboard away so the rest of the page can be reached
    let y0 = 0
    const down = (e: TouchEvent) => { y0 = e.touches[0]?.clientY ?? 0 }
    const move = (e: TouchEvent) => {
      const a = document.activeElement as HTMLElement | null
      if (!a || !/^(TEXTAREA|INPUT)$/.test(a.tagName) || a.contains(e.target as Node)) return
      if (Math.abs((e.touches[0]?.clientY ?? 0) - y0) > 12) a.blur()
    }
    document.addEventListener('touchstart', down, { passive: true }); document.addEventListener('touchmove', move, { passive: true })
    return () => {
      for (const h of subs) void h.remove()
      vv?.removeEventListener('resize', fromViewport)
      document.removeEventListener('touchstart', down); document.removeEventListener('touchmove', move)
      root.style.removeProperty('--kb')
    }
  }, [])
}
