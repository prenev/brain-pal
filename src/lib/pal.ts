import { outfitLayers, type Outfit } from './outfits.ts'
// "Wobbi", the mascot: a soft lavender cloud-brain with stubby arms and legs. Every pose is plain data rendered to SVG,
// so the app (inline SVG, CSS-animated), the sprite-sheet PNG and the app icon all come from the same drawing.
// Pure (no imports): unit-tested by scripts/test-pal.mjs.

export type Eyes = 'open' | 'happy' | 'closed' | 'wide' | 'side' | 'heart'
export type Mouth = 'smile' | 'grin' | 'open' | 'o' | 'flat' | 'wavy' | 'small'
export type Brows = 'worried' | 'determined' | null
export type Legs = 'stand' | 'wide' | 'squat' | 'jump' | 'walkA' | 'walkB'
export type Extra = 'sparkles' | 'confetti' | 'bubble' | 'sweat' | 'zzz' | 'hearts' | 'shield' | 'play' | 'laptop' | 'book' | 'cup' | 'shades' | 'laurel' | 'blanket' | 'phone' | 'headband' | 'partyhat'

export interface PoseSpec { armL: number; armR: number; legs: Legs; eyes: Eyes; mouth: Mouth; brows: Brows; dy: number; scale: number; tilt: number; extras: Extra[] }
const BASE: PoseSpec = { armL: 14, armR: 14, legs: 'stand', eyes: 'open', mouth: 'smile', brows: null, dy: 0, scale: 1, tilt: 0, extras: [] }

/** Arm angle: 0 = hanging down, 90 = straight out sideways, 180 = straight up. */
export const POSES = {
  idle: {},
  wave: { armR: 150, mouth: 'grin' },
  wave2: { armR: 118, mouth: 'grin' },
  cheer: { armL: 158, armR: 158, eyes: 'happy', mouth: 'grin', extras: ['sparkles'], dy: -4 },
  celebrate: { armL: 168, armR: 168, eyes: 'happy', mouth: 'open', extras: ['confetti'], dy: -12, legs: 'jump' },
  think: { armR: 72, eyes: 'side', mouth: 'flat', extras: ['bubble'], tilt: -4 },
  worried: { armL: 4, armR: 4, eyes: 'wide', brows: 'worried', mouth: 'wavy', extras: ['sweat'] },
  sleepy: { eyes: 'closed', mouth: 'small', extras: ['zzz'], tilt: 5 },
  breatheIn: { eyes: 'closed', mouth: 'o', armL: 62, armR: 62, scale: 1.07 },
  breatheOut: { eyes: 'closed', mouth: 'smile', armL: 10, armR: 10, scale: 0.95 },
  flex: { armL: 104, armR: 104, brows: 'determined', mouth: 'grin', extras: ['sweat'], legs: 'wide' },
  squat: { legs: 'squat', armL: 84, armR: 84, dy: 10, brows: 'determined', mouth: 'grin' },
  walkA: { legs: 'walkA', armL: 38, armR: -30 },
  walkB: { legs: 'walkB', armL: -30, armR: 38 },
  love: { eyes: 'heart', armL: 64, armR: 64, extras: ['hearts'] },
  stop: { armR: 172, brows: 'determined', mouth: 'flat', extras: ['shield'] },
  // the pomodoro cast
  holdPlay: { armL: -52, armR: -52, eyes: 'happy', mouth: 'smile', extras: ['play'] },
  focus: { armL: -58, armR: -58, eyes: 'side', brows: 'determined', mouth: 'flat', extras: ['laptop'] },
  read: { armL: -60, armR: -60, eyes: 'side', mouth: 'small', extras: ['book'] },
  hype: { armL: 128, armR: 14, brows: 'determined', mouth: 'grin', extras: ['headband', 'sweat'], legs: 'wide' },
  coffee: { armL: 10, armR: 48, eyes: 'happy', mouth: 'smile', extras: ['cup'], tilt: -3 },
  stretch: { armL: 176, armR: 176, eyes: 'closed', mouth: 'open', legs: 'wide', dy: -3, scale: 1.04 },
  chill: { armL: 146, armR: 146, mouth: 'smile', extras: ['shades'], legs: 'wide', tilt: 3 },
  nap: { eyes: 'closed', mouth: 'small', extras: ['blanket', 'zzz'], tilt: 7 },
  champ: { armL: 165, armR: 165, eyes: 'happy', mouth: 'grin', extras: ['laurel', 'sparkles'], dy: -4 },
  party: { armL: 150, armR: 150, eyes: 'happy', mouth: 'open', extras: ['partyhat', 'confetti'], legs: 'jump', dy: -10 },
  scroll: { armL: -50, armR: -50, eyes: 'wide', brows: 'worried', mouth: 'flat', extras: ['phone'] },
} as const satisfies Record<string, Partial<PoseSpec>>
export type PoseName = keyof typeof POSES
export const POSE_NAMES = Object.keys(POSES) as PoseName[]

