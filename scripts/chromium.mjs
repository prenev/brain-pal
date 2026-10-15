import { readdirSync } from 'node:fs'

/** Browser binary for Playwright: $CHROMIUM_PATH, else this sandbox's preinstalled one, else undefined (Playwright's own download, e.g. in CI). */
export function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  try {
    const dir = readdirSync('/opt/pw-browsers').filter(d => d.startsWith('chromium-')).sort().at(-1)
    if (dir) return `/opt/pw-browsers/${dir}/chrome-linux/chrome`
  } catch { /* not in the sandbox */ }
  return undefined
}
