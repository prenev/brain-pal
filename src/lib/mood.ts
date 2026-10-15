export const MOODS = [
  { v: 5, name: 'rad', color: '#3fa869' },
  { v: 4, name: 'good', color: '#a8bd1b' },
  { v: 3, name: 'meh', color: '#f5b81f' },
  { v: 2, name: 'bad', color: '#f58b1f' },
  { v: 1, name: 'awful', color: '#ef1c34' },
] as const

export const moodOf = (v: number) => MOODS.find(m => m.v === Math.round(v)) ?? MOODS[2]
