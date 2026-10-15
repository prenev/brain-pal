/** Accent themes (unlocked with coins). Pure helpers; `applyTheme` is the only DOM touch. */
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
export const isHex = (c: unknown): c is string => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)

/** Darken (negative) or lighten (positive) a #rrggbb colour by a factor in -1..1. */
export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16), f = Math.max(-1, Math.min(1, factor))
  const ch = (v: number) => clamp(f < 0 ? v * (1 + f) : v + (255 - v) * f)
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => ch(v).toString(16).padStart(2, '0')).join('')}`
}

/** Dark text that stays readable on the accent: near-black on light colours. */
export function inkFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16), lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.45 ? '#0b1a14' : '#ffffff'
}

export function themeVars(color: string | null): Record<string, string> | null {
  return isHex(color) ? { '--accent': color, '--accent-dark': shade(color, -0.3), '--accent-ink': inkFor(color) } : null
}

export function applyTheme(color: string | null) {
  const root = document.documentElement.style
  const vars = themeVars(color)
  for (const k of ['--accent', '--accent-dark', '--accent-ink']) vars ? root.setProperty(k, vars[k]) : root.removeProperty(k)
}
