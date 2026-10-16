import { useMemo, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, Images, Mic, Plus, X } from 'lucide-react'
import { IconGrid } from '../components/ui'
import { PalSays } from '../components/Pal'
import VoiceRecorder from '../components/VoiceRecorder'
import NoteField, { useKeyboardInset } from '../components/NoteField'
import Support from '../components/Support'
import { AiError, aiEnabled, looksLikeCrisis, suggestReframes, type Structured } from '../lib/gemini'
import { Emoji } from '../lib/emoji'
import Face from '../components/Face'
import { EMOTIONS, REFRAME_QUESTIONS, TRAPS } from '../lib/constants'
import { MOODS } from '../lib/mood'
import { useStore } from '../lib/store'
import { rankByUse, shortList, STARTER_EMOTIONS } from '../lib/today.ts'
import type { AudioClip, EmotionRating } from '../lib/types'
import type { PoseName } from '../lib/pal.ts'

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16)
const fmtWhen = (d: Date) => {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5)
  const day = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short' })
  return `${day}, ${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })} at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

/** Short on purpose: feel → write (save from either) → optionally untangle the thought (the CBT part). */
type StepId = 'feel' | 'write' | 'kinder'
const SAY: Record<StepId, { pose: PoseName; text: string }> = {
  feel: { pose: 'idle', text: 'Which feelings are here? Pick as many as fit.' },
  write: { pose: 'think', text: 'What’s on your mind? Write it the way you thought it, or say it out loud.' },
  kinder: { pose: 'love', text: 'Now be kind: what would you tell a friend who thought this?' },
}
/** Limits that say what each box is for: one thought, not an essay (the Journal is for long writing). */
export const LIMITS = { thought: 280, situation: 140, alt: 280 } as const

export default function NewEntry({ date, onClose, onSaved, initialMood = null }: { date: Date; onClose: () => void; onSaved: () => void; initialMood?: number | null }) {
  const { addThought, allTags, thoughts } = useStore()
  const [when, setWhen] = useState(date)
  const [pickDate, setPickDate] = useState(false)
  const [mood, setMood] = useState<number | null>(initialMood)
  const [emotions, setEmotions] = useState<EmotionRating[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [allEmos, setAllEmos] = useState(false)
  const [allTagsShown, setAllTagsShown] = useState(false)
  const [situation, setSituation] = useState('')
  const [thought, setThought] = useState('')
  const [alt, setAlt] = useState('')
  const [outcome, setOutcome] = useState<number | null>(null)
  const [traps, setTraps] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [clip, setClip] = useState<AudioClip | null>(null)
  const [filled, setFilled] = useState(false)
  const [ideas, setIdeas] = useState<string[]>([])
  const [ideaBusy, setIdeaBusy] = useState(false)
  const [ideaErr, setIdeaErr] = useState('')
  const [step, setStep] = useState<StepId>('feel')
  const [showVoice, setShowVoice] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Short lists first (your most-used, else sensible starters); searching or "More" shows everything.
  const rankedEmos = useMemo(() => rankByUse(EMOTIONS, thoughts.map(t => t.emotions.map(e => e.name)), { starters: STARTER_EMOTIONS }), [thoughts])
  const rankedTags = useMemo(() => rankByUse(allTags, thoughts.map(t => t.tags)), [thoughts, allTags])
  const emoOptions = useMemo(() => (allEmos ? rankedEmos : shortList(rankedEmos, emotions.map(e => e.name))), [allEmos, rankedEmos, emotions])
  const tagOptions = useMemo(() => (allTagsShown ? rankedTags : shortList(rankedTags, tags)), [allTagsShown, rankedTags, tags])
  const peak = Math.max(0, ...emotions.map(e => e.intensity))
  const setEmos = (names: string[]) => setEmotions(names.map(n => emotions.find(e => e.name === n) ?? { name: n, intensity: 60 }))
  const addCustom = (kind: 'emotion' | 'tag') => {
    const n = prompt(kind === 'emotion' ? 'New emotion' : 'New tag')?.trim().toLowerCase()
    if (!n) return
    kind === 'emotion' ? setEmos([...emotions.map(e => e.name), n]) : setTags([...new Set([...tags, n])])
  }
  const customEmos = emotions.map(e => e.name).filter(n => !EMOTIONS.includes(n))
  const customTags = tags.filter(n => !allTags.includes(n))

  const crisis = looksLikeCrisis([thought, situation, alt, clip?.transcript ?? ''].join(' '))

  /** Merge an AI-structured transcript into the form without overwriting what the user already wrote. */
  function applyStructured(r: Structured) {
    setSituation(v => v || r.situation.slice(0, LIMITS.situation)); setThought(v => v || r.thought.slice(0, LIMITS.thought))
    setAlt(v => v || r.alternateThought.slice(0, LIMITS.alt))
    setEmotions(cur => [...cur, ...r.emotions.filter(e => !cur.some(c => c.name === e.name))])
    setTraps(cur => [...new Set([...cur, ...r.distortions])]); setTags(cur => [...new Set([...cur, ...r.tags])])
    setFilled(true)
  }

  async function getIdeas() {
    setIdeaBusy(true); setIdeaErr(''); setIdeas([])
    try {
      const r = await suggestReframes({ thought, situation, emotions: emotions.map(e => e.name) })
      if (r.crisis) { setIdeaErr('Please look at the support options above — you don’t have to handle this alone.'); return }
      setIdeas(r.reframes); setTraps(cur => [...new Set([...cur, ...r.distortions])])
      if (!r.reframes.length) setIdeaErr('No suggestions this time — try rewording the thought.')
    } catch (e) { setIdeaErr(e instanceof AiError ? e.message : 'Something went wrong. Please try again.') }
    finally { setIdeaBusy(false) }
  }

  async function save() {
    setSaving(true); setError('')
    try {
      await addThought({
        mood: mood!, createdAt: when.toISOString(), situation: situation.trim(), thought: thought.trim(), emotions,
        internalBehaviour: '', externalBehaviour: '', alternateThought: alt.trim(),
        outcomeIntensity: outcome, tags, distortions: traps, photoFiles: files, audioClip: clip,
      })
      onSaved()
    } catch (e: any) { setError(e?.message ?? 'Could not save'); setSaving(false) }
  }

  useKeyboardInset()
  // Untangling the thought is an extra step you choose; the bar shows it only once you do.
  const steps: StepId[] = ['feel', 'write', ...(step === 'kinder' ? ['kinder' as const] : [])]
  const at = Math.max(0, steps.indexOf(step))
  const go = (d: 1 | -1) => { const n = at + d; if (n < 0) setMood(null); else if (n < steps.length) setStep(steps[n]) }

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

  const mic = clip || showVoice ? null : <button type="button" className="note-mic" onClick={() => setShowVoice(true)}><Mic size={17} /> Voice memo</button>
  const voice = (showVoice || clip) && (
    <div className="wiz-voice">
      <VoiceRecorder clip={clip} onChange={c => { setClip(c); if (!c) setShowVoice(false) }} onFill={applyStructured} />
      {filled && <p role="status" style={{ color: 'var(--accent)', margin: '4px 6px', fontWeight: 800 }}>✨ Filled in from your memo. Have a look.</p>}
    </div>
  )
  return (
    <div className="overlay wiz"><div className="inner wiz-inner">
      <div className="wiz-head">
        <button className="glass round" aria-label="Close" onClick={onClose}><X size={24} /></button>
        <div className="wiz-prog" role="progressbar" aria-label="Progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={at + 1}>
          {steps.map((s, i) => <i key={s} className={i <= at ? 'on' : ''} />)}
        </div>
        <button className="wiz-face" aria-label="Change mood" onClick={() => setMood(null)}><Face mood={mood} size={42} /></button>
      </div>

      <div className="wiz-body" key={step}>
        <PalSays pose={SAY[step].pose} size={72}>{SAY[step].text}</PalSays>
        {crisis && <div role="alert"><Support /></div>}

        {step === 'feel' && <div className="wiz-card">
          <IconGrid options={[...emoOptions, ...customEmos]} value={emotions.map(e => e.name)} onChange={setEmos} />
          <div className="row spread" style={{ marginTop: 4 }}>
            <button type="button" className="linkbtn morebtn" style={{ margin: 0 }} onClick={() => setAllEmos(!allEmos)}>{allEmos ? 'Show fewer' : `More emotions (${EMOTIONS.length - emoOptions.length})`}</button>
            <button className="linkbtn" aria-label="Add emotion" onClick={() => addCustom('emotion')}><Plus size={16} style={{ display: 'inline', verticalAlign: -3 }} /> Add your own</button>
          </div>
          {emotions.length > 0 && <>
            <div className="hr" />
            <p className="muted small" style={{ margin: '0 0 8px' }}>How strong?</p>
            {emotions.map(e => (
              <div key={e.name} style={{ marginBottom: 8 }}>
                <div className="row spread"><span>{e.name}</span><b>{e.intensity}%</b></div>
                <input type="range" min={0} max={100} value={e.intensity} aria-label={`${e.name} intensity`}
                  onChange={ev => setEmotions(emotions.map(x => x.name === e.name ? { ...x, intensity: +ev.target.value } : x))} />
              </div>
            ))}
          </>}
        </div>}

        {step === 'write' && <>
          <NoteField big autoFocus label="What’s on your mind?" value={thought} onChange={setThought} max={LIMITS.thought} placeholder="e.g. Everyone will notice I messed up the demo" tools={mic} />
          {voice}
          <NoteField label="What was happening? (optional)" value={situation} onChange={setSituation} max={LIMITS.situation} placeholder="e.g. Team meeting, 3 pm" />
          <details className="wiz-extras">
            <summary>Tags and photos <span className="muted">(optional{tags.length + files.length ? ` · ${tags.length + files.length} added` : ''})</span></summary>
            <IconGrid options={[...tagOptions, ...customTags]} value={tags} onChange={setTags} />
            <div className="row spread">
              {allTags.length > 6 ? <button type="button" className="linkbtn morebtn" style={{ margin: 0 }} onClick={() => setAllTagsShown(!allTagsShown)}>{allTagsShown ? 'Show fewer' : `More tags (${Math.max(0, allTags.length - tagOptions.length)})`}</button> : <span />}
              <button className="linkbtn" aria-label="Add tag" onClick={() => addCustom('tag')}><Plus size={16} style={{ display: 'inline', verticalAlign: -3 }} /> Add your own</button>
            </div>
            <div className="photos-edit">
              <label><Camera size={22} />Take photo<input hidden type="file" accept="image/*" capture="environment" onChange={e => setFiles([...files, ...Array.from(e.target.files ?? [])])} /></label>
              <label><Images size={22} />From gallery<input hidden type="file" accept="image/*" multiple onChange={e => setFiles([...files, ...Array.from(e.target.files ?? [])])} /></label>
            </div>
            {files.length > 0 && <div className="photos">{files.map((f, i) => (
              <div key={i} style={{ position: 'relative' }}><img src={URL.createObjectURL(f)} alt="" style={{ height: 96, borderRadius: 14 }} />
                <button className="icon-btn" aria-label="Remove photo" style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, background: '#000a' }} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={16} /></button></div>))}</div>}
          </details>
          {thought.trim() && <button type="button" className="untangle" onClick={() => setStep('kinder')}>
            <Emoji name="bulb" size={30} /><span><b>Untangle this thought</b><small>Spot the thinking trap and find a kinder one · 1 min</small></span><ChevronRight size={20} />
          </button>}
        </>}

        {step === 'kinder' && <>
          <div className="wiz-quote" aria-label="Your thought">“{thought.trim()}”</div>
          <div className="wiz-card">
            <b>Does it fit a thinking trap?</b><span className="muted small"> (optional)</span>
            <div className="chips" style={{ marginTop: 10 }}>{TRAPS.map(t => (
              <button type="button" key={t.name} className={`chip ${traps.includes(t.name) ? 'on' : ''}`} aria-pressed={traps.includes(t.name)}
                onClick={() => setTraps(traps.includes(t.name) ? traps.filter(x => x !== t.name) : [...traps, t.name])}>{t.name}</button>))}</div>
            {TRAPS.filter(t => traps.includes(t.name)).slice(-1).map(t => (
              <div className="trap" key={t.name} style={{ marginTop: 10 }}><b>{t.name}</b>: {t.blurb}<div className="muted" style={{ marginTop: 4 }}>Try asking: {t.ask}</div></div>))}
          </div>
          <NoteField big autoFocus label="A kinder thought" value={alt} onChange={setAlt} max={LIMITS.alt} placeholder="What would you tell a friend? What’s the evidence?" />
          <div className="wiz-card">
            <span className="muted small">Need a nudge? Tap a question.</span>
            <div style={{ marginTop: 8 }}>{REFRAME_QUESTIONS.slice(0, 4).map(q => <button type="button" key={q} className="qbtn" onClick={() => setAlt(a => ((a ? a + '\n' : '') + q + ' ').slice(0, LIMITS.alt))}>{q}</button>)}</div>
            {aiEnabled() && !crisis && <>
              <button type="button" className="btn" disabled={ideaBusy} onClick={getIdeas}><Emoji name="sparkles" size={18} style={{ display: 'inline', verticalAlign: -4, marginRight: 6 }} />{ideaBusy ? 'Thinking…' : 'Suggest reframes'}</button>
              {ideas.map(i => <button type="button" key={i} className="reframe-card" style={{ marginTop: 8 }} onClick={() => setAlt(a => ((a ? a + '\n' : '') + i).slice(0, LIMITS.alt))}>{i}<div className="muted small">Tap to use</div></button>)}
              {ideaErr && <p role="alert" style={{ color: 'var(--danger)', margin: '8px 0 0' }}>{ideaErr}</p>}
            </>}
          </div>
          {emotions.length > 0 && alt.trim() && <div className="wiz-card">
            <div className="row spread"><span className="muted small">How strong does it feel now? (was {peak}%)</span><b>{outcome ?? peak}%</b></div>
            <input type="range" min={0} max={100} value={outcome ?? peak} aria-label="Intensity after reframe" onChange={e => setOutcome(+e.target.value)} />
          </div>}
        </>}
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>

      <div className="wiz-foot">
        <button className="btn" aria-label="Back" onClick={() => go(-1)}><ChevronLeft size={22} style={{ display: 'block' }} /></button>
        {step === 'feel' && <>
          <button className="btn" style={{ flex: 1 }} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Just save'}</button>
          <button className="btn primary" style={{ flex: 1.4 }} onClick={() => go(1)}>Write about it</button>
        </>}
        {step !== 'feel' && <button className="btn primary" style={{ flex: 1 }} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>}
      </div>
    </div></div>
  )
}
