import confetti from 'canvas-confetti'

/** Celebration burst; skipped for users who prefer reduced motion. */
export function burst() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#35d07f', '#4aa8ff', '#ffd23f', '#ff5d73', '#9b7bff']
  confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.75 }, colors, zIndex: 200 })
  setTimeout(() => confetti({ particleCount: 50, spread: 110, origin: { y: 0.7, x: 0.2 }, colors, zIndex: 200 }), 180)
  setTimeout(() => confetti({ particleCount: 50, spread: 110, origin: { y: 0.7, x: 0.8 }, colors, zIndex: 200 }), 320)
}
