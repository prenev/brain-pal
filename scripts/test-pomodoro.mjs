import assert from 'node:assert/strict'
import { IDLE_RUN, normalizeRun, pomoStats, addPomoTo, addTodo, cleanTodoText, DEFAULT_POMO, isPomoStep, MAX_TODO_TEXT, MAX_TODOS, nextPhase, normalizePomo, normalizeTodos, phaseMinutes, pomoStep, POMO_PRESETS, removeTodo, tidyTodos, toggleTodo } from '../src/lib/pomodoro.ts'

// rhythm
assert.equal(nextPhase('work', 1, DEFAULT_POMO), 'short'); assert.equal(nextPhase('work', 3, DEFAULT_POMO), 'short'); assert.equal(nextPhase('work', 4, DEFAULT_POMO), 'long'); assert.equal(nextPhase('work', 8, DEFAULT_POMO), 'long')
assert.equal(nextPhase('short', 4, DEFAULT_POMO), 'work'); assert.equal(nextPhase('long', 4, DEFAULT_POMO), 'work'); assert.equal(nextPhase('work', 0, DEFAULT_POMO), 'short')
assert.equal(nextPhase('work', 3, { ...DEFAULT_POMO, every: 3 }), 'long')
assert.equal(phaseMinutes('work', DEFAULT_POMO), 25); assert.equal(phaseMinutes('short', DEFAULT_POMO), 5); assert.equal(phaseMinutes('long', DEFAULT_POMO), 15)
assert.equal(new Set(POMO_PRESETS.map(p => p.id)).size, POMO_PRESETS.length); for (const p of POMO_PRESETS) assert.ok(p.s.work > p.s.short && p.s.long > p.s.short, p.id)
assert.deepEqual(normalizePomo(null), DEFAULT_POMO); assert.deepEqual(normalizePomo({ work: 9999, short: -5, long: 'x', every: 1, autoFocus: 'yes', goal: 99 }), { work: 120, short: 1, long: 15, every: 2, autoBreak: true, autoFocus: false, bell: true, goal: 12, block: false })
assert.deepEqual(normalizePomo({ ...DEFAULT_POMO, autoFocus: true, bell: false }), { ...DEFAULT_POMO, autoFocus: true, bell: false })
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

// the run survives a restart; junk never crashes
assert.deepEqual(normalizeRun(null), IDLE_RUN); assert.deepEqual(normalizeRun('x'), IDLE_RUN)
const run = { phase: 'short', taskId: 'a', timer: { status: 'running', totalMs: 300000, accumulatedMs: 1000, startedAt: 5 } }
assert.deepEqual(normalizeRun(JSON.parse(JSON.stringify(run))), run)
assert.equal(normalizeRun({ phase: 'weird', timer: { status: 'finished', totalMs: 5, accumulatedMs: 0, startedAt: null } }).timer, null, 'a finished/invalid timer is dropped'); assert.equal(normalizeRun({ phase: 'weird' }).phase, 'work')
assert.equal(normalizeRun({ timer: { status: 'running', totalMs: 5, accumulatedMs: 0, startedAt: null } }).timer, null, 'running without a start time is invalid'); assert.equal(normalizeRun({ timer: { status: 'paused', totalMs: 5, accumulatedMs: 2, startedAt: null } }).timer.accumulatedMs, 2)

// stats
const at = (d, h = 10) => new Date(2026, 9, d, h).toISOString(), blk = (d, task = null, sec = 1500, done = true) => ({ createdAt: at(d), actualSec: sec, completed: done, step: pomoStep(task) })
const now2 = new Date(2026, 9, 16, 15)
const st = pomoStats([blk(16, 'Report'), blk(16, 'Report'), blk(16), blk(15, 'Email'), blk(14, 'Report'), blk(10), blk(16, 'x', 600, false), { createdAt: at(16), actualSec: 1500, completed: true, step: 'Open the tax form' }], now2, 4)
assert.deepEqual(st.today, { blocks: 3, minutes: 75, goal: 4, goalMet: false }); assert.equal(st.week.length, 7); assert.equal(st.week.at(-1).blocks, 3); assert.equal(st.week[0].day, '2026-10-10'); assert.equal(st.week[0].blocks, 1); assert.equal(st.week[1].blocks, 0)
assert.equal(st.streak, 3, '14th, 15th and 16th'); assert.deepEqual(st.total, { blocks: 6, minutes: 150 }, 'unfinished and non-pomodoro sessions are not counted'); assert.deepEqual(st.best, { day: '2026-10-16', blocks: 3 })
assert.deepEqual(st.tasks, [{ task: 'Report', blocks: 3 }, { task: 'Email', blocks: 1 }])
assert.equal(pomoStats([blk(16), blk(16), blk(16), blk(16)], now2, 4).today.goalMet, true)
assert.equal(pomoStats([blk(15), blk(14)], now2, 4).streak, 2, 'nothing yet today: yesterday still counts'); assert.equal(pomoStats([blk(13)], now2, 4).streak, 0); assert.equal(pomoStats([], now2, 4).best, null)
console.log('pomodoro ok')

