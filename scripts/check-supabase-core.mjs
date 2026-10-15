// Logic for `npm run check:supabase` (network injected so it can be unit-tested). Returns [{ level: 'ok'|'warn'|'fail', name, detail }].
export const TABLES = ['thoughts', 'breath_sessions', 'worries', 'push_subscriptions', 'user_docs']

const b64json = s => { try { return JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) } catch { return null } }
export const keyRole = key => (key.startsWith('sb_publishable_') ? 'publishable' : key.startsWith('sb_secret_') ? 'service_role' : b64json(key.split('.')[1] ?? '')?.role ?? 'unknown')

export async function runChecks({ url, key, fetch, email, password }) {
  const out = []
  const add = (level, name, detail = '') => out.push({ level, name, detail })
  const base = (url ?? '').replace(/\/+$/, '')

  // 1. configuration
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
    return [{ level: 'fail', name: 'Project URL', detail: `"${url ?? ''}" doesn't look like https://<project-ref>.supabase.co — set VITE_SUPABASE_URL in .env` }]
  add('ok', 'Project URL', base)
  if (!key) return [...out, { level: 'fail', name: 'Publishable key', detail: 'VITE_SUPABASE_ANON_KEY is empty — paste the sb_publishable_… key (or the legacy anon key) into .env' }]
  const role = keyRole(key)
  if (role === 'service_role') return [...out, { level: 'fail', name: 'Key type', detail: 'This is a SECRET (service_role) key. Never put it in the app or .env — it bypasses all security. Use the publishable/anon key.' }]
  add(role === 'publishable' || role === 'anon' ? 'ok' : 'warn', 'Key type', role === 'unknown' ? 'unrecognised key format' : role)

  const call = async (path, init = {}, token = key) => {
    try {
      const res = await fetch(base + path, { ...init, headers: { apikey: key, Authorization: `Bearer ${token}`, ...(init.body && typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) } })
      const text = await res.text(); let body = null; try { body = JSON.parse(text) } catch { body = text }
      return { status: res.status, body }
    } catch (e) { return { status: 0, body: String(e?.message ?? e) } }
  }

  // 2. reachability + auth settings
  const settings = await call('/auth/v1/settings')
  if (settings.status === 0) return [...out, { level: 'fail', name: 'Reach Supabase', detail: `network error: ${settings.body}` }]
  if (settings.status === 401 || settings.status === 403) return [...out, { level: 'fail', name: 'API key accepted', detail: 'Supabase rejected the key — copy it again from Project Settings → API Keys' }]
  if (settings.status !== 200) return [...out, { level: 'fail', name: 'Auth service', detail: `unexpected HTTP ${settings.status}` }]
  add('ok', 'API key accepted')
  const s = settings.body ?? {}
  add(s.external?.email === false ? 'fail' : 'ok', 'Email sign-in', s.external?.email === false ? 'email provider is disabled (Authentication → Providers)' : 'enabled')
  if (s.disable_signup) add('warn', 'Sign-ups', 'new sign-ups are disabled — nobody can create an account')
  add(s.mailer_autoconfirm ? 'ok' : 'warn', 'Email confirmation', s.mailer_autoconfirm ? 'off: new users can sign in immediately' : 'on: new users must click the email link first (needs working email delivery; Supabase\'s built-in sender is heavily rate-limited)')
  const oauth = Object.entries(s.external ?? {}).filter(([k, v]) => v && !['email', 'phone', 'anonymous_users'].includes(k)).map(([k]) => k)
  add('ok', 'Social sign-in providers', oauth.length ? oauth.join(', ') : 'none enabled (fine — the app uses email + password)')

  // 3. tables exist and are locked to anonymous visitors
  for (const t of TABLES) {
    const r = await call(`/rest/v1/${t}?select=*&limit=1`)
    const code = r.body?.code
    if (r.status === 404 || code === 'PGRST205') add('fail', `Table ${t}`, 'missing — the migrations have not been applied to this project')
    else if ((r.status === 401 || r.status === 403) && code === '42501') add('ok', `Table ${t}`, 'exists, anonymous access denied')
    else if (r.status === 200 && Array.isArray(r.body) && r.body.length > 0) add('fail', `Table ${t}`, 'ANONYMOUS VISITORS CAN READ ROWS — row-level security is broken')
    else if (r.status === 200) add('warn', `Table ${t}`, 'readable by anon but empty (RLS hides rows). Run the migrations to revoke anon access.')
    else add('fail', `Table ${t}`, `unexpected response HTTP ${r.status}: ${JSON.stringify(r.body).slice(0, 120)}`)
  }

  // 4. edge functions
  for (const [fn, want, optional] of [['delete-account', [401], false], ['send-reminders', [401, 403], true]]) {
    const r = await call(`/functions/v1/${fn}`, { method: 'POST', body: '{}' }, key)
    if (r.status === 404) add(optional ? 'warn' : 'fail', `Function ${fn}`, optional ? 'not deployed (only needed for web-push reminders)' : 'not deployed — "Delete account" in the app will fail')
    else if (want.includes(r.status)) add('ok', `Function ${fn}`, `deployed and refuses unauthenticated calls (HTTP ${r.status})`)
    else if (r.status === 200) add('fail', `Function ${fn}`, 'deployed but answered an unauthenticated call with 200')
    else add('warn', `Function ${fn}`, `HTTP ${r.status}: ${JSON.stringify(r.body).slice(0, 100)}`)
  }

  // 5. optional: a real round trip as a test user
  if (!email || !password) { add('warn', 'Signed-in round trip', 'skipped — set CHECK_EMAIL and CHECK_PASSWORD (a throwaway account) to also test saving data, photos and isolation'); return out }
  const login = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (login.status !== 200) {
    const msg = login.body?.msg ?? login.body?.error_description ?? JSON.stringify(login.body).slice(0, 100)
    add('fail', 'Sign in as test user', /confirm/i.test(msg) ? 'email not confirmed yet — open the link Supabase emailed, then re-run' : msg)
    return out
  }
  const token = login.body.access_token, uid = login.body.user?.id
  add('ok', 'Sign in as test user', uid)
  const as = (path, init) => call(path, init, token)
  const created = { thought: null, worry: null, file: `${uid}/check-${Date.now()}.jpg` }
  try {
    const t = await as('/rest/v1/thoughts', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ mood: 4, thought: 'check:supabase', emotions: [{ name: 'calm', intensity: 50 }], tags: ['check'] }) })
    created.thought = t.body?.[0]?.id
    add(t.status === 201 && t.body?.[0]?.user_id === uid ? 'ok' : 'fail', 'Save a thought', t.status === 201 ? 'saved with the right owner' : `HTTP ${t.status} ${JSON.stringify(t.body).slice(0, 120)}`)
    const w = await as('/rest/v1/worries', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ text: 'check:supabase' }) })
    created.worry = w.body?.[0]?.id
    add(w.status === 201 ? 'ok' : 'fail', 'Save a worry', w.status === 201 ? 'saved' : `HTTP ${w.status}`)
    const forged = await as('/rest/v1/thoughts', { method: 'POST', body: JSON.stringify({ user_id: '00000000-0000-0000-0000-000000000000', thought: 'forged' }) })
    add([401, 403].includes(forged.status) ? 'ok' : 'fail', 'Cannot write as another user', [401, 403].includes(forged.status) ? 'blocked by row-level security' : `HTTP ${forged.status} — SHOULD have been refused`)
    const bad = await as('/rest/v1/thoughts', { method: 'POST', body: JSON.stringify({ thought: 'x', mood: 9 }) })
    add(bad.status === 400 || bad.status === 409 ? 'ok' : 'fail', 'Rejects invalid data', bad.status === 400 || bad.status === 409 ? 'mood 9 refused by a database check' : `HTTP ${bad.status}`)
    const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')
    const up = await as(`/storage/v1/object/photos/${created.file}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: jpeg })
    add(up.status === 200 ? 'ok' : 'fail', 'Upload a photo to your private folder', up.status === 200 ? 'uploaded' : `HTTP ${up.status} ${JSON.stringify(up.body).slice(0, 120)}`)
    const other = await as(`/storage/v1/object/photos/00000000-0000-0000-0000-000000000000/x.jpg`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: jpeg })
    add(other.status !== 200 ? 'ok' : 'fail', "Cannot upload into someone else's folder", other.status !== 200 ? 'refused' : 'SHOULD have been refused')
    const signed = await as(`/storage/v1/object/sign/photos/${created.file}`, { method: 'POST', body: JSON.stringify({ expiresIn: 60 }) })
    add(signed.status === 200 && signed.body?.signedURL ? 'ok' : 'fail', 'Signed link for the photo', signed.status === 200 ? 'created' : `HTTP ${signed.status}`)
  } finally {   // always clean up what we created
    if (created.thought) await as(`/rest/v1/thoughts?id=eq.${created.thought}`, { method: 'DELETE' })
    if (created.worry) await as(`/rest/v1/worries?id=eq.${created.worry}`, { method: 'DELETE' })
    await as(`/storage/v1/object/photos/${created.file}`, { method: 'DELETE' })
  }
  return out
}

export const summarize = results => ({ fail: results.filter(r => r.level === 'fail').length, warn: results.filter(r => r.level === 'warn').length })
