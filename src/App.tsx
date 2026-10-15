import { useState } from 'react'
import { Icon } from './components/ui'
import { StoreProvider, useStore } from './lib/store'
import Today from './pages/Today'
import Journal from './pages/Journal'
import Breathe from './pages/Breathe'
import Settings from './pages/Settings'
import Login from './pages/Login'
import NewThought from './pages/NewThought'

const TABS = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'journal', label: 'Journal', icon: 'book' },
  { id: 'breathe', label: 'Breathe', icon: 'wind' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
] as const
type Tab = (typeof TABS)[number]['id']

function Shell() {
  const { ready, needsLogin } = useStore()
  const [tab, setTab] = useState<Tab>('today')
  const [composing, setComposing] = useState(false)

  if (!ready) return <div className="center-screen muted">Loading…</div>
  if (needsLogin) return <Login />

  return (
    <div className="shell">
      <nav className="tabbar glass" aria-label="Main">
        {TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} />{t.label}
          </button>
        ))}
      </nav>
      <main className="main">
        {tab === 'today' && <Today onNew={() => setComposing(true)} goBreathe={() => setTab('breathe')} />}
        {tab === 'journal' && <Journal />}
        {tab === 'breathe' && <Breathe />}
        {tab === 'settings' && <Settings />}
      </main>
      {tab !== 'breathe' && tab !== 'settings' && (
        <button className="fab btn primary" aria-label="New thought" onClick={() => setComposing(true)}>+</button>
      )}
      {composing && <NewThought onClose={() => setComposing(false)} />}
    </div>
  )
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>
}
