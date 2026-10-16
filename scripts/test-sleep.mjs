import assert from 'node:assert/strict'
import { buildNights, eveningMinutes, fmtDuration, manualNight, mergeNights, mergeSegments, MIN_NIGHT_MIN, sleepMoodLink, summarizeSleep } from '../src/lib/sleep.ts'

const T = (d, h, m = 0, mo = 10) => new Date(2026, mo - 1, d, h, m).getTime()   // local time
const seg = (kind, a, b) => ({ kind, start: a, end: b })
const H = 3_600_000

/* ---- merging sources ---- */
assert.deepEqual(mergeSegments([]), []); assert.deepEqual(mergeSegments([seg('core', 5, 5), seg('core', 9, 3)]), [], 'empty / backwards segments are dropped')
// Watch stages overlap the phone's generic "asleep": the named stage wins where they overlap, generic fills the rest
const merged = mergeSegments([seg('asleep', 0, 100), seg('deep', 20, 40), seg('rem', 60, 80)])
assert.deepEqual(merged, [seg('asleep', 0, 20), seg('deep', 20, 40), seg('asleep', 40, 60), seg('rem', 60, 80), seg('asleep', 80, 100)])
// explicit awake beats sleep; sleep beats in-bed; neighbours of the same kind coalesce; duplicates don't double count
assert.deepEqual(mergeSegments([seg('inBed', 0, 100), seg('core', 10, 90), seg('awake', 40, 50)]), [seg('inBed', 0, 10), seg('core', 10, 40), seg('awake', 40, 50), seg('core', 50, 90), seg('inBed', 90, 100)])
assert.deepEqual(mergeSegments([seg('core', 0, 50), seg('core', 0, 50), seg('core', 50, 80)]), [seg('core', 0, 80)])
assert.deepEqual(mergeSegments([seg('nonsense', 0, 10)]), [])

/* ---- one ordinary night across midnight (Watch + in-bed from the phone) ---- */
const ordinary = [
  seg('inBed', T(14, 22, 45), T(15, 6, 55)),
  seg('core', T(14, 23, 0), T(15, 1, 0)), seg('deep', T(15, 1, 0), T(15, 2, 0)), seg('core', T(15, 2, 0), T(15, 3, 30)),
  seg('rem', T(15, 3, 30), T(15, 4, 30)), seg('awake', T(15, 4, 30), T(15, 4, 40)), seg('core', T(15, 4, 40), T(15, 6, 40)),
]
let r = buildNights(ordinary)
assert.equal(r.nights.length, 1); assert.equal(r.naps.length, 0)
let n = r.nights[0]
assert.equal(n.date, '2026-10-15', 'belongs to the morning you woke up')
assert.deepEqual([n.start, n.end], [T(14, 23), T(15, 6, 40)])
assert.equal(n.asleepMin, 7 * 60 + 40 - 10); assert.equal(n.deepMin, 60); assert.equal(n.remMin, 60); assert.equal(n.coreMin, 330); assert.equal(n.awakeMin, 10)
assert.equal(n.asleepMin, n.deepMin + n.remMin + n.coreMin + n.unspecifiedMin, 'stages add up to time asleep')
assert.equal(n.inBedMin, n.asleepMin + n.awakeMin, 'in-bed minutes inside the sleep span = asleep + awake')
assert.equal(n.efficiency, Math.round((450 / 460) * 100)); assert.equal(n.source, 'health')

/* ---- double-reported data (Watch + phone both say asleep for the same time) is not counted twice ---- */
r = buildNights([...ordinary, seg('asleep', T(14, 23), T(15, 6, 40))])
assert.equal(r.nights[0].asleepMin, 450, 'same night, same minutes, even with a second source')
assert.equal(r.nights[0].unspecifiedMin, 0, 'the phone’s generic reading only fills gaps where the Watch has nothing; it never adds time')

/* ---- naps, tiny blips, gaps ---- */
const day = [...ordinary, seg('core', T(15, 14, 0), T(15, 14, 45)), seg('core', T(15, 20, 0), T(15, 20, 10))]   // 45-min nap + a 10-minute blip hours later
r = buildNights(day)
assert.equal(r.nights.length, 1); assert.deepEqual(r.naps.map(x => x.min), [45], 'the nap is kept separately; a 10-minute blip is ignored')
// a short night (< 3h) on its own is not "the night": it is listed as a nap
r = buildNights([seg('core', T(15, 2, 0), T(15, 4, 30))]); assert.equal(r.nights.length, 0); assert.equal(r.naps[0].min, 150); assert.ok(150 < MIN_NIGHT_MIN)
// a waking gap shorter than 3h stays in the same night; a long one splits it
r = buildNights([seg('core', T(14, 23), T(15, 2)), seg('core', T(15, 3, 30), T(15, 7))]); assert.equal(r.nights.length, 1); assert.equal(r.nights[0].asleepMin, 3 * 60 + 3 * 60 + 30)
r = buildNights([seg('core', T(14, 23), T(15, 5)), seg('core', T(15, 12), T(15, 13, 30))]); assert.equal(r.nights.length, 1); assert.equal(r.naps.length, 1)

