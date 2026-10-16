import assert from 'node:assert/strict'
import { keyRole, runChecks, summarize } from './check-supabase-core.mjs'

const jwt = role => `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`
const URL_ = 'https://abcdefghijklmnopqrst.supabase.co', ANON = jwt('anon'), PUB = 'sb_publishable_abc123'

/** A tiny fake Supabase. `o` flips individual behaviours so each failure mode can be tested. */
function fake(o = {}) {
  const calls = []
  const f = async (url, init = {}) => {
    const path = url.replace(URL_, ''), method = init.method ?? 'GET', auth = init.headers?.Authorization?.replace('Bearer ', ''), body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : init.body
    calls.push(`${method} ${path.split('?')[0]}`)
    if (o.down) throw new TypeError('fetch failed')
    const r = (status, data) => ({ status, text: async () => (typeof data === 'string' ? data : JSON.stringify(data)) })
    const signedIn = auth === 'USER-TOKEN'
    if (path.startsWith('/auth/v1/settings')) return o.badKey ? r(401, { message: 'Invalid API key' }) : r(200, { external: { email: o.emailOff ? false : true, google: !!o.google }, disable_signup: !!o.noSignup, mailer_autoconfirm: !!o.autoconfirm })
    if (path.startsWith('/auth/v1/token')) return body.password === 'right' ? r(200, { access_token: 'USER-TOKEN', user: { id: 'u1' } }) : r(400, { msg: o.unconfirmed ? 'Email not confirmed' : 'Invalid login credentials' })
    if (path.startsWith('/functions/v1/delete-account')) return o.noDelFn ? r(404, { message: 'not found' }) : r(401, { message: 'Missing authorization header' })
    if (path.startsWith('/functions/v1/send-reminders')) return o.reminderFn ? r(403, 'forbidden') : r(404, { message: 'not found' })
    const table = path.match(/^\/rest\/v1\/(\w+)/)?.[1]
    if (table && !signedIn) return o.noTables ? r(404, { code: 'PGRST205', message: 'Could not find the table' }) : o.leak ? r(200, [{ id: 1 }]) : o.anonOpen ? r(200, []) : r(401, { code: '42501', message: 'permission denied' })
    if (table && signedIn && method === 'POST') {
      if (table === 'thoughts' && body.user_id) return o.forgedAllowed ? r(201, []) : r(401, { code: '42501' })
      if (table === 'thoughts' && body.mood === 9) return r(400, { code: '23514' })
      if (o.worryBoom && table === 'worries') throw new TypeError('socket hang up')
      return r(201, [{ id: `${table}-1`, user_id: 'u1' }])
    }
    if (path.startsWith('/storage/v1/object/sign/')) return r(200, { signedURL: '/object/sign/x?token=1' })
    if (path.startsWith('/storage/v1/object/photos/') && method === 'POST') return path.includes('/u1/') ? r(200, { Key: 'ok' }) : o.crossFolder ? r(200, {}) : r(403, { error: 'Unauthorized' })
    if (method === 'DELETE') return r(200, {})
    return r(500, 'unexpected ' + path)
  }
  f.calls = calls
  return f
}
const run = (o, extra = {}) => { const f = fake(o); return runChecks({ url: URL_, key: PUB, fetch: f, ...extra }).then(res => Object.assign(res, { calls: f.calls })) }
const level = (res, name) => res.find(r => r.name === name || r.name.startsWith(name))?.level

/* key parsing */
assert.equal(keyRole(PUB), 'publishable'); assert.equal(keyRole(ANON), 'anon'); assert.equal(keyRole(jwt('service_role')), 'service_role'); assert.equal(keyRole('sb_secret_zzz'), 'service_role'); assert.equal(keyRole('nonsense'), 'unknown')

/* healthy project, no test account */
{ const res = await run({}); assert.deepEqual(summarize(res), { fail: 0, warn: 3 })   // warns: email confirmation, optional reminders fn, skipped round trip
  for (const t of ['thoughts', 'breath_sessions', 'worries', 'push_subscriptions', 'user_docs']) assert.equal(level(res, `Table ${t}`), 'ok')
  assert.equal(level(res, 'Function delete-account'), 'ok'); assert.equal(level(res, 'Function send-reminders'), 'warn'); assert.equal(level(res, 'Signed-in round trip'), 'warn')
  assert.ok(!res.calls.some(c => c.startsWith('POST /rest')), 'without a test account nothing is written') }

