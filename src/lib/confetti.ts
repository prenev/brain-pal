import confetti from 'canvas-confetti'

/** Celebration burst; skipped for users who prefer reduced motion. */
export function burst() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#35d07f', '#4aa8ff', '#ffd23f', '#ff5d73', '#9b7bff']
  confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.75 }, colors, zIndex: 200 })
  setTimeout(() => confetti({ particleCount: 50, spread: 110, origin: { y: 0.7, x: 0.2 }, colors, zIndex: 200 }), 180)
  setTimeout(() => confetti({ particleCount: 50, spread: 110, origin: { y: 0.7, x: 0.8 }, colors, zIndex: 200 }), 320)
}

/** A small pop of confetti from a point on screen (an anchor tile being ticked). */
export function burstAt(x: number, y: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  confetti({ particleCount: 26, spread: 70, startVelocity: 24, ticks: 90, scalar: .8, origin: { x: x / window.innerWidth, y: y / window.innerHeight }, colors: ['#35d07f', '#4aa8ff', '#ffd23f', '#ff5d73', '#9b7bff'], zIndex: 200 })
}
