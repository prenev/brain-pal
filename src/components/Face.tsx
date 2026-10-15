import { moodOf } from '../lib/mood'

/** Original mood faces (1 awful … 5 rad). */
export default function Face({ mood, size = 48 }: { mood: number; size?: number }) {
  const m = Math.round(mood)
  const ink = '#1d1d1f'
  const s = { stroke: ink, strokeWidth: 5, strokeLinecap: 'round' as const, fill: 'none' }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={moodOf(m).name} role="img">
      <circle cx="50" cy="50" r="50" fill={moodOf(m).color} />
      {m === 5 && <>
        <path d="M22 44q8-10 16 0M62 44q8-10 16 0" {...s} />
        <path d="M28 58q22 8 44 0q-4 26-22 26T28 58z" fill={ink} />
        <path d="M40 76q10-7 20 0q-4 6-10 6t-10-6z" fill="#e8636f" />
      </>}
      {m === 4 && <>
        <circle cx="32" cy="46" r="6" fill={ink} /><circle cx="68" cy="46" r="6" fill={ink} />
        <path d="M38 66q12 10 24 0" {...s} />
      </>}
      {m === 3 && <>
        <circle cx="32" cy="46" r="6" fill={ink} /><circle cx="68" cy="46" r="6" fill={ink} />
        <path d="M38 68h24" {...s} />
      </>}
      {m === 2 && <>
        <circle cx="32" cy="52" r="6" fill={ink} /><circle cx="68" cy="52" r="6" fill={ink} />
        <path d="M22 40q8-8 18-3M60 37q10-5 18 3" {...s} strokeWidth={4} />
        <path d="M36 74q14-14 28 0" {...s} />
      </>}
      {m <= 1 && <>
        <path d="M24 38l16 8-16 8M76 38l-16 8 16 8" {...s} />
        <path d="M34 76q16-18 32 0" {...s} />
      </>}
    </svg>
  )
}