// the clock keeps going while the app is closed
{
  const { catchUp, plan } = await import('../src/lib/pomodoro.ts')
  const { startTimer, pauseTimer } = await import('../src/lib/focus.ts')
  const t0 = Date.parse('2026-10-16T12:00:00Z'), m = 60_000, S = DEFAULT_POMO
  const work = { phase: 'work', taskId: 'x', timer: startTimer(25, t0) }
  assert.deepEqual(catchUp(work, S, 0, t0 + 10 * m), { run: work, finished: [] }, 'still running: nothing to do')
  let c = catchUp(work, S, 0, t0 + 27 * m)
  assert.equal(c.finished.length, 1); assert.equal(c.finished[0].end, t0 + 25 * m, 'finished when it really ended'); assert.equal(c.finished[0].taskId, 'x')
  assert.equal(c.run.phase, 'short'); assert.equal(c.run.timer.startedAt, t0 + 25 * m, 'the break started at the end of the block, not when the app woke up')
  c = catchUp(work, S, 0, t0 + 40 * m)
  assert.equal(c.finished.length, 2); assert.equal(c.run.phase, 'work'); assert.equal(c.run.timer, null, 'after the break the next block waits (autoFocus off)')
  c = catchUp(work, { ...S, autoFocus: true }, 0, t0 + 57 * m)
  assert.deepEqual(c.finished.map(f => f.phase), ['work', 'short', 'work']); assert.equal(c.run.phase, 'short', 'two blocks and a break later, in the second break'); assert.equal(c.run.timer.startedAt, t0 + 55 * m)
  c = catchUp(work, { ...S, autoFocus: true }, 3, t0 + 26 * m); assert.equal(c.run.phase, 'long', 'the 4th block of the day earns the long break')
  assert.equal(catchUp(work, { ...S, autoBreak: false }, 0, t0 + 90 * m).run.timer, null, 'no auto break: stops after the block')
  const paused = { ...work, timer: pauseTimer(work.timer, t0 + 5 * m) }; assert.equal(catchUp(paused, S, 0, t0 + 999 * m).finished.length, 0, 'a paused clock never runs out')
  assert.equal(catchUp({ ...work, timer: startTimer(25, t0) }, { ...S, autoFocus: true, work: 1, short: 1 }, 0, t0 + 1e9).finished.length, 200, 'bounded')
  // plan
  let pl = plan(work, S, 0, t0 + 5 * m)
  assert.deepEqual(pl.map(x => [x.phase, (x.start - t0) / m, (x.end - t0) / m]), [['work', 0, 25], ['short', 25, 30]], 'block, then the auto break, then it waits')
  pl = plan(work, { ...S, autoFocus: true }, 2, t0)
  assert.deepEqual(pl.slice(0, 5).map(x => x.phase), ['work', 'short', 'work', 'long', 'work']); assert.equal(pl.length, 8)
  assert.deepEqual(plan(paused, S, 0, t0), []); assert.deepEqual(plan(IDLE_RUN, S, 0, t0), [])
  assert.deepEqual(plan(work, { ...S, autoBreak: false }, 0, t0).length, 1)
}
console.log('pomodoro background ok')

// blocking apps during focus
{
  const { shouldBlock, normalizePomo: np } = await import('../src/lib/pomodoro.ts')
  const { startTimer, pauseTimer } = await import('../src/lib/focus.ts')
  const on = { ...DEFAULT_POMO, block: true }, t = startTimer(25, 0)
  assert.equal(DEFAULT_POMO.block, false, 'off until you choose apps'); assert.equal(np({ block: 'yes' }).block, false); assert.equal(np({ block: true }).block, true)
  assert.equal(shouldBlock({ phase: 'work', taskId: null, timer: t }, on), true, 'a running focus block blocks')
  assert.equal(shouldBlock({ phase: 'work', taskId: null, timer: pauseTimer(t, 5) }, on), true, 'a paused block is still a block')
  assert.equal(shouldBlock({ phase: 'short', taskId: null, timer: t }, on), false, 'breaks open the apps')
  assert.equal(shouldBlock({ phase: 'long', taskId: null, timer: t }, on), false)
  assert.equal(shouldBlock({ phase: 'work', taskId: null, timer: null }, on), false, 'idle: nothing blocked')
  assert.equal(shouldBlock({ phase: 'work', taskId: null, timer: t }, DEFAULT_POMO), false, 'switched off: nothing blocked')
}
console.log('pomodoro blocking ok')
