import { stripMd } from './mdlite.ts'
import { dayKey, shift } from './dates.ts'
import { weekStart } from './journalCal.ts'

/**
 * On-device topic modelling: what do you keep writing about? No network, no AI helper, no model download. Plain statistics over your own words:
 *  - AREAS: a small, readable lexicon of life areas (work, family, sleep, money …). A note belongs to an area when it uses that area's words.
 *  - THEMES: groups of notes that use similar words in your own language (TF-IDF vectors + k-means), named by their most telling words.
 *  - KEYWORDS: the words you come back to most.
 * It describes patterns in what you wrote. It is not a diagnosis and says nothing about why. Pure and deterministic; tested in scripts/test-topics.mjs.
 */
export interface TopicDoc { id: string; at: string; text: string; mood: number | null; source: 'thought' | 'journal' | 'worry' }

/* ------------------------------ text → terms ------------------------------ */
const STOP = new Set(`a about above after again all also am an and any are aren't as at be because been before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself just let's like me more most mustn't my myself no nor not now of off on once only or other ought our ours ourselves out over own really same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's will with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves
get got getting go going gone went come came make made know knew think thought feel felt feeling want wanted need needed say said tell told see saw look looked thing things something anything everything nothing one two much many lot lots even still back way well yeah yes okay ok today day days time times maybe kind sort bit little little never always sometimes often already though although since yet else around away next last first able
am pm will would shall might may must also` .split(/\s+/))

/** Light stemmer: enough to treat worry / worried / worries / worrying as one word. */
const IRREGULAR: Record<string, string> = { slept: 'sleep', woke: 'wake', ate: 'eat', fought: 'fight', lost: 'lose', ran: 'run', felt: 'feel', thought: 'think' }
export function stem(w: string): string {
  if (IRREGULAR[w]) return stem(IRREGULAR[w])
  let s = w
  if (s.length > 4 && s.endsWith('ies')) s = s.slice(0, -3) + 'y'
  else if (s.length > 5 && s.endsWith('ing')) { s = s.slice(0, -3); if (/(.)\1$/.test(s)) s = s.slice(0, -1) }
  else if (s.length > 4 && s.endsWith('ed')) { s = s.slice(0, -2); if (/(.)\1$/.test(s)) s = s.slice(0, -1) }
  else if (s.length > 4 && s.endsWith('es') && /(ss|sh|ch|x|z)es$/.test(s)) s = s.slice(0, -2)
  else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us')) s = s.slice(0, -1)
  if (s.length > 3 && s.endsWith('y') && !w.endsWith('ey')) s = s.slice(0, -1) + 'i'     // worry / worri(ed) meet
  return s
}

