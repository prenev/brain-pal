// App Store readiness that can be checked without a Mac or an account: listing limits and wording, legal pages, icon format,
// version consistency, privacy manifest vs. label, no required-reason APIs, screenshot sizes. (Owner-only blanks are reported by `npm run store:check`.)
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { LISTING, APP, REVIEW, AGE_RATING, PRIVACY_LABEL } from './store-metadata.mjs'
import { privacy, terms, support, licenses, NOTICES, DOCS, OWNER } from '../src/lib/legal.ts'
import { APP_VERSION } from '../src/lib/appInfo.ts'
import { renderDoc, renderSite } from './site-core.mjs'
import { iconSvg, POSE_NAMES } from '../src/lib/pal.ts'

const read = p => readFileSync(new URL(`../${p}`, import.meta.url))
const text = p => read(p).toString('utf8')
const pkg = JSON.parse(text('package.json'))

/* 1. listing text: Apple's limits */
assert.ok(LISTING.name.length <= 30, 'name ≤ 30'); assert.ok(LISTING.subtitle.length <= 30, 'subtitle ≤ 30')
assert.ok(LISTING.promotional_text.length <= 170, 'promo ≤ 170'); assert.ok(LISTING.keywords.length <= 100, `keywords ≤ 100 (is ${LISTING.keywords.length})`)
assert.ok(LISTING.description.length <= 4000, 'description ≤ 4000'); assert.ok(LISTING.release_notes.length <= 4000)
assert.ok(!/, /.test(LISTING.keywords), 'no spaces after commas in keywords (they waste characters)')
const kw = LISTING.keywords.split(','); assert.equal(new Set(kw).size, kw.length, 'no duplicate keywords')

