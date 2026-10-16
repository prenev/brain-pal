import Pal from './Pal'
import { Emoji } from '../lib/emoji'
import type { Release } from '../lib/whatsnew.ts'

const KEY = 'bp.seenVersion'
export const seenVersion = (): string | null => { try { return localStorage.getItem(KEY) } catch { return null } }
export const markSeen = (v: string) => { try { localStorage.setItem(KEY, v) } catch { /* ignore */ } }

/** After an update: Wobbi tells you what's new, once. Also reachable any time from More → What's new. */
export default function WhatsNew({ releases, onClose }: { releases: Release[]; onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal aria-label="What’s new"><div className="inner" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, paddingTop: 'calc(var(--safe-t) + 24px)', textAlign: 'center' }}>
        <Pal pose="cheer" size={140} />
        <h1 style={{ fontSize: 30, margin: '8px 0 14px' }}>What’s new</h1>
        {releases.map(r => (
          <section key={r.version} style={{ textAlign: 'left' }}>
            {releases.length > 1 && <h2 className="sec">Version {r.version}</h2>}
            {r.items.map(i => (
              <div key={i.title} className="card row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <Emoji name={i.emoji} size={32} /><span><b>{i.title}</b><span className="muted" style={{ display: 'block' }}>{i.text}</span></span>
              </div>
            ))}
          </section>
        ))}
      </div>
      <div style={{ padding: '14px 0 calc(var(--safe-b) + 24px)' }}><button className="btn primary block" onClick={onClose}>Got it</button></div>
    </div></div>
  )
}