/* ---- several nights, DST-ish clock change, newest first, year boundary ---- */
const multi = [seg('core', T(29, 23, 0, 10), T(30, 6, 0, 10)), seg('core', T(30, 23, 30, 10), T(31, 7, 0, 10)), seg('core', T(31, 22, 0, 10), T(1, 6, 0, 11))]
r = buildNights(multi); assert.deepEqual(r.nights.map(x => x.date), ['2026-11-01', '2026-10-31', '2026-10-30'])
assert.deepEqual(r.nights.map(x => x.asleepMin), [480, 450, 420])
const ny = buildNights([seg('core', new Date(2026, 11, 31, 23, 0).getTime(), new Date(2027, 0, 1, 7, 0).getTime())]); assert.equal(ny.nights[0].date, '2027-01-01')
assert.deepEqual(buildNights([]), { nights: [], naps: [] })

/* ---- no in-bed data and no awake data: efficiency is unknown, not 100% ---- */
assert.equal(buildNights([seg('core', T(14, 23), T(15, 6))]).nights[0].efficiency, null)

/* ---- manual log ---- */
const mn = manualNight(T(14, 23, 30), T(15, 7, 15), 4)
assert.deepEqual([mn.date, mn.asleepMin, mn.source, mn.quality, mn.efficiency], ['2026-10-15', 465, 'manual', 4, null])
assert.equal(manualNight(T(15, 7), T(14, 23)), null); assert.equal(manualNight(T(14, 1), T(15, 23)), null, 'more than 18 h is not a night')
// measured beats manual for the same morning; others kept; newest first
const merged2 = mergeNights(buildNights(ordinary).nights, [mn, manualNight(T(13, 23), T(14, 7))])
assert.deepEqual(merged2.map(x => [x.date, x.source]), [['2026-10-15', 'health'], ['2026-10-14', 'manual']])

/* ---- formatting + summary ---- */
assert.equal(fmtDuration(0), '0h 00m'); assert.equal(fmtDuration(452), '7h 32m'); assert.equal(fmtDuration(59.6), '1h 00m')
assert.equal(eveningMinutes(T(14, 23, 30)), 330); assert.equal(eveningMinutes(T(15, 1, 0)), 420); assert.equal(eveningMinutes(T(15, 18, 0)), 0)
assert.deepEqual(summarizeSleep([]), { nights: 0, avgAsleepMin: null, avgBedEvening: null, avgWakeMin: null, bedtimeSpreadMin: null })
const s3 = summarizeSleep(buildNights(multi).nights)
assert.equal(s3.nights, 3); assert.equal(s3.avgAsleepMin, 450); assert.equal(s3.avgBedEvening, Math.round((300 + 330 + 240) / 3)); assert.ok(s3.bedtimeSpreadMin > 0)
assert.equal(summarizeSleep(buildNights(multi).nights.slice(0, 2)).bedtimeSpreadMin, null, 'spread needs 3+ nights')
// bedtimes either side of midnight average sensibly (no wrap-around artefacts)
const around = summarizeSleep([manualNight(T(15, 23, 30), T(16, 7)), manualNight(T(14, 0, 30), T(14, 8))].filter(Boolean))
assert.equal(around.avgBedEvening, Math.round((330 + 390) / 2)); assert.equal(summarizeSleep(buildNights(multi).nights, 1).nights, 1)

/* ---- sleep <-> mood ---- */
// ten mornings (Oct 2..11): alternating 8 h and 5 h nights
const nightFor = (i, hours) => { const wake = new Date(2026, 9, 2 + i, 7, 0).getTime(); return manualNight(wake - hours * H, wake) }
const nts = Array.from({ length: 10 }, (_, i) => nightFor(i, i % 2 === 0 ? 8 : 5))
const moodsFor = (list, f) => list.map(x => ({ createdAt: new Date(`${x.date}T12:00:00`).toISOString(), mood: f(x) }))
const link = sleepMoodLink(nts, moodsFor(nts, x => (x.asleepMin >= 480 ? 4 : 2)))
assert.ok(link, 'enough paired days'); assert.equal(link.pairs, 10); assert.equal(link.thresholdMin, 480)
assert.deepEqual([link.restedMood, link.shortMood, link.diff], [4, 2, 2]); assert.match(link.sentence, /slept 8h or more, your mood tended to be higher \(4 vs 2/); assert.match(link.sentence, /not a cause/)
assert.equal(sleepMoodLink(nts.slice(0, 6), moodsFor(nts.slice(0, 6), () => 3)), null, 'fewer than 7 paired days: no claim')
const flat = sleepMoodLink(nts, moodsFor(nts, () => 3)); assert.equal(flat.diff, 0); assert.match(flat.sentence, /about the same/)
const reversed = sleepMoodLink(nts, moodsFor(nts, x => (x.asleepMin >= 480 ? 2 : 4))); assert.ok(reversed.diff < 0); assert.match(reversed.sentence, /not what’s typical/)
assert.equal(sleepMoodLink(nts, []), null, 'no mood entries: nothing to pair')
assert.equal(sleepMoodLink(nts, moodsFor(nts.slice(0, 5), () => 3)), null, 'days without a mood entry are not paired')
// all nights the same length: no side has enough "short" nights
assert.equal(sleepMoodLink(Array.from({ length: 10 }, (_, i) => nightFor(i, 7)), moodsFor(Array.from({ length: 10 }, (_, i) => nightFor(i, 7)), () => 3)), null)
console.log('sleep: all tests passed')
