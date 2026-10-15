import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } })
    error ? setErr(error.message) : setSent(true)
  }

  return (
    <div className="center-screen">
      <form className="card" style={{ width: 'min(420px, 100%)', padding: 28 }} onSubmit={submit}>
        <h1 style={{ margin: "0 0 4px" }}>Brain Pal</h1>
        <p className="muted" style={{ margin: "0 0 18px" }}>Sign in with a magic link — no password.</p>
        {sent ? <p>Check <b>{email}</b> for your sign-in link.</p> : <>
          <input className="input" type="email" required placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 12 }} />
          <button className="btn primary block" type="submit">Send link</button>
          {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
        </>}
      </form>
    </div>
  )
}
