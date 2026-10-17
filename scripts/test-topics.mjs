import assert from 'node:assert/strict'
import { analyseTopics, areasOf, AREAS, clusterDocs, docsFrom, MIN_DOCS, stem, tokens } from '../src/lib/topics.ts'

// ---- words ----
for (const group of [['worry', 'worried', 'worries', 'worrying'], ['study', 'studies', 'studied', 'studying'], ['deadline', 'deadlines'], ['sleep', 'sleeping', 'sleeps'], ['friend', 'friends']]) assert.equal(new Set(group.map(stem)).size, 1, group.join())
assert.notEqual(stem('boss'), stem('bus'), 'a double s is not a plural'); assert.equal(stem('us'), 'us'); assert.equal(stem('go'), 'go')
assert.deepEqual(tokens('I am so tired of the deadline!!'), ['tired', 'deadline'].map(stem), 'stop words and short words go')
assert.deepEqual(tokens('**Big** day\n\n- my *boss*'), ['big', 'boss'], 'Markdown markers are not words'); assert.deepEqual(tokens(''), []); assert.deepEqual(tokens('😀 😀 123 !!!'), [], 'emoji and numbers are not words')
assert.ok(tokens('今日は仕事でとても疲れました').length >= 1, 'other scripts do not crash'); assert.ok(tokens('Ça va très bien, merci'). includes('merci'))
assert.deepEqual(tokens("don't can't it's she's"), [], 'contractions are stop words')

// ---- areas ----
assert.deepEqual(areasOf('My boss moved the deadline again'), ['work']); assert.ok(areasOf('I could not sleep, so tired').includes('sleep')); assert.deepEqual(areasOf('the sky was blue'), [])
assert.ok(areasOf('I hate myself sometimes').includes('selfworth'), 'a phrase counts'); assert.ok(areasOf('Rent is due and the bank called').includes('money'))
assert.deepEqual(areasOf('My mum and my boss'), ['work', 'family'], 'more than one area, in lexicon order'); assert.ok(areasOf('Worrying about money').includes('stress'))
assert.equal(new Set(AREAS.map(a => a.id)).size, AREAS.length); assert.ok(AREAS.every(a => a.words.length >= 8 && a.name && a.emoji))

