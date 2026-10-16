import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { loadGuard } from '../lib/extras'
import { guardStatus, guardSupported } from '../lib/guardNative'
import { isUnlocked, minutesLeft } from '../lib/guard.ts'
import { stepChoices } from '../lib/focus.ts'

/** Half-width Focus-guard tile: what's blocked and whether it is locked right now, or an invitation to pick apps. */
export function GuardTile({ onOpen }: { onOpen: () => void }) {
  const [cfg, setCfg] = useState(loadGuard)
  const [until, setUntil] = useState<number | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const native = guardSupported()
  useEffect(() => {
    setCfg(loadGuard()); if (!native) return
    let off = false
    guardStatus().then(s => { if (off) return; setUntil(s.unlockedUntil); if (s.available) setCount(s.appCount) }).catch(() => {})
    return () => { off = true }
  }, [native])
  const n = count ?? cfg.appCount
  const now = Date.now(), open = isUnlocked(until, now)
  const state = !native ? 'web' : cfg.enabled && n > 0 ? (open ? 'open' : 'locked') : 'empty'
  return (
    <button className={`card home-tile guard-tile ${state}`} onClick={onOpen} aria-label="Focus guard">
      <span className="tile-art" aria-hidden="true"><Emoji name="shield" size={44} /></span>
      <span className="tile-body">
        <b>Focus guard</b>
        {state === 'locked' && <span className="tile-sub"><i className="dot lock" />{n} {n === 1 ? 'app' : 'apps'} blocked · earn time to open them</span>}
        {state === 'open' && <span className="tile-sub"><i className="dot open" />{n} {n === 1 ? 'app' : 'apps'} open for {minutesLeft(until!, now)} more min</span>}
        {state === 'empty' && <span className="tile-sub">Pick the apps that eat your time, and earn them back.</span>}
        {state === 'web' && <span className="tile-sub">Pause distracting apps until you move. Works in the iPhone app.</span>}
      </span>
      {state === 'empty' && <span className="tile-cta"><Plus size={16} strokeWidth={3} /> Add apps</span>}
    </button>
  )
}

/** Worry tile in the tools row: how many are parked, or an invitation to park one. Opens worry time (or the park sheet while nothing is parked). */
export function WorryTool({ onWorry, onPark }: { onWorry: () => void; onPark: () => void }) {
  const { worries } = useStore()
  const n = worries.filter(w => w.status === 'open').length
  return (
    <button className="card tool worry-tool" onClick={n ? onWorry : onPark} aria-label={n ? `${n} parked ${n === 1 ? 'worry' : 'worries'}` : 'Park a worry'}>
      <Emoji name="worry" size={30} /><b>Worries</b><small>{n ? `${n} parked` : 'Park one'}</small>
    </button>
  )
}

/** One line under the tools when a worry has a planned small step waiting. */
export function StepNudge({ onStep }: { onStep: () => void }) {
  const { worries, focusSessions } = useStore()
  const step = stepChoices(worries, focusSessions).fromWorries[0]?.text
  if (!step) return null
  return <button className="tile-step" onClick={onStep}><Emoji name="rocket" size={20} /> A small step is waiting: {step}</button>
}
