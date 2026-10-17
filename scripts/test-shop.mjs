import assert from 'node:assert/strict'
import { ACCESSORIES, accessoryById, normalizeOutfit, outfitLayers, SLOTS } from '../src/lib/outfits.ts'
import { collectDays, COLLECTIBLES, EMPTY_EQUIP, equipIsEmpty, itemById, normalizeEquip, RARITIES, RARITY_PRICE, SHOP, titleText, toggleOutfit, cardStyle } from '../src/lib/shop.ts'
import { palBody, palSvg, POSE_NAMES } from '../src/lib/pal.ts'

// catalogue: unique ids, sensible prices that follow rarity, a real mix of things to collect
assert.equal(new Set(SHOP.map(i => i.id)).size, SHOP.length)
for (const i of SHOP) assert.ok(i.name && i.blurb && i.cost > 0 && RARITIES.includes(i.rarity), i.id)
for (const i of COLLECTIBLES) assert.equal(i.cost, RARITY_PRICE[i.rarity], `${i.id} costs what its rarity says`)
assert.ok(Math.max(...SHOP.map(i => i.cost)) <= 1000, 'nothing absurd')
assert.deepEqual(RARITIES.map(r => RARITY_PRICE[r]), [60, 160, 400, 900])
for (const kind of ['outfit', 'theme', 'card', 'title']) assert.ok(COLLECTIBLES.filter(i => i.kind === kind).length >= 6, kind)
assert.ok(COLLECTIBLES.length >= 36); assert.equal(COLLECTIBLES.every(i => !i.repeatable), true)
for (const r of RARITIES) assert.ok(COLLECTIBLES.some(i => i.rarity === r), `something ${r}`)
// the old theme ids keep working
for (const id of ['theme-ocean', 'theme-sunset', 'theme-berry', 'theme-lavender', 'restday', 'treat']) assert.ok(itemById(id), id)
assert.ok(itemById('theme-ocean').color.startsWith('#'))
// every outfit item has art and a slot that matches it
for (const i of SHOP.filter(x => x.kind === 'outfit')) { const a = accessoryById(i.id.replace('outfit-', '')); assert.ok(a && a.slot === i.slot && (a.front || a.back || '').includes('<'), i.id) }
for (const a of ACCESSORIES) assert.ok(SHOP.some(i => i.id === `outfit-${a.id}`), a.id + ' is for sale')
for (const i of SHOP.filter(x => x.kind === 'card')) assert.equal(i.stops.length, 3)

// wearing: one piece per slot, tapping the worn piece takes it off, unknown ids are ignored
let e = EMPTY_EQUIP
e = toggleOutfit(e, 'outfit-beanie'); assert.deepEqual(e.outfit, { head: 'beanie' })
e = toggleOutfit(e, 'outfit-crown'); assert.deepEqual(e.outfit, { head: 'crown' }, 'a new hat replaces the old one')
e = toggleOutfit(e, 'outfit-glasses'); assert.deepEqual(e.outfit, { head: 'crown', face: 'glasses' })
e = toggleOutfit(e, 'outfit-crown'); assert.deepEqual(e.outfit, { face: 'glasses' })
assert.deepEqual(toggleOutfit(e, 'theme-ocean'), e); assert.deepEqual(toggleOutfit(e, 'nope'), e)
assert.deepEqual(normalizeOutfit({ head: 'glasses', face: 'glasses', neck: 5, back: 'cape', junk: 'x' }), { face: 'glasses', back: 'cape' }, 'a piece in the wrong slot is dropped')
assert.deepEqual(normalizeOutfit(null), {}); assert.deepEqual(normalizeOutfit('x'), {})

