import { useEffect, useRef, useState } from 'react'
import { isIOSApp, Mindful } from './native'

export interface NativeTab { id: string; label: string; symbol: string }

/**
 * Drives the real UIKit tab bar in the iPhone app (Liquid Glass on iOS 26, the system bar before that).
 * Returns true once the native bar is up; the web tab bar then hides itself. Any failure keeps the web bar,
 * so a missing / old native shell never leaves the app without navigation.
 */
export function useNativeTabs(items: NativeTab[], active: string, hidden: boolean, onSelect: (id: string) => void): boolean {
  const [native, setNative] = useState(false)
  const cb = useRef(onSelect); cb.current = onSelect
  const first = useRef({ items, active })   // only the first values matter for setup; later changes go through selectTab

  useEffect(() => {
    if (!isIOSApp()) return
    let dead = false, handle: { remove: () => Promise<void> } | undefined
    Mindful.addListener('tabSelected', e => cb.current(e.id)).then(h => { if (dead) h.remove().catch(() => {}); else handle = h }).catch(() => {})
    Mindful.setTabs({ items: first.current.items, selected: first.current.active }).then(r => {
      if (dead || !r?.native) return
      document.documentElement.style.setProperty('--native-tab-h', `${Math.max(0, Math.round(r.height))}px`)
      setNative(true)
    }).catch(() => {})
    return () => { dead = true; handle?.remove().catch(() => {}) }
  }, [])

  useEffect(() => { document.documentElement.classList.toggle('native-tabs', native) }, [native])
  useEffect(() => { if (native) Mindful.selectTab({ id: active }).catch(() => {}) }, [native, active])
  useEffect(() => { if (native) Mindful.setTabsHidden({ hidden }).catch(() => {}) }, [native, hidden])
  return native
}
