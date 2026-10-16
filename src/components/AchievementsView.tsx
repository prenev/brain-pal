import { useMemo, useState } from 'react'
import { Sheet } from './ui'
import Medal from './Medal'
import { ShareCardSheet } from './ShareSheet'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { familyProgress, TIER_LABEL, type Achievement } from '../lib/achievements.ts'
import { achievementShareCard } from '../lib/share.ts'
import { fmtDate } from '../lib/dates.ts'

/** Every milestone, grouped by what you did. Earned ones open as a shareable card; the rest show how far you are. */
export default function AchievementsView() {
  const { achievements } = useStore()
  const [open, setOpen] = useState<Achievement | null>(null)
  const fams = useMemo(() => familyProgress(achievements), [achievements])
  const got = achievements.filter(a => a.unlocked).length
  const latest = useMemo(() => achievements.filter(a => a.day).sort((a, b) => b.day!.localeCompare(a.day!) || b.tierIndex - a.tierIndex).slice(0, 1)[0] ?? null, [achievements])
  return (
    <>
      <div className="card ach-sum" aria-label="Achievements">
        <div><div className="muted small">Unlocked</div><div className="ach-big" aria-label={`${got} of ${achievements.length} achievements`}>{got}<span> / {achievements.length}</span></div></div>
        {latest && <button className="ach-latest" onClick={() => setOpen(latest)}><Medal tier={latest.tier} emoji={latest.emoji} size={46} /><span><small>Latest</small><b>{latest.title}</b></span></button>}
      </div>
      <p className="muted small" style={{ margin: '0 2px 12px' }}>Each one is something you actually did. Tap a badge to see it as a card you can share (no entries, nothing you wrote). Every unlock gives a few coins.</p>
      {fams.map(({ fam, got: g, next, count, total }) => (
        <div key={fam.id} className="card ach-fam" aria-label={fam.name}>
          <div className="row spread"><span className="row"><Emoji name={fam.emoji} size={26} /><b>{fam.name}</b></span><span className="muted small">{g.length}/{total}</span></div>
          <div className="ach-medals">
            {achievements.filter(a => a.family === fam.id).map(a => (
              <button key={a.id} className="ach-medal" aria-label={`${a.title}, ${TIER_LABEL[a.tier]}, ${a.unlocked ? 'unlocked' : 'locked'}`} onClick={() => setOpen(a)}>
                <Medal tier={a.tier} emoji={a.emoji} locked={!a.unlocked} size={54} /><small>{a.at}</small>
              </button>
            ))}
          </div>
          {next ? <><div className="bar"><i style={{ width: `${next.progress * 100}%` }} /></div><p className="muted small" style={{ margin: '6px 0 0' }}>{count} of {next.at} {next.at === 1 ? fam.unitOne : fam.unit} for “{next.title}”</p></> : <p className="muted small" style={{ margin: '8px 0 0' }}>All done here. {count} {fam.unit}.</p>}
        </div>
      ))}
      {open && (open.unlocked
        ? <ShareCardSheet card={achievementShareCard(open)} onClose={() => setOpen(null)} />
        : <Sheet onClose={() => setOpen(null)}>
          <div style={{ display: 'grid', placeItems: 'center', gap: 8, textAlign: 'center' }}>
            <Medal tier={open.tier} emoji={open.emoji} locked size={104} />
            <span className="chip">{TIER_LABEL[open.tier]}</span>
            <h2 style={{ margin: 0 }}>{open.title}</h2>
            <p className="muted" style={{ margin: 0 }}>{open.text}</p>
            <div className="bar" style={{ width: '100%' }}><i style={{ width: `${open.progress * 100}%` }} /></div>
            <p className="muted small" style={{ margin: 0 }}>{open.count} of {open.at} · worth {open.coins} coins</p>
            <button className="linkbtn" onClick={() => setOpen(null)}>Close</button>
          </div>
        </Sheet>)}
      {latest?.day && <p className="muted small" style={{ textAlign: 'center' }}>Latest unlock: {latest.title}, {fmtDate(latest.day)}.</p>}
    </>
  )
}
