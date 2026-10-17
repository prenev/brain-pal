/** Wobbi's wardrobe: accessories drawn in the mascot's 200×200 box, one piece per slot. Pure SVG strings so they work in the app, on share cards and in tests. */
export type Slot = 'head' | 'face' | 'neck' | 'back'
export type Outfit = Partial<Record<Slot, string>>
export const SLOTS: Slot[] = ['head', 'face', 'neck', 'back']
export const SLOT_LABEL: Record<Slot, string> = { head: 'Hat', face: 'Face', neck: 'Neck', back: 'Back' }

const f = (n: number) => Math.round(n * 10) / 10
const starPath = (cx: number, cy: number, R: number, r: number, pts = 5) => 'M' + Array.from({ length: pts * 2 }, (_, i) => { const a = (-90 + (i * 180) / pts) * Math.PI / 180, k = i % 2 ? r : R; return `${f(cx + k * Math.cos(a))} ${f(cy + k * Math.sin(a))}` }).join('L') + 'z'
const heart = (cx: number, cy: number, s: number) => `M${cx} ${f(cy + 10 * s)}c${f(-14 * s)}-${f(9 * s)} ${f(-14 * s)}-${f(20 * s)} ${f(-6 * s)}-${f(20 * s)} ${f(4 * s)} 0 ${f(6 * s)} ${f(3 * s)} ${f(6 * s)} ${f(5 * s)} 0-${f(2 * s)} ${f(2 * s)}-${f(5 * s)} ${f(6 * s)}-${f(5 * s)} ${f(8 * s)} 0 ${f(8 * s)} ${f(11 * s)}-${f(6 * s)} ${f(20 * s)}z`
/** Gradient helper: ids are prefixed per piece so several pieces (or several Wobbis on one page) never collide. */
const lg = (id: string, a: string, b: string, c?: string, vertical = true) => `<linearGradient id="wa-${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${a}"/>${c ? `<stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>` : `<stop offset="1" stop-color="${b}"/>`}</linearGradient>`
const rg = (id: string, a: string, b: string) => `<radialGradient id="wa-${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`
const defs = (...x: string[]) => `<defs>${x.join('')}</defs>`
/** Scale a piece about a point (tall hats are drawn big, then eased down so they never touch the top of the picture). */
const fit = (svg: string, k: number, cx = 100, cy = 52) => `<g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">${svg}</g>`
const shine = (d: string, w = 3, o = 0.55) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`
const petals = (cx: number, cy: number, r: number, c: string, mid: string, n = 5) => `<g>${Array.from({ length: n }, (_, i) => { const a = (i * 360) / n - 90, x = cx + r * 0.95 * Math.cos(a * Math.PI / 180), y = cy + r * 0.95 * Math.sin(a * Math.PI / 180); return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.72)}" fill="${c}" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>` }).join('')}<circle cx="${cx}" cy="${cy}" r="${f(r * 0.55)}" fill="${mid}"/></g>`

/** `front` is drawn over Wobbi, `back` behind her. `covers` lists slots this piece makes pointless (a helmet already covers the face). */
export interface Accessory { id: string; slot: Slot; name: string; front?: string; back?: string; covers?: Slot[] }

/* ---------------------------------- HEAD ---------------------------------- */
const beanie = fit(`${defs(lg('bn1', '#ff9aa8', '#ff5d73'), lg('bn2', '#ffd0d6', '#ff9aa8'))}
<path d="M58 50 C54 14 82 0 100 0 C118 0 146 14 142 50 Q100 40 58 50z" fill="url(#wa-bn1)" stroke="#c93b52" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M74 44 Q70 22 82 6 M92 41 Q90 20 96 2 M108 41 Q110 20 104 2 M126 44 Q130 22 118 6" fill="none" stroke="#c93b52" stroke-width="2.4" stroke-linecap="round" opacity=".35"/>
${shine('M70 30 Q74 14 88 7', 4, 0.5)}
<path d="M54 46 Q100 33 146 46 L147 62 Q100 49 53 62z" fill="url(#wa-bn2)" stroke="#c93b52" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M66 50 v10 M78 47 v10 M90 45 v10 M102 45 v10 M114 46 v10 M126 48 v10 M138 51 v9" stroke="#e8707f" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
<g fill="#fff" stroke="#dfe5f5" stroke-width="1.5"><circle cx="100" cy="5" r="9"/><circle cx="92" cy="3" r="6"/><circle cx="108" cy="3" r="6"/><circle cx="100" cy="0" r="6"/></g>`, 0.88)

const cap = `${defs(lg('cp1', '#6cbcff', '#2f86e0'), lg('cp2', '#4aa8ff', '#256fc4'))}
<path d="M60 48 C58 14 82 6 100 6 C118 6 142 14 140 48z" fill="url(#wa-cp1)" stroke="#1f5fa6" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M100 7 Q96 28 98 48 M100 7 Q114 24 122 47 M100 7 Q86 24 78 47" fill="none" stroke="#1f5fa6" stroke-width="2" opacity=".4"/>
<path d="M88 22 l4 -9 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4z" fill="#fff" opacity=".9" transform="translate(8 6) scale(.8)"/>
${shine('M72 30 Q78 16 94 10', 4, 0.5)}
<path d="M96 46 Q132 38 164 54 Q160 66 130 60 Q108 56 96 46z" fill="url(#wa-cp2)" stroke="#1f5fa6" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M112 50 Q134 48 152 56" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".4"/>
<circle cx="100" cy="7" r="4.5" fill="#fff" stroke="#1f5fa6" stroke-width="2"/>`

const bow = `${defs(lg('bw1', '#ffb3d1', '#ff6fa8'))}
<g transform="rotate(-16 70 32)"><path d="M70 32 C54 12 40 18 42 34 C44 48 56 50 70 32z" fill="url(#wa-bw1)" stroke="#d6457f" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M70 32 C86 12 100 18 98 34 C96 48 84 50 70 32z" fill="url(#wa-bw1)" stroke="#d6457f" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M70 34 q-6 14 -16 18 M70 34 q8 14 18 18" fill="none" stroke="#d6457f" stroke-width="2.4" stroke-linecap="round"/>
<path d="M50 28 q4 -6 12 -4 M80 26 q8 -2 12 4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
<circle cx="70" cy="32" r="7" fill="#ff5d9e" stroke="#d6457f" stroke-width="2.2"/><circle cx="68" cy="30" r="2" fill="#fff" opacity=".7"/></g>`

const flowerCrown = (() => {
  const pts: [number, number, string, string][] = [[58, 54, '#ff8fb1', '#ffd95a'], [67, 38, '#fff', '#ff9a3d'], [81, 27, '#c9b8ff', '#ffd95a'], [100, 22, '#ff8fb1', '#ffd95a'], [119, 27, '#fff', '#ff9a3d'], [133, 38, '#c9b8ff', '#ffd95a'], [142, 54, '#ff8fb1', '#ffd95a']]
  const leaves = [[62, 46], [73, 32], [90, 24], [110, 24], [127, 32], [138, 46]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.2" fill="#4cc98a" stroke="#2f9d68" stroke-width="1" transform="rotate(${f((x - 100) * 1.3)} ${x} ${y})"/>`).join('')
  return `<path d="M52 58 Q100 8 148 58" fill="none" stroke="#3aa876" stroke-width="4" stroke-linecap="round"/>${leaves}${pts.map(([x, y, c, m]) => petals(x, y, 6.5, c, m)).join('')}`
})()

const headphones = `${defs(lg('hp1', '#4a5272', '#262b45'), rg('hp2', '#ff8a9b', '#e83a55'))}
<path d="M48 86 C46 22 78 12 100 12 C122 12 154 22 152 86" fill="none" stroke="#1b1f35" stroke-width="12" stroke-linecap="round"/><path d="M48 86 C46 22 78 12 100 12 C122 12 154 22 152 86" fill="none" stroke="url(#wa-hp1)" stroke-width="8" stroke-linecap="round"/>
${shine('M58 54 C62 30 80 20 100 19', 3, 0.35)}
<g><rect x="36" y="64" width="22" height="42" rx="11" fill="#1b1f35"/><rect x="38" y="66" width="18" height="38" rx="9" fill="url(#wa-hp2)"/><ellipse cx="44" cy="76" rx="3" ry="6" fill="#fff" opacity=".45"/><circle cx="47" cy="86" r="5" fill="#b3263c" opacity=".5"/></g>
<g><rect x="142" y="64" width="22" height="42" rx="11" fill="#1b1f35"/><rect x="144" y="66" width="18" height="38" rx="9" fill="url(#wa-hp2)"/><ellipse cx="150" cy="76" rx="3" ry="6" fill="#fff" opacity=".45"/><circle cx="153" cy="86" r="5" fill="#b3263c" opacity=".5"/></g>`

const wizard = fit(`${defs(lg('wz1', '#8a67ff', '#4a30b0'), lg('wz2', '#6c4de0', '#3e2a9a'))}
<path d="M112 -2 Q106 16 92 26 Q76 38 56 52 L144 52 Q118 40 114 22 Q112 10 112 -2z" fill="url(#wa-wz1)" stroke="#33227c" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M104 14 Q122 4 126 20" fill="none" stroke="#33227c" stroke-width="2" opacity=".35"/>
<ellipse cx="100" cy="52" rx="60" ry="10" fill="url(#wa-wz2)" stroke="#33227c" stroke-width="2.6"/><path d="M62 52 Q100 60 138 52" fill="none" stroke="#33227c" stroke-width="2" opacity=".4"/>
<path d="M62 46 Q100 56 138 46 L138 52 Q100 62 62 52z" fill="#ffd95a" stroke="#c78a00" stroke-width="2"/>
<path d="${starPath(98, 34, 7, 3)}" fill="#ffd95a" stroke="#c78a00" stroke-width="1.2" stroke-linejoin="round"/><path d="${starPath(116, 40, 4.5, 2)}" fill="#fff" opacity=".9"/><path d="${starPath(84, 44, 3.6, 1.6)}" fill="#ffd95a"/>
<path d="M118 14 a7 7 0 1 0 6 9 a6 6 0 1 1 -6 -9z" fill="#ffe27a" transform="translate(2 -2) scale(.8)"/>
${shine('M96 24 Q80 36 66 46', 3, 0.35)}`, 0.9)

const crown = `${defs(lg('cr1', '#ffe58a', '#ffb81f', '#d68a00', false), lg('cr2', '#a1272f', '#d8414d'))}
<path d="M60 52 L62 12 L82 30 L100 2 L118 30 L138 12 L140 52 Q100 60 60 52z" fill="url(#wa-cr1)" stroke="#b27200" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M60 44 Q100 52 140 44 L140 52 Q100 60 60 52z" fill="url(#wa-cr2)" stroke="#8a1f27" stroke-width="2"/>
<g stroke="#b27200" stroke-width="1.6"><circle cx="62" cy="11" r="5" fill="#fff6c9"/><circle cx="100" cy="2" r="6" fill="#fff6c9"/><circle cx="138" cy="11" r="5" fill="#fff6c9"/></g>
<ellipse cx="100" cy="30" rx="6" ry="8" fill="#e83a55" stroke="#8a1f27" stroke-width="1.6"/><ellipse cx="82" cy="40" rx="4" ry="5" fill="#4aa8ff" stroke="#256fc4" stroke-width="1.4"/><ellipse cx="118" cy="40" rx="4" ry="5" fill="#4cc98a" stroke="#2f9d68" stroke-width="1.4"/>
${shine('M70 36 L66 20', 3, 0.6)}${shine('M90 26 L98 12', 2.6, 0.5)}`

const halo = `${defs(lg('hl1', '#fff7c2', '#ffd95a'))}
<ellipse cx="100" cy="17" rx="36" ry="9.5" fill="none" stroke="#fff3b0" stroke-width="10" opacity=".35"/><ellipse cx="100" cy="17" rx="36" ry="9.5" fill="none" stroke="#ffd95a" stroke-width="7"/><ellipse cx="100" cy="17" rx="36" ry="9.5" fill="none" stroke="url(#wa-hl1)" stroke-width="4"/>
<path d="M70 14 Q86 8 104 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
<path d="${starPath(62, 8, 5, 1.8, 4)}" fill="#fff6c9"/><path d="${starPath(144, 10, 4, 1.5, 4)}" fill="#fff6c9"/>`

/* ---------------------------------- FACE ---------------------------------- */
const glasses = `${defs(lg('gl1', '#4b4f78', '#2a2745'))}
<g fill="#cfe9ff" fill-opacity=".18" stroke="url(#wa-gl1)" stroke-width="3.6"><circle cx="80" cy="76" r="14"/><circle cx="120" cy="76" r="14"/></g>
<path d="M94 74 q6 -5 12 0 M66 72 l-10 -3 M134 72 l10 -3" fill="none" stroke="#2a2745" stroke-width="3.2" stroke-linecap="round"/>
<path d="M70 70 q5 -6 12 -5 M110 70 q5 -6 12 -5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>`

const heartShades = `${defs(lg('hs1', '#ff8fbd', '#e8366f'))}
<path d="${heart(80, 66, 1.1)}" fill="url(#wa-hs1)" stroke="#2a2745" stroke-width="2.8" stroke-linejoin="round"/><path d="${heart(120, 66, 1.1)}" fill="url(#wa-hs1)" stroke="#2a2745" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M93 72 q7 -5 14 0 M66 70 l-10 -3 M134 70 l10 -3" fill="none" stroke="#2a2745" stroke-width="3.2" stroke-linecap="round"/>
<path d="M70 70 q-2 -6 4 -8 M110 70 q-2 -6 4 -8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>`

const starShades = `${defs(lg('ss1', '#ffe27a', '#ffb81f'))}
<path d="${starPath(80, 77, 17, 8.5)}" fill="url(#wa-ss1)" stroke="#2a2745" stroke-width="2.8" stroke-linejoin="round"/><path d="${starPath(120, 77, 17, 8.5)}" fill="url(#wa-ss1)" stroke="#2a2745" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M95 73 h10 M64 72 l-8 -3 M136 72 l8 -3" fill="none" stroke="#2a2745" stroke-width="3.2" stroke-linecap="round"/><path d="M74 70 l4 -4 M114 70 l4 -4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`

/* ---------------------------------- NECK ---------------------------------- */
const scarf = `${defs(lg('sc1', '#ff8a8a', '#e04a4a'), lg('sc2', '#e86a6a', '#b83232'))}
<path d="M112 116 Q122 134 120 152 L106 154 Q108 138 100 122z" fill="url(#wa-sc2)" stroke="#a82e2e" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M116 118 Q132 130 134 148 L121 150 Q121 134 112 122z" fill="url(#wa-sc1)" stroke="#a82e2e" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M108 134 h10 M110 142 h10 M121 132 h10 M123 140 h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".55"/><path d="M107 152 l1 4 M111 152 l1 4 M115 152 l1 4 M122 149 l1 4 M126 148 l1 4 M130 147 l1 4" stroke="#a82e2e" stroke-width="1.8" stroke-linecap="round"/>
<path d="M56 108 Q100 138 144 108 L146 122 Q100 152 54 122z" fill="url(#wa-sc1)" stroke="#a82e2e" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M70 118 v10 M84 124 v11 M100 128 v11 M116 124 v11 M130 118 v10" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>
${shine('M62 112 Q90 128 120 120', 3, 0.45)}
<ellipse cx="116" cy="121" rx="9" ry="8" fill="url(#wa-sc2)" stroke="#a82e2e" stroke-width="2.4"/>`

const bowtie = `${defs(lg('bt1', '#ff8a9b', '#e8344f'))}
<path d="M100 118 L74 104 Q68 118 74 132z" fill="url(#wa-bt1)" stroke="#a82038" stroke-width="2.6" stroke-linejoin="round"/><path d="M100 118 L126 104 Q132 118 126 132z" fill="url(#wa-bt1)" stroke="#a82038" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M82 112 L94 118 M118 112 L106 118 M82 124 L94 118 M118 124 L106 118" stroke="#a82038" stroke-width="1.8" opacity=".5"/>
<rect x="92" y="109" width="16" height="18" rx="6" fill="#ff6f86" stroke="#a82038" stroke-width="2.4"/><path d="M96 113 q4 -2 8 0" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>`

const medal = `${defs(lg('md1', '#fff0a0', '#ffc21f', '#c78a00', false), lg('md2', '#6cbcff', '#2f86e0'))}
<path d="M80 108 L100 138 L120 108 L112 106 L100 124 L88 106z" fill="url(#wa-md2)" stroke="#1f5fa6" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M92 110 L100 123 L108 110" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>
<circle cx="100" cy="143" r="15" fill="url(#wa-md1)" stroke="#a87000" stroke-width="3"/><circle cx="100" cy="143" r="10.5" fill="none" stroke="#a87000" stroke-width="1.6" opacity=".6"/>
<path d="${starPath(100, 143, 8, 3.6)}" fill="#fff6c9" stroke="#a87000" stroke-width="1.2" stroke-linejoin="round"/>${shine('M90 137 Q94 132 100 131', 2.4, 0.7)}`

/* ---------------------------------- BACK ---------------------------------- */
const backpack = {
  back: `${defs(lg('bp1', '#6cbcff', '#2f86e0'), lg('bp2', '#4aa8ff', '#256fc4'))}
<path d="M84 42 q-2 -16 16 -16 q18 0 16 16" fill="none" stroke="#1f5fa6" stroke-width="5" stroke-linecap="round"/><path d="M84 42 q-2 -16 16 -16 q18 0 16 16" fill="none" stroke="#6cbcff" stroke-width="2.4" stroke-linecap="round"/>
<rect x="40" y="40" width="120" height="92" rx="26" fill="url(#wa-bp1)" stroke="#1f5fa6" stroke-width="3.2"/>
<rect x="148" y="86" width="26" height="40" rx="12" fill="url(#wa-bp2)" stroke="#1f5fa6" stroke-width="3"/><path d="M152 98 h18 M152 108 h18" stroke="#1f5fa6" stroke-width="2" opacity=".5"/>
<rect x="26" y="86" width="26" height="40" rx="12" fill="url(#wa-bp2)" stroke="#1f5fa6" stroke-width="3"/><path d="M30 98 h18 M30 108 h18" stroke="#1f5fa6" stroke-width="2" opacity=".5"/>
<path d="M52 56 q48 -14 96 0" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".4"/><circle cx="100" cy="124" r="4" fill="#ffd95a" stroke="#c78a00" stroke-width="1.4"/>`,
  front: `<path d="M70 94 Q64 108 74 126" fill="none" stroke="#1f5fa6" stroke-width="10" stroke-linecap="round"/><path d="M70 94 Q64 108 74 126" fill="none" stroke="#8fd0ff" stroke-width="6" stroke-linecap="round"/><path d="M69 100 Q66 110 71 120" fill="none" stroke="#fff" stroke-width="1.8" stroke-dasharray="3 4" opacity=".7"/>
<path d="M130 94 Q136 108 126 126" fill="none" stroke="#1f5fa6" stroke-width="10" stroke-linecap="round"/><path d="M130 94 Q136 108 126 126" fill="none" stroke="#8fd0ff" stroke-width="6" stroke-linecap="round"/><path d="M131 100 Q134 110 129 120" fill="none" stroke="#fff" stroke-width="1.8" stroke-dasharray="3 4" opacity=".7"/>
<rect x="68" y="112" width="8" height="10" rx="2" fill="#ffd95a" stroke="#c78a00" stroke-width="1.2"/><rect x="124" y="112" width="8" height="10" rx="2" fill="#ffd95a" stroke="#c78a00" stroke-width="1.2"/>`,
}

const cape = {
  back: `${defs(lg('cv1', '#f0546a', '#b8243d'), lg('cv2', '#ff8a9b', '#e83a55'))}
<path d="M54 84 Q30 120 22 168 Q100 186 178 168 Q170 120 146 84z" fill="url(#wa-cv1)" stroke="#8a1a2e" stroke-width="3" stroke-linejoin="round"/>
<path d="M54 84 Q40 122 36 166 Q60 148 70 126 Q74 106 60 90z" fill="url(#wa-cv2)" opacity=".5"/>
<path d="M62 100 Q52 140 50 172 M100 120 Q100 156 100 178 M138 100 Q148 140 150 172" fill="none" stroke="#8a1a2e" stroke-width="2.4" opacity=".35"/>
<path d="M26 164 Q38 172 52 166 Q66 176 80 170 Q100 180 120 170 Q134 176 148 166 Q162 172 174 164" fill="none" stroke="#ffd95a" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
  front: `<path d="M56 104 Q100 124 144 104 L142 114 Q100 134 58 114z" fill="url(#wa-cv1)" stroke="#8a1a2e" stroke-width="2.6" stroke-linejoin="round"/>
<circle cx="72" cy="114" r="5" fill="#ffd95a" stroke="#c78a00" stroke-width="1.6"/><circle cx="128" cy="114" r="5" fill="#ffd95a" stroke="#c78a00" stroke-width="1.6"/><path d="M77 114 Q100 124 123 114" fill="none" stroke="#ffd95a" stroke-width="2.4"/>
<path d="M68 112 l2 -2" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
}

const wingShape = `<path d="M54 94 C16 90 2 52 12 20 C26 30 36 42 42 56 C36 36 38 18 52 4 C60 28 66 58 62 88z" fill="url(#wa-wg1)" stroke="#bccaee" stroke-width="3" stroke-linejoin="round"/>
<path d="M54 94 C30 92 20 76 18 60 C30 66 44 76 56 90z" fill="url(#wa-wg2)" stroke="#bccaee" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M30 40 q8 14 12 30 M46 22 q6 18 8 38" fill="none" stroke="#c9d6f5" stroke-width="3" stroke-linecap="round"/>`
const wings = { back: `${defs(lg('wg1', '#ffffff', '#dfe7fb'), lg('wg2', '#f4f7ff', '#c9d6f5'))}${wingShape}<g transform="translate(200 0) scale(-1 1)">${wingShape}</g>` }

/* ------------------------------ more head pieces ------------------------------ */
const chef = fit(`${defs(lg('ch1', '#ffffff', '#e6ecf8'))}
<g fill="url(#wa-ch1)" stroke="#bcc8e2" stroke-width="2.6"><circle cx="66" cy="26" r="17"/><circle cx="134" cy="26" r="17"/><circle cx="84" cy="10" r="20"/><circle cx="116" cy="10" r="20"/><circle cx="100" cy="24" r="18"/></g>
<path d="M66 30 a17 17 0 0 0 20 14 M134 30 a17 17 0 0 1 -20 14" fill="none" stroke="#c9d3ea" stroke-width="2" opacity=".7"/>
<path d="M64 36 Q100 44 136 36 L134 62 Q100 70 66 62z" fill="url(#wa-ch1)" stroke="#bcc8e2" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M80 41 v22 M92 43 v22 M104 43 v22 M116 42 v22" stroke="#d3dcef" stroke-width="2.4" stroke-linecap="round"/>
${shine('M60 18 Q66 8 78 8', 3.4, 0.7)}`, 0.74, 100, 60)

const pirate = fit(`${defs(lg('pr1', '#3a3a52', '#14141f'), lg('pr2', '#2a2a40', '#0c0c14'))}
<path d="M62 54 C62 22 80 12 100 12 C120 12 138 22 138 54z" fill="url(#wa-pr1)" stroke="#000" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M34 56 Q44 40 74 44 Q100 36 126 44 Q156 40 166 56 Q150 72 100 62 Q50 72 34 56z" fill="url(#wa-pr2)" stroke="#000" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M38 56 Q50 46 74 49 Q100 42 126 49 Q150 46 162 56" fill="none" stroke="#ffd95a" stroke-width="2.6" stroke-linecap="round"/>
<g transform="translate(100 34)"><circle r="8.5" fill="#fff" stroke="#c9d3ea" stroke-width="1.4"/><ellipse cx="-3.2" cy="-1" rx="2" ry="2.6" fill="#14141f"/><ellipse cx="3.2" cy="-1" rx="2" ry="2.6" fill="#14141f"/><path d="M-1 4 l1 2 l1 -2" fill="none" stroke="#14141f" stroke-width="1.4" stroke-linecap="round"/>
<path d="M-12 12 L12 -10 M12 12 L-12 -10" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".9"/><circle cx="-13" cy="13" r="2.4" fill="#fff"/><circle cx="13" cy="13" r="2.4" fill="#fff"/><circle cx="-13" cy="-11" r="2.4" fill="#fff"/><circle cx="13" cy="-11" r="2.4" fill="#fff"/></g>
${shine('M72 28 Q80 18 94 16', 3, 0.3)}`, 0.92)

const knight = fit(`${defs(lg('kn1', '#eef2f8', '#9aa6bd', '#6f7d98', false), lg('kn2', '#ff8a9b', '#c8243d'))}
<path d="M110 14 C130 4 156 8 168 26 C150 22 134 26 120 34 C122 26 118 20 110 14z" fill="url(#wa-kn2)" stroke="#8a1a2e" stroke-width="2.4" stroke-linejoin="round"/><path d="M120 18 C134 12 150 14 160 22 M122 26 C134 22 148 24 158 28" fill="none" stroke="#ff9aa8" stroke-width="2" opacity=".7"/>
<path d="M56 62 C52 20 78 8 100 8 C122 8 148 20 144 62 Q100 52 56 62z" fill="url(#wa-kn1)" stroke="#56627c" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M100 8 Q96 30 100 56" fill="none" stroke="#56627c" stroke-width="2.4" opacity=".6"/><path d="M60 52 Q100 42 140 52" fill="none" stroke="#56627c" stroke-width="2.4" opacity=".7"/>
<path d="M56 62 Q52 80 58 104 L72 100 Q68 84 70 64z" fill="url(#wa-kn1)" stroke="#56627c" stroke-width="2.8" stroke-linejoin="round"/><path d="M144 62 Q148 80 142 104 L128 100 Q132 84 130 64z" fill="url(#wa-kn1)" stroke="#56627c" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M96 40 h8 v34 q-4 6 -8 0z" fill="url(#wa-kn1)" stroke="#56627c" stroke-width="2.2" stroke-linejoin="round"/>
<g fill="#ffd95a" stroke="#c78a00" stroke-width="1.2"><circle cx="70" cy="50" r="2.6"/><circle cx="130" cy="50" r="2.6"/><circle cx="64" cy="84" r="2.4"/><circle cx="136" cy="84" r="2.4"/></g>
${shine('M66 30 Q74 16 92 12', 3.6, 0.7)}`, 0.88)

const astronaut = { front: `${defs(lg('as1', '#ffffff', '#c9d3ea', '#8f9bb8'), lg('as2', '#cfe9ff', '#7fb8ff'))}
<path d="M34 96 Q100 168 166 96 L168 116 Q100 184 32 116z" fill="url(#wa-as1)" stroke="#6d7a98" stroke-width="3" stroke-linejoin="round"/>
<path d="M40 112 Q100 164 160 112" fill="none" stroke="#6d7a98" stroke-width="2" opacity=".5"/>
<g stroke="#6d7a98" stroke-width="1.6"><circle cx="64" cy="132" r="5.5" fill="#ff5d73"/><circle cx="100" cy="146" r="5.5" fill="#4aa8ff"/><circle cx="136" cy="132" r="5.5" fill="#ffd95a"/></g>
<path d="M44 108 Q100 158 156 108" fill="none" stroke="#4aa8ff" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7" opacity=".8"/>
<ellipse cx="100" cy="76" rx="67" ry="63" fill="#cfe9ff" fill-opacity=".12" stroke="url(#wa-as2)" stroke-width="4.5"/>
<path d="M52 40 Q60 22 82 16" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".75"/><path d="M42 58 Q43 52 46 47" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/><path d="M150 112 Q160 100 163 84" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>
<path d="M142 22 L152 8" stroke="#8f9bb8" stroke-width="3.4" stroke-linecap="round"/><circle cx="153" cy="6" r="4.6" fill="#ff5d73" stroke="#a82038" stroke-width="1.6"/>`, covers: ['face', 'neck'] as Slot[] }

const viking = fit(`${defs(lg('vk1', '#d9a35c', '#8f5a22'), lg('vk2', '#fff8e6', '#d9c9a0'))}
<path d="M64 52 C30 52 20 28 26 2 C34 22 50 30 66 32z" fill="url(#wa-vk2)" stroke="#a89260" stroke-width="2.6" stroke-linejoin="round"/><path d="M30 16 q8 10 18 12 M27 8 q6 8 14 12" fill="none" stroke="#a89260" stroke-width="1.8" opacity=".6"/>
<path d="M136 52 C170 52 180 28 174 2 C166 22 150 30 134 32z" fill="url(#wa-vk2)" stroke="#a89260" stroke-width="2.6" stroke-linejoin="round"/><path d="M170 16 q-8 10 -18 12 M173 8 q-6 8 -14 12" fill="none" stroke="#a89260" stroke-width="1.8" opacity=".6"/>
<path d="M58 56 C56 22 78 12 100 12 C122 12 144 22 142 56 Q100 46 58 56z" fill="url(#wa-vk1)" stroke="#6b3f14" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M56 50 Q100 38 144 50 L144 60 Q100 48 56 60z" fill="#b8c2d6" stroke="#6b7893" stroke-width="2.4" stroke-linejoin="round"/><g fill="#eef2f8" stroke="#6b7893" stroke-width="1"><circle cx="72" cy="50" r="2.4"/><circle cx="86" cy="47" r="2.4"/><circle cx="100" cy="46" r="2.4"/><circle cx="114" cy="47" r="2.4"/><circle cx="128" cy="50" r="2.4"/></g>
<path d="M100 22 l6 10 l-6 10 l-6 -10z" fill="#4aa8ff" stroke="#256fc4" stroke-width="1.8" stroke-linejoin="round"/>${shine('M66 32 Q74 20 92 16', 3.2, 0.5)}`, 0.88, 100, 56)

const topHat = fit(`${defs(lg('tp1', '#3b3b55', '#14141f'))}
<ellipse cx="100" cy="52" rx="52" ry="10.5" fill="url(#wa-tp1)" stroke="#000" stroke-width="2.6"/>
<path d="M72 50 L76 8 Q100 0 124 8 L128 50 Q100 58 72 50z" fill="url(#wa-tp1)" stroke="#000" stroke-width="2.6" stroke-linejoin="round"/><ellipse cx="100" cy="8" rx="24" ry="5.5" fill="#2a2a40" stroke="#000" stroke-width="2.2"/>
<path d="M73 40 Q100 48 127 40 L127 50 Q100 58 73 50z" fill="#a1272f" stroke="#6b1220" stroke-width="2"/><rect x="92" y="41" width="16" height="12" rx="3" fill="none" stroke="#ffd95a" stroke-width="2.6"/>
${shine('M80 14 Q82 30 82 40', 3.4, 0.4)}`, 0.9)

const unicorn = `${defs(lg('uc1', '#fff3b0', '#ffb3e6', '#c9a8ff'), lg('uc2', '#fff', '#ffd0ee'))}
<path d="M62 36 L58 6 L82 26z" fill="url(#wa-uc2)" stroke="#e8a8d4" stroke-width="2.4" stroke-linejoin="round"/><path d="M62 30 L60 14 L74 26z" fill="#ffb3e6" opacity=".7"/>
<path d="M138 36 L142 6 L118 26z" fill="url(#wa-uc2)" stroke="#e8a8d4" stroke-width="2.4" stroke-linejoin="round"/><path d="M138 30 L140 14 L126 26z" fill="#ffb3e6" opacity=".7"/>
<path d="M90 38 L100 -4 L110 38 Q100 42 90 38z" fill="url(#wa-uc1)" stroke="#c78ac4" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M92 32 Q102 28 108 31 M93 24 Q101 20 106 22 M95 16 Q101 13 104 14 M97 8 Q100 6 102 7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
<path d="M60 40 C50 46 46 58 52 70" fill="none" stroke="#ff8fb1" stroke-width="5" stroke-linecap="round"/><path d="M58 38 C46 44 40 58 46 72" fill="none" stroke="#ffd95a" stroke-width="5" stroke-linecap="round"/><path d="M62 42 C54 48 52 58 56 68" fill="none" stroke="#7fe0ee" stroke-width="5" stroke-linecap="round"/><path d="M55 36 C41 42 34 58 40 74" fill="none" stroke="#c9a8ff" stroke-width="5" stroke-linecap="round"/>
<path d="${starPath(112, 6, 5, 2, 4)}" fill="#fff" opacity=".9"/><path d="${starPath(80, 12, 3.4, 1.4, 4)}" fill="#fff" opacity=".8"/>`

const catEars = `${defs(lg('ce1', '#e8e2ff', '#bba8fb'))}
<path d="M54 56 L52 12 L92 38z" fill="url(#wa-ce1)" stroke="#8c78d8" stroke-width="2.8" stroke-linejoin="round"/><path d="M60 46 L59 24 L80 38z" fill="#ffb3d1"/>
<path d="M146 56 L148 12 L108 38z" fill="url(#wa-ce1)" stroke="#8c78d8" stroke-width="2.8" stroke-linejoin="round"/><path d="M140 46 L141 24 L120 38z" fill="#ffb3d1"/>
${shine('M58 36 L57 22', 3, 0.6)}${shine('M142 36 L143 22', 3, 0.6)}`

/* ------------------------------ more face pieces ------------------------------ */
const monocle = `${defs(lg('mo1', '#fff0a0', '#c78a00', '#ffd95a', false))}
<circle cx="120" cy="76" r="15.5" fill="#cfe9ff" fill-opacity=".16" stroke="url(#wa-mo1)" stroke-width="4"/><circle cx="120" cy="76" r="12" fill="none" stroke="#a87000" stroke-width="1" opacity=".5"/>
<path d="M112 69 q5 -6 12 -5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
<path d="M134 84 Q150 96 146 116 Q144 130 152 140" fill="none" stroke="#c78a00" stroke-width="2" stroke-dasharray="3 2.5" stroke-linecap="round"/><circle cx="152" cy="142" r="3.4" fill="#ffd95a" stroke="#c78a00" stroke-width="1.4"/>`

const eyepatch = `${defs(lg('ep1', '#3a3a52', '#14141f'))}
<path d="M62 62 L44 46 M96 62 Q128 34 156 50" fill="none" stroke="#14141f" stroke-width="3.4" stroke-linecap="round"/>
<path d="M80 62 C66 60 62 78 68 88 C76 96 94 92 96 78 C98 68 92 62 80 62z" fill="url(#wa-ep1)" stroke="#000" stroke-width="2.4" stroke-linejoin="round"/><path d="M72 70 q4 -5 12 -4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".35"/>
<path d="M76 74 l8 8 M84 74 l-8 8" stroke="#ffd95a" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`

const vr = `${defs(lg('vr1', '#5b6190', '#262b45'), lg('vr2', '#0f1530', '#1c2a5a'))}
<path d="M54 76 Q36 74 34 90 M146 76 Q164 74 166 90" fill="none" stroke="#1b1f35" stroke-width="9" stroke-linecap="round"/><path d="M54 76 Q36 74 34 90 M146 76 Q164 74 166 90" fill="none" stroke="#4a5272" stroke-width="5" stroke-linecap="round"/>
<rect x="50" y="58" width="100" height="40" rx="17" fill="url(#wa-vr1)" stroke="#12162a" stroke-width="3"/>
<rect x="56" y="64" width="88" height="28" rx="12" fill="url(#wa-vr2)" stroke="#3de0ff" stroke-width="1.6" stroke-opacity=".7"/>
<g fill="#eaffff"><rect x="70" y="70" width="16" height="16" rx="8"/><rect x="114" y="70" width="16" height="16" rx="8"/></g><g fill="#0f1530"><circle cx="79" cy="78" r="4.4"/><circle cx="123" cy="78" r="4.4"/></g><g fill="#fff"><circle cx="81" cy="76" r="1.6"/><circle cx="125" cy="76" r="1.6"/></g>
<path d="M92 94 q8 4 16 0" fill="none" stroke="#12162a" stroke-width="2.4" opacity=".6"/><path d="M60 68 q20 -6 40 -4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".25"/>
<circle cx="64" cy="58" r="2.6" fill="#3de0ff"/><circle cx="136" cy="58" r="2.6" fill="#ff5db1"/>`

const glasses3d = `<path d="M58 72 L46 66 M142 72 L154 66" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M58 72 L46 66 M142 72 L154 66" fill="none" stroke="#2a2745" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
<rect x="62" y="62" width="76" height="30" rx="8" fill="#fff" stroke="#2a2745" stroke-width="2.6"/>
<rect x="67" y="67" width="27" height="20" rx="5" fill="#ff4d5e" stroke="#2a2745" stroke-width="1.8"/><rect x="106" y="67" width="27" height="20" rx="5" fill="#2fd6ff" stroke="#2a2745" stroke-width="1.8"/>
<path d="M72 71 l6 0 M111 71 l6 0" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/><path d="M94 76 h12" stroke="#2a2745" stroke-width="2.4"/>
<path d="M62 66 l5 5 M138 66 l-5 5" stroke="#c9d3ea" stroke-width="1.6" opacity=".6"/>`

const mustache = `${defs(lg('mu1', '#7a4a2a', '#3d2412'))}
<path d="M100 83 C94 79 84 80 78 85 C74 88 70 86 66 80 C68 92 80 96 92 91 Q100 88 100 88 Q100 88 108 91 C120 96 132 92 134 80 C130 86 126 88 122 85 C116 80 106 79 100 83z" fill="url(#wa-mu1)" stroke="#2a170b" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M82 86 q8 -2 14 1 M118 86 q-8 -2 -14 1" fill="none" stroke="#9a6a44" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`

/* ------------------------------ more neck pieces ------------------------------ */
const necktie = `${defs(lg('nt1', '#4aa8ff', '#1f5fa6'))}
<path d="M91 111 L109 111 L105 123 L95 123z" fill="url(#wa-nt1)" stroke="#143f73" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M95 123 L105 123 L115 150 L100 162 L85 150z" fill="url(#wa-nt1)" stroke="#143f73" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M94 128 L108 134 M92 138 L110 144 M97 121 L103 123" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>${shine('M95 126 L91 144', 2, 0.4)}`

const bandana = `${defs(lg('bd1', '#ff7a8a', '#d8283f'))}
<path d="M58 106 Q100 126 142 106 L138 118 Q100 156 62 118z" fill="url(#wa-bd1)" stroke="#8a1a2e" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M62 118 Q100 156 138 118" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="3 5" stroke-linecap="round" opacity=".7"/>
<g fill="#fff" opacity=".85"><circle cx="86" cy="122" r="2.6"/><circle cx="100" cy="132" r="3"/><circle cx="114" cy="122" r="2.6"/><circle cx="100" cy="118" r="2"/><circle cx="76" cy="114" r="2"/><circle cx="124" cy="114" r="2"/></g>
<path d="M130 108 l16 -8 l-4 16z" fill="url(#wa-bd1)" stroke="#8a1a2e" stroke-width="2.2" stroke-linejoin="round"/><circle cx="132" cy="110" r="4.6" fill="#e83a55" stroke="#8a1a2e" stroke-width="2"/>`

const pearls = (() => {
  const dots = Array.from({ length: 13 }, (_, i) => { const t = i / 12, x = 60 + t * 80, y = 106 + Math.sin(t * Math.PI) * 24; return `<circle cx="${f(x)}" cy="${f(y)}" r="4.8" fill="url(#wa-pe1)" stroke="#c9b9d6" stroke-width="1"/>` }).join('')
  return `${defs(rg('pe1', '#ffffff', '#e2d6f0'))}<path d="M60 106 Q100 144 140 106" fill="none" stroke="#c9b9d6" stroke-width="1.6"/>${dots}
<path d="M100 130 l8 8 l-8 14 l-8 -14z" fill="#ff8fbd" stroke="#d6457f" stroke-width="2" stroke-linejoin="round"/><path d="M96 138 l4 -3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`
})()

const ruff = (() => {
  const ring = (n: number, rx: number, ry: number, cy: number, r: number, fill: string) => Array.from({ length: n }, (_, i) => { const t = Math.PI * (0.04 + (i / (n - 1)) * 0.92), x = 100 - Math.cos(t) * rx, y = cy + Math.sin(t) * ry; return `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${fill}" stroke="#a9b7d6" stroke-width="1.8"/>` }).join('')
  return `${defs(lg('rf1', '#ffffff', '#dbe3f5'))}${ring(15, 56, 20, 102, 11, 'url(#wa-rf1)')}${ring(13, 46, 15, 104, 9, '#f4f7ff')}
<path d="M54 106 Q100 134 146 106" fill="none" stroke="#c9d3ea" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/><path d="M68 112 Q100 128 132 112" fill="none" stroke="#ffd95a" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="123" r="4.4" fill="#e83a55" stroke="#8a1a2e" stroke-width="1.6"/>`
})()

const lei = (() => {
  const cols: [string, string][] = [['#ff8fb1', '#ffd95a'], ['#ffa63d', '#fff3b0'], ['#fff', '#ff8fb1'], ['#c9a8ff', '#ffd95a']]
  const flowers = Array.from({ length: 9 }, (_, i) => { const t = i / 8, x = 56 + t * 88, y = 106 + Math.sin(t * Math.PI) * 26, [c, m] = cols[i % cols.length]; return petals(f(x), f(y), 7, c, m) }).join('')
  const leaves = Array.from({ length: 8 }, (_, i) => { const t = (i + 0.5) / 8, x = 56 + t * 88, y = 106 + Math.sin(t * Math.PI) * 26; return `<ellipse cx="${f(x)}" cy="${f(y + 3)}" rx="7" ry="3" fill="#4cc98a" stroke="#2f9d68" stroke-width="1" transform="rotate(${f((t - 0.5) * 80)} ${f(x)} ${f(y + 3)})"/>` }).join('')
  return `<path d="M56 106 Q100 156 144 106" fill="none" stroke="#3aa876" stroke-width="3.4"/>${leaves}${flowers}`
})()

/* ------------------------------ more back pieces ------------------------------ */
const jetpack = {
  back: `${defs(lg('jp1', '#e8eef8', '#8f9bb8'), lg('jp2', '#ff5d73', '#b8243d'), lg('jp3', '#fff3b0', '#ffa63d', '#ff5d3d'))}
<g><path d="M30 134 Q24 166 14 176 Q30 160 34 148 Q40 164 36 182 Q50 164 50 134z" fill="url(#wa-jp3)" opacity=".95"/><path d="M36 140 Q32 160 28 168 Q40 156 42 142z" fill="#fff6c9" opacity=".85"/></g>
<g><path d="M170 134 Q176 166 186 176 Q170 160 166 148 Q160 164 164 182 Q150 164 150 134z" fill="url(#wa-jp3)" opacity=".95"/><path d="M164 140 Q168 160 172 168 Q160 156 158 142z" fill="#fff6c9" opacity=".85"/></g>
<rect x="24" y="62" width="34" height="74" rx="16" fill="url(#wa-jp1)" stroke="#6d7a98" stroke-width="3"/><rect x="142" y="62" width="34" height="74" rx="16" fill="url(#wa-jp1)" stroke="#6d7a98" stroke-width="3"/>
<path d="M24 80 Q41 70 58 80 L58 92 Q41 82 24 92z" fill="url(#wa-jp2)" stroke="#8a1a2e" stroke-width="2.4"/><path d="M142 80 Q159 70 176 80 L176 92 Q159 82 142 92z" fill="url(#wa-jp2)" stroke="#8a1a2e" stroke-width="2.4"/>
<path d="M30 104 v22 M152 104 v22" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".6"/><circle cx="41" cy="140" r="7" fill="#4a5272" stroke="#262b45" stroke-width="2.4"/><circle cx="159" cy="140" r="7" fill="#4a5272" stroke="#262b45" stroke-width="2.4"/>
<path d="M56 96 L144 96" stroke="#6d7a98" stroke-width="8" stroke-linecap="round"/><path d="M56 96 L144 96" stroke="#c9d3ea" stroke-width="4" stroke-linecap="round"/>`,
  front: `<path d="M62 92 Q60 108 66 124" fill="none" stroke="#262b45" stroke-width="7" stroke-linecap="round"/><path d="M138 92 Q140 108 134 124" fill="none" stroke="#262b45" stroke-width="7" stroke-linecap="round"/>`,
}

const butterfly = (() => {
  const wing = `<path d="M56 92 C26 98 2 74 6 36 C8 12 34 6 46 28 C52 40 56 66 58 88z" fill="url(#wa-bf1)" stroke="#6b3fb0" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M56 96 C34 98 12 116 18 140 C24 158 46 152 54 130 C58 118 58 106 56 96z" fill="url(#wa-bf2)" stroke="#6b3fb0" stroke-width="2.8" stroke-linejoin="round"/>
<path d="M56 90 C40 72 26 52 18 34 M56 94 C36 84 20 70 10 52 M56 98 C40 108 30 124 26 142" fill="none" stroke="#6b3fb0" stroke-width="2" stroke-linecap="round" opacity=".5"/>
<g fill="#fff" opacity=".9"><circle cx="20" cy="30" r="4.4"/><circle cx="14" cy="46" r="3"/><circle cx="32" cy="22" r="3"/><circle cx="26" cy="140" r="3.4"/></g><path d="M16 56 Q24 64 34 62" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>`
  return { back: `${defs(lg('bf1', '#ffd0f0', '#b58cff', '#7b5ce0'), lg('bf2', '#ffe3a8', '#ff9ad0', '#b58cff'))}${wing}<g transform="translate(200 0) scale(-1 1)">${wing}</g>` }
})()

const balloons = {
  back: `${defs(rg('bl1', '#ff9aa8', '#d8283f'), rg('bl2', '#fff0a0', '#e8a31f'), rg('bl3', '#9bd2ff', '#2f86e0'))}
<path d="M152 108 Q158 80 170 60 M152 108 Q150 70 150 38 M152 108 Q174 84 184 52" fill="none" stroke="#c9d3ea" stroke-width="1.8"/>
<g><ellipse cx="170" cy="46" rx="14" ry="17" fill="url(#wa-bl1)" stroke="#8a1a2e" stroke-width="2"/><path d="M170 63 l-3 5 h6z" fill="#d8283f"/><ellipse cx="164" cy="38" rx="3" ry="5" fill="#fff" opacity=".6"/></g>
<g><ellipse cx="150" cy="22" rx="14" ry="17" fill="url(#wa-bl2)" stroke="#a87000" stroke-width="2"/><path d="M150 39 l-3 5 h6z" fill="#e8a31f"/><ellipse cx="144" cy="14" rx="3" ry="5" fill="#fff" opacity=".6"/></g>
<g><ellipse cx="184" cy="34" rx="13" ry="16" fill="url(#wa-bl3)" stroke="#1f5fa6" stroke-width="2"/><path d="M184 50 l-3 5 h6z" fill="#2f86e0"/><ellipse cx="179" cy="27" rx="3" ry="4.6" fill="#fff" opacity=".6"/></g>`,
}

const guitar = {
  back: `${defs(lg('gt1', '#e8a057', '#a85f1f'), lg('gt2', '#7a4a2a', '#3d2412'))}
<g transform="translate(-14 6) rotate(28 150 100) translate(150 100) scale(.88) translate(-150 -100)"><rect x="143" y="-22" width="14" height="86" rx="3" fill="url(#wa-gt2)" stroke="#2a170b" stroke-width="2"/><path d="M141 -26 h18 l2 14 h-22z" fill="url(#wa-gt2)" stroke="#2a170b" stroke-width="2" stroke-linejoin="round"/><g fill="#ffd95a" stroke="#c78a00" stroke-width="1"><circle cx="139" cy="-20" r="2.4"/><circle cx="139" cy="-12" r="2.4"/><circle cx="161" cy="-20" r="2.4"/><circle cx="161" cy="-12" r="2.4"/></g>
<path d="M146 -6 v70 M150 -6 v70 M154 -6 v70" stroke="#e8dcc4" stroke-width="1" opacity=".7"/>
<path d="M150 56 C118 56 112 82 124 94 C110 104 112 142 150 144 C188 142 190 104 176 94 C188 82 182 56 150 56z" fill="url(#wa-gt1)" stroke="#6b3a12" stroke-width="3" stroke-linejoin="round"/><circle cx="150" cy="98" r="11" fill="#2a170b" stroke="#6b3a12" stroke-width="2.6"/><circle cx="150" cy="98" r="14" fill="none" stroke="#ffd95a" stroke-width="1.6" opacity=".7"/><rect x="134" y="120" width="32" height="6" rx="3" fill="#3d2412"/></g>`,
  front: `<path d="M70 90 Q96 100 132 126" fill="none" stroke="#7a1f2e" stroke-width="8" stroke-linecap="round"/><path d="M70 90 Q96 100 132 126" fill="none" stroke="#e0485f" stroke-width="5" stroke-linecap="round"/><path d="M74 91 Q98 101 128 123" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="2 4" opacity=".7"/><rect x="82" y="94" width="8" height="9" rx="2" fill="#ffd95a" stroke="#c78a00" stroke-width="1.2" transform="rotate(14 86 98)"/>`,
}

export const ACCESSORIES: Accessory[] = [
  { id: 'beanie', slot: 'head', name: 'Cosy beanie', front: beanie },
  { id: 'cap', slot: 'head', name: 'Sporty cap', front: cap },
  { id: 'bow', slot: 'head', name: 'Pink bow', front: bow },
  { id: 'flowers', slot: 'head', name: 'Flower crown', front: flowerCrown },
  { id: 'headphones', slot: 'head', name: 'Headphones', front: headphones },
  { id: 'wizard', slot: 'head', name: 'Wizard hat', front: wizard },
  { id: 'crown', slot: 'head', name: 'Golden crown', front: crown },
  { id: 'halo', slot: 'head', name: 'Halo', front: halo },
  { id: 'chef', slot: 'head', name: 'Chef’s toque', front: chef },
  { id: 'pirate', slot: 'head', name: 'Pirate hat', front: pirate },
  { id: 'knight', slot: 'head', name: 'Knight’s helm', front: knight },
  { id: 'astronaut', slot: 'head', name: 'Space helmet', ...astronaut },
  { id: 'viking', slot: 'head', name: 'Viking helm', front: viking },
  { id: 'tophat', slot: 'head', name: 'Top hat', front: topHat },
  { id: 'unicorn', slot: 'head', name: 'Unicorn horn', front: unicorn },
  { id: 'catears', slot: 'head', name: 'Cat ears', front: catEars },
  { id: 'glasses', slot: 'face', name: 'Round glasses', front: glasses },
  { id: 'heartshades', slot: 'face', name: 'Heart shades', front: heartShades },
  { id: 'starshades', slot: 'face', name: 'Star shades', front: starShades },
  { id: 'monocle', slot: 'face', name: 'Monocle', front: monocle },
  { id: 'eyepatch', slot: 'face', name: 'Eye patch', front: eyepatch },
  { id: 'vr', slot: 'face', name: 'VR headset', front: vr },
  { id: '3d', slot: 'face', name: '3D glasses', front: glasses3d },
  { id: 'mustache', slot: 'face', name: 'Handlebar tache', front: mustache },
  { id: 'scarf', slot: 'neck', name: 'Cosy scarf', front: scarf },
  { id: 'bowtie', slot: 'neck', name: 'Bow tie', front: bowtie },
  { id: 'medal', slot: 'neck', name: 'Gold medal', front: medal },
  { id: 'necktie', slot: 'neck', name: 'Necktie', front: necktie },
  { id: 'bandana', slot: 'neck', name: 'Bandana', front: bandana },
  { id: 'pearls', slot: 'neck', name: 'Pearl necklace', front: pearls },
  { id: 'ruff', slot: 'neck', name: 'Royal ruff', front: ruff },
  { id: 'lei', slot: 'neck', name: 'Flower lei', front: lei },
  { id: 'backpack', slot: 'back', name: 'Little backpack', ...backpack },
  { id: 'cape', slot: 'back', name: 'Hero cape', ...cape },
  { id: 'wings', slot: 'back', name: 'Angel wings', ...wings },
  { id: 'jetpack', slot: 'back', name: 'Jetpack', ...jetpack },
  { id: 'butterfly', slot: 'back', name: 'Butterfly wings', ...butterfly },
  { id: 'balloons', slot: 'back', name: 'Balloons', ...balloons },
  { id: 'guitar', slot: 'back', name: 'Guitar', ...guitar },
]
export const accessoryById = (id: string) => ACCESSORIES.find(a => a.id === id)

/** Which equipped pieces would clash with something the pose already draws (e.g. the Chill pose has its own shades). */
const HEAD_CLASH = new Set(['headband', 'partyhat', 'laurel']), FACE_CLASH = new Set(['shades']), NECK_CLASH = new Set(['blanket'])
export function outfitLayers(outfit: Outfit | undefined, poseExtras: readonly string[] = []): { back: string; front: string } {
  if (!outfit) return { back: '', front: '' }
  const worn = SLOTS.map(slot => (outfit[slot] ? accessoryById(outfit[slot]!) : undefined)).filter((a): a is Accessory => !!a && outfit[a.slot] === a.id)
  const covered = new Set<Slot>(worn.flatMap(a => (a.slot === 'head' && poseExtras.some(e => HEAD_CLASH.has(e)) ? [] : a.covers ?? [])))
  let back = '', front = ''
  for (const a of worn) {
    if (covered.has(a.slot)) continue
    if (a.slot === 'head' && poseExtras.some(e => HEAD_CLASH.has(e))) continue
    if (a.slot === 'face' && poseExtras.some(e => FACE_CLASH.has(e))) continue
    if (a.slot === 'neck' && poseExtras.some(e => NECK_CLASH.has(e))) continue
    if (a.back) back += `<g class="acc acc-${a.id}">${a.back}</g>`
    if (a.front) front += `<g class="acc acc-${a.id}">${a.front}</g>`
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

/** Complete looks (used for the lookbook sheet). */
export interface Look { id: string; name: string; pose: import('./pal.ts').PoseName; outfit: Outfit }
export const LOOKS: Look[] = [
  { id: 'cosy', name: 'Cosy day', pose: 'idle', outfit: { head: 'beanie', neck: 'scarf', back: 'backpack' } },
  { id: 'royal', name: 'Royal', pose: 'cheer', outfit: { head: 'crown', neck: 'ruff', back: 'cape' } },
  { id: 'wizard', name: 'Wizard', pose: 'think', outfit: { head: 'wizard', face: 'glasses', neck: 'bowtie' } },
  { id: 'angel', name: 'Angel', pose: 'love', outfit: { head: 'halo', face: 'heartshades', back: 'wings' } },
  { id: 'astronaut', name: 'Astronaut', pose: 'cheer', outfit: { head: 'astronaut', back: 'jetpack' } },
  { id: 'pirate', name: 'Pirate', pose: 'flex', outfit: { head: 'pirate', face: 'eyepatch', neck: 'bandana', back: 'cape' } },
  { id: 'knight', name: 'Knight', pose: 'champ', outfit: { head: 'knight', neck: 'medal', back: 'cape' } },
  { id: 'chef', name: 'Chef', pose: 'coffee', outfit: { head: 'chef', face: 'mustache', neck: 'necktie' } },
  { id: 'fairy', name: 'Fairy', pose: 'wave', outfit: { head: 'unicorn', neck: 'pearls', back: 'butterfly' } },
  { id: 'rocker', name: 'Rock star', pose: 'hype', outfit: { head: 'headphones', face: '3d', neck: 'bandana', back: 'guitar' } },
  { id: 'party', name: 'Party', pose: 'cheer', outfit: { head: 'tophat', face: 'monocle', neck: 'bowtie', back: 'balloons' } },
  { id: 'viking', name: 'Viking', pose: 'flex', outfit: { head: 'viking', neck: 'lei', back: 'backpack' } },
]