/** Short phrases for aria-labels (the mascot is decorative, but the pose can carry meaning). */
export const POSE_LABEL: Record<PoseName, string> = {
  idle: 'Wobbi smiling', wave: 'Wobbi waving', wave2: 'Wobbi waving', cheer: 'Wobbi cheering', celebrate: 'Wobbi celebrating', think: 'Wobbi thinking', worried: 'Wobbi looking worried', sleepy: 'Wobbi sleepy',
  breatheIn: 'Wobbi breathing in', breatheOut: 'Wobbi breathing out', flex: 'Wobbi flexing', squat: 'Wobbi squatting', walkA: 'Wobbi walking', walkB: 'Wobbi walking', love: 'Wobbi with hearts', stop: 'Wobbi holding up a hand',
  holdPlay: 'Wobbi holding a play button', focus: 'Wobbi working on a laptop', read: 'Wobbi reading', hype: 'Wobbi pumped up', coffee: 'Wobbi with a warm drink', stretch: 'Wobbi stretching', chill: 'Wobbi in sunglasses', nap: 'Wobbi napping under a blanket', champ: 'Wobbi wearing a laurel wreath', party: 'Wobbi with a party hat', scroll: 'Wobbi stuck on a phone',
}

/** Named animations = ordered pose frames (used for the sprite sheet; in the app CSS animates the same pieces). */
export const ANIMATIONS: Record<string, PoseName[]> = {
  breathe: ['breatheOut', 'breatheIn', 'breatheIn', 'breatheOut'],
  wave: ['idle', 'wave', 'wave2', 'wave'],
  cheer: ['idle', 'cheer', 'celebrate', 'cheer'],
  walk: ['walkA', 'idle', 'walkB', 'idle'],
  workout: ['idle', 'squat', 'flex', 'squat'],
  sleep: ['sleepy', 'sleepy', 'idle', 'sleepy'],
  focus: ['focus', 'hype', 'focus', 'read'],
  break: ['coffee', 'stretch', 'coffee', 'chill'],
  nap: ['nap', 'nap', 'sleepy', 'nap'],
  party: ['party', 'cheer', 'party', 'champ'],
}

const C = { body: '#c8b8ff', hi: '#eee8ff', edge: '#9f8be6', fold: '#ad9bf0', cheek: '#ff9ec0', ink: '#2a2745', white: '#fff', limb: '#bba8fb', gold: '#ffd95a', blue: '#7cc4ff', pink: '#ff8fb1', green: '#5fd39a' }
const f = (n: number) => Math.round(n * 10) / 10

// silhouette: a chubby brain seen from the front: two hemispheres made of soft round lobes, a notch at the top and bottom
type Blob = readonly [number, number, number]
const bump = (deg: number, side: 1 | -1): Blob => { const a = (deg * Math.PI) / 180; return [f(100 + side * 43 * Math.cos(a)), f(76 + 38 * Math.sin(a)), 19] }
const BLOBS: Blob[] = [...[-64, -22, 24, 66].flatMap(d => [bump(d, 1), bump(d, -1)]), [100, 76, 40]]
const circles = (extra: number) => BLOBS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${f(r + extra)}"/>`).join('')