export function tokens(text: string): string[] {
  const words = stripMd(text).toLowerCase().replace(/[’']/g, "'").match(/[\p{L}][\p{L}']*/gu) ?? []
  return words.map(w => w.replace(/'s$/, '').replace(/^'+|'+$/g, '')).filter(w => w.length >= 3 && !STOP.has(w) && !STOP.has(w.replace(/'/g, ''))).map(stem).filter(w => w.length >= 3)
}

/* ---------------------------------- areas ---------------------------------- */
export interface AreaDef { id: string; name: string; emoji: string; words: string[]; phrases?: string[] }
export const AREAS: AreaDef[] = [
  { id: 'work', name: 'Work & study', emoji: 'work', words: 'work job boss colleague coworker meeting deadline project career office manager client email shift interview promotion fired workload exam test school class homework assignment grade study university college lecture thesis teacher professor presentation'.split(' ') },
  { id: 'relationships', name: 'Relationships', emoji: 'relationships', words: 'partner boyfriend girlfriend husband wife date dating breakup relationship marriage love crush ex fiance romantic argument fight'.split(' ') },
  { id: 'family', name: 'Family', emoji: 'family', words: 'mom mum dad mother father parent sister brother family kid child son daughter grandma grandpa baby sibling cousin aunt uncle'.split(' ') },
  { id: 'friends', name: 'Friends & social', emoji: 'social', words: 'friend party social invite group people awkward ignored gossip hangout lunch dinner text message'.split(' '), phrases: ['left out'] },
  { id: 'health', name: 'Health & body', emoji: 'health', words: 'health sick ill doctor pain headache symptom medication hospital diagnosis appetite exercise workout gym body weight eat eating diet nausea dizzy heart therapy therapist'.split(' ') },
  { id: 'sleep', name: 'Sleep & energy', emoji: 'sleep', words: 'sleep slept tired insomnia nap exhausted awake nightmare bed rest energy fatigue drowsy'.split(' ') },
  { id: 'money', name: 'Money', emoji: 'money', words: 'money rent bill debt pay salary afford bank budget loan expensive savings broke price paycheck mortgage tax'.split(' ') },
  { id: 'future', name: 'The future', emoji: 'future', words: 'future plan uncertain unknown decision goal direction purpose tomorrow graduate move choice choose path unsure wonder'.split(' '), phrases: ['what if', 'next year'] },
  { id: 'selfworth', name: 'Self-worth', emoji: 'self-worth', words: 'failure fail stupid worthless enough ashamed useless ugly compare comparison confidence perfect mistake embarrass embarrassed guilty loser inadequate behind'.split(' '), phrases: ['hate myself', 'not good enough'] },
  { id: 'stress', name: 'Stress & overwhelm', emoji: 'stressed', words: 'stress stressed overwhelm overwhelmed pressure busy burnout rush chaos cope panic anxious anxiety worry worried nervous tense'.split(' '), phrases: ['too much'] },
  { id: 'lonely', name: 'Loneliness', emoji: 'lonely', words: 'lonely alone isolated empty nobody abandoned disconnected unseen friendless'.split(' '), phrases: ['left out'] },
  { id: 'home', name: 'Home & chores', emoji: 'family', words: 'home house clean chores apartment roommate landlord laundry dishes tidy mess cooking groceries'.split(' ') },
  { id: 'grief', name: 'Loss & grief', emoji: 'sad', words: 'grief loss died death funeral miss mourning grieving passed bereaved'.split(' '), phrases: ['passed away'] },
  { id: 'joy', name: 'Joy & hobbies', emoji: 'happy', words: 'music art draw paint read book game movie hobby walk nature garden travel trip holiday sunshine cooking baking dance song laugh fun grateful thankful'.split(' ') },
]
const AREA_STEMS: Map<string, string[]> = (() => { const m = new Map<string, string[]>(); for (const a of AREAS) for (const w of a.words) { const s = stem(w); m.set(s, [...(m.get(s) ?? []), a.id]) } return m })()

/** The areas a piece of text touches (an area needs a word from its lexicon or one of its phrases). */
export function areasOf(text: string): string[] {
  const t = stripMd(text).toLowerCase(), found = new Set<string>()
  for (const s of tokens(text)) for (const id of AREA_STEMS.get(s) ?? []) found.add(id)
  for (const a of AREAS) if (a.phrases?.some(p => t.includes(p))) found.add(a.id)
  return AREAS.map(a => a.id).filter(id => found.has(id))
}

/* --------------------------------- themes --------------------------------- */
type Vec = Map<number, number>
const dot = (a: Vec, b: Vec) => { let s = 0; const [x, y] = a.size < b.size ? [a, b] : [b, a]; for (const [k, v] of x) { const w = y.get(k); if (w) s += v * w } return s }
function normalize(v: Vec): Vec { let n = 0; for (const x of v.values()) n += x * x; n = Math.sqrt(n) || 1; return new Map([...v].map(([k, x]) => [k, x / n])) }

/** Group documents that use similar words (k-means on TF-IDF, cosine similarity, deterministic farthest-first start). */
export function clusterDocs(docs: string[][], k: number): number[] {
  const n = docs.length
  const df = new Map<string, number>(); docs.forEach(d => new Set(d).forEach(t => df.set(t, (df.get(t) ?? 0) + 1)))
  const vocab = [...df].filter(([, c]) => c >= 2 && c <= n * 0.6).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 400).map(([t]) => t)
  const idx = new Map(vocab.map((t, i) => [t, i]))
  const vecs: Vec[] = docs.map(d => { const v: Vec = new Map(); for (const t of d) { const i = idx.get(t); if (i !== undefined) v.set(i, (v.get(i) ?? 0) + 1) } return normalize(new Map([...v].map(([i, c]) => [i, (1 + Math.log(c)) * Math.log(1 + n / (df.get(vocab[i]) ?? 1))]))) })
  const live = vecs.map((v, i) => [v, i] as const).filter(([v]) => v.size > 0)
  if (live.length < k * 2) return docs.map(() => 0)
  const centers: Vec[] = [live[0][0]]
  while (centers.length < k) {                                   // farthest-first: the next centre is the note least like any chosen one
    let best = -1, bestD = -1
    live.forEach(([v], i) => { const d = 1 - Math.max(...centers.map(c => dot(v, c))); if (d > bestD) { bestD = d; best = i } })
    if (bestD < 0.2) break
    centers.push(live[best][0])
  }
  let assign: number[] = docs.map((_, i) => (vecs[i].size ? 0 : -1))     // notes with nothing in common with any other note belong to no group
  for (let iter = 0; iter < 15; iter++) {
    const next = vecs.map(v => { if (!v.size) return -1; let b = 0, bs = -1; centers.forEach((c, ci) => { const s = dot(v, c); if (s > bs) { bs = s; b = ci } }); return b })
    const changed = next.some((a, i) => a !== assign[i]); assign = next
    centers.forEach((_, ci) => { const sum: Vec = new Map(); vecs.forEach((v, i) => { if (assign[i] === ci) for (const [t, x] of v) sum.set(t, (sum.get(t) ?? 0) + x) }); if (sum.size) centers[ci] = normalize(sum) })
    if (!changed && iter > 0) break
  }
  return assign
}

