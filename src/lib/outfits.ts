/** Wobbi's wardrobe: accessories drawn in the mascot's 200×200 box, one per slot. Pure SVG strings so they work in the app, on share cards and in tests. */
export type Slot = 'head' | 'face' | 'neck' | 'back'
export type Outfit = Partial<Record<Slot, string>>
export const SLOTS: Slot[] = ['head', 'face', 'neck', 'back']
export const SLOT_LABEL: Record<Slot, string> = { head: 'Hat', face: 'Face', neck: 'Neck', back: 'Back' }

const INK = '#2a2745'
const f = (n: number) => Math.round(n * 10) / 10
const starPath = (cx: number, cy: number, R: number, r: number) => 'M' + Array.from({ length: 10 }, (_, i) => { const a = (-90 + i * 36) * Math.PI / 180, k = i % 2 ? r : R; return `${f(cx + k * Math.cos(a))} ${f(cy + k * Math.sin(a))}` }).join('L') + 'z'
const heart = (cx: number, cy: number, s: number) => `M${cx} ${f(cy + 10 * s)}c${f(-14 * s)}-${f(9 * s)} ${f(-14 * s)}-${f(20 * s)} ${f(-6 * s)}-${f(20 * s)} ${f(4 * s)} 0 ${f(6 * s)} ${f(3 * s)} ${f(6 * s)} ${f(5 * s)} 0-${f(2 * s)} ${f(2 * s)}-${f(5 * s)} ${f(6 * s)}-${f(5 * s)} ${f(8 * s)} 0 ${f(8 * s)} ${f(11 * s)}-${f(6 * s)} ${f(20 * s)}z`

export interface Accessory { id: string; slot: Slot; name: string; art: string }

const flowers = () => [[62, 46, '#ff8fb1'], [72, 33, '#ffd95a'], [86, 26, '#ffffff'], [100, 24, '#ff8fb1'], [114, 26, '#ffffff'], [128, 33, '#ffd95a'], [138, 46, '#ff8fb1']]
  .map(([x, y, c]) => `<g><circle cx="${x}" cy="${y}" r="7.5" fill="${c}" stroke="#fff" stroke-width="1" opacity=".98"/><circle cx="${x}" cy="${y}" r="2.8" fill="${c === '#ffd95a' ? '#ff8a3d' : '#ffd95a'}"/></g>`).join('')
