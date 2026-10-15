import assert from 'node:assert/strict'
import { AiError, createClient, extractJson, looksLikeCrisis, mapError, rankModels, sanitizeReframes, sanitizeStructured, PROMPTS } from '../src/lib/aiCore.ts'

const allowed = { emotions: ['anxious', 'sad', 'afraid'], traps: ['catastrophizing', 'mind reading'], tags: ['work', 'sleep'] }

/* ---- error mapping ---- */
assert.equal(mapError(429, {}).code, 'quota')
assert.equal(mapError(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }).code, 'auth')
assert.equal(mapError(401, {}).code, 'auth')
assert.equal(mapError(403, { error: { message: 'permission denied' } }).code, 'auth')
assert.equal(mapError(403, { error: { message: 'User location is not supported for the API use.' } }).code, 'model')
assert.equal(mapError(404, { error: { message: 'models/x is not found' } }).code, 'model')
assert.equal(mapError(500, { error: { message: 'boom' } }).code, 'bad-response')

/* ---- model ranking: stable first, newest first, flash before flash-lite, previews last, junk excluded ---- */
const m = names => names.map(name => ({ name: `models/${name}`, supportedGenerationMethods: ['generateContent'] }))
assert.deepEqual(rankModels(m(['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-image', 'text-embedding-004', 'gemma-3-27b'])),
  ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-3-flash-preview'])
assert.deepEqual(rankModels(m(['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash'])), ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'])
assert.deepEqual(rankModels([{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['embedContent'] }]), [])
assert.deepEqual(rankModels([]), [])

/* ---- JSON extraction tolerates fences / chatter, rejects garbage ---- */
assert.deepEqual(extractJson('{"a":1}'), { a: 1 })
assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 })
assert.deepEqual(extractJson('Sure! Here you go: {"a":1} hope that helps'), { a: 1 })
assert.throws(() => extractJson('no json here'), e => e instanceof AiError && e.code === 'bad-response')

/* ---- crisis detection (sensitive on purpose, no false alarm on ordinary anxiety) ---- */
for (const t of ['I want to kill myself', 'thinking about suicide', "I don't want to live anymore", 'I wish I were dead', 'I keep wanting to hurt myself', 'they would be better off without me', 'I want to end it all', 'self-harm urges tonight'])
  assert.equal(looksLikeCrisis(t), true, t)
for (const t of ['I have a presentation and I feel anxious', 'This deadline is killing me softly… kidding', 'I am dying to see the new film', 'my phone battery died'])
  assert.equal(looksLikeCrisis(t), false, t)

/* ---- sanitising untrusted model output ---- */
const s = sanitizeStructured({
  situation: '  Meeting  ', thought: 'x'.repeat(1000),
  emotions: [{ name: 'Anxious', intensity: 140 }, { name: 'anxious', intensity: 10 }, { name: 'hungry', intensity: 50 }, { name: 'sad', intensity: 'abc' }, { name: 'afraid', intensity: -5 }, null],
  distortions: ['Catastrophizing', 'made-up', 'catastrophizing', 7], tags: ['work', 'nope'], alternateThought: 42, internalBehaviour: undefined,
}, allowed)
assert.equal(s.situation, 'Meeting'); assert.equal(s.thought.length, 600)
assert.deepEqual(s.emotions, [{ name: 'anxious', intensity: 100 }, { name: 'sad', intensity: 50 }, { name: 'afraid', intensity: 0 }])
assert.deepEqual(s.distortions, ['catastrophizing']); assert.deepEqual(s.tags, ['work'])
assert.equal(s.alternateThought, ''); assert.equal(s.internalBehaviour, '')
assert.deepEqual(sanitizeStructured(null, allowed).emotions, []); assert.deepEqual(sanitizeStructured('junk', allowed).tags, [])

assert.deepEqual(sanitizeReframes({ distortions: ['mind reading', 'x'], reframes: ['I can cope', '', 5, 'b', 'c', 'd'], crisis: false }, allowed),
  { distortions: ['mind reading'], reframes: ['I can cope', 'b', 'c'], crisis: false })