/* --------------------------------- results --------------------------------- */
export interface TopicStat {
  id: string; name: string; emoji: string
  /** notes that touch this area */ count: number; /** share of all notes, 0..1 */ share: number
  /** average mood 1-5 of those notes that have one, null when none */ mood: number | null
  /** notes per week, oldest first (last 12 weeks) */ weekly: number[]
  /** last 28 days vs the 28 before: up / down / flat (needs a few notes to say) */ trend: 'up' | 'down' | 'flat'; recent: number; before: number
  /** words you used most inside these notes */ words: string[]
}
export interface Theme { id: string; label: string; words: string[]; count: number; mood: number | null; share: number }
export interface TopicsResult {
  ready: boolean; docs: number; needed: number; from: string | null; overallMood: number | null
  areas: TopicStat[]; themes: Theme[]; keywords: { word: string; count: number }[]
  /** areas noticeably more often lately / noticeably heavier than your average mood */ rising: TopicStat[]; heavier: TopicStat[]
}
export const MIN_DOCS = 8
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)
const WEEKS = 12

export function analyseTopics(all: TopicDoc[], now: Date = new Date()): TopicsResult {
  const docs = all.filter(d => d.text.trim()).sort((a, b) => a.at.localeCompare(b.at))
  const empty: TopicsResult = { ready: false, docs: docs.length, needed: MIN_DOCS, from: docs[0] ? dayKey(docs[0].at) : null, overallMood: null, areas: [], themes: [], keywords: [], rising: [], heavier: [] }
  if (docs.length < MIN_DOCS) return empty
  const toks = docs.map(d => tokens(d.text)), per = docs.map(d => areasOf(d.text))
  const overall = avg(docs.filter(d => d.mood).map(d => d.mood!))
  const today = dayKey(now), thisWeek = weekStart(today)
  const weekIndex = (iso: string) => { const w = weekStart(dayKey(iso)), a = Date.parse(w), b = Date.parse(thisWeek); return WEEKS - 1 - Math.round((b - a) / (7 * 864e5)) }
  const d28 = shift(today, -27), d56 = shift(today, -55)

  const areas: TopicStat[] = AREAS.map(a => {
    const idxs = docs.map((_, i) => i).filter(i => per[i].includes(a.id))
    const weekly = Array(WEEKS).fill(0); idxs.forEach(i => { const w = weekIndex(docs[i].at); if (w >= 0 && w < WEEKS) weekly[w]++ })
    const recent = idxs.filter(i => dayKey(docs[i].at) >= d28).length, before = idxs.filter(i => { const k = dayKey(docs[i].at); return k >= d56 && k < d28 }).length
    const trend: TopicStat['trend'] = recent >= 3 && recent >= before * 1.5 + 1 ? 'up' : before >= 3 && recent <= before * 0.5 ? 'down' : 'flat'
    const seeds = new Set(AREAS.find(x => x.id === a.id)!.words.map(stem)), counts = new Map<string, number>()
    idxs.forEach(i => toks[i].forEach(t => { if (seeds.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1) }))
    return { id: a.id, name: a.name, emoji: a.emoji, count: idxs.length, share: idxs.length / docs.length, mood: avg(idxs.filter(i => docs[i].mood).map(i => docs[i].mood!)), weekly, trend, recent, before,
      words: [...counts].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 4).map(([t]) => display(t, docs, toks)) }
  }).filter(a => a.count >= 2).sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1))

  // your own words: keywords and themes
  const df = new Map<string, number>(); toks.forEach(t => new Set(t).forEach(w => df.set(w, (df.get(w) ?? 0) + 1)))
  const keywords = [...df].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 12).map(([w, c]) => ({ word: display(w, docs, toks), count: c }))
  const k = Math.max(2, Math.min(5, Math.floor(docs.length / 4)))
  const assign = docs.length >= 12 ? clusterDocs(toks, k) : docs.map(() => 0)
  const themes: Theme[] = []
  for (let ci = 0; ci <= Math.max(-1, ...assign); ci++) {
    const idxs = docs.map((_, i) => i).filter(i => assign[i] === ci)
    if (idxs.length < 3 || docs.length < 12) continue
    const cdf = new Map<string, number>(); idxs.forEach(i => new Set(toks[i]).forEach(w => cdf.set(w, (cdf.get(w) ?? 0) + 1)))
    // the words that are common in this group but not everywhere: tf-idf-like
    const scored = [...cdf].filter(([, c]) => c >= 2).map(([w, c]) => [w, (c / idxs.length) * Math.log(1 + docs.length / (df.get(w) ?? 1))] as const).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    const words = scored.slice(0, 4).map(([w]) => display(w, docs, toks)); if (words.length < 2) continue
    themes.push({ id: `t${ci}`, label: words.slice(0, 3).join(' · '), words, count: idxs.length, share: idxs.length / docs.length, mood: avg(idxs.filter(i => docs[i].mood).map(i => docs[i].mood!)) })
  }
  themes.sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1))

  const rising = areas.filter(a => a.trend === 'up').slice(0, 3)
  const heavier = overall === null ? [] : areas.filter(a => a.mood !== null && a.count >= 4 && a.mood <= overall - 0.5).sort((a, b) => a.mood! - b.mood!).slice(0, 3)
  return { ready: true, docs: docs.length, needed: MIN_DOCS, from: dayKey(docs[0].at), overallMood: overall, areas, themes, keywords, rising, heavier }
}

