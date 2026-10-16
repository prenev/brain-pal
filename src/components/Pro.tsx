import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import Pal from './Pal'
import { Emoji } from '../lib/emoji'
import { burst } from '../lib/confetti'
import { isIOSApp } from '../lib/native'
import { ALWAYS_FREE, DISCLOSURE, featureInfo, PRO_FEATURES, priceLine, type ProFeature } from '../lib/pro.ts'
import { buyPro, loadProduct, redeemCode, refreshPro, restorePro, usePro, type BuyResult } from '../lib/proStore'
import { SITE_URL } from '../lib/legal.ts'

const Ctx = createContext<{ open: (f?: ProFeature) => void; isOpen: boolean }>({ open: () => {}, isOpen: false })
export const useOpenPaywall = () => useContext(Ctx).open
/** True while the paywall is showing (the native tab bar hides itself behind full-screen flows). */
export const usePaywallOpen = () => useContext(Ctx).isOpen

/** Wrap the app: gives every screen `useOpenPaywall()` and keeps the subscription state fresh (launch, foreground). */
export function PaywallProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<{ feature?: ProFeature } | null>(null)
  useEffect(() => {
    void refreshPro(); const f = () => { if (document.visibilityState === 'visible') void refreshPro() }
    document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f)
  }, [])
  return <Ctx.Provider value={{ open: f => setOpen({ feature: f }), isOpen: !!open }}>{children}{open && <Paywall feature={open.feature} onClose={() => setOpen(null)} />}</Ctx.Provider>
}

/** Shows the feature when you have Pro; otherwise a friendly lock card that opens the paywall. */
export function ProGate({ feature, children, compact = false }: { feature: ProFeature; children: ReactNode; compact?: boolean }) {
  const { pro } = usePro()
  const openPaywall = useOpenPaywall()
  if (pro) return <>{children}</>
  const f = featureInfo(feature)
  return (
    <div className={`card pro-lock ${compact ? 'compact' : ''}`} role="region" aria-label={`${f.title} is part of Pro`}>
      {!compact && <Pal pose="stop" size={96} />}
      <div className="pro-lock-text"><b><Emoji name={f.emoji} size={22} /> {f.title}</b><p>{f.blurb}</p></div>
      <button className="btn primary block" onClick={() => openPaywall(feature)}>Unlock with Pro</button>
    </div>
  )
}

function Paywall({ feature, onClose }: { feature?: ProFeature; onClose: () => void }) {
  const { pro } = usePro()
  const [product, setProduct] = useState<{ price: string; trialDays?: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const native = isIOSApp()
  useEffect(() => { void loadProduct().then(setProduct) }, [])
  const trial = !!product?.trialDays

  async function buy() {
    setBusy(true); setMsg('')
    const r: BuyResult = await buyPro(); setBusy(false)
    if (r === 'purchased') { burst(); return }
    setMsg(r === 'pending' ? 'Waiting for approval. Pro unlocks as soon as it goes through.' : r === 'cancelled' ? '' : 'The purchase didn’t go through. You weren’t charged. Try again in a moment.')
  }
  async function restore() {
    setBusy(true); setMsg(''); const ok = await restorePro(); setBusy(false)
    setMsg(ok ? '' : 'No active Pro subscription found for this Apple ID.')
  }
  const link = (path: string) => `${SITE_URL}/${path}`

  return (
    <div className="overlay paywall" role="dialog" aria-modal aria-label="Wobbi Pro"><div className="inner">
      <div className="topbar" style={{ background: 'none' }}>
        <span style={{ width: 50 }} />
        <span className="title">Wobbi Pro</span>
        <button className="glass round" aria-label="Close" onClick={onClose}><X size={24} /></button>
      </div>

      {pro ? <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <Pal pose="celebrate" size={150} motion="jump" />
        <h1 style={{ fontSize: 28, margin: '8px 0 6px' }}>You’re Pro. Thank you!</h1>
        <p className="muted" style={{ margin: 0 }}>Everything below is unlocked. Manage your subscription in Settings → your name → Subscriptions.</p>
        <button className="btn primary block" style={{ marginTop: 16 }} onClick={onClose}>Continue</button>
      </div> : <>
        <div style={{ textAlign: 'center' }}>
          <Pal pose="love" size={130} />
          <h1 style={{ fontSize: 28, margin: '6px 0 4px' }}>{feature ? featureInfo(feature).title : 'Go further with Pro'}</h1>
          <p className="muted" style={{ margin: 0 }}>{feature ? featureInfo(feature).blurb : 'Support Wobbi and unlock everything below.'}</p>
        </div>
        <div className="card" style={{ marginTop: 14 }} aria-label="What Pro includes">
          {PRO_FEATURES.map(f => <div key={f.id} className={`pro-row ${f.id === feature ? 'on' : ''}`}><Emoji name={f.emoji} size={26} /><span><b>{f.title}</b><span className="muted small" style={{ display: 'block' }}>{f.blurb}</span></span></div>)}
        </div>
        <div className="card free-box" aria-label="Always free">
          <b>Always free, for everyone</b>
          <ul>{ALWAYS_FREE.map(t => <li key={t}>{t}</li>)}</ul>
        </div>

        {native ? <>
          <button className="btn primary block" disabled={busy} onClick={buy} style={{ marginTop: 6 }}>{busy ? 'One moment…' : trial ? 'Start free trial' : 'Subscribe'}</button>
          <p style={{ textAlign: 'center', fontWeight: 800, margin: '8px 0 0' }}>{priceLine(product)}</p>
          <p className="small" role="status" style={{ textAlign: 'center', minHeight: 20 }}>{msg}</p>
          <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
            <button className="linkbtn" disabled={busy} onClick={restore}>Restore purchases</button> · <button className="linkbtn" onClick={() => void redeemCode()}>Have a code?</button>
          </div>
          <p className="muted small" style={{ lineHeight: 1.45 }}>{DISCLOSURE(product?.price ?? null)}</p>
          <p className="small" style={{ textAlign: 'center' }}>
            <a href={link('terms.html')} target="_blank" rel="noreferrer">Terms of Service</a> · <a href={link('privacy.html')} target="_blank" rel="noreferrer">Privacy Policy</a> · <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">Apple’s standard EULA</a>
          </p>
        </> : <div className="card" style={{ textAlign: 'center' }}>
          <b>Pro is part of the iPhone app</b>
          <p className="muted" style={{ marginBottom: 0 }}>Subscriptions are handled by the App Store, so they can’t be bought on the web.</p>
        </div>}
      </>}
    </div></div>
  )
}
