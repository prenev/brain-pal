import assert from 'node:assert/strict'
import { addPomoTo, addTodo, cleanTodoText, DEFAULT_POMO, isPomoStep, MAX_TODO_TEXT, MAX_TODOS, nextPhase, normalizePomo, normalizeTodos, phaseMinutes, pomoStep, POMO_PRESETS, removeTodo, tidyTodos, toggleTodo } from '../src/lib/pomodoro.ts'

// rhythm
assert.equal(nextPhase('work', 1, DEFAULT_POMO), 'short'); assert.equal(nextPhase('work', 3, DEFAULT_POMO), 'short'); assert.equal(nextPhase('work', 4, DEFAULT_POMO), 'long'); assert.equal(nextPhase('work', 8, DEFAULT_POMO), 'long')
assert.equal(nextPhase('short', 4, DEFAULT_POMO), 'work'); assert.equal(nextPhase('long', 4, DEFAULT_POMO), 'work'); assert.equal(nextPhase('work', 0, DEFAULT_POMO), 'short')
assert.equal(nextPhase('work', 3, { ...DEFAULT_POMO, every: 3 }), 'long')
assert.equal(phaseMinutes('work', DEFAULT_POMO), 25); assert.equal(phaseMinutes('short', DEFAULT_POMO), 5); assert.equal(phaseMinutes('long', DEFAULT_POMO), 15)
assert.equal(new Set(POMO_PRESETS.map(p => p.id)).size, POMO_PRESETS.length); for (const p of POMO_PRESETS) assert.ok(p.s.work > p.s.short && p.s.long > p.s.short, p.id)
assert.deepEqual(normalizePomo(null), DEFAULT_POMO); assert.deepEqual(normalizePomo({ work: 9999, short: -5, long: 'x', every: 1 }), { work: 120, short: 1, long: 15, every: 2 })
assert.equal(pomoStep(null), 'Pomodoro'); assert.equal(pomoStep('Write report'), 'Pomodoro · Write report'); assert.ok(isPomoStep('Pomodoro') && isPomoStep('Pomodoro · x') && !isPomoStep('Open the tax form') && !isPomoStep('Pomodoros are great'))

// to-dos
let r = addTodo([], '  Write   the   report  ', '2026-10-16T09:00:00Z', 'a'); assert.equal(r.list[0].text, 'Write the report'); assert.equal(r.error, undefined)
assert.equal(addTodo(r.list, '   ', 'n', 'b').error, 'Write what you want to get done.'); assert.equal(addTodo(r.list, 'write THE report', 'n', 'b').error, 'That one is already on the list.')
assert.equal(cleanTodoText('x'.repeat(500)).length, MAX_TODO_TEXT)
let many = []; for (let i = 0; i < MAX_TODOS; i++) many = addTodo(many, 'task ' + i, 'n', 'id' + i).list
assert.match(addTodo(many, 'one more', 'n', 'z').error, /Keep it to 30/); assert.equal(addTodo(toggleTodo(many, 'id0', 'n'), 'one more', 'n', 'z').error, undefined, 'finishing one makes room')
const t1 = toggleTodo(r.list, 'a', '2026-10-16T10:00:00Z'); assert.equal(t1[0].done, true); assert.equal(t1[0].doneAt, '2026-10-16T10:00:00Z'); assert.equal(toggleTodo(t1, 'a', 'x')[0].doneAt, null)
assert.equal(addPomoTo(r.list, 'a')[0].pomos, 1); assert.deepEqual(addPomoTo(r.list, null), r.list); assert.deepEqual(addPomoTo(r.list, 'nope'), r.list); assert.deepEqual(removeTodo(r.list, 'a'), [])
// tidy: open first; old done items drop off
const now = Date.parse('2026-10-16T12:00:00Z')
const list = [{ id: '1', text: 'old done', done: true, createdAt: '2026-09-01T00:00:00Z', doneAt: '2026-09-02T00:00:00Z', pomos: 0 }, { id: '2', text: 'fresh done', done: true, createdAt: '2026-10-15T00:00:00Z', doneAt: '2026-10-15T00:00:00Z', pomos: 1 }, { id: '3', text: 'open older', done: false, createdAt: '2026-10-10T00:00:00Z', doneAt: null, pomos: 0 }, { id: '4', text: 'open newer', done: false, createdAt: '2026-10-14T00:00:00Z', doneAt: null, pomos: 0 }]
assert.deepEqual(tidyTodos(list, now).map(t => t.id), ['4', '3', '2'])
// junk never crashes
assert.deepEqual(normalizeTodos('x'), []); assert.deepEqual(normalizeTodos([null, 5, { id: 1 }, { id: 'a', text: '   ', createdAt: 'z' }, { id: 'b', text: ' ok ', createdAt: 'z', done: 'yes', pomos: -3 }]), [{ id: 'b', text: 'ok', done: false, createdAt: 'z', doneAt: null, pomos: 0 }])
console.log('pomodoro ok')
