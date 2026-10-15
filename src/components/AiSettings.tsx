import { useState } from 'react'
import { Toggle } from './ui'
import { AiError, aiSettings, connect } from '../lib/gemini'

/** Opt-in Gemini setup: explicit privacy consent + the user's own free API key (stored only on this device). */
export default function AiSettings() {
  const [s, setS] = useState(aiSettings.get)
  const [key, setKey] = useState(s.key)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = () => setS(aiSettings.get())
  async function test() {
    setBusy(true); setStatus(null)
    aiSettings.save({ key, model: key.trim() === s.key ? undefined : '' }) // a new key must re-pick its model
    try { const m = await connect(); refresh(); setStatus({ ok: true, text: `Connected — using ${m}.` }) }
    catch (e) { setStatus({ ok: false, text: e instanceof AiError ? e.message : 'Could not connect.' }) }
    finally { setBusy(false); refresh() }
  }

  return (
    <>
      <div className="card disclosure">
        <h3 style={{ marginBottom: 8 }}>Optional: AI helper (Gemini)</h3>
        <p style={{ marginTop: 0 }}>Transcribe voice memos, turn them into a thought record, and get reframe ideas. Off unless you set it up.</p>
        <p className="small" style={{ margin: '0 0 10px' }}><b>Privacy — please read.</b> When you use it, your voice memo audio or text is sent to Google’s Gemini API using <b>your own</b> free key.
          On Google’s free tier, Google may use what you send to improve its products, and human reviewers may read it. If you want your journal to stay private, leave this off.
          If you’re in the UK, EEA or Switzerland, Google’s terms may require a paid project — check before enabling.</p>
        <p className="small muted" style={{ margin: 0 }}>Brain Pal never sees your key: it stays in this browser. Entries that look like they mention self-harm are never sent.</p>
      </div>

      <div className="card">
        <Toggle label="I understand — enable AI helper" on={s.consent} onChange={on => { aiSettings.save({ consent: on }); refresh() }} />
        <label className="field" style={{ marginTop: 12 }}><span>Gemini API key</span>
          <input className="input" type="password" autoComplete="off" spellCheck={false} placeholder="Paste your key" value={key} onChange={e => setKey(e.target.value)} disabled={!s.consent} /></label>
        <p className="muted small" style={{ marginTop: -6 }}>Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>aistudio.google.com/apikey</a> (no card needed).</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn primary" disabled={!s.consent || !key.trim() || busy} onClick={test}>{busy ? 'Checking…' : 'Save & test'}</button>
          {(s.key || s.consent) && <button className="btn danger" onClick={() => { aiSettings.clear(); setKey(''); setStatus(null); refresh() }}>Remove key</button>}
        </div>
        {status && <p role="status" style={{ color: status.ok ? 'var(--accent)' : 'var(--danger)', margin: '12px 0 0' }}>{status.text}</p>}
        {s.model && !status && <p className="muted small" style={{ margin: '12px 0 0' }}>Model: {s.model}</p>}
      </div>
    </>
  )
}
