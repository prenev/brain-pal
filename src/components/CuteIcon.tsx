/** Small hand-drawn icons for the Home tools, in Wobbi's style (ink outline, rosy cheeks, eyes that blink). Decorative. */
const INK = '#2a2745', CHEEK = '#ff9ec0'

const eyes = (lx: number, rx: number, y: number) => (
  <g className="eyes"><ellipse cx={lx} cy={y} rx="1.9" ry="2.3" fill={INK} /><ellipse cx={rx} cy={y} rx="1.9" ry="2.3" fill={INK} /><circle cx={lx + .7} cy={y - .9} r=".7" fill="#fff" /><circle cx={rx + .7} cy={y - .9} r=".7" fill="#fff" /></g>
)
const cheeks = (lx: number, rx: number, y: number) => <><ellipse cx={lx} cy={y} rx="2.4" ry="1.5" fill={CHEEK} opacity=".8" /><ellipse cx={rx} cy={y} rx="2.4" ry="1.5" fill={CHEEK} opacity=".8" /></>
const smile = (cx: number, y: number) => <path d={`M${cx - 2.6} ${y} q2.6 2.6 5.2 0`} fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />

/** A jar with a lid: worries go in and wait. */
function Jar() {
  return (
    <>
      <rect x="11" y="9" width="26" height="6" rx="2.5" fill="#a78bfa" stroke={INK} strokeWidth="2" />
      <path d="M13 15h22v2c3 2 4 5 4 9v10c0 4-3 6-7 6H16c-4 0-7-2-7-6V26c0-4 1-7 4-9z" fill="#cfe9ff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M13.5 22c-1 2-1.2 5-1.2 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".9" />
      <path d="M27 36.5c-1.6 0-2.6-1-2.6-2.2 0-1 .8-1.9 1.9-2 .3-1.5 1.5-2.4 3-2.4 1.6 0 2.8 1.1 3 2.6 1 .2 1.7 1 1.7 1.9 0 1.2-1 2.1-2.4 2.1z" fill="#fff" stroke="#9fb4d8" strokeWidth="1.2" />
      {eyes(19.5, 27.5, 26)}{cheeks(16.6, 30.4, 29.6)}{smile(23.5, 29.2)}
    </>
  )
}

/** A sleepy crescent moon with a little z. */
function Moon() {
  return (
    <>
      <path d="M20.71 10.05A16 16 0 1 0 37.69 29.15A13 13 0 0 1 20.71 10.05Z" fill="#ffd95a" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M11.5 22.5c-.6 3-.2 6 1.2 8.6" stroke="#fff3b8" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M13.2 29.4q1.7 1.5 3.4 0M19.2 31.6q1.7 1.5 3.4 0" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
      <ellipse cx="13" cy="33.2" rx="2.1" ry="1.3" fill={CHEEK} opacity=".85" /><ellipse cx="23.4" cy="35.6" rx="2.1" ry="1.3" fill={CHEEK} opacity=".85" />
      <path d="M16.6 35.4q1.4 1.1 2.8 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M33 6h5l-5 5h5M39.5 13h3.4l-3.4 3.4h3.4" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

/** A sprout in a pot: back to the ground you're standing on. */
function Sprout() {
  return (
    <>
      <path d="M24 24c0-5 0-8 .2-11" stroke="#2fa56f" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M24 16c-2-5.5-7.5-7.5-12-6.5 0 5 4.5 8.5 12 6.5z" fill="#5fd39a" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M24.3 13.5c1.8-5 7-7 11.5-6 0 4.8-4.3 8-11.5 6z" fill="#7ee0ad" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 23h28l-2.6 15.5c-.4 2.3-2.2 3.5-4.5 3.5H17.1c-2.3 0-4.1-1.2-4.5-3.5z" fill="#ff9b5a" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="8.5" y="21" width="31" height="5.5" rx="2.5" fill="#ffb37d" stroke={INK} strokeWidth="2" />
      {eyes(19.5, 28.5, 32)}{cheeks(16.4, 31.6, 35.4)}{smile(24, 35)}
    </>
  )
}

const ART = { worry: Jar, sleep: Moon, ground: Sprout }
export type CuteName = keyof typeof ART

export default function CuteIcon({ name, size = 44 }: { name: CuteName; size?: number }) {
  const Art = ART[name]
  return <svg className="cute-icon" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true"><Art /></svg>
}
