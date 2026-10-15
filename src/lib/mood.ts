export const MOODS = [
  { v: 5, name: 'rad', color: '#35d07f' },
  { v: 4, name: 'good', color: '#b6d93a' },
  { v: 3, name: 'meh', color: '#ffd23f' },
  { v: 2, name: 'bad', color: '#ffa63d' },
  { v: 1, name: 'awful', color: '#ff5d73' },
] as const

export const moodOf = (v: number) => MOODS.find(m => m.v === Math.round(v)) ?? MOODS[2]