function limb(x0: number, y0: number, angle: number, len: number, side: -1 | 1, name: string) {
  const a = (angle * Math.PI) / 180
  const x1 = x0 + side * len * Math.sin(a), y1 = y0 + len * Math.cos(a)
  return `<g class="${name}"><line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${C.edge}" stroke-width="13.5" stroke-linecap="round"/><line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${C.limb}" stroke-width="9.5" stroke-linecap="round"/></g>`
}
function foot(x: number, y: number, dir: number) { return `<ellipse cx="${f(x + dir * 3)}" cy="${f(y + 1)}" rx="9.5" ry="5.6" fill="${C.limb}" stroke="${C.edge}" stroke-width="2.4"/>` }

function legs(kind: Legs) {
  const hipY = 126
  const spec: Record<Legs, [number, number, number, number]> = { // [angleL, lenL, angleR, lenR] — 0 = straight down
    stand: [4, 26, 4, 26], wide: [18, 27, 18, 27], squat: [42, 20, 42, 20], jump: [24, 18, 24, 18], walkA: [-22, 26, 26, 26], walkB: [26, 26, -22, 26],
  }
  const [aL, lL, aR, lR] = spec[kind]
  const draw = (x: number, a: number, l: number, side: -1 | 1) => {
    const ex = x + side * l * Math.sin((a * Math.PI) / 180), ey = hipY + l * Math.cos((a * Math.PI) / 180)
    return limb(x, hipY, a, l, side, 'leg') + foot(ex, ey, side)
  }
  return draw(84, aL, lL, -1) + draw(116, aR, lR, 1)
}