assert.deepEqual(sanitizeReframes({ distortions: ['mind reading'], reframes: ['x'], crisis: true }, allowed), { distortions: [], reframes: [], crisis: true })
assert.ok(PROMPTS.structure(allowed).includes('anxious, sad, afraid') && PROMPTS.reframe(allowed).includes('catastrophizing'))

/* ---- client with a mocked network ---- */
const ok = text => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) })
const fail = (status, message = '') => ({ ok: false, status, json: async () => ({ error: { message } }) })
const modelsResp = names => ({ ok: true, status: 200, json: async () => ({ models: m(names) }) })
const mock = (handler) => { const calls = []; const f = async (url, init) => { calls.push({ url, init }); return handler(url, init, calls.length) }; f.calls = calls; return f }

{ // picks the best model that works and persists it; sends key header
  const picked = []
  const f = mock(url => url.includes('/models?') ? modelsResp(['gemini-2.5-flash-lite', 'gemini-2.5-flash']) : ok('OK'))
  const c = createClient({ key: 'K', model: null, fetch: f, onModel: x => picked.push(x) })
  assert.equal(await c.autoSelect(), 'gemini-2.5-flash'); assert.deepEqual(picked, ['gemini-2.5-flash'])
  assert.equal(f.calls[0].init.headers['x-goog-api-key'], 'K')
  assert.ok(f.calls[1].url.endsWith('/models/gemini-2.5-flash:generateContent'))
}
{ // free-tier quota on the best model -> falls through to the next
  const f = mock(url => url.includes('/models?') ? modelsResp(['gemini-3.5-flash', 'gemini-2.5-flash']) : url.includes('3.5') ? fail(429) : ok('OK'))
  assert.equal(await createClient({ key: 'K', model: null, fetch: f }).autoSelect(), 'gemini-2.5-flash')
}
{ // bad key surfaces immediately instead of trying every model
  const f = mock(url => url.includes('/models?') ? fail(400, 'API key not valid') : ok('OK'))
  await assert.rejects(createClient({ key: 'bad', model: null, fetch: f }).autoSelect(), e => e.code === 'auth')
}
{ // no usable model
  const f = mock(url => url.includes('/models?') ? modelsResp(['text-embedding-004']) : ok('OK'))
  await assert.rejects(createClient({ key: 'K', model: null, fetch: f }).autoSelect(), e => e.code === 'model')
}
{ // retired model: rediscovers once and retries, saving the new model
  let retired = true; const saved = []
  const f = mock(url => url.includes('/models?') ? modelsResp(['gemini-3.5-flash'])
    : url.includes('old-model') ? (retired ? fail(404, 'models/old-model is no longer available') : ok('x'))
    : ok('hello'))
  const c = createClient({ key: 'K', model: 'old-model', fetch: f, onModel: x => saved.push(x) })
  assert.equal(await c.generate('sys', [{ text: 'hi' }]), 'hello'); assert.deepEqual(saved, ['gemini-3.5-flash'])
}
{ // JSON mode + system prompt are sent; text parts are joined
  const f = mock(() => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] } }] }) }))
  const out = await createClient({ key: 'K', model: 'gemini-2.5-flash', fetch: f }).generate('SYS', [{ text: 'hi' }], true)
  assert.equal(out, '{"a":1}')
  const body = JSON.parse(f.calls[0].init.body)
  assert.equal(body.generationConfig.responseMimeType, 'application/json'); assert.equal(body.systemInstruction.parts[0].text, 'SYS')
}
{ // network failure and safety blocks map to friendly errors
  const down = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(createClient({ key: 'K', model: 'm', fetch: down }).generate(null, [{ text: 'x' }]), e => e.code === 'network')
  const blocked = mock(() => ({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) }))
  await assert.rejects(createClient({ key: 'K', model: 'm', fetch: blocked }).generate(null, [{ text: 'x' }]), e => e.code === 'blocked')
  const empty = mock(() => ({ ok: true, status: 200, json: async () => ({ candidates: [] }) }))
  await assert.rejects(createClient({ key: 'K', model: 'm', fetch: empty }).generate(null, [{ text: 'x' }]), e => e.code === 'blocked')
}
console.log('ai: all tests passed')
