// npm test -> runs every scripts/test-*.mjs under Node (TypeScript sources imported directly) and summarises.
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const files = readdirSync(new URL('.', import.meta.url)).filter(f => /^test-.*\.mjs$/.test(f)).sort()
let failed = 0
for (const f of files) {
  const r = spawnSync(process.execPath, ['--no-warnings', '--experimental-strip-types', new URL(f, import.meta.url).pathname], { encoding: 'utf8' })
  const ok = r.status === 0
  console.log(`${ok ? '✓' : '✗'} ${f.replace(/^test-|\.mjs$/g, '')}${ok ? '' : '\n' + (r.stdout + r.stderr).trim().split('\n').map(l => '    ' + l).join('\n')}`)
  if (!ok) failed++
}
console.log(failed ? `\n${failed} of ${files.length} suites FAILED` : `\nAll ${files.length} suites passed`)
process.exit(failed ? 1 : 0)
