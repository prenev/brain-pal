import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { isNative, Mindful } from './native'
import { useStore } from './store'
import { loadGuard, loadPomo } from './extras'
import { worryStats } from './worries'
import { buildSnapshot, normalizeActions, planActions } from './widgetData.ts'
import { parseRouteLink } from './nativeCore'
import { routeEvent } from './nativeInit'

const blank = { situation: '', thought: '', emotions: [], internalBehaviour: '', externalBehaviour: '', alternateThought: '', outcomeIntensity: null, tags: [], distortions: [], photoFiles: [] }

/**
 * iPhone widgets: keeps the shared snapshot fresh and applies what the widgets queued (a mood tapped on the
 * home screen, an anchor ticked, a control that asked to open SOS). Best-effort: widgets must never break the app.
 */
export function useWidgetSync() {
  const { ready, thoughts, streak, anchorsToday, worries, sleepNights, coins, sessions, journal, focusSessions, addThought, toggleAnchor } = useStore()
  const latest = useRef({ thoughts, streak, anchorsToday, worries, sleepNights, coins, sessions, journal, focusSessions, addThought, toggleAnchor })
  latest.current = { thoughts, streak, anchorsToday, worries, sleepNights, coins, sessions, journal, focusSessions, addThought, toggleAnchor }

  const push = () => {
    const s = latest.current
    const snap = buildSnapshot({
      now: new Date(), thoughts: s.thoughts, streak: s.streak, anchors: s.anchorsToday.items, worriesOpen: worryStats(s.worries).open,
      nights: s.sleepNights, coins: s.coins, focus: (() => { const p = loadPomo(); return { block: p.block, apps: loadGuard().appCount, goal: p.goal, blocks: s.focusSessions } })(), sessions: s.sessions, journal: s.journal,
    })
    return Mindful.widgetUpdate({ snapshot: JSON.stringify(snap) }).catch(() => {})
  }

  const drain = async () => {
    let taken: { actions: string; route?: string }
    try { taken = await Mindful.widgetTake() } catch { return }
    if (taken.route) { const go = parseRouteLink(`brainpal://${taken.route}`); if (go) window.dispatchEvent(new CustomEvent(routeEvent, { detail: go })) }
    let raw: unknown = []
    try { raw = JSON.parse(taken.actions || '[]') } catch { /* junk: ignore */ }
    const s = latest.current
    const plan = planActions(normalizeActions(raw), new Date(), s.anchorsToday.items)
    for (const m of plan.moods) { try { await s.addThought({ ...blank, mood: m.mood, createdAt: m.createdAt }) } catch { /* keep going */ } }
    for (const id of plan.toggles) s.toggleAnchor(id)
  }

  // Coming back to the app: apply the queue first, then redraw; going away: make sure the widgets show the latest.
  useEffect(() => {
    if (!isNative() || !ready) return
    void drain()
    let handle: { remove: () => Promise<void> } | null = null, gone = false
    App.addListener('appStateChange', ({ isActive }) => { if (isActive) void drain(); else void push() })
      .then(h => { if (gone) void h.remove(); else handle = h }).catch(() => {})
    return () => { gone = true; void handle?.remove() }
  }, [ready])

  // Any change to what the widgets show: redraw (debounced; a burst of edits is one update).
  useEffect(() => {
    if (!isNative() || !ready) return
    const t = setTimeout(() => void push(), 600)
    return () => clearTimeout(t)
  }, [ready, thoughts, streak, anchorsToday, worries, sleepNights, coins, sessions, journal])
}
