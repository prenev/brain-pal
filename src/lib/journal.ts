import { dayKey } from './dates.ts'
import { stripMd } from './mdlite.ts'

/** Free-writing journal, separate from the structured thought record. Pure helpers only (storage lives in extras.ts). */
export interface JournalEntry {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  body: string
  /** 1-5, optional */
  mood: number | null
  tags: string[]
  /** Id of the prompt the entry started from, if any. */
  prompt: string | null
  /** An optional voice note. The audio itself lives in IndexedDB under `ref` on the device that recorded it; only this small description syncs. */
  audio?: { ref: string; durationSec: number; mime: string; transcript: string | null } | null
}

export const MAX_TITLE = 80
export const MAX_BODY = 20000

export const PROMPTS = [
  { id: 'gratitude', text: 'Three things that went okay today' },
  { id: 'release', text: 'What is taking up space in my head right now?' },
  { id: 'tomorrow', text: 'One small thing I will do for future me' },
  { id: 'kindness', text: 'What would I tell a friend who felt this way?' },
  { id: 'win', text: 'A small win I might be overlooking' },
  { id: 'body', text: 'How does my body feel, and what does it need?' },
  { id: 'proud', text: 'Something I handled better than I would have a year ago' },
] as const
export type PromptId = (typeof PROMPTS)[number]['id']

/** A stable prompt for a given day (same all day, changes tomorrow), so it doesn't flicker on every render. */
export function pickPrompt(day: string): (typeof PROMPTS)[number] {
  let h = 0
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PROMPTS[h % PROMPTS.length]
}
export const promptText = (id: string | null) => PROMPTS.find(p => p.id === id)?.text ?? null

export const wordCount = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0)
export const isBlank = (title: string, body: string) => !title.trim() && !body.trim()

/** Trim and cap an entry's text; tags are lower-cased, de-duplicated. */
export function cleanText(title: string, body: string, tags: string[] = []) {
  return {
    title: title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE),
    body: body.replace(/\r\n/g, '\n').trim().slice(0, MAX_BODY),
    tags: [...new Set(tags.map(t => t.trim().toLowerCase()).filter(Boolean))],
  }
}

/** Every search word must appear in the title, body or a tag (case-insensitive). Empty query returns everything. */
export function searchJournal(entries: JournalEntry[], q: string): JournalEntry[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return entries
  return entries.filter(e => { const hay = `${e.title} ${e.body} ${e.tags.join(' ')}`.toLowerCase(); return terms.every(t => hay.includes(t)) })
}

export const filterByTag = (entries: JournalEntry[], tag: string | null) => (tag ? entries.filter(e => e.tags.includes(tag)) : entries)

export interface MonthGroup { key: string; entries: JournalEntry[] }
/** Newest month first, newest entry first within it. `key` is "YYYY-MM". */
export function groupByMonth(entries: JournalEntry[]): MonthGroup[] {
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const groups: MonthGroup[] = []
  for (const e of sorted) {
    const key = dayKey(e.createdAt).slice(0, 7)
    const g = groups.find(x => x.key === key)
    if (g) g.entries.push(e); else groups.push({ key, entries: [e] })
  }
  return groups
}

/** One-line preview for lists. */
export function previewOf(e: Pick<JournalEntry, 'body'>, max = 140): string {
  const flat = stripMd(e.body).replace(/\s+/g, ' ').trim()
  return flat.length <= max ? flat : `${flat.slice(0, max).trimEnd()}…`
}

export const allJournalTags = (entries: JournalEntry[]): string[] => {
  const c = new Map<string, number>(); for (const e of entries) for (const t of e.tags) c.set(t, (c.get(t) ?? 0) + 1)
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(x => x[0])
}

/** Topic ideas shown as chips above an empty page. A new random handful each time; `exclude` keeps a shuffle from repeating itself. */
export const TOPICS: { id: string; chip: string; text: string }[] = [
  { id: 't-today', chip: 'Today so far', text: 'How my day has gone so far:' },
  { id: 't-grateful', chip: 'Grateful for', text: 'Three things I’m grateful for right now:' },
  { id: 't-head', chip: 'In my head', text: 'What is taking up space in my head:' },
  { id: 't-win', chip: 'A small win', text: 'A small win I might be overlooking:' },
  { id: 't-body', chip: 'My body', text: 'How my body feels, and what it needs:' },
  { id: 't-avoid', chip: 'Avoiding', text: 'Something I’ve been avoiding, and the tiniest first step:' },
  { id: 't-friend', chip: 'Advice to a friend', text: 'What I would tell a friend who felt like this:' },
  { id: 't-tomorrow', chip: 'Tomorrow', text: 'One small thing I’ll do for future me:' },
  { id: 't-people', chip: 'People', text: 'Someone who matters to me, and why:' },
  { id: 't-work', chip: 'Work or study', text: 'What’s going on with work or study:' },
  { id: 't-proud', chip: 'Proud of', text: 'Something I handled better than I would have a year ago:' },
  { id: 't-worry', chip: 'A worry', text: 'A worry I want to put on paper:' },
  { id: 't-joy', chip: 'A good moment', text: 'A moment today that felt good, even a little:' },
  { id: 't-need', chip: 'What I need', text: 'What I need more of, and less of:' },
  { id: 't-letter', chip: 'Letter to me', text: 'Dear me,' },
  { id: 't-sleep', chip: 'Sleep', text: 'How I slept, and how I feel because of it:' },
  { id: 't-change', chip: 'One change', text: 'One thing I’d like to change, and why it matters:' },
  { id: 't-free', chip: 'Free write', text: 'Whatever comes, for two minutes without stopping:' },
]
export function pickTopics(n = 4, exclude: string[] = [], rnd: () => number = Math.random) {
  const pool = TOPICS.filter(t => !exclude.includes(t.id)); const list = pool.length >= n ? pool : TOPICS
  const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a.slice(0, n)
}
