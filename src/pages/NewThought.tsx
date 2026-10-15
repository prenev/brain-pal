import { useState } from 'react'
import { Chips, Sheet } from '../components/ui'
import { EMOTIONS, DISTORTIONS_HINT } from '../lib/constants'
import { useStore } from '../lib/store'
import type { EmotionRating } from '../lib/types'

const STEPS = ['Thought', 'Feeling', 'Reaction', 'Reframe']

export default function NewThought({ onClose }: { onClose: () => void }) {
  const { addThought, allTags } = useStore()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [situation, setSituation] = useState('')
  const [thought, setThought] = useState('')
  const [emotions, setEmotions] = useState<EmotionRating[]>([])
  const [internal, setInternal] = useState('')
  const [external, setExternal] = useState('')
  const [alt, setAlt] = useState('')
  const [outcome, setOutcome] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const setEmos = (names: string[]) =>
    setEmotions(names.map(n => emotions.find(e => e.name === n) ?? { name: n, intensity: 60 }))
  const canNext = step === 0 ? thought.trim().length > 0 : true
  const peak = Math.max(0, ...emotions.map(e => e.intensity))

  async function save() {
    setSaving(true); setError('')
    try {
      await addThought({
        situation: situation.trim(), thought: thought.trim(), emotions,
        internalBehaviour: internal.trim(), externalBehaviour: external.trim(),
        alternateThought: alt.trim(), outcomeIntensity: outcome, tags, photoFiles: files,
      })
      onClose()
    } catch (e: any) { setError(e?.message ?? 'Could not save'); setSaving(false) }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="row spread">
        <h2 style={{ margin: 0 }}>{STEPS[step]}</h2>
        <button className="btn" style={{ padding: '8px 14px' }} onClick={onClose}>Close</button>
      </div>
      <div className="progress">{STEPS.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>

      {step === 0 && <>
        <label className="field"><span>Situation (optional)</span>
          <textarea className="input" value={situation} onChange={e => setSituation(e.target.value)} placeholder="What was happening?" /></label>
        <label className="field"><span>The thought</span>
          <textarea className="input" autoFocus value={thought} onChange={e => setThought(e.target.value)} placeholder="What went through your mind?" /></label>
      </>}

      {step === 1 && <>
        <p className="muted">What emotions came with it? Rate each one.</p>
        <Chips options={EMOTIONS} value={emotions.map(e => e.name)} onChange={setEmos} />
        <div style={{ marginTop: 18 }}>
          {emotions.map(e => (
            <div className="emo-row" key={e.name}>
              <div className="row spread"><span>{e.name}</span><b>{e.intensity}%</b></div>
              <input type="range" min={0} max={100} value={e.intensity} aria-label={`${e.name} intensity`}
                onChange={ev => setEmotions(emotions.map(x => x.name === e.name ? { ...x, intensity: +ev.target.value } : x))} />
            </div>
          ))}
        </div>
      </>}

      {step === 2 && <>
        <label className="field"><span>Internal reaction</span>
          <textarea className="input" value={internal} onChange={e => setInternal(e.target.value)} placeholder="Body sensations, urges, what you told yourself next…" /></label>
        <label className="field"><span>External behaviour</span>
          <textarea className="input" value={external} onChange={e => setExternal(e.target.value)} placeholder="What did you actually do or say?" /></label>
      </>}

      {step === 3 && <>
        <label className="field"><span>Alternate thought</span>
          <textarea className="input" value={alt} onChange={e => setAlt(e.target.value)} placeholder={DISTORTIONS_HINT[Math.floor(Date.now() / 6e4) % DISTORTIONS_HINT.length]} /></label>
        {emotions.length > 0 && <div className="field">
          <span style={{ display: 'block', fontSize: 13, fontWeight: 650, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 4px 6px' }}>
            How strong is the feeling now? (was {peak}%)</span>
          <input type="range" min={0} max={100} value={outcome ?? peak} aria-label="Intensity after reframe" onChange={e => setOutcome(+e.target.value)} />
          <div className="muted small" style={{ textAlign: 'right' }}>{outcome ?? peak}%</div>
        </div>}
        <div className="field"><span>Tags</span>
          <Chips options={[...allTags, ...tags.filter(t => !allTags.includes(t))]} value={tags} onChange={setTags} />
          <form className="row" style={{ marginTop: 10 }} onSubmit={e => { e.preventDefault(); const t = customTag.trim().toLowerCase(); if (t && !tags.includes(t)) setTags([...tags, t]); setCustomTag('') }}>
            <input className="input" value={customTag} onChange={e => setCustomTag(e.target.value)} placeholder="Add your own tag" />
            <button className="btn" type="submit">Add</button>
          </form>
        </div>
        <div className="field"><span>Photos</span>
          <input type="file" accept="image/*" multiple onChange={e => setFiles([...files, ...Array.from(e.target.files ?? [])])} />
          {files.length > 0 && <div className="muted small" style={{ marginTop: 6 }}>{files.length} photo{files.length > 1 ? 's' : ''} attached</div>}
        </div>
      </>}

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      <div className="row" style={{ marginTop: 8 }}>
        {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3
          ? <button className="btn primary" style={{ flex: 1 }} disabled={!canNext} onClick={() => setStep(step + 1)}>Next</button>
          : <button className="btn primary" style={{ flex: 1 }} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save entry'}</button>}
      </div>
    </Sheet>
  )
}
