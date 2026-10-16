import { useSyncExternalStore } from 'react'
import type { Outfit } from './outfits.ts'

/** What Wobbi is wearing right now, so every picture of Wobbi in the app shows it. */
let worn: Outfit = {}
const subs = new Set<() => void>()
export const setWornOutfit = (o: Outfit) => { if (JSON.stringify(o) === JSON.stringify(worn)) return; worn = o; subs.forEach(f => f()) }
export const wornOutfit = () => worn
export const useOutfit = () => useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb) } }, () => worn)