const leaves = () => [[67, 40], [79, 29], [93, 25], [107, 25], [121, 29], [133, 40]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="3" fill="#5fd39a" transform="rotate(${f((x - 100) * 1.2)} ${x} ${y})"/>`).join('')
const wing = `<path d="M52 92 C14 86 4 50 12 22 C28 32 38 42 42 54 C38 36 42 20 54 8 C62 30 64 62 58 90z" fill="#fff" stroke="#cdd8f0" stroke-width="3" stroke-linejoin="round"/><path d="M30 40 q8 14 10 28 M46 26 q6 18 6 38" fill="none" stroke="#dfe7fb" stroke-width="3" stroke-linecap="round"/>`

export const ACCESSORIES: Accessory[] = [
  { id: 'beanie', slot: 'head', name: 'Cosy beanie', art: `<path d="M60 46 q0 -42 40 -42 q40 0 40 42 q-40 -8 -80 0z" fill="#ff7a8a" stroke="#d6485c" stroke-width="2.4" stroke-linejoin="round"/><path d="M57 44 q43 -9 86 0 v11 q-43 -9 -86 0z" fill="#ffb3bd" stroke="#d6485c" stroke-width="2.4" stroke-linejoin="round"/><circle cx="100" cy="5" r="8.5" fill="#fff" stroke="#e5e9f5" stroke-width="2"/>` },
  { id: 'cap', slot: 'head', name: 'Sporty cap', art: `<path d="M62 46 q0 -36 38 -36 q38 0 38 36z" fill="#4aa8ff" stroke="#2878c8" stroke-width="2.4" stroke-linejoin="round"/><path d="M96 45 q32 -6 60 6 q-6 9 -32 5 q-20 -3 -28 -11z" fill="#2f86e0" stroke="#2878c8" stroke-width="2.4" stroke-linejoin="round"/><circle cx="100" cy="11" r="4" fill="#fff"/>` },
  { id: 'bow', slot: 'head', name: 'Pink bow', art: `<g transform="rotate(-14 72 32)"><path d="M72 32 l-20 -12 v24z M72 32 l20 -12 v24z" fill="#ff8fb1" stroke="#d6537f" stroke-width="2.4" stroke-linejoin="round"/><circle cx="72" cy="32" r="6" fill="#ff5d9e" stroke="#d6537f" stroke-width="2"/></g>` },
  { id: 'flowers', slot: 'head', name: 'Flower crown', art: leaves() + flowers() },
  { id: 'headphones', slot: 'head', name: 'Headphones', art: `<path d="M50 84 q0 -64 50 -64 q50 0 50 64" fill="none" stroke="#343a52" stroke-width="8" stroke-linecap="round"/><rect x="40" y="66" width="18" height="32" rx="8" fill="#ff5d73" stroke="#343a52" stroke-width="3"/><rect x="142" y="66" width="18" height="32" rx="8" fill="#ff5d73" stroke="#343a52" stroke-width="3"/>` },
  { id: 'wizard', slot: 'head', name: 'Wizard hat', art: `<path d="M106 2 Q98 24 62 48 H138 Q108 28 106 2z" fill="#6c4de0" stroke="#4a30b0" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="100" cy="48" rx="50" ry="8" fill="#5b3fd0" stroke="#4a30b0" stroke-width="2.4"/><path d="${starPath(98, 32, 6, 2.6)}" fill="#ffd95a"/><path d="${starPath(116, 42, 4, 1.8)}" fill="#ffd95a"/><path d="${starPath(84, 44, 3.4, 1.6)}" fill="#fff" opacity=".9"/>` },
  { id: 'crown', slot: 'head', name: 'Golden crown', art: `<path d="M64 44 L66 12 L84 28 L100 6 L116 28 L134 12 L136 44z" fill="#ffd95a" stroke="#c78a00" stroke-width="2.8" stroke-linejoin="round"/><path d="M64 38 h72" stroke="#c78a00" stroke-width="2.4"/><circle cx="100" cy="24" r="4.2" fill="#ff5d73"/><circle cx="78" cy="31" r="3" fill="#7cc4ff"/><circle cx="122" cy="31" r="3" fill="#5fd39a"/>` },
  { id: 'halo', slot: 'head', name: 'Halo', art: `<ellipse cx="100" cy="12" rx="32" ry="8.5" fill="none" stroke="#fff3b0" stroke-width="10" opacity=".45"/><ellipse cx="100" cy="12" rx="32" ry="8.5" fill="none" stroke="#ffd95a" stroke-width="5.5"/>` },
  { id: 'glasses', slot: 'face', name: 'Round glasses', art: `<circle cx="80" cy="76" r="13" fill="#fff" fill-opacity=".16" stroke="${INK}" stroke-width="3.2"/><circle cx="120" cy="76" r="13" fill="#fff" fill-opacity=".16" stroke="${INK}" stroke-width="3.2"/><path d="M93 74 q7 -5 14 0 M67 72 l-9 -3 M133 72 l9 -3" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` },
  { id: 'heartshades', slot: 'face', name: 'Heart shades', art: `<path d="${heart(80, 68, 1.05)}" fill="#ff5d9e" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="${heart(120, 68, 1.05)}" fill="#ff5d9e" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M92 72 h16 M68 70 l-9 -2 M132 70 l9 -2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M73 71 l4 -3" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>` },
  { id: 'starshades', slot: 'face', name: 'Star shades', art: `<path d="${starPath(80, 76, 16, 8)}" fill="#ffd95a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="${starPath(120, 76, 16, 8)}" fill="#ffd95a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M92 73 h16 M66 72 l-9 -2 M134 72 l9 -2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` },
  { id: 'scarf', slot: 'neck', name: 'Cosy scarf', art: `<path d="M110 118 l12 28 l-14 3 l-8 -29z" fill="#e34a4a" stroke="#a82e2e" stroke-width="2.4" stroke-linejoin="round"/><path d="M60 110 q40 20 80 0 v14 q-40 20 -80 0z" fill="#ff6b6b" stroke="#a82e2e" stroke-width="2.4" stroke-linejoin="round"/><path d="M78 119 v14 M96 123 v14 M114 121 v14 M130 116 v13" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>` },
  { id: 'bowtie', slot: 'neck', name: 'Bow tie', art: `<path d="M100 120 l-20 -11 v22z M100 120 l20 -11 v22z" fill="#ff5d73" stroke="#c8344b" stroke-width="2.4" stroke-linejoin="round"/><rect x="94" y="113" width="12" height="14" rx="4" fill="#ff8a9b" stroke="#c8344b" stroke-width="2.2"/>` },
  { id: 'medal', slot: 'neck', name: 'Gold medal', art: `<path d="M84 108 L100 132 L116 108" fill="none" stroke="#4aa8ff" stroke-width="8" stroke-linejoin="round"/><circle cx="100" cy="138" r="12" fill="#ffd95a" stroke="#c78a00" stroke-width="3"/><path d="${starPath(100, 138, 6.5, 3)}" fill="#fff3b0" stroke="#c78a00" stroke-width="1.2" stroke-linejoin="round"/>` },
  { id: 'backpack', slot: 'back', name: 'Little backpack', art: `<rect x="128" y="66" width="40" height="52" rx="14" fill="#4aa8ff" stroke="#2878c8" stroke-width="3"/><rect x="136" y="92" width="24" height="18" rx="6" fill="#7cc4ff" stroke="#2878c8" stroke-width="2.4"/><path d="M140 66 q-2 -10 6 -10 q8 0 6 10" fill="none" stroke="#2878c8" stroke-width="3"/>` },
  { id: 'cape', slot: 'back', name: 'Hero cape', art: `<path d="M54 82 q-18 52 -12 86 q58 14 116 0 q6 -34 -12 -86z" fill="#e63950" stroke="#a82038" stroke-width="3" stroke-linejoin="round"/><path d="M66 100 q-8 30 -4 56 M134 100 q8 30 4 56" fill="none" stroke="#ff6b82" stroke-width="3" stroke-linecap="round" opacity=".7"/>` },
  { id: 'wings', slot: 'back', name: 'Angel wings', art: wing + `<g transform="translate(200 0) scale(-1 1)">${wing}</g>` },
]
export const accessoryById = (id: string) => ACCESSORIES.find(a => a.id === id)