/* healthy with a test account: every step passes and everything created is deleted again */
{ const res = await run({ autoconfirm: true, reminderFn: true }, { email: 'e@x.test', password: 'right' }); assert.deepEqual(summarize(res), { fail: 0, warn: 0 })
  for (const n of ['Save a thought', 'Save a worry', 'Cannot write as another user', 'Rejects invalid data', 'Upload a photo', 'Cannot upload into', 'Signed link']) assert.equal(level(res, n), 'ok', n)
  assert.ok(res.calls.includes('DELETE /rest/v1/thoughts') && res.calls.includes('DELETE /rest/v1/worries') && res.calls.some(c => c.startsWith('DELETE /storage/v1/object/photos')), 'test data is cleaned up') }

/* cleanup still runs when a step blows up half-way */
{ const res = await run({ autoconfirm: true, worryBoom: true }, { email: 'e@x.test', password: 'right' }); assert.equal(level(res, 'Save a worry'), 'fail'); assert.ok(res.calls.includes('DELETE /rest/v1/thoughts')) }

/* each way the setup can be wrong is reported clearly */
{ const res = await run({ noTables: true }); assert.equal(res.filter(r => r.level === 'fail').length, 5); assert.match(res.find(r => r.level === 'fail').detail, /migrations/) }
{ const res = await run({ leak: true }); assert.equal(level(res, 'Table thoughts'), 'fail'); assert.match(res.find(r => r.level === 'fail').detail, /ANONYMOUS VISITORS CAN READ/) }
{ const res = await run({ anonOpen: true }); assert.equal(level(res, 'Table thoughts'), 'warn') }
{ const res = await run({ noDelFn: true }); assert.equal(level(res, 'Function delete-account'), 'fail') }
{ const res = await run({ forgedAllowed: true, autoconfirm: true }, { email: 'e@x.test', password: 'right' }); assert.equal(level(res, 'Cannot write as another user'), 'fail') }
{ const res = await run({ crossFolder: true, autoconfirm: true }, { email: 'e@x.test', password: 'right' }); assert.equal(level(res, 'Cannot upload into'), 'fail') }
{ const res = await run({ unconfirmed: true }, { email: 'e@x.test', password: 'wrong' }); assert.match(res.find(r => r.name === 'Sign in as test user').detail, /not confirmed/) }
{ const res = await run({ badKey: true }); assert.equal(res.at(-1).level, 'fail'); assert.equal(res.at(-1).name, 'API key accepted') }
{ const res = await run({ down: true }); assert.equal(res.at(-1).name, 'Reach Supabase'); assert.equal(res.at(-1).level, 'fail') }
{ const res = await run({ emailOff: true, noSignup: true, google: true }); assert.equal(level(res, 'Email sign-in'), 'fail'); assert.equal(level(res, 'Sign-ups'), 'warn'); assert.match(res.find(r => r.name === 'Social sign-in providers').detail, /google/) }

/* guard rails on the configuration itself — and no network is touched */
{ let touched = false; const spy = async () => { touched = true; throw new Error('should not be called') }
  let res = await runChecks({ url: URL_, key: jwt('service_role'), fetch: spy }); assert.equal(res.at(-1).level, 'fail'); assert.match(res.at(-1).detail, /SECRET/)
  res = await runChecks({ url: URL_, key: 'sb_secret_abc', fetch: spy }); assert.match(res.at(-1).detail, /SECRET/)
  res = await runChecks({ url: 'https://example.com', key: PUB, fetch: spy }); assert.equal(res[0].name, 'Project URL')
  res = await runChecks({ url: undefined, key: PUB, fetch: spy }); assert.equal(res[0].level, 'fail')
  res = await runChecks({ url: URL_, key: '', fetch: spy }); assert.equal(res.at(-1).name, 'Publishable key')
  assert.equal(touched, false) }
console.log('supabase-check: all tests passed')
