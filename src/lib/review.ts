/** When to ask for an App Store rating: only at a happy moment, rarely, never early. Pure + tested (scripts/test-share.mjs). */
export interface ReviewState { firstSeen: string | null; lastAsked: string | null; asks: number }
export const REVIEW_MIN_DAYS = 7
export const REVIEW_GAP_DAYS = 120
export const REVIEW_MAX_ASKS = 3
const DAY = 86_400_000

export function shouldAskReview(s: ReviewState, now: Date, happy: boolean): boolean {
  if (!happy || !s.firstSeen) return false
  if (s.asks >= REVIEW_MAX_ASKS) return false
  if (now.getTime() - new Date(s.firstSeen).getTime() < REVIEW_MIN_DAYS * DAY) return false
  if (s.lastAsked && now.getTime() - new Date(s.lastAsked).getTime() < REVIEW_GAP_DAYS * DAY) return false
  return true
}
export const markAsked = (s: ReviewState, now: Date): ReviewState => ({ ...s, lastAsked: now.toISOString(), asks: s.asks + 1 })
