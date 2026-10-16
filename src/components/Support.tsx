import { ExternalLink, Phone } from 'lucide-react'

const LINES = [
  { where: 'United States', what: 'Call or text 988 — Suicide & Crisis Lifeline', href: 'tel:988' },
  { where: 'United Kingdom & Ireland', what: 'Samaritans — 116 123 (free, 24/7)', href: 'tel:116123' },
  { where: 'Canada', what: 'Call or text 9-8-8 — Suicide Crisis Helpline', href: 'tel:988' },
  { where: 'Australia', what: 'Lifeline — 13 11 14', href: 'tel:131114' },
]

export default function Support() {
  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>You don’t have to do this alone</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Anxiety is common and very treatable. Talking to a GP, therapist or someone you trust can help — CBT in particular
          has strong evidence for anxiety. Wobbi is a self-help tool, not a substitute for professional care.
        </p>
        <p style={{ marginBottom: 0 }}><b>If you might be in danger, call your local emergency number now.</b></p>
      </div>
      <div className="list">
        {LINES.map(l => (
          <a key={l.where} className="li" href={l.href} style={{ color: 'inherit', textDecoration: 'none' }}>
            <span className="sq" style={{ background: '#3fa869' }}><Phone size={22} /></span>
            <span style={{ fontSize: 17 }}>{l.where}<br /><span className="muted" style={{ fontSize: 14 }}>{l.what}</span></span>
          </a>
        ))}
        <a className="li" href="https://findahelpline.com" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span className="sq" style={{ background: '#5e6ad2' }}><ExternalLink size={22} /></span>
          <span style={{ fontSize: 17 }}>Other countries<br /><span className="muted" style={{ fontSize: 14 }}>findahelpline.com — free, confidential</span></span>
        </a>
      </div>
    </>
  )
}
