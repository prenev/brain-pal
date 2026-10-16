import { PalTip } from './Pal'
import { useMemo, useState } from 'react'
import { Star, X } from 'lucide-react'
import { Sheet } from './ui'
import AchievementsView from './AchievementsView'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { palSvg } from '../lib/pal.ts'
import { dayKey, shift } from '../lib/dates.ts'
import { canBuy, MAX_COINS_PER_DAY, REASON_LABEL, total } from '../lib/rewards.ts'
import { CATEGORY_LABEL, categoryOf, COLLECTIBLES, owned as ownedSet, RARITY_COLOR, RARITY_LABEL, SHOP, type Category, type ShopItem } from '../lib/shop.ts'
import type { Outfit } from '../lib/outfits.ts'

const CATS: Category[] = ['outfit', 'theme', 'card', 'title', 'boost']
const wobbi = (outfit: Outfit, size: number, pose: 'idle' | 'cheer' = 'idle') => ({ __html: palSvg(pose, { size, label: '', outfit }) })

/** What an item looks like before you own it: Wobbi wearing it, the colour, the card background, the title. */
function Preview({ item }: { item: ShopItem }) {
  if (item.kind === 'outfit' && item.slot) return <span className="shop-prev" dangerouslySetInnerHTML={wobbi({ [item.slot]: item.id.replace('outfit-', '') }, 92)} />
  if (item.kind === 'theme') return <span className="shop-prev"><i className="swatch" style={{ background: item.color }} /></span>
  if (item.kind === 'card') return <span className="shop-prev"><i className={`cardprev ${item.sparkle ? 'sparkle' : ''}`} style={{ background: `linear-gradient(160deg, ${item.stops![0]}, ${item.stops![1]} 55%, ${item.stops![2]})` }} /></span>
  if (item.kind === 'title') return <span className="shop-prev"><b className="titleprev">{item.text}</b></span>
  return <span className="shop-prev"><Emoji name={item.kind === 'restday' ? 'bed' : 'party'} size={52} /></span>
}

