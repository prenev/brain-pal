import type { ReactElement } from 'react'

/** Feelings drawn as things that feel like them (a tangle, a rain cloud, a low battery), never as faces. Wobbi's style: ink outline, soft fills. */
const INK = '#2a2745'
const sw = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const line = { ...sw, fill: 'none' }

const ART: Record<string, () => ReactElement> = {
  happy: () => <>{Array.from({ length: 8 }, (_, i) => { const a = (i * 45) * Math.PI / 180; return <line key={i} x1={24 + 13 * Math.cos(a)} y1={24 + 13 * Math.sin(a)} x2={24 + 19 * Math.cos(a)} y2={24 + 19 * Math.sin(a)} stroke="#ffb020" strokeWidth="3.2" strokeLinecap="round" /> })}<circle cx="24" cy="24" r="10" fill="#ffd95a" {...sw} /><circle cx="20.5" cy="20.5" r="3" fill="#fff3b8" /></>,
  excited: () => <><path d="M24 6l4.6 10.4L40 18l-8.6 7.6L34 37l-10-6-10 6 2.6-11.4L8 18l11.4-1.6z" fill="#ffd95a" {...sw} /><path d="M40 5v6M37 8h6M8 34v5M5.5 36.5h5" stroke="#ff8fb1" strokeWidth="2.4" strokeLinecap="round" /><circle cx="41" cy="40" r="2.2" fill="#7cc4ff" /></>,
  grateful: () => <><path d="M24 30c-7-4.6-11-8.4-11-13a5.6 5.6 0 0 1 11-1.4A5.6 5.6 0 0 1 35 17c0 4.6-4 8.4-11 13z" fill="#ff8fb1" {...sw} /><path d="M6 31c4 0 6 1.5 9 4h10c2 0 2 3 0 3h-7M6 31v11h3c6 3 14 3 22-2l9-6c2-1.4.6-4-1.6-3l-8 4" fill="#c8b8ff" {...sw} /><circle cx="19.5" cy="15" r="1.8" fill="#fff" /></>,
  relaxed: () => <><path d="M6 33c4-3 8-3 12 0s8 3 12 0 8-3 12 0" {...line} stroke="#7cc4ff" strokeWidth="2.6" /><path d="M10 40c4-2.4 8-2.4 12 0s8 2.4 12 0" {...line} stroke="#7cc4ff" strokeWidth="2.2" opacity=".7" /><path d="M14 27c2-10 12-17 24-17-1 12-9 19-20 19z" fill="#5fd39a" {...sw} /><path d="M18 27c5-5 10-9 16-13" {...line} /></>,
  content: () => <><path d="M18 8c-2 2.5 2 4 0 6.5M25 7c-2 2.5 2 4 0 6.5" {...line} stroke="#b8c4e0" /><path d="M9 19h26v9c0 7-5.6 12-13 12S9 35 9 28z" fill="#fff6e6" {...sw} /><path d="M11 22h22" stroke="#ff9b5a" strokeWidth="3" strokeLinecap="round" /><path d="M35 22h2.5a4.5 4.5 0 0 1 0 9H34" {...line} /><path d="M7 43h30" {...line} /></>,
  hopeful: () => <><path d="M5 34a19 19 0 0 1 38 0" {...line} stroke="#ff5d73" strokeWidth="4" /><path d="M10 34a14 14 0 0 1 28 0" {...line} stroke="#ffd95a" strokeWidth="4" /><path d="M15 34a9 9 0 0 1 18 0" {...line} stroke="#7cc4ff" strokeWidth="4" /><path d="M2 38c0-3 2.4-5 5-5 1-2.4 3-3.6 5.4-3.4 2.6.2 4.6 2.4 4.6 5 2 .2 3 1.6 3 3.4z" fill="#fff" {...sw} /><path d="M29 38c0-2.6 2-4.6 4.6-4.6.8-2 2.8-3.4 5-3.4 2.8 0 5 2.2 5 5 2 .2 3.4 1.4 3.4 3z" fill="#fff" {...sw} /></>,
  tired: () => <><rect x="6" y="15" width="32" height="19" rx="5" fill="#fff" {...sw} /><rect x="38" y="20.5" width="4" height="8" rx="1.6" fill={INK} /><rect x="10" y="19" width="6" height="11" rx="2" fill="#ff5d73" /></>,
  unsure: () => <><path d="M8 10h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20l-8 7v-7H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="#c8b8ff" {...sw} /><path d="M19.5 18a4.5 4.5 0 1 1 6.4 4c-1.4.7-1.9 1.6-1.9 3" {...line} strokeWidth="2.6" /><circle cx="24" cy="29.5" r="1.7" fill={INK} /></>,
  bored: () => <><path d="M12 5h24M12 43h24" {...line} strokeWidth="2.6" /><path d="M14 6c0 9 8 12 8 18s-8 9-8 18h20c0-9-8-12-8-18s8-9 8-18z" fill="#e8f2ff" {...sw} /><path d="M17 39c2-4 5-6 7-6s5 2 7 6zM19 13h10c-1 3-3 4-5 6-2-2-4-3-5-6z" fill="#ffd95a" /><path d="M24 24v8" stroke="#ffd95a" strokeWidth="1.6" strokeDasharray="1.5 2" /></>,
  anxious: () => <><circle cx="22" cy="23" r="14" fill="#ff8fb1" {...sw} /><path d="M11 17c7-3 16 0 22 7M10 25c8-4 17 2 23 4M14 33c4-7 13-13 20-12M17 11c1 8 9 15 9 25M27 10c-5 6-7 16-3 26" {...line} strokeWidth="1.5" opacity=".75" /><path d="M35 31c4 2 6 6 4 9s-7 1-6-2 6-2 9 2" {...line} stroke="#ff5d73" strokeWidth="2.2" /></>,
  angry: () => <><path d="M4 42l12-22h16l12 22z" fill="#a0715a" {...sw} /><path d="M16 20c3 2.5 5 0 8 0s5 2.5 8 0" fill="none" stroke="#ff5d73" strokeWidth="3" strokeLinecap="round" /><path d="M17 31l3-4 3 5 3-6 3 5" {...line} stroke="#ff9b5a" strokeWidth="2.4" /><path d="M20 13l-3-6M24 12V4M28 13l3-6" {...line} stroke="#ff5d73" strokeWidth="2.8" /></>,
  stressed: () => <><path d="M6 32a18 18 0 0 1 36 0z" fill="#fff" {...sw} /><path d="M10 32a14 14 0 0 1 6-11.5" {...line} stroke="#5fd39a" strokeWidth="4" /><path d="M17.5 19.5a14 14 0 0 1 13 0" {...line} stroke="#ffd95a" strokeWidth="4" /><path d="M32 20.5A14 14 0 0 1 38 32" {...line} stroke="#ff5d73" strokeWidth="4" /><path d="M24 32l10-9" {...line} strokeWidth="2.8" /><circle cx="24" cy="32" r="3" fill={INK} /><path d="M38 9c1 2 3 2 4 0M42 14c1 2 3 2 4 0" {...line} stroke="#b8c4e0" /></>,
  sad: () => <><path d="M11 27a7 7 0 0 1 1.4-13.9A10 10 0 0 1 31.6 11 8 8 0 0 1 36 27z" fill="#9fb4d8" {...sw} /><path d="M15 33l-2 5M24 33l-2 5M33 33l-2 5M19.5 40l-1.4 3.4M28.5 40l-1.4 3.4" stroke="#4aa8ff" strokeWidth="2.8" strokeLinecap="round" /></>,
  lonely: () => <><ellipse cx="25" cy="17" rx="10" ry="12" fill="#c8b8ff" {...sw} /><path d="M23.5 29l1.5 2.2 1.5-2.2z" fill="#c8b8ff" {...sw} /><path d="M25 31c-3 4 3 6 0 10s1 4 0 5" {...line} strokeWidth="1.6" /><path d="M20 10c-2 2-2.5 4-2 6.5" {...line} stroke="#fff" strokeWidth="2.4" /></>,
  overwhelmed: () => <><path d="M4 40c2-13 10-26 24-28 9-1.4 15 5 13 12-1.6 5-7 6-10 3 4 0 5-4 3-6-3-3-10-1-13 6-2 4-2.6 8-1 13z" fill="#7cc4ff" {...sw} /><path d="M2 42c5 0 7-2.4 11-2.4S20 42 24 42s7-2.4 11-2.4 7 2.4 11 2.4" {...line} stroke="#4aa8ff" strokeWidth="2.4" /><path d="M14 26c2-5 6-9 11-10" {...line} stroke="#fff" strokeWidth="2.2" /></>,
  ashamed: () => <><path d="M9 40V18a3 3 0 0 1 6 0v8M15 15V11a3 3 0 0 1 6 0v14M21 12a3 3 0 0 1 6 0v13M27 15a3 3 0 0 1 6 0v13c0 7-5 12-12 12h-2c-5 0-10-3-10-8" fill="#c8b8ff" {...sw} /><path d="M33 28l3.4-5a3 3 0 0 1 5 3.2L35 37" fill="#c8b8ff" {...sw} /><ellipse cx="18" cy="33" rx="3" ry="1.8" fill="#ff9ec0" /></>,
  guilty: () => <><path d="M18 14a6 6 0 1 1 12 0" {...line} strokeWidth="3" /><path d="M14 18h20l6 22H8z" fill="#8f9bb8" {...sw} /><path d="M17 26h14" {...line} stroke="#c9d2e6" strokeWidth="2.4" /><text x="24" y="37" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff" fontFamily="system-ui">heavy</text></>,
  afraid: () => <><path d="M11 40V21a13 13 0 0 1 26 0v19l-4.3-3.4L28.3 40 24 36.6 19.7 40l-4.4-3.4z" fill="#fff" {...sw} /><ellipse cx="19.5" cy="22" rx="2.2" ry="3.2" fill={INK} /><ellipse cx="28.5" cy="22" rx="2.2" ry="3.2" fill={INK} /><path d="M5 18c-1.4-1.4-1.4-3.4 0-4.8M43 18c1.4-1.4 1.4-3.4 0-4.8" {...line} stroke="#b8c4e0" /></>,
  desperate: () => <><circle cx="24" cy="24" r="17" fill="#fff" {...sw} /><circle cx="24" cy="24" r="8" fill="#17233a" {...sw} /><path d="M12 12l6 6M36 12l-6 6M12 36l6-6M36 36l-6-6" stroke="#ff5d73" strokeWidth="7" /><circle cx="24" cy="24" r="17" fill="none" {...sw} /><circle cx="24" cy="24" r="8" fill="none" {...sw} /></>,
}

export const hasFeelIcon = (name: string) => name in ART

export default function FeelIcon({ name, size = 28 }: { name: string; size?: number }) {
  const Art = ART[name]
  if (!Art) return null
  return <svg className="feel-icon" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true"><Art /></svg>
}
