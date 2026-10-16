import { PalTip } from './Pal'
import { ProGate } from './Pro'
import { usePro } from '../lib/proStore'
import { useMemo } from 'react'
import Pal from './Pal'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'
import { SKILLS, skillCounts, levelFor, MAX_LEVEL } from '../lib/levels.ts'
import { milestones, MIN_OVERALL, MIN_POINTS, proofCards, type ProofCard } from '../lib/proof.ts'
import { fmtDate } from '../lib/dates.ts'

function Trend({ t }: { t: NonNullable<ProofCard['trend']> }) {
  const Icon = t.direction === 'up' ? ArrowUp : t.direction === 'down' ? ArrowDown : Minus
  const color = t.better === null ? 'var(--muted)' : t.better ? 'var(--accent)' : 'var(--orange, #ffa63d)'
  const word = t.direction === 'flat' ? 'about the same' : t.direction === 'up' ? 'up' : 'down'
  return <span className="trend" style={{ color }} aria-label={`Trend: ${word}`}><Icon size={16} />{word}</span>
}

/** Skill levels + honest before/after proof + first-time milestones, all computed from your own data. */
export default function Progress() {
  const { thoughts, sessions, worries, journal, focusSessions } = useStore()
  const { pro } = usePro()
  const counts = useMemo(() => skillCounts({ thoughts, sessions, worries, journal, focus: focusSessions }), [thoughts, sessions, worries, journal, focusSessions])
  const cards = useMemo(() => proofCards({ thoughts, sessions, worries }), [thoughts, sessions, worries])
  const marks = useMemo(() => milestones({ thoughts, sessions, worries }), [thoughts, sessions, worries])
  // Skills you can't practise yet (journal / focus arrive in later phases) stay hidden until they have data.
  const skills = SKILLS.filter(s => counts[s.id] > 0 || ['calming', 'reframing', 'worry', 'consistency'].includes(s.id))

  return (
    <>
      <PalTip id="progress" pose="flex">Skills grow with what you actually do and never go down. Proof appears once there’s enough of your own data.</PalTip>
      <h2 className="sec">Your skills</h2>
      <div className="skill-grid">
        {skills.map(s => {
          const l = levelFor(counts[s.id])
          return (
            <div key={s.id} className="card skill" aria-label={`${s.name}: level ${l.level}`}>
              <div className="row"><Emoji name={s.emoji} size={30} /><b>{s.name}</b></div>
              <div className="lvl">{l.level === 0 ? 'Not started' : `Level ${l.level}${l.level === MAX_LEVEL ? ' · max' : ''}`}</div>
              <div className="bar"><i style={{ width: `${l.progress * 100}%` }} /></div>
              <p className="muted small" style={{ margin: '8px 0 0' }}>
                {l.next === null ? `${l.count} ${s.unit}` : `${l.toNext} more ${l.toNext === 1 ? s.unit.replace(/s$/, '').replace('entrie', 'entry') : s.unit} to level ${l.level + 1}`}
              </p>
            </div>
          )
        })}
      </div>

      <h2 className="sec">Proof you’re improving</h2>
      {!pro && <ProGate feature="analytics" compact>{null}</ProGate>}
      {pro && cards.length === 0 && <div className="card empty"><div style={{ display: 'grid', placeItems: 'center', marginBottom: 6 }}><Pal pose="think" size={84} /></div>
        Your proof appears here as you use the tools. We only draw a comparison once there’s enough of <i>your</i> data — {MIN_OVERALL}+ rated sessions or entries for a first figure, {MIN_POINTS}+ in each of two 30-day windows for a trend.
      </div>}
      {pro && cards.map(c => (
        <div key={c.id} className="card proof">
          <div className="row spread"><b>{c.title}</b>{c.trend && <Trend t={c.trend} />}</div>
          <div className="big">{c.value}</div>
          <p style={{ margin: 0 }}>{c.sentence}</p>
        </div>
      ))}
      {pro && cards.length > 0 && <p className="muted small">These are your own trends, not a medical measure — and a bad month says nothing bad about you.</p>}

      {marks.length > 0 && <>
        <h2 className="sec">Milestones</h2>
        <div className="card">
          <ul className="timeline">{marks.map(m => <li key={m.id}><Emoji name="star" size={20} /><span>{m.title}</span><em>{fmtDate(m.at)}</em></li>)}</ul>
        </div>
      </>}
    </>
  )
}
