import assert from 'node:assert/strict'
import { reviewQueue, worryStats } from '../src/lib/worries.ts'

const w = (id, status, createdAt = '2026-10-10T10:00:00Z') => ({ id, status, createdAt, text: id, action: null, reviewedAt: null })
assert.deepEqual(worryStats([]), { open: 0, letGo: 0, actionable: 0, reviewed: 0, letGoPct: null })
assert.deepEqual(worryStats([w('a', 'open'), w('b', 'let-go'), w('c', 'let-go'), w('d', 'actionable'), w('e', 'let-go')]),
  { open: 1, letGo: 3, actionable: 1, reviewed: 4, letGoPct: 75 })
assert.equal(worryStats([w('a', 'open')]).letGoPct, null)           // nothing reviewed yet: no percentage
assert.deepEqual(reviewQueue([w('new', 'open', '2026-10-12T00:00:00Z'), w('done', 'let-go'), w('old', 'open', '2026-10-01T00:00:00Z')]).map(x => x.id), ['old', 'new'])
console.log('worries: all tests passed')
