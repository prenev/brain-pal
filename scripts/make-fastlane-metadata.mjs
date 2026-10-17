// npm run store:meta → fastlane/metadata/**, fastlane/app_privacy_details.json, fastlane/age_rating.json from scripts/store-metadata.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { LISTING, APP, REVIEW, AGE_RATING, PRIVACY_LABEL } from './store-metadata.mjs'
const base = new URL('../fastlane/', import.meta.url)
const w = (rel, text) => { const u = new URL(rel, base); mkdirSync(new URL('.', u), { recursive: true }); writeFileSync(u, String(text).trim() + '\n') }
// the App Store record was created in English (Australia): its listing lives under en-AU
for (const [k, v] of Object.entries(LISTING)) w(`metadata/en-AU/${k === 'privacy_url' ? 'privacy_url' : k}.txt`, v)
w('metadata/primary_category.txt', APP.primary_category); w('metadata/secondary_category.txt', APP.secondary_category); w('metadata/copyright.txt', APP.copyright)
for (const [k, v] of Object.entries(REVIEW)) w(`metadata/review_information/${k === 'notes' ? 'notes' : k}.txt`, v)
w('age_rating.json', JSON.stringify(AGE_RATING, null, 2)); w('app_privacy_details.json', JSON.stringify(PRIVACY_LABEL, null, 2))
console.log('fastlane/metadata written')
