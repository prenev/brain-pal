// Tests supabase/migrations against a real Postgres: replays them from scratch, then checks row-level security between two users, constraints, defaults, storage rules and cascades.
// Needs: psql + a superuser connection in TEST_DATABASE_URL (CI provides one; locally e.g. a throwaway `postgres` container).
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import assert from 'node:assert/strict'

const base = process.env.TEST_DATABASE_URL
if (!base) { console.log('db: skipped (set TEST_DATABASE_URL to a superuser Postgres URL to run the migration + RLS tests)'); process.exit(0) }

const dir = new URL('../supabase/', import.meta.url).pathname
const urlFor = db => { const u = new URL(base); u.pathname = '/' + db; return u.toString() }
const psql = (url, args, input) => spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-t', '-A', ...args], { encoding: 'utf8', input })
const run = (db, file) => { const r = psql(urlFor(db), ['-f', file]); assert.equal(r.status, 0, `${file.split('/').slice(-2).join('/')} failed:\n${r.stderr}`); return r.stdout }
const q = (db, sql) => { const r = psql(urlFor(db), ['-c', sql]); assert.equal(r.status, 0, r.stderr); return r.stdout.trim() }
const migrations = readdirSync(dir + 'migrations').filter(f => f.endsWith('.sql')).sort().map(f => dir + 'migrations/' + f)

const dbs = []
const fresh = name => { const db = `bp_${name}_${process.pid}`; dbs.push(db); assert.equal(psql(urlFor('postgres'), ['-c', `create database ${db}`]).status, 0, 'cannot create test database'); run(db, dir + 'tests/stubs.sql'); return db }
try {
  // 1. fresh project: replay every migration in order, then the behavioural tests
  const a = fresh('fresh'); migrations.forEach(m => run(a, m))
  assert.match(run(a, dir + 'tests/rls.sql'), /rls: all checks passed/)

  // 2. migration files follow the Supabase CLI naming (<14-digit version>_<name>.sql) so the GitHub integration accepts them
  for (const f of readdirSync(dir + 'migrations')) assert.match(f, /^\d{14}_[a-z0-9_]+\.sql$/, `bad migration file name: ${f}`)
  assert.ok(migrations.length >= 1)

  console.log('db: all tests passed')
} finally {
  for (const db of dbs) psql(urlFor('postgres'), ['-c', `drop database if exists ${db} with (force)`])
}
