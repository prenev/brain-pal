import { useMemo, useState } from 'react'
import { Camera, Check, ChevronLeft, ChevronUp, Images, Plus, Search, X } from 'lucide-react'
import { IconGrid } from '../components/ui'
import VoiceRecorder from '../components/VoiceRecorder'
import Support from '../components/Support'
import { AiError, aiEnabled, looksLikeCrisis, suggestReframes, type Structured } from '../lib/gemini'
import { Emoji } from '../lib/emoji'
import Face from '../components/Face'
import { EMOTIONS, REFRAME_QUESTIONS, TRAPS } from '../lib/constants'
import { MOODS } from '../lib/mood'
import { useStore } from '../lib/store'
import type { AudioClip, EmotionRating } from '../lib/types'

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16)
const fmtWhen = (d: Date) => {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5)
  const day = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short' })
  return `${day}, ${d.getDate()} ${d.toLocaleDateString(undefined, { month: 'short' })} at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

export default function NewEntry({ date, onClose, onSaved, initialMood = null }: { date: Date; onClose: () => void; onSaved: () => void; initialMood?: number | null }) {
  const { addThought, allTags } = useStore()
  const [when, setWhen] = useState(date)
  const [pickDate, setPickDate] = useState(false)
  const [mood, setMood] = useState<number | null>(initialMood)
  const [emotions, setEmotions] = useState<EmotionRating[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [emoOpen, setEmoOpen] = useState(true)
  const [tagOpen, setTagOpen] = useState(true)
  const [situation, setSituation] = useState('')
  const [thought, setThought] = useState('')
  const [internal, setInternal] = useState('')
  const [external, setExternal] = useState('')
  const [alt, setAlt] = useState('')
  const [outcome, setOutcome] = useState<number | null>(null)
  const [traps, setTraps] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [clip, setClip] = useState<AudioClip | null>(null)
  const [filled, setFilled] = useState(false)
  const [ideas, setIdeas] = useState<string[]>([])
  const [ideaBusy, setIdeaBusy] = useState(false)
  const [ideaErr, setIdeaErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const match = (o: string) => !q || o.includes(q.toLowerCase())
  const emoOptions = useMemo(() => EMOTIONS.filter(match), [q])
  const tagOptions = useMemo(() => allTags.filter(match), [q, allTags])
  const peak = Math.max(0, ...emotions.map(e => e.intensity))
  const setEmos = (names: string[]) => setEmotions(names.map(n => emotions.find(e => e.name === n) ?? { name: n, intensity: 60 }))
  const addCustom = (kind: 'emotion' | 'tag') => {
    const n = prompt(kind === 'emotion' ? 'New emotion' : 'New tag')?.trim().toLowerCase()
    if (!n) return
    kind === 'emotion' ? setEmos([...emotions.map(e => e.name), n]) : setTags([...new Set([...tags, n])])
  }
  const customEmos = emotions.map(e => e.name).filter(n => !EMOTIONS.includes(n) && match(n))
  const customTags = tags.filter(n => !allTags.includes(n) && match(n))

  const crisis = looksLikeCrisis([thought, situation, internal, external, alt, clip?.transcript ?? ''].join(' '))

  /** Merge an AI-structured transcript into the form without overwriting what the user already wrote. */
  function applyStructured(r: Structured) {
    setSituation(v => v || r.situation); setThought(v => v || r.thought)
    setInternal(v => v || r.internalBehaviour); setExternal(v => v || r.externalBehaviour); setAlt(v => v || r.alternateThought)
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
        internalBehaviour: internal.trim(), externalBehaviour: external.trim(), alternateThought: alt.trim(),
        outcomeIntensity: outcome, tags, distortions: traps, photoFiles: files, audioClip: clip,
      })
      onSaved()
    } catch (e: any) { setError(e?.message ?? 'Could not save'); setSaving(false) }
  }

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

  return (
    <div className="overlay"><div className="inner">
      <div className="topbar" style={{ background: 'linear-gradient(#000 70%, transparent)' }}>
        <div className="glass pill-btn" style={{ padding: '0 10px 0 6px', gap: 4 }}>
          <button className="round" aria-label="Back" style={{ width: 40, color: 'var(--accent)' }} onClick={onClose}><ChevronLeft size={26} /></button>
          <button aria-label="Change mood" onClick={() => setMood(null)}><Face mood={mood} size={38} /></button>
        </div>
        <button className="glass pill-btn" disabled={saving} onClick={save}>
          <span className="round" style={{ width: 40, height: 40, background: 'var(--accent)', color: '#04130a' }}><Check size={22} /></span>{saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="searchbar"><Search size={22} /><input placeholder="Search emotions & tags…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <h1 style={{ textAlign: 'center', fontSize: 28, margin: '24px 0' }}>What’s going on?</h1>

      <div className="card">
        <div className="card-head"><h3 style={{ fontWeight: 500 }}>Emotions</h3>
          <div className="row"><button className="icon-btn dark" aria-label="Add emotion" onClick={() => addCustom('emotion')}><Plus size={22} /></button>
            <button className="icon-btn dark" aria-label="Collapse" onClick={() => setEmoOpen(!emoOpen)}><ChevronUp size={22} style={{ transform: emoOpen ? '' : 'rotate(180deg)' }} /></button></div></div>
        {emoOpen && <IconGrid options={[...emoOptions, ...customEmos]} value={emotions.map(e => e.name)} onChange={setEmos} />}
        {emoOpen && emotions.length > 0 && <>
          <div className="hr" />
          {emotions.map(e => (
            <div key={e.name} style={{ marginBottom: 6 }}>
              <div className="row spread"><span>{e.name}</span><b>{e.intensity}%</b></div>
              <input type="range" min={0} max={100} value={e.intensity} aria-label={`${e.name} intensity`}
                onChange={ev => setEmotions(emotions.map(x => x.name === e.name ? { ...x, intensity: +ev.target.value } : x))} />
            </div>
          ))}
        </>}
      </div>

      <div className="card">
        <div className="card-head"><h3 style={{ fontWeight: 500 }}>Tags</h3>
          <div className="row"><button className="icon-btn dark" aria-label="Add tag" onClick={() => addCustom('tag')}><Plus size={22} /></button>
            <button className="icon-btn dark" aria-label="Collapse" onClick={() => setTagOpen(!tagOpen)}><ChevronUp size={22} style={{ transform: tagOpen ? '' : 'rotate(180deg)' }} /></button></div></div>
        {tagOpen && <IconGrid options={[...tagOptions, ...customTags]} value={tags} onChange={setTags} />}
      </div>

      {crisis && <div role="alert"><Support /></div>}

      <VoiceRecorder clip={clip} onChange={setClip} onFill={applyStructured} />
      {filled && <p role="status" style={{ color: 'var(--accent)', margin: '-6px 6px 14px', fontWeight: 800 }}>✨ Filled in from your memo — review and edit below.</p>}

      <div className="card">
        <div className="card-head"><h3 style={{ fontWeight: 500 }}>Thought record</h3></div>
        <label className="field"><span>Situation</span><textarea className="input" value={situation} onChange={e => setSituation(e.target.value)} placeholder="What was happening?" /></label>
        <label className="field"><span>The thought</span><textarea className="input" value={thought} onChange={e => setThought(e.target.value)} placeholder="What went through your mind?" /></label>
        <div className="field"><span>Thinking traps — does this thought fit any?</span>
          <div className="chips">{TRAPS.map(t => (
            <button type="button" key={t.name} className={`chip ${traps.includes(t.name) ? 'on' : ''}`} aria-pressed={traps.includes(t.name)}
              onClick={() => setTraps(traps.includes(t.name) ? traps.filter(x => x !== t.name) : [...traps, t.name])}>{t.name}</button>))}</div>
          {TRAPS.filter(t => traps.includes(t.name)).map(t => (
            <div className="trap" key={t.name} style={{ marginTop: 8 }}><b>{t.name}</b> — {t.blurb}<div className="muted" style={{ marginTop: 4 }}>Try asking: {t.ask}</div></div>))}
        </div>
        <label className="field"><span>Internal reaction</span><textarea className="input" value={internal} onChange={e => setInternal(e.target.value)} placeholder="Body sensations, urges, what you told yourself…" /></label>
        <label className="field"><span>External behaviour</span><textarea className="input" value={external} onChange={e => setExternal(e.target.value)} placeholder="What did you actually do or say?" /></label>
        <div className="field"><span>Questions that help you reframe (tap to add)</span>
          {REFRAME_QUESTIONS.map(q => <button type="button" key={q} className="qbtn" onClick={() => setAlt(a => (a ? a + '\n' : '') + q + ' ')}>{q}</button>)}
        </div>
        {aiEnabled() && !crisis && thought.trim() && <div className="field">
          <button type="button" className="btn" disabled={ideaBusy} onClick={getIdeas}><Emoji name="sparkles" size={18} style={{ display: 'inline', verticalAlign: -4, marginRight: 6 }} />{ideaBusy ? 'Thinking…' : 'Suggest reframes'}</button>
          {ideas.map(i => <button type="button" key={i} className="reframe-card" style={{ marginTop: 8 }} onClick={() => setAlt(a => (a ? a + '\n' : '') + i)}>{i}<div className="muted small">Tap to use</div></button>)}
          {ideaErr && <p role="alert" style={{ color: 'var(--danger)', margin: '8px 0 0' }}>{ideaErr}</p>}
        </div>}
        <label className="field"><span>Alternate thought</span><textarea className="input" value={alt} onChange={e => setAlt(e.target.value)} placeholder="What would you tell a friend? What’s the evidence?" /></label>
        {emotions.length > 0 && alt.trim() && <div>
          <div className="row spread"><span className="muted small">Feeling now (was {peak}%)</span><b>{outcome ?? peak}%</b></div>
          <input type="range" min={0} max={100} value={outcome ?? peak} aria-label="Intensity after reframe" onChange={e => setOutcome(+e.target.value)} />
        </div>}
      </div>

      <div className="row" style={{ margin: '22px 6px 12px' }}><Camera size={26} /><span style={{ fontSize: 20 }}>Photo</span></div>
      <div className="photos-edit">
        <label><Camera size={24} />Take Photo<input hidden type="file" accept="image/*" capture="environment" onChange={e => setFiles([...files, ...Array.from(e.target.files ?? [])])} /></label>
        <label><Images size={24} />From Gallery<input hidden type="file" accept="image/*" multiple onChange={e => setFiles([...files, ...Array.from(e.target.files ?? [])])} /></label>
      </div>
      {files.length > 0 && <div className="photos">{files.map((f, i) => (
        <div key={i} style={{ position: 'relative' }}><img src={URL.createObjectURL(f)} alt="" style={{ height: 96, borderRadius: 14 }} />
          <button className="icon-btn" aria-label="Remove photo" style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, background: '#000a' }} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={16} /></button></div>))}</div>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
    </div></div>
  )
}
