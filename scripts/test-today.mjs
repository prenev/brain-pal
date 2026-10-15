import assert from 'node:assert/strict'
import { nextAction, rankByUse, shortList, STARTER_EMOTIONS } from '../src/lib/today.ts'

const base = { hasEntryToday: true, anchorsLeft: 0, openWorries: 0 }
assert.deepEqual(nextAction({ ...base, hasEntryToday: false, anchorsLeft: 3, openWorries: 2 }), { kind: 'mood' }, 'check in comes first')
assert.deepEqual(nextAction({ ...base, anchorsLeft: 2, openWorries: 5 }), { kind: 'anchors', left: 2 })
assert.deepEqual(nextAction({ ...base, openWorries: 5 }), { kind: 'worries', count: 5 })
assert.deepEqual(nextAction(base), { kind: 'done' })

const opts = ['happy', 'excited', 'grateful', 'tired', 'anxious', 'sad', 'stressed']
// brand-new user: starters first, in starter order, then the rest in original order
assert.deepEqual(rankByUse(opts, [], { starters: STARTER_EMOTIONS }), ['anxious', 'stressed', 'sad', 'tired', 'happy', 'grateful', 'excited'])
// your history beats the starters
const uses = [['excited', 'happy'], ['excited'], ['excited', 'tired'], ['happy']]
assert.deepEqual(rankByUse(opts, uses, { starters: STARTER_EMOTIONS }).slice(0, 4), ['excited', 'happy', 'tired', 'anxious'])
// one entry counts a name once even if repeated; only the most recent `window` entries count
assert.deepEqual(rankByUse(['a', 'b'], [['b', 'b', 'b'], ['a'], ['a']], {}), ['a', 'b'])
assert.deepEqual(rankByUse(['a', 'b'], [['b'], ['a'], ['a']], { window: 1 }), ['b', 'a'])
assert.deepEqual(rankByUse([], [['x']]), [])
// short list: top n + selected extras (only known options), no duplicates
const ranked = ['a', 'b', 'c', 'd']
assert.deepEqual(shortList(ranked, [], 2), ['a', 'b'])
assert.deepEqual(shortList(ranked, ['d', 'a', 'zzz'], 2), ['a', 'b', 'd'])
console.log('today: all tests passed')
