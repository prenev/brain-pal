import type { Worry } from './types'

export function worryStats(worries: Worry[]) {
  const open = worries.filter(w => w.status === 'open').length
  const letGo = worries.filter(w => w.status === 'let-go').length
  const actionable = worries.filter(w => w.status === 'actionable').length
  const reviewed = letGo + actionable
  return { open, letGo, actionable, reviewed, letGoPct: reviewed ? Math.round((letGo / reviewed) * 100) : null as number | null }
}

/** Oldest parked worry first, so nothing sits forever. */
export const reviewQueue = (worries: Worry[]): Worry[] =>
  worries.filter(w => w.status === 'open').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
