// App <-> database contract: every table/column the cloud code touches must exist in supabase/migrations.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const root = new URL('../', import.meta.url).pathname
const sql = readdirSync(root + 'supabase/migrations').sort().map(f => readFileSync(root + 'supabase/migrations/' + f, 'utf8')).join('\n')

// schema: table -> columns, from create table + add column
const schema = {}
for (const [, t, body] of sql.matchAll(/create table if not exists public\.(\w+) \(([\s\S]*?)\n\);/g))
  schema[t] = new Set(body.split('\n').map(l => l.trim().match(/^(\w+) /)?.[1]).filter(Boolean))
for (const [, t, c] of sql.matchAll(/alter table public\.(\w+) add column if not exists (\w+)/g)) schema[t].add(c)
assert.deepEqual(Object.keys(schema).sort(), ['breath_sessions', 'push_subscriptions', 'thoughts', 'worries'])

const files = { 'src/lib/repo.ts': ['thoughts', 'breath_sessions', 'worries'], 'src/lib/push.ts': ['push_subscriptions'], 'supabase/functions/send-reminders/index.ts': ['push_subscriptions', 'thoughts', 'breath_sessions'] }
const everyColumn = new Set(Object.values(schema).flatMap(s => [...s]))
const tablesUsed = new Set()
for (const [file, expected] of Object.entries(files)) {
  const code = readFileSync(root + file, 'utf8')
  for (const [, t] of code.matchAll(/\.from\('(\w+)'\)/g)) if (t !== 'photos') { tablesUsed.add(t); assert.ok(schema[t], `${file}: table "${t}" is not in the migrations`) }
  for (const t of expected) assert.ok(code.includes(`from('${t}')`), `${file} should use ${t}`)
  // every snake_case identifier that looks like a column must be a real column (or a table name)
  const allowed = new Set([...everyColumn, ...Object.keys(schema), 'last_run'])
  const bad = [...new Set([...code.matchAll(/\b([a-z]+(?:_[a-z]+)+)\b/g)].map(m => m[1]))].filter(w => !allowed.has(w) && !/^(sb_|no_|is_|set_|on_|use_|get_)/.test(w))
  assert.deepEqual(bad, [], `${file} mentions snake_case names missing from the schema: ${bad}`)
}

// the storage bucket the app uploads to exists, is private, and has the right per-user folder rule
assert.match(sql, /insert into storage\.buckets[\s\S]*'photos', 'photos', false/)
assert.match(sql, /storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/)
assert.ok(readFileSync(root + 'src/lib/repo.ts', 'utf8').includes("`${user!.id}/${uid()}"), 'uploads must go under "<uid>/"')

// the reminder function is called by the database scheduler (no user JWT), so it must not require one
const toml = readFileSync(root + 'supabase/config.toml', 'utf8')
assert.match(toml, /\[functions\.send-reminders\]\s*\n\s*verify_jwt = false/)
assert.match(toml, /\[functions\.delete-account\]\s*\n\s*verify_jwt = true/)
assert.match(toml, /brainpal:\/\/auth/, 'iPhone auth redirect must be allowed')
console.log('contract: all tests passed')
