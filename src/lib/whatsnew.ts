/** "What's new": one entry per release, shown once after an update (never on a fresh install, where first-run covers everything). Pure + tested. */
export interface Release { version: string; items: { emoji: string; title: string; text: string }[] }

/** Newest first. Add a release here when you ship it; keep it to the things people will actually notice. */
export const RELEASES: Release[] = [
  { version: '1.0.0', items: [
    { emoji: 'sparkles', title: 'Meet Wobbi', text: 'Your little brain buddy now cheers you on, and gives a tip in every section.' },
    { emoji: 'shield', title: 'Focus guard', text: 'Pause the apps that eat your time until you do push-ups, a walk, or a minute of breathing.' },
    { emoji: 'cloud', title: 'Works offline, syncs if you want', text: 'No account needed. Sign in only if you want your data on every device.' },
    { emoji: 'sleep', title: 'Sleep, summaries and proof', text: 'Apple Watch sleep, weekly summaries and before-and-after proof of your progress. (Proof and week/month summaries are Pro)' },
  ] },
]

const parts = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0)
export function compareVersions(a: string, b: string): number {
  const x = parts(a), y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d < 0 ? -1 : 1 }
  return 0
}
/** Releases newer than the last one the person saw, up to the version they run. `null` = fresh install: nothing to announce. */
export function unseenReleases(lastSeen: string | null, current: string, releases: Release[] = RELEASES): Release[] {
  if (!lastSeen) return []
  return releases.filter(r => compareVersions(r.version, lastSeen) > 0 && compareVersions(r.version, current) <= 0).sort((a, b) => compareVersions(b.version, a.version))
}
