import { useEffect, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import Pal from './Pal'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { loadGuard } from '../lib/extras'
import { guardStatus, guardSupported } from '../lib/guardNative'
import { isUnlocked, minutesLeft } from '../lib/guard.ts'
import { stepChoices } from '../lib/focus.ts'

/** Long Focus-guard tile: what's blocked and whether it is locked right now, or an invitation to pick apps. */
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
      {state === 'empty' ? <span className="tile-cta"><Plus size={16} strokeWidth={3} /> Add apps</span> : <ChevronRight size={22} className="tile-go" />}
    </button>
  )
}

/** Long worry tile: how many are parked (with the first two), a planned small step, or an invitation to park one. */
export function WorryTile({ onWorry, onPark, onStep }: { onWorry: () => void; onPark: () => void; onStep: () => void }) {
  const { worries, focusSessions } = useStore()
  const open = worries.filter(w => w.status === 'open')
  const step = stepChoices(worries, focusSessions).fromWorries[0]?.text
  if (open.length === 0 && !step) return (
    <button className="card home-tile worry-tile empty" onClick={onPark} aria-label="Park a worry">
      <span className="tile-art"><Pal pose="think" size={52} /></span>
      <span className="tile-body"><b>Park your worries</b><span className="tile-sub">Write one down and let it wait until worry time.</span></span>
      <span className="tile-cta"><Plus size={16} strokeWidth={3} /> Park one</span>
    </button>
  )
  return (
    <div className="card home-tile worry-tile has" role="group" aria-label="Worries">
      <button className="tile-main" onClick={onWorry} aria-label={open.length ? `${open.length} parked ${open.length === 1 ? 'worry' : 'worries'}` : 'Worry time'}>
        <span className="tile-art" aria-hidden="true"><Emoji name="worry" size={44} /></span>
        <span className="tile-body">
          <b>{open.length ? `${open.length} ${open.length === 1 ? 'worry' : 'worries'} parked` : 'Worries, handled'}</b>
          <span className="tile-lines">{open.length ? <>{open.slice(0, 2).map(w => <span key={w.id}>{w.text}</span>)}{open.length > 2 && <em>+{open.length - 2} more</em>}</> : <span>You turned them into steps. Nothing is waiting to be parked.</span>}</span>
        </span>
        <ChevronRight size={22} className="tile-go" />
      </button>
      {step && <button className="tile-step" onClick={onStep}><Emoji name="rocket" size={20} /> A small step is waiting: {step}</button>}
    </div>
  )
}
