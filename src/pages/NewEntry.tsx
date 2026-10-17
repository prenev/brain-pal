import { useMemo, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { NameIcon } from '../lib/icons'
import { IconGrid } from '../components/ui'
import { PalSays } from '../components/Pal'
import VoiceNote from '../components/VoiceNote'
import NoteField, { useKeyboardInset } from '../components/NoteField'
import Support from '../components/Support'
import { AiError, aiEnabled, looksLikeCrisis, suggestReframes } from '../lib/gemini'
import { Emoji } from '../lib/emoji'
import Face from '../components/Face'
import { EMOTIONS, REFRAME_QUESTIONS } from '../lib/constants'
import { MOODS } from '../lib/mood'
import { useStore } from '../lib/store'
import { emotionsForMood, rankByUse, shortList } from '../lib/today.ts'
import type { AudioClip, EmotionRating, Thought } from '../lib/types'
import type { PoseName } from '../lib/pal.ts'

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16)
const fmtWhen = (d: Date) => {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5)
  const day = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short' })
  return `${day}, ${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })} at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

/**
 * How are you → which feelings (fitted to the mood) → save, or add the thought that came (typed or a voice memo)
 * → save, or one more step: a kinder thought / next step (on a good day: what helped). Each step can end the entry.
 */
type StepId = 'feel' | 'thought' | 'next'
/** Limits that say what each box is for: one thought, not an essay (the Journal is for long writing). */
export const LIMITS = { thought: 280, situation: 140, alt: 280 } as const

/** `edit`: an existing entry, opened with everything filled in; saving changes its words and ratings (photos and voice stay). */
export default function NewEntry({ date, onClose, onSaved, initialMood = null, edit }: { date: Date; onClose: () => void; onSaved: () => void; initialMood?: number | null; edit?: Thought }) {
  const { addThought, updateThought, allTags, thoughts } = useStore()
  const [when, setWhen] = useState(date)
  const [pickDate, setPickDate] = useState(false)
  const [mood, setMood] = useState<number | null>(edit?.mood ?? initialMood)
  const [emotions, setEmotions] = useState<EmotionRating[]>(edit?.emotions ?? [])
  const [tags, setTags] = useState<string[]>(edit?.tags ?? [])
  const [allEmos, setAllEmos] = useState(false)
  const [thought, setThought] = useState(edit?.thought ?? '')
  const [alt, setAlt] = useState(edit?.alternateThought ?? '')
  const [outcome, setOutcome] = useState<number | null>(edit?.outcomeIntensity ?? null)
  const [files, setFiles] = useState<File[]>([])
  const [clip, setClip] = useState<AudioClip | null>(null)
  const [ideas, setIdeas] = useState<string[]>([])
  const [ideaBusy, setIdeaBusy] = useState(false)
  const [ideaErr, setIdeaErr] = useState('')
  const [step, setStep] = useState<StepId>('feel')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const good = (mood ?? 3) >= 4

  // the feelings grid follows the mood: a good day offers good feelings first, a hard day the hard ones
  const rankedEmos = useMemo(() => emotionsForMood(EMOTIONS, mood ?? 3, thoughts), [mood, thoughts])
  const emoOptions = useMemo(() => (allEmos ? rankedEmos : shortList(rankedEmos, emotions.map(e => e.name))), [allEmos, rankedEmos, emotions])
  const rankedTags = useMemo(() => rankByUse(allTags, thoughts.map(t => t.tags)), [thoughts, allTags])
  const peak = Math.max(0, ...emotions.map(e => e.intensity))
  const setEmos = (names: string[]) => setEmotions(names.map(n => emotions.find(e => e.name === n) ?? { name: n, intensity: 60 }))
  const addCustom = (kind: 'emotion' | 'tag') => {
    const n = prompt(kind === 'emotion' ? 'New feeling' : 'New tag')?.trim().toLowerCase()
    if (!n) return
    kind === 'emotion' ? setEmos([...emotions.map(e => e.name), n]) : setTags([...new Set([...tags, n])])
  }
  const customEmos = emotions.map(e => e.name).filter(n => !EMOTIONS.includes(n))
  const crisis = looksLikeCrisis([thought, alt, clip?.transcript ?? ''].join(' '))

  async function getIdeas() {
    setIdeaBusy(true); setIdeaErr(''); setIdeas([])
    try {
      const r = await suggestReframes({ thought, situation: '', emotions: emotions.map(e => e.name) })
      if (r.crisis) { setIdeaErr('Please look at the support options above — you don’t have to handle this alone.'); return }
      setIdeas(r.reframes)
      if (!r.reframes.length) setIdeaErr('No suggestions this time — try rewording the thought.')
    } catch (e) { setIdeaErr(e instanceof AiError ? e.message : 'Something went wrong. Please try again.') }
    finally { setIdeaBusy(false) }
  }

  async function save() {
    setSaving(true); setError('')
    try {
      if (edit) {
        await updateThought(edit.id, { mood: mood!, thought: thought.trim(), emotions, alternateThought: alt.trim(), outcomeIntensity: outcome, tags })
        onSaved(); return
      }
      await addThought({
        mood: mood!, createdAt: when.toISOString(), situation: '', thought: thought.trim(), emotions,
        internalBehaviour: '', externalBehaviour: '', alternateThought: alt.trim(),
        outcomeIntensity: outcome, tags, distortions: [], photoFiles: files, audioClip: clip,
      })
      onSaved()
    } catch (e: any) { setError(e?.message ?? 'Could not save'); setSaving(false) }
  }

  useKeyboardInset()
  const steps: StepId[] = ['feel', 'thought', 'next']
  const at = steps.indexOf(step)

  if (mood === null) return (
    <div className="overlay"><div className="inner mood-stage">
      <div className="topbar" style={{ background: 'none' }}><button className="glass round" aria-label="Close" onClick={onClose}><X size={26} /></button></div>
      <div className="center">
        <h1>How are you?</h1>
        <div><button className="datelink" onClick={() => setPickDate(!pickDate)}>{fmtWhen(when)}</button></div>
        {pickDate && <input className="input" type="datetime-local" style={{ maxWidth: 280, margin: '14px auto 0' }} max={toLocalInput(new Date())}
          value={toLocalInput(when)} onChange={e => e.target.value && setWhen(new Date(e.target.value))} />}
        <div className="faces">
          {MOODS.map(m => (
            <button key={m.v} onClick={() => setMood(m.v)} style={{ color: m.color }}><Face mood={m.v} size={70} />{m.name}</button>
          ))}
        </div>
      </div>
    </div></div>
  )

  const say: Record<StepId, { pose: PoseName; text: string }> = {
    feel: { pose: good ? 'cheer' : 'idle', text: good ? 'Love that. What’s making it a good one? Pick what fits.' : 'Which feelings are here? Pick as many as fit.' },
    thought: { pose: 'think', text: good ? 'What’s on your mind? A line is plenty, or just say it.' : 'What thought came up? Write it the way it sounded in your head, or just say it.' },
    next: good ? { pose: 'love', text: 'What helped today? Write it down so you can find it on a harder day.' } : { pose: 'love', text: 'Now be kind: what would you tell a friend who thought this? Or one small next step.' },
  }

  return (
    <div className="overlay wiz"><div className="inner wiz-inner">
      <div className="wiz-head">
        <button className="glass round" aria-label="Close" onClick={onClose}><X size={24} /></button>
        <div className="wiz-prog" role="progressbar" aria-label="Progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={at + 1}>
          {steps.map((s, i) => <button key={s} type="button" className={i <= at ? 'on' : ''} aria-label={`Step ${i + 1}`} disabled={i >= at} onClick={() => setStep(steps[i])} />)}   {/* tap an earlier step to go back */}
        </div>
        <button className="wiz-face" aria-label="Change mood" onClick={() => setMood(null)}><Face mood={mood} size={42} /></button>
      </div>

      <div className="wiz-body" key={step}>
        <PalSays pose={say[step].pose} size={72}>{say[step].text}</PalSays>
        {crisis && <div role="alert"><Support /></div>}

        {step === 'feel' && <div className="wiz-card">
          <IconGrid options={[...emoOptions, ...customEmos]} value={emotions.map(e => e.name)} onChange={setEmos} />
          <div className="row spread" style={{ marginTop: 4 }}>
            <button type="button" className="linkbtn morebtn" style={{ margin: 0 }} onClick={() => setAllEmos(!allEmos)}>{allEmos ? 'Show fewer' : `More feelings (${EMOTIONS.length - emoOptions.length})`}</button>
            <button className="linkbtn" aria-label="Add emotion" onClick={() => addCustom('emotion')}><Plus size={16} style={{ display: 'inline', verticalAlign: -3 }} /> Your own</button>
          </div>
          {emotions.length > 0 && <>
            <div className="hr" />
            <p className="muted small" style={{ margin: '0 0 8px' }}>How strong?</p>
            {emotions.map(e => (
              <div key={e.name} style={{ marginBottom: 8 }}>
                <div className="row spread"><span>{e.name}</span><b>{e.intensity}%</b></div>
                <input className="slider" type="range" min={0} max={100} value={e.intensity} aria-label={`${e.name} intensity`} style={{ ['--p' as string]: `${e.intensity}%` }}
                  onChange={ev => setEmotions(emotions.map(x => x.name === e.name ? { ...x, intensity: +ev.target.value } : x))} />
              </div>
            ))}
          </>}
        </div>}

        {step === 'thought' && <>
          <NoteField big autoFocus label={good ? 'What’s on your mind?' : 'The thought that came'} value={thought} onChange={setThought} max={LIMITS.thought}
            placeholder={good ? 'e.g. Finally finished the project and it felt great' : 'e.g. Everyone will notice I messed up the demo'} />
          {!edit && <div className={`wiz-media ${clip ? 'has-voice' : ''}`}>
            <VoiceNote clip={clip} onChange={setClip} onWords={w => setThought(t => t || w.slice(0, LIMITS.thought))} />
            <label className="vn-start photo"><Camera size={18} /> Photo<input hidden type="file" accept="image/*" onChange={e => setFiles([...files, ...Array.from(e.target.files ?? [])])} /></label>
          </div>}
          {files.length > 0 && <div className="wiz-photos">{files.map((f, i) => (
            <div key={i}><img src={URL.createObjectURL(f)} alt="" />
              <button aria-label="Remove photo" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={14} /></button></div>))}</div>}
          <div className="wiz-tags" role="group" aria-label="Tags">
            {[...new Set([...tags, ...rankedTags.slice(0, 10)])].map(t => <button key={t} type="button" className={`chip ${tags.includes(t) ? 'on' : ''}`} aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])}><NameIcon name={t} size={16} /> {t}</button>)}
            <button type="button" className="chip add" aria-label="Add tag" onClick={() => addCustom('tag')}><Plus size={14} strokeWidth={3} /> Tag</button>
          </div>
        </>}

        {step === 'next' && <>
          {thought.trim() && <div className="wiz-quote" aria-label="Your thought">“{thought.trim()}”</div>}
          <NoteField big autoFocus label={good ? 'What helped' : 'A kinder thought, or a next step'} value={alt} onChange={setAlt} max={LIMITS.alt}
            placeholder={good ? 'e.g. A walk at lunch and texting Sam' : 'What would you tell a friend? What’s one small thing you can do?'} />
          {!good && <div className="wiz-help">
            <span className="muted small">Need a nudge? Tap a question.</span>
            <div className="qrow">{REFRAME_QUESTIONS.slice(0, 4).map(q => <button type="button" key={q} className="qbtn" onClick={() => setAlt(a => ((a ? a + '\n' : '') + q + ' ').slice(0, LIMITS.alt))}>{q}</button>)}</div>
            {aiEnabled() && !crisis && thought.trim() && <>
              <button type="button" className="btn" disabled={ideaBusy} onClick={getIdeas}><Emoji name="sparkles" size={18} style={{ display: 'inline', verticalAlign: -4, marginRight: 6 }} />{ideaBusy ? 'Thinking…' : 'Suggest kinder thoughts'}</button>
              {ideas.map(i => <button type="button" key={i} className="reframe-card" style={{ marginTop: 8 }} onClick={() => setAlt(a => ((a ? a + '\n' : '') + i).slice(0, LIMITS.alt))}>{i}<div className="muted small">Tap to use</div></button>)}
              {ideaErr && <p role="alert" style={{ color: 'var(--danger)', margin: '8px 0 0' }}>{ideaErr}</p>}
            </>}
          </div>}
          {!good && emotions.length > 0 && alt.trim() && <div className="wiz-card">
            <div className="row spread"><span className="muted small">How strong does it feel now? (was {peak}%)</span><b>{outcome ?? peak}%</b></div>
            <input className="slider" type="range" min={0} max={100} value={outcome ?? peak} aria-label="Intensity after reframe" style={{ ['--p' as string]: `${outcome ?? peak}%` }} onChange={e => setOutcome(+e.target.value)} />
          </div>}
        </>}
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>

      <div className="wiz-foot inpage">
        <button className="btn back" aria-label="Back" onClick={() => (at === 0 ? setMood(null) : setStep(steps[at - 1]))}><ChevronLeft size={22} style={{ display: 'block' }} /></button>
        {step === 'next'
          ? <button className="btn primary" style={{ flex: 1 }} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
          : <>
            <button className="btn" style={{ flex: 1 }} disabled={saving} onClick={save}>{saving ? 'Saving…' : step === 'feel' ? 'Save mood' : 'Save'}</button>
            <button className="btn primary" style={{ flex: 1.2 }} onClick={() => setStep(steps[at + 1])}>{step === 'feel' ? 'Add a thought' : good ? 'What helped' : 'Kinder thought'}<ChevronRight size={18} style={{ display: 'inline', verticalAlign: -4, marginLeft: 2 }} /></button>
          </>}
      </div>
    </div></div>
  )
}
