import assert from 'node:assert/strict'
import { dayName, monthSummary, sentences, shareText, summarize, weekSummary } from '../src/lib/summaries.ts'

const at = (day, h = 12) => `${day}T${String(h).padStart(2, '0')}:00:00`
const th = (day, mood, emotions = [], distortions = []) => ({ createdAt: at(day), mood, emotions: emotions.map(name => ({ name })), distortions })
const ses = (day, min, b = null, a = null, completed = true) => ({ createdAt: at(day), durationSec: min * 60, completed, anxietyBefore: b, anxietyAfter: a })
const wor = (day, status, reviewed = null) => ({ createdAt: at(day), status, reviewedAt: reviewed && at(reviewed) })

assert.equal(dayName('2026-10-15'), 'Thursday'); assert.equal(dayName('2027-01-01'), 'Friday')

// empty period: kind, single sentence, no zeros-as-failure
const empty = summarize({ thoughts: [], sessions: [], worries: [] }, '2026-10-15', 7)
assert.equal(empty.entries, 0); assert.equal(empty.avgMood, null)
assert.deepEqual(sentences(empty), ['Nothing logged this week — that’s okay. Whenever you’re ready, one tap is enough.'])

// a full week (Oct 9..15) vs the week before (Oct 2..8)
const data = {
  thoughts: [th('2026-10-09', 2, ['anxious', 'tired'], ['catastrophizing']), th('2026-10-10', 3, ['anxious'], ['catastrophizing', 'mind reading']), th('2026-10-12', 4, ['happy']), th('2026-10-14', 5, ['grateful', 'happy']), th('2026-10-15', 4, ['happy']),
    th('2026-10-03', 2), th('2026-10-04', 2), th('2026-09-30', 4) /* outside both windows */],
  sessions: [ses('2026-10-10', 5, 8, 4), ses('2026-10-13', 3, 7, 5), ses('2026-10-13', 4, null, null), ses('2026-10-14', 9, 6, 1, false) /* unfinished: ignored */],
  worries: [wor('2026-10-09', 'let-go', '2026-10-12'), wor('2026-10-10', 'actionable', '2026-10-13'), wor('2026-10-11', 'open'), wor('2026-10-01', 'let-go', '2026-10-02') /* before the window */],
  anchorDays: [{ day: '2026-10-13', done: 3, total: 3 }, { day: '2026-10-14', done: 2, total: 3 }, { day: '2026-10-15', done: 3, total: 3 }, { day: '2026-10-12', done: 0, total: 0 }],
}
const w = weekSummary(data, '2026-10-15')
assert.deepEqual([w.start, w.end, w.days], ['2026-10-09', '2026-10-15', 7])
assert.equal(w.entries, 5); assert.equal(w.avgMood, 3.6); assert.equal(w.prevAvgMood, 2)
assert.deepEqual(w.bestDay, { day: '2026-10-14', mood: 5 }); assert.deepEqual(w.toughestDay, { day: '2026-10-09', mood: 2 })
assert.deepEqual(w.topEmotions, ['happy', 'anxious', 'grateful']); assert.equal(w.topTrap, 'catastrophizing')
assert.deepEqual([w.calmingSessions, w.calmingMinutes, w.avgRelief], [3, 12, 3])
assert.deepEqual([w.worriesParked, w.worriesLetGo, w.worriesPlanned], [3, 1, 1])
assert.deepEqual([w.anchorsFullDays, w.anchorsTrackedDays], [2, 3], 'days with no anchors are not tracked')
assert.equal(w.activeDays, 6, 'active days (9,10,12,13,14,15) = any entry, finished session or reviewed worry; Oct 11 only parked a worry')
const text = sentences(w)
assert.equal(text[0], 'You showed up on 6 of 7 days and wrote 5 entries.')
assert.match(text[1], /^Your average mood was 3\.6 out of 5, up from 2 last week\.$/)
assert.match(text.join(' '), /best day was Wednesday \(5\) and the toughest was Friday \(2\)/)
assert.ok(text.includes('Feelings that came up most: happy, anxious and grateful.'))
assert.ok(text.includes('The thinking trap you noticed most was catastrophizing.'))
assert.ok(text.includes('You did 3 calming sessions (12 minutes), and your anxiety dropped by 3 points on average afterwards.'))
assert.ok(text.includes('You parked 3 worries and let go of 1 and made a plan for 1.'))
assert.ok(text.includes('You completed every anchor on 2 of 3 days.'))

// wording edge cases
const one = summarize({ thoughts: [th('2026-10-15', 3)], sessions: [ses('2026-10-15', 1)], worries: [wor('2026-10-15', 'open')] }, '2026-10-15', 1)
const s1 = sentences(one, 'today')
assert.equal(s1[0], 'You showed up on 1 of 1 day and wrote 1 entry.'); assert.ok(s1.includes('You did 1 calming session (1 minute).')); assert.ok(s1.includes('You parked 1 worry.'))
assert.ok(!s1.join(' ').includes('best day'), 'no best/toughest with fewer than 3 days')
// "about the same" and "down from"
const flat = summarize({ thoughts: [th('2026-10-15', 3), th('2026-10-08', 3)], sessions: [], worries: [] }, '2026-10-15', 7)
assert.match(sentences(flat)[1], /about the same as last week/)
const down = summarize({ thoughts: [th('2026-10-15', 2), th('2026-10-08', 4)], sessions: [], worries: [] }, '2026-10-15', 7)
assert.match(sentences(down)[1], /down from 4 last week/)
// no relief claim when sessions weren't rated or anxiety didn't drop
assert.ok(!sentences(summarize({ thoughts: [], sessions: [ses('2026-10-15', 2, 3, 6)], worries: [] }, '2026-10-15', 7)).join(' ').includes('dropped'))
// year boundary + month window
const ye = summarize({ thoughts: [th('2026-12-31', 4), th('2027-01-01', 2)], sessions: [], worries: [] }, '2027-01-02', 7)
assert.equal(ye.entries, 2); assert.equal(ye.start, '2026-12-27')
assert.equal(monthSummary(data, '2026-10-15').days, 30)
// share text
const st = shareText('My week', w)
assert.ok(st.startsWith('My week\n2026-10-09 – 2026-10-15\n\n• You showed up')); assert.ok(st.endsWith('not medical advice.'))
console.log('summaries: all tests passed')