/** Which equipped pieces would clash with something the pose already draws (e.g. the Chill pose has its own shades). */
const HEAD_CLASH = new Set(['headband', 'partyhat', 'laurel']), FACE_CLASH = new Set(['shades']), NECK_CLASH = new Set(['blanket'])
export function outfitLayers(outfit: Outfit | undefined, poseExtras: readonly string[] = []): { back: string; front: string } {
  if (!outfit) return { back: '', front: '' }
  let back = '', front = ''
  for (const slot of SLOTS) {
    const acc = outfit[slot] ? accessoryById(outfit[slot]!) : undefined
    if (!acc || acc.slot !== slot) continue
    if (slot === 'head' && poseExtras.some(e => HEAD_CLASH.has(e))) continue
    if (slot === 'face' && poseExtras.some(e => FACE_CLASH.has(e))) continue
    if (slot === 'neck' && poseExtras.some(e => NECK_CLASH.has(e))) continue
    if (slot === 'back') back += `<g class="acc acc-${acc.id}">${acc.art}</g>`
    else front += `<g class="acc acc-${acc.id}">${acc.art}</g>`
  }
  return { back, front }
}

/** Drop unknown ids and pieces in the wrong slot (data from an older or newer app, or from sync). */
export function normalizeOutfit(raw: unknown): Outfit {
  const out: Outfit = {}
  if (!raw || typeof raw !== 'object') return out
  for (const slot of SLOTS) { const id = (raw as Record<string, unknown>)[slot]; if (typeof id === 'string' && accessoryById(id)?.slot === slot) out[slot] = id }
  return out
}