// equip is always limited to what you own; the goal must be something you do not own yet
const bought = ids => ids.map((itemId, n) => ({ id: 'p' + n, itemId, at: '2026-10-10T10:00:00.000Z', cost: 1 }))
const raw = { outfit: { head: 'crown', face: 'glasses' }, card: 'card-aurora', title: 'title-captain', goal: 'outfit-halo' }
let n = normalizeEquip(raw, bought(['outfit-glasses', 'card-aurora']))
assert.deepEqual(n, { outfit: { face: 'glasses' }, card: 'card-aurora', title: null, goal: 'outfit-halo' })
n = normalizeEquip(raw, bought(['outfit-halo'])); assert.equal(n.goal, null, 'a goal you already own is cleared')
assert.deepEqual(normalizeEquip('garbage', []), EMPTY_EQUIP); assert.equal(equipIsEmpty(EMPTY_EQUIP), true); assert.equal(equipIsEmpty(n), true, 'owning only the goal item leaves nothing equipped'); assert.equal(equipIsEmpty({ ...EMPTY_EQUIP, title: 'title-captain' }), false)
assert.equal(titleText({ ...EMPTY_EQUIP, title: 'title-captain' }), 'Calm Captain'); assert.equal(titleText(EMPTY_EQUIP), null)
assert.equal(cardStyle({ ...EMPTY_EQUIP, card: 'card-aurora' }).name, 'Aurora'); assert.equal(cardStyle(EMPTY_EQUIP), null)
// collectibles are counted once each (rest days and treats are not collectibles)
assert.deepEqual(collectDays([...bought(['outfit-beanie', 'restday', 'treat', 'theme-ocean'])]), ['2026-10-10', '2026-10-10'])

// rendering: the outfit shows up in every pose, pieces that clash with a pose's own props are skipped, nothing changes without one
const worn = { head: 'crown', face: 'glasses', neck: 'scarf', back: 'cape' }
for (const p of POSE_NAMES) {
  const plain = palBody(p), dressed = palBody(p, worn)
  assert.ok(dressed.includes('acc-cape'), p); assert.equal(dressed.includes('acc-scarf'), p !== 'nap', p + ': a blanket covers the scarf')
  assert.equal(palBody(p, {}), plain, 'no outfit, same picture')
}
assert.ok(palBody('chill', worn).includes('acc-glasses') === false, 'the Chill pose already has its own shades')
assert.ok(palBody('party', worn).includes('acc-crown') === false, 'the Party pose already has a party hat')
assert.ok(palBody('idle', worn).includes('acc-crown') && palBody('idle', worn).includes('acc-glasses'))
const back = outfitLayers({ back: 'wings', head: 'halo' }); assert.ok(back.back.includes('acc-wings') && !back.back.includes('acc-halo') && back.front.includes('acc-halo'))
assert.equal(outfitLayers(undefined).back + outfitLayers(undefined).front, '')
// the space helmet covers the face and neck pieces; the 3D glasses show without it
const astro = outfitLayers({ head: 'astronaut', face: '3d', neck: 'bowtie' }); assert.ok(astro.front.includes('acc-astronaut') && !astro.front.includes('acc-3d') && !astro.front.includes('acc-bowtie'))
assert.ok(outfitLayers({ face: '3d' }).front.includes('acc-3d'))
// every piece renders, has its own gradient ids only (no clashes between worn pieces) and is balanced SVG
assert.ok(ACCESSORIES.length >= 39)
for (const a of ACCESSORIES) { const l = outfitLayers({ [a.slot]: a.id }); const svg = l.back + l.front; assert.ok(svg.includes('acc-' + a.id), a.id); assert.equal((svg.match(/<g[ >]/g) || []).length, (svg.match(/<\/g>/g) || []).length, a.id + ' balanced groups'); for (const m of svg.matchAll(/url\(#(wa-[\w-]+)\)/g)) assert.ok(svg.includes('id="' + m[1] + '"'), a.id + ' defines ' + m[1]) }
// the cape is drawn behind the body
assert.ok(palBody('idle', { back: 'cape' }).indexOf('acc-cape') < palBody('idle', { back: 'cape' }).indexOf('class="leg"') || palBody('idle', { back: 'cape' }).indexOf('acc-cape') < palBody('idle', { back: 'cape' }).indexOf('<g class="arm'))
assert.ok(palSvg('idle', { outfit: worn }).startsWith('<svg')); for (const s of SLOTS) assert.ok(ACCESSORIES.some(a => a.slot === s), s)
console.log('shop: all tests passed')