function eyes(kind: Eyes) {
  const L = 80, R = 120, y = 76
  const dot = (x: number, rx: number, ry: number, hx = 1.8, hy = -2.8) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.ink}"/><circle cx="${f(x + hx)}" cy="${f(y + hy)}" r="${f(rx * 0.42)}" fill="${C.white}"/><circle cx="${f(x - hx * 0.9)}" cy="${f(y - hy * 0.9)}" r="${f(rx * 0.2)}" fill="${C.white}" opacity=".85"/>`
  const arc = (x: number, up: boolean) => `<path d="M${f(x - 5.5)} ${y + (up ? 2.5 : -2)} q5.5 ${up ? -8 : 8} 11 0" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round"/>`
  switch (kind) {
    case 'happy': return arc(L, true) + arc(R, true)
    case 'closed': return arc(L, false) + arc(R, false)
    case 'wide': return dot(L, 6.8, 9) + dot(R, 6.8, 9)
    case 'side': return dot(L + 2.4, 5.6, 7.8, 1.2, -2.4) + dot(R + 2.4, 5.6, 7.8, 1.2, -2.4)
    case 'heart': { const h = (x: number) => `<path d="M${x} ${y + 6}c-9-5-9-12-3.6-12 2.2 0 3.6 1.6 3.6 3.2 0-1.6 1.4-3.2 3.6-3.2 5.4 0 5.4 7-3.6 12z" fill="${C.pink}"/>`; return h(L) + h(R) }
    default: return dot(L, 6, 8.2) + dot(R, 6, 8.2)
  }
}
function brows(kind: Brows) {
  if (!kind) return ''
  const s = kind === 'worried' ? -1 : 1
  return `<path d="M${f(72)} ${f(60 + s * 2)} l12 ${f(-s * 4)}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/><path d="M${f(128)} ${f(60 + s * 2)} l-12 ${f(-s * 4)}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`
}
function mouth(kind: Mouth) {
  const cx = 100, y = 89
  switch (kind) {
    case 'grin': return `<path d="M${cx - 9} ${y - 1} q9 14 18 0z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="M${cx - 4} ${y + 6} q4 3 8 0" fill="none" stroke="${C.pink}" stroke-width="2.6" stroke-linecap="round"/>`
    case 'open': return `<ellipse cx="${cx}" cy="${y + 3}" rx="6" ry="7.5" fill="${C.ink}"/><ellipse cx="${cx}" cy="${y + 7}" rx="3.4" ry="2.6" fill="${C.pink}"/>`
    case 'o': return `<ellipse cx="${cx}" cy="${y + 2}" rx="3.6" ry="4.6" fill="${C.ink}"/>`
    case 'flat': return `<path d="M${cx - 6} ${y + 2} h12" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round"/>`
    case 'wavy': return `<path d="M${cx - 8} ${y + 3} q4 -5 8 0 t8 0" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round"/>`
    case 'small': return `<path d="M${cx - 4} ${y + 1} q4 4 8 0" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`
    default: return `<path d="M${cx - 7} ${y} q7 7 14 0" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round"/>`
  }
}
const hand = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="6.4" fill="${C.limb}" stroke="${C.edge}" stroke-width="2.4"/>`
const star = (x: number, y: number, s: number, c = C.gold) => `<path d="M${x} ${y - s} l${f(s * 0.28)} ${f(s * 0.72)} ${f(s * 0.72)} ${f(s * 0.28)} ${f(-s * 0.72)} ${f(s * 0.28)} ${f(-s * 0.28)} ${f(s * 0.72)} ${f(-s * 0.28)} ${f(-s * 0.72)} ${f(-s * 0.72)} ${f(-s * 0.28)} ${f(s * 0.72)} ${f(-s * 0.28)}z" fill="${c}"/>`
function extra(kind: Extra) {
  switch (kind) {
    case 'sparkles': return star(30, 30, 9) + star(172, 40, 7) + star(160, 14, 5, C.pink)
    case 'confetti': return [[28, 26, C.pink], [170, 30, C.blue], [44, 52, C.gold], [158, 58, C.green], [100, 8, C.pink], [20, 78, C.green], [182, 84, C.gold]].map(([x, y, c], i) => `<rect class="cf" x="${x}" y="${y}" width="7" height="${4 + (i % 2) * 3}" rx="1.5" fill="${c}" transform="rotate(${i * 37} ${x} ${y})"/>`).join('')
    case 'bubble': return `<g fill="#fff" opacity=".95"><circle cx="150" cy="22" r="14"/><circle cx="136" cy="14" r="9"/><circle cx="166" cy="16" r="9"/><circle cx="130" cy="42" r="3.6"/><circle cx="124" cy="52" r="2.2"/></g><g fill="${C.ink}"><circle cx="143" cy="23" r="2"/><circle cx="150" cy="23" r="2"/><circle cx="157" cy="23" r="2"/></g>`
    case 'sweat': return `<path d="M158 52 q-7 11 0 15 q7 -4 0 -15z" fill="${C.blue}" stroke="#4aa8ff" stroke-width="1.4"/>`
    case 'zzz': return `<g fill="none" stroke="#9ec9ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M150 36h11l-11 12h11"/><path d="M166 14h8l-8 9h8" opacity=".8"/></g>`
    case 'hearts': return `<g fill="${C.pink}"><path d="M30 40c-8-5-8-12-3-12 2 0 3 1.4 3 3 0-1.6 1-3 3-3 5 0 5 7-3 12z"/><path d="M172 30c-6-4-6-9-2-9 1.6 0 2.4 1 2.4 2.4 0-1.4.8-2.4 2.4-2.4 4 0 4 5-2.4 9z" opacity=".8"/></g>`
    case 'play': return `<path d="M89 103 L89 137 L119 120z" fill="#4a3b66" stroke="#4a3b66" stroke-width="13" stroke-linejoin="round"/><path d="M89 103 L89 137 L119 120z" fill="#fff6e6" stroke="#fff6e6" stroke-width="8" stroke-linejoin="round"/><path d="M95 110 v12" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>${hand(68, 121)}${hand(132, 121)}`
    case 'laptop': return `<rect x="56" y="104" width="88" height="50" rx="8" fill="#343a52" stroke="#1d2133" stroke-width="3"/><circle cx="100" cy="129" r="5" fill="#fff" opacity=".85"/><rect x="50" y="152" width="100" height="6" rx="3" fill="#1d2133"/>${hand(70, 118)}${hand(130, 118)}`
    case 'book': return `<path d="M100 112 q-20-9-42-3 v38 q22-6 42 3z" fill="#fff6e0" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/><path d="M100 112 q20-9 42-3 v38 q-22-6-42 3z" fill="#fffaf0" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/><path d="M66 122 q14-3 28 1 M66 132 q14-3 28 1 M106 123 q14-4 28-1 M106 133 q14-4 28-1" fill="none" stroke="#c9b9a0" stroke-width="2" stroke-linecap="round"/><path d="M54 150 q23-6 46 3 q23-9 46-3" fill="none" stroke="${C.blue}" stroke-width="4" stroke-linecap="round"/>${hand(66, 128)}${hand(134, 128)}`
    case 'cup': return `<path d="M171 109 q-10 1-10 9 q0 8 10 9" fill="none" stroke="${C.ink}" stroke-width="3.4" stroke-linecap="round"/><rect x="170" y="101" width="24" height="28" rx="6" fill="#fff" stroke="${C.ink}" stroke-width="3"/><rect x="170" y="110" width="24" height="7" fill="${C.pink}" opacity=".85"/><path d="M176 95 q-4-6 0-11 M186 95 q-4-6 0-11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>${hand(182, 119)}`
    case 'shades': return `<rect x="66" y="66" width="27" height="17" rx="7" fill="${C.ink}"/><rect x="107" y="66" width="27" height="17" rx="7" fill="${C.ink}"/><path d="M93 72 h14" stroke="${C.ink}" stroke-width="3.6" stroke-linecap="round"/><path d="M66 70 l-8-3 M134 70 l8-3" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/><path d="M71 70 l7 0 M112 70 l7 0" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>`
    case 'laurel': return [-1, 1].map(side => [0, 1, 2, 3, 4, 5].map(i => { const th = (200 + i * 12) * Math.PI / 180, x = 100 + side * 54 * Math.cos(th) * -1, y = 70 + 36 * Math.sin(th); return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="8.5" ry="3.8" fill="${i % 2 ? '#7be0a8' : C.green}" stroke="#2fa56f" stroke-width="1.2" transform="rotate(${f(side * (-62 + i * 14))} ${f(x)} ${f(y)})"/>` }).join('')).join('')
    case 'blanket': return `<path d="M36 108 q16-9 32 0 t32 0 t32 0 t32 0 V158 H36z" fill="#aab4ff" stroke="#7783dd" stroke-width="3" stroke-linejoin="round"/><g fill="#fff" opacity=".9">${star(62, 132, 5, '#fff')}${star(104, 142, 4, '#fff')}${star(140, 128, 5, '#fff')}</g><path d="M36 108 q16-9 32 0 t32 0 t32 0 t32 0" fill="none" stroke="#c9d0ff" stroke-width="3" stroke-linecap="round"/>`
    case 'phone': return `<rect x="86" y="100" width="28" height="44" rx="7" fill="#20243a" stroke="${C.ink}" stroke-width="3"/><rect x="90" y="106" width="20" height="30" rx="3" fill="#6ec1ff" opacity=".85"/><path d="M93 114 h14 M93 120 h10 M93 126 h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>${hand(82, 126)}${hand(118, 126)}`
    case 'headband': return `<path d="M54 52 q46-18 92 0" fill="none" stroke="#ff5d73" stroke-width="9" stroke-linecap="round"/><circle cx="100" cy="42" r="5.2" fill="#fff"/><path d="M146 52 l12 7 M146 52 l10 -6" stroke="#ff5d73" stroke-width="5" stroke-linecap="round"/>`
    case 'partyhat': return `<path d="M100 2 L80 44 H120z" fill="${C.pink}" stroke="#d6537f" stroke-width="2.4" stroke-linejoin="round"/><path d="M92 20 l16 6 M87 32 l26 8" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".85"/><circle cx="100" cy="4" r="5.5" fill="${C.gold}"/>`
    case 'shield': return `<path d="M170 78 l12 4 v12 q0 12 -12 18 q-12 -6 -12 -18 v-12z" fill="${C.green}" stroke="#2fa56f" stroke-width="2"/><path d="M164 94 l4 4 8 -9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  }
}

export function poseSpec(name: PoseName): PoseSpec { return { ...BASE, ...(POSES[name] as Partial<PoseSpec>) } }

/** The mascot as an SVG fragment in a 200×200 box (no <svg> wrapper): for building scenes. */
export function palBody(name: PoseName, outfit?: Outfit): string {
  const p = poseSpec(name)
  const shoulderY = 98
  const arms = limb(44, shoulderY, p.armL, 32, -1, 'arm armL') + limb(156, shoulderY, p.armR, 32, 1, 'arm armR')
  const body = `<g fill="${C.edge}">${circles(2.4)}</g><g fill="${C.body}">${circles(0)}</g>
    <g fill="${C.hi}" opacity=".75"><ellipse cx="76" cy="41" rx="11" ry="5.5" transform="rotate(-28 76 41)"/></g>
    <g fill="none" stroke="${C.fold}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M121 47q10 5 8 16"/><path d="M79 47q-10 5 -8 16"/>
    </g>`
  const face = `<ellipse cx="71" cy="90" rx="7.5" ry="4.8" fill="${C.cheek}" opacity=".7"/><ellipse cx="129" cy="90" rx="7.5" ry="4.8" fill="${C.cheek}" opacity=".7"/>${brows(p.brows)}<g class="eyes">${eyes(p.eyes)}</g>${mouth(p.mouth)}`
  const cx = 100, cy = 100
  const t = `translate(0 ${p.dy}) translate(${cx} ${cy + 20}) rotate(${p.tilt}) scale(${p.scale}) translate(${-cx} ${-(cy + 20)})`
  const worn = outfitLayers(outfit, p.extras)
  return `<g class="pal-fig" transform="${t}">${worn.back}${legs(p.legs)}${arms}${body}${face}${worn.front}</g>${p.extras.map(extra).join('')}`
}

/** A complete <svg> for one pose. `size` in px; omit for 100%. */
export function palSvg(name: PoseName, opts: { size?: number; label?: string; className?: string; outfit?: Outfit } = {}): string {
  const dim = opts.size ? ` width="${opts.size}" height="${opts.size}"` : ''
  const aria = opts.label === '' ? ' aria-hidden="true"' : ` role="img" aria-label="${(opts.label ?? POSE_LABEL[name]).replace(/"/g, '&quot;')}"`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"${dim}${aria} class="${opts.className ?? 'pal-svg'}">${palBody(name, opts.outfit)}</svg>`
}

/** The app icon: Wobbi on a dark rounded-square-ready background (iOS rounds the corners itself, so it is a full-bleed square). 512×512. */
export function iconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><radialGradient id="bg" cx=".5" cy=".46" r=".72"><stop offset="0" stop-color="#2a3347"/><stop offset=".6" stop-color="#171d2b"/><stop offset="1" stop-color="#0d111a"/></radialGradient></defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(26 36) scale(2.3)">${palBody('idle')}</g>
</svg>
`
}

/** An SVG sprite (one <symbol> per pose) for designers / other surfaces. */
export function spriteSymbols(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${POSE_NAMES.map(n => `<symbol id="pal-${n}" viewBox="0 0 200 200">${palBody(n)}</symbol>`).join('')}</svg>`
}