/* 2. wording rules: no other brands, no medical claims, no pricing/ranking claims, no placeholders in what is sent to Apple */
const BRANDS = /daylio|flourish|finch|rootd|umbrella|holisti|headspace|calm app|moodpath|bearable|reflectly|how we feel|youper|woebot/i
const claims = /\b(cure[sd]?|treat(s|ed|ment of)?|diagnos\w+|therapy replacement|clinically proven|medical device|heals?)\b/i
const all = [LISTING.name, LISTING.subtitle, LISTING.promotional_text, LISTING.keywords, LISTING.description, LISTING.release_notes].join('\n')
assert.doesNotMatch(all, BRANDS, 'never name other apps / brands in App Store metadata (keyword stuffing + trademark rejections)')
assert.doesNotMatch(all.replace(/does not diagnose or treat any condition/i, ''), claims, 'no medical / treatment claims')
assert.doesNotMatch(all, /\b(best|#1|number one|free forever|top rated)\b/i, 'no unverifiable superlatives')
assert.doesNotMatch(LISTING.keywords, /brain|pal/i, 'the app name is already indexed')
assert.match(LISTING.description, /not medical care/i); assert.match(LISTING.description, /emergency number/i)
for (const u of [LISTING.support_url, LISTING.privacy_url, LISTING.marketing_url]) assert.match(u, /^https:\/\//)
assert.match(LISTING.privacy_url, /\/privacy\.html$/); assert.match(LISTING.support_url, /\/support\.html$/)
assert.match(REVIEW.notes, /no account is needed/i); assert.match(REVIEW.notes, /Delete account/)

/* 3. generated fastlane files equal their source (run `npm run store:meta` after editing scripts/store-metadata.mjs) */
for (const [k, v] of Object.entries(LISTING)) assert.equal(text(`fastlane/metadata/en-US/${k}.txt`).trim(), v.trim(), `fastlane/metadata/en-US/${k}.txt is stale`)
assert.deepEqual(JSON.parse(text('fastlane/age_rating.json')), AGE_RATING, 'age_rating.json stale'); assert.deepEqual(JSON.parse(text('fastlane/app_privacy_details.json')), PRIVACY_LABEL, 'app_privacy_details.json stale')
assert.equal(text('fastlane/metadata/review_information/notes.txt').trim(), REVIEW.notes.trim())

/* 4. legal documents say what the app really does, and are shown in the app */
const flat = d => [d.intro, ...d.sections.flatMap(s => [s.h, ...(s.p ?? []), ...(s.li ?? [])])].join('\n')
for (const id of Object.keys(DOCS)) { const d = DOCS[id](); assert.equal(d.id, id); assert.ok(d.sections.length >= 5 || id === 'support', id); assert.ok(flat(d).length > 600, `${id} has real content`) }
const P = flat(privacy())
for (const must of [/Apple Health/, /sleep/, /Gemini|Google/, /do not (run|sell)|never sell|not sell/i, /delete (the )?account/i, /children/i, /GDPR|California/, /Supabase/, /no analytics|do not run analytics/i, /on your device/i])
  assert.match(P, must, `privacy policy must mention ${must}`)
const Tm = flat(terms()); for (const must of [/not medical advice/i, /emergency number/i, /13 years/, /Apple/, /Governing law/i]) assert.match(Tm, must)
assert.match(flat(support()), /988/); assert.match(flat(licenses()), /Fluent Emoji/); assert.match(flat(licenses()), /Permission is hereby granted/)
// every runtime dependency has a notice
const listed = new Set(NOTICES.flatMap(n => n.npm ?? []))
for (const dep of Object.keys(pkg.dependencies)) assert.ok(listed.has(dep), `dependency ${dep} is missing from NOTICES in src/lib/legal.ts`)
for (const n of NOTICES) { assert.ok(n.license && n.by && /^https:\/\//.test(n.url), n.name) }
assert.match(text('src/pages/More.tsx'), /About & legal/); assert.match(text('src/components/Legal.tsx'), /DOCS\[id\]/)

/* 5. static site: escapes content, links every page */
const evil = renderDoc({ id: 'privacy', title: '<img src=x onerror=1>', intro: 'a & b', sections: [{ h: '<script>', p: ['x'] }] })
assert.doesNotMatch(evil, /<script>|<img src=x/); assert.match(evil, /&lt;script&gt;/)
const site = renderSite(); assert.deepEqual(Object.keys(site).sort(), ['index.html', 'licenses.html', 'privacy.html', 'support.html', 'terms.html'])
for (const html of Object.values(site)) for (const page of ['privacy', 'terms', 'support', 'licenses']) assert.ok(html.includes(`href="${page}.html"`))

/* 6. icon + splash: 1024 opaque (Apple rejects alpha), colour type 2 = RGB */
const png = p => { const b = read(p); assert.equal(b.subarray(1, 4).toString(), 'PNG', p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), color: b[25] } }
const icon = png('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'); assert.deepEqual([icon.w, icon.h, icon.color], [1024, 1024, 2], 'App Store icon: 1024×1024, RGB, no alpha')
for (const f of ['icon-192', 'icon-512', 'apple-touch-icon']) assert.equal(png(`public/${f}.png`).color, 2, `${f} has no alpha`)
assert.equal(png('ios/App/App/Assets.xcassets/Splash.imageset/Default@2x~universal~anyany.png').w, 2732)
assert.match(text('public/icon.svg'), /<svg/)

/* 6b. the mascot's art kit is in sync with its drawing (run `npm run icons && npm run sprites` after changing src/lib/pal.ts) */
assert.equal(text('public/icon.svg'), iconSvg(), 'public/icon.svg is stale')
const sprites = JSON.parse(text('assets/pal-sprites.json')); assert.deepEqual(Object.keys(sprites.poses.frames), POSE_NAMES, 'assets/pal-sprites.json is stale')
const sheet = png('assets/pal-poses.png'); assert.deepEqual([sheet.w, sheet.h, sheet.color], [1024, Math.ceil(POSE_NAMES.length / 4) * 256, 6], 'pose sheet is 4 columns of 256px with transparency')
assert.equal(png('assets/pal-animations.png').w, 1024); assert.match(text('public/pal-sprites.svg'), /id="pal-celebrate"/)

/* 7. one version everywhere */
const pbx = text('ios/App/App.xcodeproj/project.pbxproj')
assert.equal(pkg.version, APP_VERSION); assert.equal(APP.version, APP_VERSION)
assert.deepEqual([...new Set([...pbx.matchAll(/MARKETING_VERSION = ([\d.]+);/g)].map(m => m[1]))], [APP_VERSION], 'Xcode MARKETING_VERSION')
assert.ok([...pbx.matchAll(/TARGETED_DEVICE_FAMILY = ([^;]+);/g)].every(m => m[1].trim() === '1'), 'iPhone only for 1.0 (iPad would need iPad screenshots + layout)')
assert.match(pbx, /PRODUCT_BUNDLE_IDENTIFIER = com\.brainpal\.app/); assert.equal(APP.bundle_id, 'com.brainpal.app')

/* 8. Info.plist + privacy manifest */
const plist = text('ios/App/App/Info.plist'), man = text('ios-native/PrivacyInfo.xcprivacy')
assert.match(plist, /ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/); assert.doesNotMatch(plist, /NSAllowsArbitraryLoads/); assert.doesNotMatch(plist, /armv7/)
assert.match(man, /NSPrivacyTracking<\/key>\s*<false\/>/)
const MAP = { EmailAddress: 'EMAIL_ADDRESS', OtherUserContent: 'OTHER_USER_CONTENT', PhotosorVideos: 'PHOTOS_OR_VIDEOS', AudioData: 'AUDIO_DATA' }
const declared = [...man.matchAll(/NSPrivacyCollectedDataType(?!Purpose)(\w+)<\/string>/g)].map(m => m[1])
for (const d of declared) assert.ok(PRIVACY_LABEL.some(l => l.category === MAP[d]), `manifest declares ${d} but the label (store-metadata.mjs) does not`)
for (const l of PRIVACY_LABEL.filter(l => l.category !== 'NAME')) assert.ok(Object.values(MAP).includes(l.category) && declared.some(d => MAP[d] === l.category), `label has ${l.category} but the manifest does not`)
assert.ok(PRIVACY_LABEL.every(l => l.data_protections.join() === 'DATA_LINKED_TO_YOU' && l.purposes.join() === 'APP_FUNCTIONALITY'), 'nothing is used for tracking or advertising')
const swiftSrc = read('ios-native/MindfulPlugin.swift').toString()
assert.doesNotMatch(swiftSrc, /systemUptime|mach_absolute_time|creationDate|modificationDate|volumeAvailableCapacity|activeInputModes|\bstat\(/, 'a required-reason API was added: declare it in PrivacyInfo.xcprivacy with a valid reason code')
if (/UserDefaults/.test(swiftSrc)) assert.match(man, /NSPrivacyAccessedAPICategoryUserDefaults[\s\S]*CA92\.1/, 'UserDefaults is used: the manifest must declare it (reason CA92.1)')

/* 9. App Store screenshots, if generated (npm run store:screens): exact sizes */
const SIZES = { '6.9-inch': [1320, 2868], '6.5-inch': [1284, 2778] }
if (existsSync(new URL('../store/screenshots', import.meta.url)))
  for (const [dir, [w, h]] of Object.entries(SIZES)) {
    const files = readdirSync(new URL(`../store/screenshots/${dir}`, import.meta.url)).filter(f => f.endsWith('.png'))
    assert.ok(files.length >= 3 && files.length <= 10, `${dir}: 3–10 screenshots`)
    for (const f of files) { const s = png(`store/screenshots/${dir}/${f}`); assert.deepEqual([s.w, s.h], [w, h], `${dir}/${f} size`); assert.equal(s.color, 2, `${f} has no alpha`) }
  }
console.log('store: all tests passed')
void OWNER