/** Show a stem as a real word you wrote (the most common spelling of it). */
function display(stemmed: string, docs: TopicDoc[], toks: string[][]): string {
  const seen = new Map<string, number>()
  for (let i = 0; i < docs.length && seen.size < 60; i++) if (toks[i].includes(stemmed)) for (const w of (stripMd(docs[i].text).toLowerCase().match(/[\p{L}']+/gu) ?? [])) if (stem(w.replace(/'s$/, '')) === stemmed) seen.set(w, (seen.get(w) ?? 0) + 1)
  return [...seen].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]?.[0] ?? stemmed
}

/** Everything you have written, as plain documents. Voice journals count through their text. */
export function docsFrom(d: {
  thoughts: { id: string; createdAt: string; mood: number; situation: string; thought: string; alternateThought: string }[]
  journal: { id: string; createdAt: string; mood: number | null; title: string; body: string }[]
  worries: { id: string; createdAt: string; text: string }[]
}): TopicDoc[] {
  return [
    ...d.thoughts.map(t => ({ id: t.id, at: t.createdAt, text: `${t.situation} ${t.thought} ${t.alternateThought}`, mood: t.mood || null, source: 'thought' as const })),
    ...d.journal.map(j => ({ id: j.id, at: j.createdAt, text: `${j.title} ${j.body}`, mood: j.mood, source: 'journal' as const })),
    ...d.worries.map(w => ({ id: w.id, at: w.createdAt, text: w.text, mood: null, source: 'worry' as const })),
  ]
}