/** Rewards: the marketplace (spend coins on collectibles) and the achievements you've earned. Nothing is ever taken away. */
export default function Wallet({ initial = 'shop' }: { initial?: 'shop' | 'achievements' }) {
  const { coins, earned, purchases, themeId, equip, buy, setTheme, wear, setCardStyle, setTitle, setGoal } = useStore()
  const [tab, setTab] = useState(initial)
  const [cat, setCat] = useState<Category>('outfit')
  const [confirm, setConfirm] = useState<ShopItem | null>(null)
  const [tryOn, setTryOn] = useState<ShopItem | null>(null)
  const [note, setNote] = useState('')
  const [forDay, setForDay] = useState(() => dayKey(new Date()))
  const [msg, setMsg] = useState('')
  const today = dayKey(new Date()), yesterday = shift(today, -1)
  const have = useMemo(() => ownedSet(purchases), [purchases])
  const todayCoins = total(earned.filter(e => e.day === today))
  const recent = useMemo(() => {
    const byDay = new Map<string, typeof earned>()
    for (const e of earned) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])
    return [...byDay.entries()].slice(0, 5)
  }, [earned])
  const items = SHOP.filter(i => categoryOf(i.kind) === cat)
  const haveCount = COLLECTIBLES.filter(i => have.has(i.id)).length
  const goal = equip.goal ? SHOP.find(i => i.id === equip.goal) ?? null : null
  const fitting: Outfit = { ...equip.outfit, ...(tryOn?.slot ? { [tryOn.slot]: tryOn.id.replace('outfit-', '') } : {}) }

  const opts = (item: ShopItem) => ({ forDay: item.kind === 'restday' ? forDay : undefined, note: item.kind === 'treat' ? note : undefined })
  function purchase(item: ShopItem) {
    const r = buy(item.id, opts(item))
    if (!r.ok) { setMsg(r.reason ?? 'Not available.'); return }
    setConfirm(null); if (item.kind === 'treat') setNote(''); if (tryOn?.id === item.id) setTryOn(null)
    setMsg(item.kind === 'restday' ? 'Rest day added. Your streak is safe for that day.' : item.kind === 'treat' ? 'Treat saved. Go enjoy it!' : `${item.name} is yours${item.kind === 'outfit' || item.kind === 'theme' || item.kind === 'card' || item.kind === 'title' ? ' and switched on' : ''}.`)
  }
  const inUse = (i: ShopItem) => i.kind === 'theme' ? themeId === i.id : i.kind === 'card' ? equip.card === i.id : i.kind === 'title' ? equip.title === i.id : i.kind === 'outfit' && !!i.slot && equip.outfit[i.slot] === i.id.replace('outfit-', '')
  const toggleUse = (i: ShopItem) => {
    if (i.kind === 'theme') setTheme(inUse(i) ? null : i.id); else if (i.kind === 'card') setCardStyle(inUse(i) ? null : i.id)
    else if (i.kind === 'title') setTitle(inUse(i) ? null : i.id); else if (i.kind === 'outfit') wear(i.id)
  }
  const useLabel = (i: ShopItem) => inUse(i) ? (i.kind === 'outfit' ? 'Take off' : 'In use') : i.kind === 'outfit' ? 'Wear' : 'Use'
  const check = confirm ? canBuy(confirm, coins, purchases, new Date(), opts(confirm)) : null

  return (
    <>
      <div className="card shop-head" aria-label="Coins">
        <span className="shop-wobbi" dangerouslySetInnerHTML={wobbi(fitting, 118, 'cheer')} />
        <div>
          <div className="muted small">Your coins</div>
          <div className="shop-coins" aria-label={`${coins} coins`}><Emoji name="star" size={34} />{coins}</div>
          <p className="muted small" style={{ margin: 0 }}>{todayCoins > 0 ? `+${todayCoins} earned today.` : 'A tap on how you feel is enough to start.'}</p>
        </div>
      </div>
      {tryOn && <div className="card tryon" role="status"><span>Trying on <b>{tryOn.name}</b></span><span className="row"><button className="btn small" onClick={() => setConfirm(tryOn)}>Get · {tryOn.cost}</button><button className="icon-x" aria-label="Stop trying on" onClick={() => setTryOn(null)}><X size={18} /></button></span></div>}

      <div className="seg" role="tablist" aria-label="Rewards">
        <button role="tab" aria-selected={tab === 'shop'} className={tab === 'shop' ? 'on' : ''} onClick={() => setTab('shop')}>Shop</button>
        <button role="tab" aria-selected={tab === 'achievements'} className={tab === 'achievements' ? 'on' : ''} onClick={() => setTab('achievements')}>Achievements</button>
      </div>

      {tab === 'achievements' && <div style={{ marginTop: 14 }}><AchievementsView /></div>}

      {tab === 'shop' && <>
        <PalTip id="coins" pose="love">Coins come from showing up. Spend them on outfits for me, colours, share-card styles, titles, or a rest day for your streak. Try an outfit on before you buy.</PalTip>

        {goal && <div className="card goal" aria-label="Saving for">
          <div className="row spread"><span className="row"><Star size={18} fill="currentColor" /> <b>Saving for {goal.name}</b></span><button className="linkbtn" onClick={() => setGoal(null)}>Remove</button></div>
          <div className="bar"><i style={{ width: `${Math.min(100, (coins / goal.cost) * 100)}%` }} /></div>
          <p className="muted small" style={{ margin: '6px 0 0' }}>{coins >= goal.cost ? 'You can get it now!' : `${goal.cost - coins} more coins to go.`}</p>
        </div>}

        <div className="shop-cats" role="group" aria-label="Shop sections">
          {CATS.map(c => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</button>)}
        </div>
        <p className="muted small" style={{ margin: '0 2px 10px' }}>Collected {haveCount} of {COLLECTIBLES.length}. Yours to keep; nothing expires or rotates away.</p>

        <div className="shop-grid">
          {items.map(item => {
            const mine = have.has(item.id) && !item.repeatable
            const afford = coins >= item.cost
            return (
              <div key={item.id} className={`card shop-card ${mine ? 'mine' : ''}`} aria-label={item.name} style={{ '--rar': RARITY_COLOR[item.rarity] } as React.CSSProperties}>
                <span className="rarity" style={{ color: RARITY_COLOR[item.rarity] }}>{RARITY_LABEL[item.rarity]}</span>
                <Preview item={item} />
                <b className="shop-name">{item.name}</b>
                <span className="muted small shop-blurb">{item.blurb}</span>
                {mine
                  ? <button className={`btn small block ${inUse(item) ? '' : 'primary'}`} aria-pressed={inUse(item)} onClick={() => toggleUse(item)}>{useLabel(item)}</button>
                  : <button className="btn primary small block" onClick={() => { setMsg(''); setConfirm(item) }}>{afford ? <><Emoji name="star" size={16} style={{ verticalAlign: -3 }} /> {item.cost}</> : `${item.cost - coins} more`}</button>}
                {!mine && !item.repeatable && <span className="row shop-extra">
                  {item.kind === 'outfit' && <button className="linkbtn" onClick={() => setTryOn(tryOn?.id === item.id ? null : item)}>{tryOn?.id === item.id ? 'Stop' : 'Try on'}</button>}
                  <button className="linkbtn" aria-pressed={equip.goal === item.id} onClick={() => setGoal(equip.goal === item.id ? null : item.id)}>{equip.goal === item.id ? 'Saving ★' : 'Save up'}</button>
                </span>}
              </div>
            )
          })}
        </div>
        {msg && <p className="small" role="status" style={{ textAlign: 'center' }}>{msg}</p>}

        <div className="card">
          <b>How you earn them</b>
          <p className="muted small" style={{ marginBottom: 0 }}>For showing up, never for being perfect: check-ins (3), journal entries (3), calming sessions (2), focus blocks (2), worries you work through (1), each anchor (1) plus 3 when all are done, a night of sleep logged (1), and a few more every time you unlock an achievement. Each has a daily limit, so a very full day is worth at most {MAX_COINS_PER_DAY}. Coins never expire and nothing ever takes them away.</p>
        </div>
        {recent.length > 0 && <div className="card">
          <b>Recently</b>
          <ul className="timeline" style={{ marginTop: 10 }}>{recent.map(([day, list]) => (
            <li key={day}><span>{day === today ? 'Today' : day === yesterday ? 'Yesterday' : day}: {list.map(e => e.detail ?? REASON_LABEL[e.reason]).join(', ')}</span><em>+{total(list)}</em></li>))}</ul>
        </div>}
        {purchases.some(p => p.itemId === 'treat') && <div className="card"><b>Your treats</b><ul className="timeline" style={{ marginTop: 10 }}>{purchases.filter(p => p.itemId === 'treat').map(t => <li key={t.id}><span>{t.note}</span><em>{t.at.slice(0, 10)}</em></li>)}</ul></div>}
        <p className="muted small">No real money, no timers, no ranking against anyone. Just a way to notice that you keep showing up.</p>
      </>}

      {confirm && check && <Sheet onClose={() => setConfirm(null)}>
        <div className="confirm-buy" role="dialog" aria-label={`Get ${confirm.name}`}>
          <Preview item={confirm} />
          <h2 style={{ margin: '4px 0' }}>{confirm.name}</h2>
          <span className="rarity" style={{ color: RARITY_COLOR[confirm.rarity] }}>{RARITY_LABEL[confirm.rarity]}</span>
          <p className="muted" style={{ margin: '6px 0 12px' }}>{confirm.blurb}</p>
          {confirm.kind === 'restday' && <label className="field"><span>Cover</span>
            <select className="input" aria-label="Day to cover" value={forDay} onChange={e => setForDay(e.target.value)}><option value={today}>Today</option><option value={yesterday}>Yesterday</option></select></label>}
          {confirm.kind === 'treat' && <label className="field"><span>Name your treat</span>
            <input className="input" maxLength={60} placeholder="e.g. A coffee at my favourite place" value={note} onChange={e => setNote(e.target.value)} /></label>}
          <p className="small" style={{ margin: '4px 0 10px' }}>{coins} coins now · {confirm.cost} for this{check.ok ? ` · ${coins - confirm.cost} left` : ''}</p>
          {!check.ok && <p className="muted small" role="status">{check.reason}</p>}
          <button className="btn primary block" disabled={!check.ok} onClick={() => purchase(confirm)}>Get it · {confirm.cost} coins</button>
          <button className="linkbtn" style={{ display: 'block', margin: '10px auto 0' }} onClick={() => setConfirm(null)}>Not now</button>
        </div>
      </Sheet>}
    </>
  )
}