// ---- a corpus ----
const NOW = new Date('2026-10-16T12:00:00')
const day = n => { const d = new Date(NOW); d.setDate(d.getDate() - n); const p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
let id = 0
const D = (n, text, mood = null) => ({ id: 'd' + ++id, at: `${day(n)}T10:00:00`, text, mood, source: 'journal' })
const workTexts = ['My boss added another deadline and the meeting ran long', 'Stressful project meeting with the client, the deadline feels impossible', 'Email from my manager about the presentation deadline', 'Colleague dropped the project on me, deadline tomorrow', 'Boss meeting went badly, I am behind on the deadline', 'Another long meeting about the client project deadline']
const sleepTexts = ['Could not sleep again, so tired, awake until four', 'Nightmare woke me and I was exhausted all day', 'Slept badly, tired and low energy, need a nap', 'Insomnia is back, awake in bed', 'Slept ten hours and finally feel rested']
const famTexts = ['Dinner with mum and dad was lovely', 'My sister called, we talked for hours about the family trip', 'Dad visited and we walked in the garden', 'Mum made soup and we watched a movie as a family']
const corpus = [
  ...workTexts.map((t, i) => D(2 + i * 3, t, 2)),            // work: spread over the last weeks, low mood
  ...sleepTexts.map((t, i) => D(5 + i * 9, t, 3)),
  ...famTexts.map((t, i) => D(12 + i * 15, t, 4)),
]
const snapshot = JSON.stringify(corpus)
const r = analyseTopics(corpus, NOW)
assert.equal(JSON.stringify(corpus), snapshot, 'the input is not changed'); assert.deepEqual(analyseTopics(corpus, NOW), r, 'deterministic')
assert.equal(r.ready, true); assert.equal(r.docs, corpus.length); assert.equal(r.needed, MIN_DOCS); assert.equal(r.from, day(Math.max(2 + 5 * 3, 5 + 4 * 9, 12 + 3 * 15)))
assert.equal(r.overallMood, Math.round(((2 * 6 + 3 * 5 + 4 * 4) / 15) * 10) / 10)
const area = id => r.areas.find(a => a.id === id)
assert.equal(r.areas[0].id, 'work', 'the most written-about area leads'); assert.equal(area('work').count, 6); assert.equal(area('work').share, 6 / 15); assert.equal(area('work').mood, 2); assert.ok(area('sleep').count >= 5); assert.equal(area('sleep').mood, 3)
assert.ok(area('family').count >= 4, 'family is found'); assert.ok(r.areas.every((a, i, all) => i === 0 || all[i - 1].count >= a.count), 'sorted by how often')
assert.ok(area('work').words.includes('deadline') || area('work').words.includes('deadlines'), 'with the words that put it there')
// weekly counts: 12 weeks, oldest first, the newest week is last
assert.equal(area('work').weekly.length, 12); assert.equal(area('work').weekly.reduce((a, b) => a + b, 0), 6, 'all six work notes fall in the last twelve weeks'); assert.ok(area('work').weekly[11] >= 1, 'a note two days ago is in this week or last')
assert.deepEqual(analyseTopics([...corpus, D(200, 'My boss and the deadline', 2)], NOW).areas.find(a => a.id === 'work').weekly.reduce((a, b) => a + b, 0), 6, 'older than twelve weeks is left out of the weekly chart')
// trends: three work notes in the last 28 days and none before → up; a quiet area is flat
const recentWork = [0, 3, 6, 9].map(n => D(n, 'Deadline and a boss meeting at work again', 2)), older = [0, 1, 2, 3, 4, 5].map(n => D(70 + n, 'Quiet walk and a good book', 4))
const t2 = analyseTopics([...recentWork, ...older, D(12, 'Slept badly', 3), D(13, 'Mum called', 4)], NOW)
assert.equal(t2.areas.find(a => a.id === 'work').trend, 'up'); assert.deepEqual(t2.rising.map(a => a.id), ['work']); assert.equal(t2.areas.find(a => a.id === 'joy')?.trend, 'flat')
const fading = analyseTopics([...[40, 42, 44, 46].map(n => D(n, 'Deadline at work, boss meeting', 3)), ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => D(n, 'Quiet walk and a good book', 4))], NOW)
assert.equal(fading.areas.find(a => a.id === 'work').trend, 'down')
// heavier: an area whose notes are clearly lower than your average
assert.deepEqual(r.heavier.map(a => a.id), ['work'], 'work is heavier than your average mood'); assert.ok(r.heavier.every(a => a.count >= 4 && a.mood <= r.overallMood - 0.5))
// themes in your own words
assert.ok(r.themes.length >= 2, 'at least two themes'); assert.ok(r.themes.every(t => t.count >= 3 && t.words.length >= 2 && t.label.includes(' · ')))
assert.ok(r.themes.some(t => t.words.some(w => /deadline|meeting|project/.test(w))), 'one is about the work notes'); assert.ok(r.themes.some(t => t.words.some(w => /sleep|tired|awake|slept/.test(w))), 'one is about sleep')
assert.ok(r.keywords.length >= 5 && r.keywords[0].count >= r.keywords.at(-1).count); assert.ok(r.keywords.some(k => /deadline/.test(k.word)))
// clustering itself: two clearly different groups end up apart
const A = workTexts.map(tokens), B = sleepTexts.map(tokens), lab = clusterDocs([...A, ...B], 2)
assert.equal(new Set(lab.slice(0, 6)).size, 1, 'work notes together'); const sl = lab.slice(6).filter(x => x >= 0); assert.ok(sl.length >= 3 && new Set(sl).size === 1, 'sleep notes together (a note sharing no words with the others stays out)'); assert.notEqual(lab[0], sl[0]); assert.ok(lab.every(x => x >= -1))
assert.deepEqual(clusterDocs([['a'], ['b']], 3), [0, 0], 'too few notes: one group, no crash'); assert.deepEqual(clusterDocs([], 2), [])

// ---- guards ----
const few = analyseTopics(corpus.slice(0, MIN_DOCS - 1), NOW); assert.equal(few.ready, false); assert.equal(few.docs, MIN_DOCS - 1); assert.deepEqual(few.areas, []); assert.ok(few.from)
assert.equal(analyseTopics([], NOW).ready, false); assert.equal(analyseTopics([], NOW).from, null)
assert.equal(analyseTopics([...corpus, D(1, '   ', 3), D(1, '', 3)], NOW).docs, corpus.length, 'blank notes are ignored')
const long = 'deadline meeting boss '.repeat(5000); const t0 = Date.now(); analyseTopics([...corpus, D(1, long, 2)], NOW); assert.ok(Date.now() - t0 < 3000, 'a huge note does not hang')
const big = Array.from({ length: 800 }, (_, i) => D(i % 300, [workTexts, sleepTexts, famTexts][i % 3][i % 4], 2 + (i % 3))); const t1 = Date.now(); assert.equal(analyseTopics(big, NOW).ready, true); assert.ok(Date.now() - t1 < 4000, '800 notes analyse quickly')
assert.equal(analyseTopics(corpus.map(d => ({ ...d, mood: null })), NOW).overallMood, null); assert.deepEqual(analyseTopics(corpus.map(d => ({ ...d, mood: null })), NOW).heavier, [], 'no moods, nothing to compare')

// ---- from the app's data ----
const dd = docsFrom({ thoughts: [{ id: 't', createdAt: 'x', mood: 2, situation: 'at work', thought: 'I will fail', alternateThought: 'I can try' }, { id: 't0', createdAt: 'y', mood: 0, situation: '', thought: 'hi', alternateThought: '' }], journal: [{ id: 'j', createdAt: 'z', mood: null, title: 'Tue', body: '# Big day' }], worries: [{ id: 'w', createdAt: 'w', text: 'rent' }] })
assert.deepEqual(dd.map(d => [d.id, d.source, d.mood]), [['t', 'thought', 2], ['t0', 'thought', null], ['j', 'journal', null], ['w', 'worry', null]]); assert.match(dd[0].text, /at work.*I will fail.*I can try/)
console.log('topics: all tests passed')
