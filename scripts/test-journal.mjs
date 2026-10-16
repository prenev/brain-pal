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
