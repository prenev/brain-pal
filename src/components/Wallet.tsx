import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { dayKey, shift } from '../lib/dates.ts'
import { canBuy, ownedThemes, REASON_LABEL, restDays, SHOP, total, type ShopItem } from '../lib/rewards.ts'

/** Coins: what you've earned (derived from your own activity), what's in the shop, and plain rules. Nothing is ever taken away. */
export default function Wallet() {
  const { coins, earned, purchases, themeId, buy, setTheme } = useStore()
  const [note, setNote] = useState('')
  const [forDay, setForDay] = useState(() => dayKey(new Date()))
  const [msg, setMsg] = useState('')
  const today = dayKey(new Date()), yesterday = shift(today, -1)
  const todayCoins = total(earned.filter(e => e.day === today))
  const recent = useMemo(() => {
    const byDay = new Map<string, typeof earned>()
    for (const e of earned) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])
    return [...byDay.entries()].slice(0, 5)
  }, [earned])
  const themes = ownedThemes(purchases), treats = purchases.filter(p => p.itemId === 'treat')

  function purchase(item: ShopItem) {
    setMsg('')
    const r = buy(item.id, { forDay: item.kind === 'restday' ? forDay : undefined, note: item.kind === 'treat' ? note : undefined })
    if (!r.ok) { setMsg(r.reason ?? 'Not available.'); return }
    if (item.kind === 'treat') setNote('')
    setMsg(item.kind === 'restday' ? 'Rest day added — your streak is safe for that day.' : item.kind === 'treat' ? 'Treat saved. Go enjoy it!' : `${item.name} unlocked and switched on.`)
  }

  return (
    <>
      <div className="card" aria-label="Coins">
        <div className="muted small">Your coins</div>
        <div style={{ fontSize: 44, fontWeight: 900 }} aria-label={`${coins} coins`}>{coins}</div>
        <p className="muted small" style={{ margin: 0 }}>{todayCoins > 0 ? `+${todayCoins} earned today.` : 'Nothing earned yet today — one tap on how you feel is enough to start.'}</p>
      </div>

      <div className="card">
        <b>How you earn them</b>
        <p className="muted small" style={{ marginBottom: 0 }}>For showing up, never for being perfect: check-ins (5), calming sessions (3), journal entries (4), small steps (4), worries you work through (2), each anchor (2) plus a bonus when all are done (5), a night of sleep logged (2), and streak milestones (10–120). Each has a daily limit, so there’s no point farming. Coins never expire and nothing ever takes them away.</p>
      </div>

      {recent.length > 0 && <div className="card">
        <b>Recently</b>
        <ul className="timeline" style={{ marginTop: 10 }}>{recent.map(([day, list]) => (
          <li key={day}><span>{day === today ? 'Today' : day === yesterday ? 'Yesterday' : day}: {list.map(e => e.detail ?? REASON_LABEL[e.reason]).join(', ')}</span><em>+{total(list)}</em></li>))}</ul>
      </div>}

      <h2 className="sec">Shop</h2>
      {SHOP.map(item => {
        const check = canBuy(item, coins, purchases, new Date(), { forDay: item.kind === 'restday' ? forDay : undefined, note: item.kind === 'treat' ? note : undefined })
        const owned = themes.includes(item.id)
        return (
          <div key={item.id} className="card shop-item" aria-label={item.name}>
            <div className="row spread"><b>{item.name}</b><span className="chip">{item.cost} coins</span></div>
            <p className="muted small" style={{ margin: '4px 0 10px' }}>{item.blurb}</p>
            {item.kind === 'restday' && <label className="field"><span>Cover</span>
              <select className="input" aria-label="Day to cover" value={forDay} onChange={e => setForDay(e.target.value)}><option value={today}>Today</option><option value={yesterday}>Yesterday</option></select></label>}
            {item.kind === 'treat' && <label className="field"><span>Name your treat</span>
              <input className="input" maxLength={60} placeholder="e.g. A coffee at my favourite place" value={note} onChange={e => setNote(e.target.value)} /></label>}
            {item.kind === 'theme' && owned
              ? <button className="btn block" aria-pressed={themeId === item.id} onClick={() => setTheme(themeId === item.id ? null : item.id)}>{themeId === item.id ? 'In use — tap to switch back' : 'Use this colour'}</button>
              : <button className="btn primary block" disabled={!check.ok} onClick={() => purchase(item)}>Get</button>}
            {!check.ok && !owned && <p className="muted small" style={{ margin: '8px 0 0' }}>{check.reason}</p>}
          </div>
        )
      })}
      {themeId && <button className="btn block" onClick={() => setTheme(null)}>Back to the original green</button>}
      {restDays(purchases).length > 0 && <p className="muted small">Rest days used: {restDays(purchases).sort().join(', ')}</p>}
      {treats.length > 0 && <div className="card"><b>Your treats</b><ul className="timeline" style={{ marginTop: 10 }}>{treats.map(t => <li key={t.id}><span>{t.note}</span><em>{t.at.slice(0, 10)}</em></li>)}</ul></div>}
      {msg && <p className="small" role="status" style={{ textAlign: 'center' }}>{msg}</p>}
      <p className="muted small">No real money, no timers, no ranking against anyone. Just a way to notice that you keep showing up.</p>
    </>
  )
}
