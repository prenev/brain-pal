/** Share cards + invite text. Pure (no DOM): cards are built from NUMBERS only, never from anything the person wrote. Tested in scripts/test-share.mjs. */
import { palBody, type PoseName } from './pal.ts'
import type { GuardEvent } from './guard.ts'
import { SITE_URL } from './legal.ts'

/** Set to the App Store link once the app is live (https://apps.apple.com/app/id…); until then invites point at the project site. */
export const APP_STORE_URL = ''
export const inviteUrl = () => APP_STORE_URL || SITE_URL
export const INVITE_TEXT = 'I’ve been using Wobbi: a free, private little buddy for calming down, parking worries and building tiny habits. No account, no ads, works offline.'
export const inviteMessage = () => `${INVITE_TEXT}\n${inviteUrl()}`

export interface ShareCard { kind: 'streak' | 'level' | 'guard'; pose: PoseName; kicker: string; big: string; unit: string; line: string; accent: string }

const plural = (n: number, one: string, many = one + 's') => (n === 1 ? one : many)

export function streakCard(days: number): ShareCard {
  return { kind: 'streak', pose: 'celebrate', kicker: 'My streak', big: String(days), unit: plural(days, 'day'), line: days >= 7 ? 'Showing up for my brain, one tiny step at a time.' : 'Every day I show up counts.', accent: '#ffa63d' }
}
export function levelCard(skill: string, level: number): ShareCard {
  return { kind: 'level', pose: 'cheer', kicker: skill, big: `Level ${level}`, unit: '', line: 'Practising a little every day adds up.', accent: '#a78bfa' }
}

export interface GuardTotals { challenges: number; reps: number; minutes: number }
/** All-time totals of what the Focus guard made someone do instead of scrolling. */
export function guardTotals(events: GuardEvent[]): GuardTotals {
  return events.reduce((a, e) => ({ challenges: a.challenges + 1, reps: a.reps + (e.reps || 0), minutes: a.minutes + (e.minutes || 0) }), { challenges: 0, reps: 0, minutes: 0 })
}
/** Scroll-time they earned and used on purpose. Never claims minutes "saved" that we cannot know. */
export function guardCard(t: GuardTotals): ShareCard {
  const reps = t.reps > 0
  return { kind: 'guard', pose: 'flex', kicker: 'Brain rot, beaten', big: String(reps ? t.reps : t.challenges), unit: reps ? plural(t.reps, 'rep') : plural(t.challenges, 'challenge'), line: `Did ${reps ? 'these' : 'them'} before opening my apps${t.challenges > 1 ? ` (${t.challenges} times)` : ''}.`, accent: '#4ade80' }
}
export const canShareGuard = (t: GuardTotals) => t.challenges > 0

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** 1080×1350 (4:5) card as SVG text: dark Wobbi look, Wobbi on top, one big number, small footer. */
export function cardSvg(c: ShareCard): string {
  const F = `font-family="Nunito, -apple-system, 'Helvetica Neue', Arial, sans-serif"`
  const bigSize = c.big.length > 6 ? 150 : 230
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
<defs><radialGradient id="g" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#2a3347"/><stop offset=".65" stop-color="#171d2b"/><stop offset="1" stop-color="#0d111a"/></radialGradient></defs>
<rect width="1080" height="1350" fill="url(#g)"/>
<text x="540" y="170" ${F} font-size="60" font-weight="800" fill="${c.accent}" text-anchor="middle" letter-spacing="3">${esc(c.kicker.toUpperCase())}</text>
<g transform="translate(240 230) scale(3)">${palBody(c.pose)}</g>
<text x="540" y="${c.unit ? 960 : 980}" ${F} font-size="${bigSize}" font-weight="900" fill="#fff" text-anchor="middle">${esc(c.big)}</text>
${c.unit ? `<text x="540" y="1035" ${F} font-size="64" font-weight="800" fill="${c.accent}" text-anchor="middle">${esc(c.unit)}</text>` : ''}
<text x="540" y="1120" ${F} font-size="42" font-weight="700" fill="#aab4c8" text-anchor="middle">${esc(c.line)}</text>
<text x="540" y="1270" ${F} font-size="46" font-weight="900" fill="#fff" text-anchor="middle">Wobbi</text>
<text x="540" y="1313" ${F} font-size="30" font-weight="700" fill="#7d889e" text-anchor="middle">free · private · works offline</text>
</svg>`
}

/** A sticker is just Wobbi on a transparent square. */
export function stickerSvg(pose: PoseName): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="512" height="512">${palBody(pose)}</svg>`
}
