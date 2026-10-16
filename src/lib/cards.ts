import { palBody } from './pal.ts'
import { EMOJI } from './emojiData.ts'
import { TIER_COLOR, TIER_LABEL, type Achievement } from './achievements.ts'
import type { Outfit } from './outfits.ts'
import { cardStyle, titleText, type Equip } from './shop.ts'

/** Look of the achievement card: Wobbi's dark widget style, medallion in the tier's metal, optional bought card style, outfit and title. */
export interface CardLook { outfit?: Outfit; stops?: [string, string, string] | null; sparkle?: boolean; title?: string | null }
export const DEFAULT_STOPS: [string, string, string] = ['#2a3347', '#171d2b', '#0d111a']

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const F = `font-family="Nunito, -apple-system, 'Helvetica Neue', Arial, sans-serif"`

/** Shared dark backdrop for every share card (bought card styles recolour it). */
export function backdrop(look: CardLook, glow: string, id = 'bg'): string {
  const [a, b, c] = look.stops ?? DEFAULT_STOPS
  const stars = look.sparkle ? Array.from({ length: 34 }, (_, i) => { const x = (i * 197 + 53) % 1040 + 20, y = (i * 311 + 91) % 1290 + 20, r = 1.5 + (i % 4) * 0.9; return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.25 + (i % 5) * 0.12}"/>` }).join('') : ''
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
<radialGradient id="${id}g" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="${glow}" stop-opacity=".38"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>
<rect width="1080" height="1350" fill="url(#${id})"/><rect width="1080" height="1350" fill="url(#${id}g)"/>${stars}`
}

/** The footer every card shares: Wobbi (wearing the outfit), the app name, the equipped title and a date. */
export function footer(look: CardLook, pose: Parameters<typeof palBody>[0], date: string | null): string {
  return `<g transform="translate(70 1088) scale(1.05)">${palBody(pose, look.outfit)}</g>
<text x="330" y="1188" ${F} font-size="68" font-weight="900" fill="#fff">Wobbi</text>
${look.title ? `<text x="332" y="1240" ${F} font-size="38" font-weight="800" fill="#c9d3ea">${esc(look.title)}</text>` : `<text x="332" y="1240" ${F} font-size="34" font-weight="700" fill="#7d889e">free · private</text>`}
${date ? `<text x="1010" y="1240" ${F} font-size="32" font-weight="700" fill="#8a96ad" text-anchor="end">${esc(date)}</text>` : ''}`
}

const prettyDay = (day: string | null) => { if (!day) return null; const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) }

/** 1080×1350 card for one unlocked achievement: metal medallion with the emoji, tier banner, title, what you did, tier dots, Wobbi. */
export function achievementCardSvg(a: Achievement, look: CardLook = {}): string {
  const [light, base, dark] = TIER_COLOR[a.tier]
  const emoji = EMOJI[a.emoji] ?? EMOJI.sparkles
  const dots = Array.from({ length: a.tiersInFamily }, (_, i) => `<circle cx="${540 + (i - (a.tiersInFamily - 1) / 2) * 56}" cy="1058" r="14" fill="${i <= a.tierIndex ? base : 'none'}" stroke="${i <= a.tierIndex ? light : '#4a5570'}" stroke-width="4"/>`).join('')
  const titleSize = a.title.length > 20 ? 72 : 88
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
${backdrop(look, base)}
<defs><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset=".5" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
<linearGradient id="disc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27304a"/><stop offset="1" stop-color="#121829"/></linearGradient></defs>
<rect x="44" y="44" width="992" height="1262" rx="76" fill="#ffffff" fill-opacity=".035" stroke="${base}" stroke-opacity=".55" stroke-width="4"/>
<rect x="290" y="96" width="500" height="64" rx="32" fill="${base}" fill-opacity=".18" stroke="${base}" stroke-opacity=".7" stroke-width="3"/>
<text x="540" y="140" ${F} font-size="30" font-weight="900" fill="${light}" text-anchor="middle" letter-spacing="5">ACHIEVEMENT UNLOCKED</text>
<circle cx="540" cy="520" r="262" fill="url(#metal)"/><circle cx="540" cy="520" r="238" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4"/>
<circle cx="540" cy="520" r="218" fill="url(#disc)"/><circle cx="540" cy="520" r="218" fill="none" stroke="${dark}" stroke-width="6" stroke-opacity=".8"/>
<ellipse cx="450" cy="372" rx="120" ry="52" fill="#fff" opacity=".07" transform="rotate(-28 450 372)"/>
<g transform="translate(360 340) scale(11.25)">${emoji}</g>
<g><rect x="360" y="738" width="360" height="82" rx="41" fill="url(#metal)" stroke="${dark}" stroke-width="4"/>
<text x="540" y="794" ${F} font-size="44" font-weight="900" fill="#1b1305" text-anchor="middle" letter-spacing="6">${esc(TIER_LABEL[a.tier].toUpperCase())}</text></g>
<text x="540" y="934" ${F} font-size="${titleSize}" font-weight="900" fill="#fff" text-anchor="middle">${esc(a.title)}</text>
<text x="540" y="1000" ${F} font-size="42" font-weight="700" fill="#aab4c8" text-anchor="middle">${esc(a.text)}</text>
${dots}
${footer(look, a.pose, prettyDay(a.day))}
</svg>`
}

/** What the person has bought and put on, as a card look. */
export function lookFromEquip(e: Equip): CardLook {
  const style = cardStyle(e)
  return { outfit: e.outfit, stops: style?.stops ?? null, sparkle: !!style?.sparkle, title: titleText(e) }
}
