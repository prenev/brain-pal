import assert from 'node:assert/strict'
import { allJournalTags, cleanText, filterByTag, groupByMonth, isBlank, MAX_BODY, MAX_TITLE, pickPrompt, previewOf, PROMPTS, promptText, searchJournal, wordCount } from '../src/lib/journal.ts'

const e = (id, createdAt, title, body, tags = []) => ({ id, createdAt, updatedAt: createdAt, title, body, mood: null, tags, prompt: null })

// prompts: deterministic per day, valid, and they do change across days
assert.equal(pickPrompt('2026-10-15').id, pickPrompt('2026-10-15').id)
const seen = new Set(Array.from({ length: 30 }, (_, i) => pickPrompt(`2026-10-${String(i + 1).padStart(2, '0')}`).id))
assert.ok(seen.size >= 4, 'rotates through several prompts'); for (const id of seen) assert.ok(PROMPTS.some(p => p.id === id))
assert.equal(promptText('kindness'), 'What would I tell a friend who felt this way?'); assert.equal(promptText('nope'), null); assert.equal(promptText(null), null)

// word count / blank
assert.equal(wordCount(''), 0); assert.equal(wordCount('   \n '), 0); assert.equal(wordCount(' one  two\nthree '), 3)
assert.equal(isBlank('  ', '\n'), true); assert.equal(isBlank('t', ''), false); assert.equal(isBlank('', 'b'), false)

// cleaning: whitespace, caps, tags lower-cased & unique, CRLF
const c = cleanText('  My   day \n', ' a\r\nb ', ['Work', ' work ', '', 'Sleep'])
assert.deepEqual(c, { title: 'My day', body: 'a\nb', tags: ['work', 'sleep'] })
assert.equal(cleanText('x'.repeat(500), '').title.length, MAX_TITLE); assert.equal(cleanText('', 'y'.repeat(MAX_BODY + 50)).body.length, MAX_BODY)

// search: AND of words, case-insensitive, searches title/body/tags, empty = all
const list = [e('1', '2026-10-15T10:00:00', 'Quiet morning', 'Walked by the river', ['nature']), e('2', '2026-10-14T10:00:00', 'Deadline', 'Worried about the report', ['work']), e('3', '2026-09-30T10:00:00', '', 'River again, better mood', [])]
assert.deepEqual(searchJournal(list, '').map(x => x.id), ['1', '2', '3']); assert.deepEqual(searchJournal(list, '   ').map(x => x.id), ['1', '2', '3'])
assert.deepEqual(searchJournal(list, 'RIVER').map(x => x.id), ['1', '3']); assert.deepEqual(searchJournal(list, 'river mood').map(x => x.id), ['3'])
assert.deepEqual(searchJournal(list, 'work').map(x => x.id), ['2'], 'tags are searched'); assert.deepEqual(searchJournal(list, 'zzz'), [])
assert.deepEqual(filterByTag(list, 'nature').map(x => x.id), ['1']); assert.equal(filterByTag(list, null), list)

// month groups: newest first, year boundary
const g = groupByMonth([...list, e('4', '2025-12-31T23:30:00', 'NYE', 'x'), e('5', '2026-01-01T00:30:00', 'NY', 'y')])
assert.deepEqual(g.map(x => x.key), ['2026-10', '2026-09', '2026-01', '2025-12'])
assert.deepEqual(g[0].entries.map(x => x.id), ['1', '2'])
assert.deepEqual(groupByMonth([]), [])

// preview
assert.equal(previewOf({ body: 'short  text\nhere' }), 'short text here'); assert.equal(previewOf({ body: 'a'.repeat(200) }, 10), 'aaaaaaaaaa…'); assert.equal(previewOf({ body: '' }), '')

// tags by frequency then name
assert.deepEqual(allJournalTags([e('1', 'x', '', '', ['b', 'a']), e('2', 'x', '', '', ['b']), e('3', 'x', '', '', ['c'])]), ['b', 'a', 'c'])
console.log('journal: all tests passed')

