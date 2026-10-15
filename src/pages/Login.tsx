import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../lib/store'
import Face from '../components/Face'

type Mode = 'signin' | 'signup' | 'link' | 'forgot' | 'recovery'
const OAUTH = ((import.meta.env.VITE_OAUTH_PROVIDERS as string | undefined) ?? '').split(',').map(s => s.trim()).filter(Boolean) as ('google' | 'apple')[]
const TITLES: Record<Mode, string> = { signin: 'Welcome back', signup: 'Create your account', link: 'Email me a link', forgot: 'Reset password', recovery: 'Choose a new password' }

export default function Login() {
  const { recovery, clearRecovery } = useStore()
  const [mode, setMode] = useState<Mode>(recovery ? 'recovery' : 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const auth = supabase!.auth
  const go = (m: Mode) => { setMode(m); setErr(''); setInfo('') }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true)
    try {
      let error: { message: string } | null = null
      if (mode === 'signin') ({ error } = await auth.signInWithPassword({ email, password }))
      else if (mode === 'signup') {
        const r = await auth.signUp({ email, password, options: { data: { name: name.trim() }, emailRedirectTo: location.origin } })
        error = r.error
        if (!error && !r.data.session) setInfo(`Check ${email} to confirm your account, then sign in.`)
      } else if (mode === 'link') {
        ({ error } = await auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } }))
        if (!error) setInfo(`Sign-in link sent to ${email}.`)
      } else if (mode === 'forgot') {
        ({ error } = await auth.resetPasswordForEmail(email, { redirectTo: location.origin }))
        if (!error) setInfo(`Password reset link sent to ${email}.`)
      } else {
        ({ error } = await auth.updateUser({ password }))
        if (!error) clearRecovery()
      }
      if (error) setErr(error.message)
    } catch (x: any) { setErr(x?.message ?? 'Something went wrong') }
    setBusy(false)
  }

  const needsEmail = mode !== 'recovery'
  const needsPw = mode === 'signin' || mode === 'signup' || mode === 'recovery'
  const cta = { signin: 'Sign in', signup: 'Create account', link: 'Send link', forgot: 'Send reset link', recovery: 'Update password' }[mode]

  return (
    <div className="center-screen">
      <form className="card" style={{ width: 'min(420px, 100%)', padding: 26 }} onSubmit={submit}>
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10 }}><Face mood={5} size={64} /></div>
        <h1 style={{ margin: '0 0 4px', textAlign: 'center', fontSize: 28 }}>Brain Pal</h1>
        <p className="muted" style={{ margin: '0 0 20px', textAlign: 'center' }}>{TITLES[mode]}</p>

        {mode === 'signup' && <label className="field"><span>Name</span>
          <input className="input" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?" /></label>}
        {needsEmail && <label className="field"><span>Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></label>}
        {needsPw && <label className="field"><span>{mode === 'recovery' ? 'New password' : 'Password'}</span>
          <input className="input" type="password" required minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>}

        {err && <p role="alert" style={{ color: 'var(--danger)', margin: '0 0 12px' }}>{err}</p>}
        {info && <p role="status" style={{ color: 'var(--accent)', margin: '0 0 12px' }}>{info}</p>}
        <button className="btn primary block" type="submit" disabled={busy}>{busy ? 'Please wait…' : cta}</button>

        {OAUTH.length > 0 && mode !== 'recovery' && <>
          <div className="hr" />
          {OAUTH.map(p => (
            <button key={p} type="button" className="btn block" style={{ marginBottom: 8 }}
              onClick={() => auth.signInWithOAuth({ provider: p, options: { redirectTo: location.origin } })}>
              Continue with {p === 'apple' ? 'Apple' : 'Google'}
            </button>
          ))}
        </>}

        <div className="muted small" style={{ textAlign: 'center', marginTop: 16, display: 'grid', gap: 8 }}>
          {mode === 'signin' && <>
            <span>New here? <a href="#" onClick={e => { e.preventDefault(); go('signup') }} style={{ color: 'var(--accent)' }}>Create an account</a></span>
            <span><a href="#" onClick={e => { e.preventDefault(); go('forgot') }} style={{ color: 'var(--accent)' }}>Forgot password?</a> · <a href="#" onClick={e => { e.preventDefault(); go('link') }} style={{ color: 'var(--accent)' }}>Email me a link</a></span>
          </>}
          {mode !== 'signin' && mode !== 'recovery' && <a href="#" onClick={e => { e.preventDefault(); go('signin') }} style={{ color: 'var(--accent)' }}>Back to sign in</a>}
        </div>
      </form>
    </div>
  )
}
