import { loadReview, saveReview } from './extras'
import { markAsked, shouldAskReview } from './review.ts'
import { isIOSApp, Mindful } from './native'

export function noteFirstSeen() { const r = loadReview(); if (!r.firstSeen) saveReview({ ...r, firstSeen: new Date().toISOString() }) }
/** Call at a happy moment. iPhone app only; iOS has the last word on whether the prompt actually shows. */
export function askForReviewIfHappy(now = new Date()) {
  if (!isIOSApp()) return
  const r = loadReview()
  if (!shouldAskReview(r, now, true)) return
  saveReview(markAsked(r, now))
  setTimeout(() => { try { void Mindful.requestReview() } catch { /* never break the app for a rating prompt */ } }, 1500)
}
