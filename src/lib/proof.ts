import { dayKey, shift } from './dates.ts'

/**
 * "Proof you're levelling up": honest before/after comparisons from *your own* data over rolling windows.
 * A comparison needs MIN_POINTS on both sides; otherwise only an all-time figure (if enough data) is shown, or nothing.
 * These are personal trends, not clinical measures, and never claim cause.
 */
export const WINDOW_DAYS = 30
export const MIN_POINTS = 5     // per side, for a before/after claim
export const MIN_OVERALL = 3    // for an all-time figure

export interface ProofCard {
  id: 'relief' | 'reframing' | 'distress' | 'worry' | 'mood'
  title: string
  /** Headline number, already formatted. */
  value: string
  sentence: string
  /** null when there's no comparison (all-time only) */
  trend: { direction: 'up' | 'down' | 'flat'; better: boolean | null } | null
  n: { recent: number; previous: number | null }
}

export interface ProofData {
  thoughts: { createdAt: string; mood: number; thought: string; alternateThought: string; outcomeIntensity: number | null; emotions: { intensity: number }[] }[]
  sessions: { createdAt: string; anxietyBefore: number | null; anxietyAfter: number | null }[]
  worries: { status: string; reviewedAt: string | null }[]
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const r1 = (n: number) => Math.round(n * 10) / 10
const fmt = (n: number) => (Number.isInteger(r1(n)) ? String(r1(n)) : r1(n).toFixed(1))

/** Split values by date into the last WINDOW_DAYS days and the WINDOW_DAYS before that. */
function windows<T extends { at: string }>(items: T[], now: Date): { recent: T[]; previous: T[] } {
  const today = dayKey(now), recentStart = shift(today, -(WINDOW_DAYS - 1)), prevStart = shift(today, -(2 * WINDOW_DAYS - 1))
  const recent: T[] = [], previous: T[] = []
  for (const it of items) {
    const d = dayKey(it.at)
    if (d >= recentStart && d <= today) recent.push(it)
    else if (d >= prevStart && d < recentStart) previous.push(it)
  }
  return { recent, previous }
}
const dir = (diff: number, eps: number): 'up' | 'down' | 'flat' => (Math.abs(diff) < eps ? 'flat' : diff > 0 ? 'up' : 'down')

/** Generic builder for a numeric series with a direction that is "better". */
function numericCard(o: { id: ProofCard['id']; title: string; items: { at: string; v: number }[]; now: Date; higherIsBetter: boolean; eps: number; unit: string; overall: (avgAll: number, n: number) => string; compare: (recent: number, previous: number, nr: number, np: number) => string }): ProofCard | null {
  const { recent, previous } = windows(o.items, o.now)
  if (recent.length >= MIN_POINTS && previous.length >= MIN_POINTS) {
    const a = avg(recent.map(x => x.v)), b = avg(previous.map(x => x.v)), direction = dir(a - b, o.eps)
    return { id: o.id, title: o.title, value: `${fmt(a)}${o.unit}`, sentence: o.compare(a, b, recent.length, previous.length),
      trend: { direction, better: direction === 'flat' ? null : (direction === 'up') === o.higherIsBetter }, n: { recent: recent.length, previous: previous.length } }
  }
  if (o.items.length >= MIN_OVERALL) {
    const a = avg(o.items.map(x => x.v))
    return { id: o.id, title: o.title, value: `${fmt(a)}${o.unit}`, sentence: o.overall(a, o.items.length), trend: null, n: { recent: o.items.length, previous: null } }
  }
  return null
}

export function proofCards(d: ProofData, now = new Date()): ProofCard[] {
  const cards: (ProofCard | null)[] = []

  // 1. Relief after SOS (points off a 0-10 anxiety rating)
  const rated = d.sessions.filter(s => s.anxietyBefore !== null && s.anxietyAfter !== null).map(s => ({ at: s.createdAt, v: s.anxietyBefore! - s.anxietyAfter! }))
  cards.push(numericCard({ id: 'relief', title: 'Relief after calming', items: rated, now, higherIsBetter: true, eps: 0.3, unit: ' pts',
    overall: (a, n) => `After ${n} rated sessions, your anxiety dropped by ${fmt(a)} points on average (0–10 scale).`,
    compare: (a, b, nr, np) => `Your average relief was ${fmt(a)} points in the last 30 days, versus ${fmt(b)} in the 30 days before (${nr} and ${np} sessions).` }))

  // 2. How much reframing lowered distress (peak emotion → re-rated intensity)
  const dist = d.thoughts.filter(t => t.outcomeIntensity !== null && t.emotions.length).map(t => ({ at: t.createdAt, v: Math.max(...t.emotions.map(e => e.intensity)) - t.outcomeIntensity! }))
  cards.push(numericCard({ id: 'distress', title: 'Feelings after reframing', items: dist, now, higherIsBetter: true, eps: 3, unit: ' pts',
    overall: (a, n) => `Across ${n} entries you re-rated, the strongest feeling dropped by ${fmt(a)} points after you reframed the thought.`,
    compare: (a, b) => `After reframing, your strongest feeling dropped by ${fmt(a)} points recently, versus ${fmt(b)} before.` }))

  // 3. Share of thought records where you wrote a balanced thought
  const withThought = d.thoughts.filter(t => t.thought.trim()).map(t => ({ at: t.createdAt, v: t.alternateThought.trim() ? 100 : 0 }))
  cards.push(numericCard({ id: 'reframing', title: 'Balanced thoughts written', items: withThought, now, higherIsBetter: true, eps: 5, unit: '%',
    overall: (a, n) => `You wrote a balanced thought on ${fmt(a)}% of your last ${n} thought records.`,
    compare: (a, b) => `You wrote a balanced thought on ${fmt(a)}% of thought records recently, versus ${fmt(b)}% in the 30 days before.` }))

  // 4. Worries you processed rather than left open (by review date)
  const reviewed = d.worries.filter(w => w.reviewedAt && (w.status === 'let-go' || w.status === 'actionable')).map(w => ({ at: w.reviewedAt!, v: w.status === 'let-go' ? 100 : 0 }))
  cards.push(numericCard({ id: 'worry', title: 'Worries let go', items: reviewed, now, higherIsBetter: true, eps: 5, unit: '%',
    overall: (a, n) => `Of ${n} worries you reviewed, ${fmt(a)}% were ones you could let go.`,
    compare: (a, b) => `You let go of ${fmt(a)}% of the worries you reviewed recently, versus ${fmt(b)}% before.` }))

  // 5. Mood
  cards.push(numericCard({ id: 'mood', title: 'Average mood', items: d.thoughts.map(t => ({ at: t.createdAt, v: t.mood })), now, higherIsBetter: true, eps: 0.2, unit: ' / 5',
    overall: (a, n) => `Your average mood across ${n} entries is ${fmt(a)} out of 5.`,
    compare: (a, b) => `Your average mood was ${fmt(a)} out of 5 in the last 30 days, versus ${fmt(b)} before.` }))

  return cards.filter((c): c is ProofCard => !!c)
}

export interface Milestone { id: string; at: string; title: string }
/** First-time moments, newest first. */
export function milestones(d: { thoughts: ProofData['thoughts']; sessions: (ProofData['sessions'][number] & { completed?: boolean })[]; worries: ProofData['worries'] }): Milestone[] {
  const out: Milestone[] = []
  const first = <T,>(xs: T[], at: (x: T) => string) => xs.map(at).sort()[0]
  const ev = (id: string, at: string | undefined, title: string) => { if (at) out.push({ id, at, title }) }
  ev('first-entry', first(d.thoughts, t => t.createdAt), 'Wrote your first entry')
  ev('first-calm', first(d.sessions.filter(s => s.completed !== false), s => s.createdAt), 'Finished your first calming session')
  ev('first-relief', first(d.sessions.filter(s => s.anxietyBefore !== null && s.anxietyAfter !== null && s.anxietyBefore! > s.anxietyAfter!), s => s.createdAt), 'Felt your first drop in anxiety after a session')
  ev('first-reframe', first(d.thoughts.filter(t => t.alternateThought.trim()), t => t.createdAt), 'Wrote your first balanced thought')
  ev('first-let-go', first(d.worries.filter(w => w.status === 'let-go' && w.reviewedAt), w => w.reviewedAt!), 'Let go of your first worry')
  return out.sort((a, b) => b.at.localeCompare(a.at))
}
