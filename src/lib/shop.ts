import { ACCESSORIES, normalizeOutfit, type Outfit, type Slot } from './outfits.ts'

/**
 * The marketplace. Everything here is a one-off collectible you keep (outfits for Wobbi, accent colours, share-card styles, titles) or a
 * small utility (a rest day for your streak, a treat you name). No timers, no rotating stock, no real money.
 */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary']
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }
export const RARITY_COLOR: Record<Rarity, string> = { common: '#9fb0cf', rare: '#4aa8ff', epic: '#b88cff', legendary: '#ffc21f' }
/** About 12 coins a day is a normal day: common ≈ 5 days, rare ≈ 2 weeks, epic ≈ 5 weeks, legendary ≈ 2½ months. */
export const RARITY_PRICE: Record<Rarity, number> = { common: 60, rare: 160, epic: 400, legendary: 900 }

export type ItemKind = 'outfit' | 'theme' | 'card' | 'title' | 'restday' | 'treat'
export type Category = 'outfit' | 'theme' | 'card' | 'title' | 'boost'
export const CATEGORY_LABEL: Record<Category, string> = { outfit: 'Outfits', theme: 'Colours', card: 'Card styles', title: 'Titles', boost: 'Boosts' }
export const categoryOf = (k: ItemKind): Category => (k === 'restday' || k === 'treat' ? 'boost' : k)

export interface ShopItem {
  id: string; kind: ItemKind; name: string; cost: number; blurb: string; repeatable: boolean; rarity: Rarity
  /** theme: accent colour */ color?: string
  /** outfit: where it is worn */ slot?: Slot
  /** card: background gradient stops */ stops?: [string, string, string]; sparkle?: boolean
  /** title: the text */ text?: string
}

const rarityOf: Record<string, Rarity> = {
  beanie: 'common', cap: 'common', bow: 'common', glasses: 'common', scarf: 'common', bowtie: 'common', backpack: 'common',
  flowers: 'rare', headphones: 'rare', heartshades: 'rare', starshades: 'rare', medal: 'rare',
  wizard: 'epic', crown: 'epic', cape: 'epic', halo: 'legendary', wings: 'legendary',
}
const blurbOf: Record<string, string> = {
  beanie: 'Warm and a little bit silly.', cap: 'For brisk walks and focus blocks.', bow: 'A tiny bow for a big heart.', glasses: 'Looks very thoughtful.', scarf: 'Cosy in every season.', bowtie: 'Smart enough for a celebration.', backpack: 'Ready for whatever the day holds.',
  flowers: 'A crown of little flowers.', headphones: 'Lo-fi on, worries off.', heartshades: 'Seeing things on the bright side.', starshades: 'You are a star.', medal: 'For showing up again and again.',
  wizard: 'Turns hard days into a bit of magic.', crown: 'For the one who keeps going.', cape: 'Every small step is a superpower.', halo: 'A soft glow for the calmest of days.', wings: 'Light, free and ready to lift off.',
}
const OUTFITS: ShopItem[] = ACCESSORIES.map(a => ({ id: `outfit-${a.id}`, kind: 'outfit', name: a.name, cost: RARITY_PRICE[rarityOf[a.id]], blurb: blurbOf[a.id], repeatable: false, rarity: rarityOf[a.id], slot: a.slot }))

const theme = (id: string, name: string, color: string, blurb: string, rarity: Rarity = 'common'): ShopItem => ({ id: `theme-${id}`, kind: 'theme', name, cost: RARITY_PRICE[rarity], blurb, repeatable: false, rarity, color })
const THEMES: ShopItem[] = [
  theme('ocean', 'Ocean', '#4aa8ff', 'A calm blue accent.'), theme('sunset', 'Sunset', '#ffa63d', 'A warm orange accent.'), theme('berry', 'Berry', '#ff6fa8', 'A soft pink accent.'), theme('lavender', 'Lavender', '#9b8cff', 'A gentle purple accent.'),
  theme('mint', 'Mint', '#2dd4bf', 'Fresh and clear.'), theme('coral', 'Coral', '#ff7a59', 'Lively and warm.', 'rare'), theme('gold', 'Gold', '#f5c542', 'A little luxury.', 'rare'), theme('rose', 'Rose', '#fb7185', 'Soft but bold.', 'rare'),
]