// ---- formatting toolbar (Markdown-lite) ----
import { applyFormat, parseInline, parseMd, stripMd } from '../src/lib/mdlite.ts'
import { pickTopics, TOPICS } from '../src/lib/journal.ts'
{
  const f = (t, a, b, k) => applyFormat(t, a, b, k)
  assert.deepEqual(f('hello world', 6, 11, 'bold'), { text: 'hello **world**', start: 8, end: 13 })
  assert.deepEqual(f('hello **world**', 8, 13, 'bold'), { text: 'hello world', start: 6, end: 11 }, 'bold toggles off (selection inside the markers)')
  assert.equal(f('hello **world**', 6, 15, 'bold').text, 'hello world', 'bold toggles off (selection includes the markers)')
  assert.deepEqual(f('hi', 2, 2, 'italic'), { text: 'hi**', start: 3, end: 3 }, 'no selection: markers go in, cursor sits between')
  assert.equal(f('a\nb\nc', 0, 5, 'bullet').text, '- a\n- b\n- c'); assert.equal(f('- a\n- b', 0, 7, 'bullet').text, 'a\nb', 'bullets toggle off')
  assert.equal(f('a\nb', 0, 3, 'number').text, '1. a\n2. b'); assert.equal(f('x', 0, 1, 'heading').text, '# x'); assert.equal(f('- x', 0, 3, 'quote').text, '> x', 'a line format replaces another')
  assert.equal(f('one\ntwo', 5, 5, 'quote').text, 'one\n> two', 'only the lines touched change')
  assert.deepEqual(parseInline('a **b** *c* ~~d~~'), [{ t: 'text', v: 'a ' }, { t: 'b', c: [{ t: 'text', v: 'b' }] }, { t: 'text', v: ' ' }, { t: 'i', c: [{ t: 'text', v: 'c' }] }, { t: 'text', v: ' ' }, { t: 's', c: [{ t: 'text', v: 'd' }] }])
  assert.deepEqual(parseInline('2 * 3 * 4'), [{ t: 'text', v: '2 * 3 * 4' }], 'spaced stars are maths, not italics'); assert.deepEqual(parseInline('**open'), [{ t: 'text', v: '**open' }])
  const blocks = parseMd('# Title\n\nSome *text*\nmore\n\n- a\n- b\n\n1. x\n2. y\n\n> quote\n---')
  assert.deepEqual(blocks.map(b => b.t), ['h', 'p', 'ul', 'ol', 'quote', 'hr']); assert.equal(blocks[2].items.length, 2)
  // markup is data, never HTML: nothing in the output can carry a tag
  assert.deepEqual(parseMd('<img src=x onerror=alert(1)>')[0], { t: 'p', c: [{ t: 'text', v: '<img src=x onerror=alert(1)>' }] })
  assert.equal(stripMd('# Hi\n**bold** and *it* ~~no~~\n- item\n> q'), 'Hi\nbold and it no\nitem\nq')
  assert.equal(previewOf({ body: '**Great** day\n- walked' }), 'Great day walked', 'list previews show words, not markers')
}
// ---- topic chips ----
{
  assert.equal(new Set(TOPICS.map(t => t.id)).size, TOPICS.length); assert.ok(TOPICS.length >= 16)
  const a = pickTopics(4, [], () => 0.1), b = pickTopics(4, a.map(t => t.id), () => 0.1)
  assert.equal(a.length, 4); assert.ok(b.every(t => !a.some(x => x.id === t.id)), 'a shuffle never repeats what was just shown')
  assert.equal(new Set(Array.from({ length: 40 }, () => pickTopics(4).map(t => t.id).join())).size > 5, true, 'a different handful each time')
}
console.log('journal formatting + topics ok')

// ---- calendar ribbon helpers ----
{
  const { weekStart, weekOf, infoByDay, monthGrid, shiftMonth, filterByDay } = await import('../src/lib/journalCal.ts')
  assert.equal(weekStart('2026-10-16'), '2026-10-12', 'Friday → that week’s Monday'); assert.equal(weekStart('2026-10-12'), '2026-10-12'); assert.equal(weekStart('2026-10-18'), '2026-10-12', 'Sunday belongs to the week before Monday')
  assert.deepEqual(weekOf('2026-10-16'), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'])
  assert.deepEqual(weekOf('2026-12-31').slice(0, 1).concat(weekOf('2026-12-31').slice(-1)), ['2026-12-28', '2027-01-03'], 'across the year boundary')
  const e = (id, day, mood, h = 10) => ({ id, createdAt: new Date(`${day}T${String(h).padStart(2, '0')}:00:00`).toISOString(), updatedAt: '', title: '', body: 'x', mood, tags: [], prompt: null })
  const list = [e('a', '2026-10-15', 4), e('b', '2026-10-15', 2, 18), e('c', '2026-10-14', null), e('d', '2026-10-13', 5)]
  const info = infoByDay(list)
  assert.deepEqual(info.get('2026-10-15'), { day: '2026-10-15', count: 2, mood: 3 }); assert.equal(info.get('2026-10-14').mood, null, 'an entry without a mood has none'); assert.equal(info.get('2026-10-13').mood, 5); assert.equal(info.has('2026-10-16'), false)
  const g = monthGrid('2026-10'); assert.equal(g.length, 42); assert.equal(g[0].day, '2026-09-28'); assert.equal(g[0].inMonth, false); assert.equal(g.find(x => x.day === '2026-10-01').inMonth, true); assert.equal(g.filter(x => x.inMonth).length, 31); assert.equal(g[0].day, weekStart('2026-10-01'))
  assert.equal(monthGrid('2026-02').filter(x => x.inMonth).length, 28)
  assert.equal(shiftMonth('2026-01', -1), '2025-12'); assert.equal(shiftMonth('2026-12', 1), '2027-01'); assert.equal(shiftMonth('2026-10', 0), '2026-10')
  assert.deepEqual(filterByDay(list, '2026-10-15').map(x => x.id), ['a', 'b']); assert.equal(filterByDay(list, null).length, 4); assert.equal(filterByDay(list, '2026-01-01').length, 0)
  console.log('journal calendar ok')
}