const card = (id: string, name: string, stops: [string, string, string], blurb: string, rarity: Rarity, sparkle = false): ShopItem => ({ id: `card-${id}`, kind: 'card', name, cost: RARITY_PRICE[rarity], blurb, repeatable: false, rarity, stops, sparkle })
const CARDS: ShopItem[] = [
  card('aurora', 'Aurora', ['#123a3a', '#1b3a64', '#0c1424'], 'Green and blue northern lights.', 'rare'), card('sunrise', 'Sunrise', ['#4a2340', '#7a3a2e', '#1a1220'], 'A warm morning glow.', 'rare'),
  card('candy', 'Candy', ['#4a2a57', '#2f3a7a', '#171a33'], 'Pink and violet sweets.', 'rare'), card('forest', 'Forest', ['#17402e', '#1c3326', '#0b1510'], 'Deep, quiet greens.', 'rare'),
  card('galaxy', 'Galaxy', ['#2b1f5c', '#161a45', '#080a1c'], 'Stars on a deep violet sky.', 'epic', true), card('goldrush', 'Gold rush', ['#5c4510', '#33270c', '#120d04'], 'Gleaming gold, for the proudest wins.', 'legendary', true),
]

const title = (id: string, text: string, blurb: string, rarity: Rarity = 'common'): ShopItem => ({ id: `title-${id}`, kind: 'title', name: text, text, cost: RARITY_PRICE[rarity], blurb, repeatable: false, rarity })
const TITLES: ShopItem[] = [
  title('captain', 'Calm Captain', 'Shown on your share cards.'), title('gardener', 'Brain Gardener', 'Shown on your share cards.'), title('early', 'Early Bird', 'Shown on your share cards.'), title('owl', 'Night Owl', 'Shown on your share cards.'),
  title('tamer', 'Worry Tamer', 'Shown on your share cards.', 'rare'), title('keeper', 'Streak Keeper', 'Shown on your share cards.', 'rare'), title('philosopher', 'Pocket Philosopher', 'Shown on your share cards.', 'rare'), title('master', 'Zen Master', 'Shown on your share cards.', 'epic'),
]

export const REST_DAYS_PER_MONTH = 2
const BOOSTS: ShopItem[] = [
  { id: 'restday', kind: 'restday', name: 'Rest day', cost: 40, blurb: `Cover one missed day so your streak keeps going (up to ${REST_DAYS_PER_MONTH} a month).`, repeatable: true, rarity: 'common' },
  { id: 'treat', kind: 'treat', name: 'My treat', cost: 30, blurb: 'A small reward you name yourself, then actually enjoy it.', repeatable: true, rarity: 'common' },
]

export const SHOP: ShopItem[] = [...OUTFITS, ...THEMES, ...CARDS, ...TITLES, ...BOOSTS]
export const itemById = (id: string) => SHOP.find(i => i.id === id)
/** Things you collect (everything you can only own once). */
export const COLLECTIBLES = SHOP.filter(i => !i.repeatable)

export interface Purchase { id: string; itemId: string; at: string; cost: number; forDay?: string; note?: string }
export const owned = (p: Purchase[]) => new Set(p.map(x => x.itemId))
export const ownedThemes = (p: Purchase[]) => p.filter(x => itemById(x.itemId)?.kind === 'theme').map(x => x.itemId)
/** One collectible = one entry; the day it was bought. */
export const collectDays = (p: Purchase[]) => p.filter(x => { const i = itemById(x.itemId); return i && !i.repeatable }).map(x => x.at.slice(0, 10))

/** What is equipped, plus an optional "saving for" goal. */
export interface Equip { outfit: Outfit; card: string | null; title: string | null; goal: string | null }
export const EMPTY_EQUIP: Equip = { outfit: {}, card: null, title: null, goal: null }
export function normalizeEquip(raw: unknown, purchases: Purchase[]): Equip {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const have = owned(purchases)
  const outfit = normalizeOutfit(r.outfit)
  for (const slot of Object.keys(outfit) as Slot[]) if (!have.has(`outfit-${outfit[slot]}`)) delete outfit[slot]
  const pick = (v: unknown, kind: ItemKind) => (typeof v === 'string' && itemById(v)?.kind === kind && have.has(v) ? v : null)
  const goal = typeof r.goal === 'string' && itemById(r.goal) && !have.has(r.goal) ? r.goal : null
  return { outfit, card: pick(r.card, 'card'), title: pick(r.title, 'title'), goal }
}
export const equipIsEmpty = (e: Equip) => !Object.keys(e.outfit).length && !e.card && !e.title && !e.goal
export const titleText = (e: Equip) => (e.title ? itemById(e.title)?.text ?? null : null)
export const cardStyle = (e: Equip) => (e.card ? itemById(e.card) ?? null : null)

/** Wear (or take off) an owned outfit piece. */
export function toggleOutfit(e: Equip, itemId: string): Equip {
  const it = itemById(itemId); if (!it || it.kind !== 'outfit' || !it.slot) return e
  const acc = itemId.replace('outfit-', ''), outfit = { ...e.outfit }
  if (outfit[it.slot] === acc) delete outfit[it.slot]; else outfit[it.slot] = acc
  return { ...e, outfit }
}

export const RARITY_COUNTS = (items: ShopItem[]) => Object.fromEntries(RARITIES.map(r => [r, items.filter(i => i.rarity === r).length])) as Record<Rarity, number>
