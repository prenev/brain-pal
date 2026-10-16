// Single source for the Privacy Policy, Terms, Support page and open-source notices.
// The app renders these (More → About & legal) and `npm run site` turns them into the static pages the App Store links to.
// Pure data, no imports (unit-tested by scripts/test-store.mjs). Not legal advice: have a lawyer read it before you publish.

/** OWNER: fill these in before submitting (npm run store:check lists what is still empty). */
export const OWNER = {
  developerName: '',        // your legal name or company, as on your Apple Developer account
  contactEmail: 'hello@wobbi.app',         // public support + privacy contact (App Store Connect needs one too)
  governingLaw: '',         // e.g. "the laws of England and Wales" / "the State of California, USA"
}
export const SITE_URL = 'https://wobbi.app'
/** Public legal pages live on the website (wobbi.app/privacy/ …). */
export const legalUrl = (id: 'privacy' | 'terms' | 'support' | 'licenses') => `${SITE_URL}/${id}/`
export const APP_NAME = 'Wobbi'
export const LEGAL_UPDATED = '16 October 2026'

export interface Section { h: string; p?: string[]; li?: string[] }
export interface LegalDoc { id: 'privacy' | 'terms' | 'support' | 'licenses'; title: string; intro: string; sections: Section[] }

const who = () => OWNER.developerName || '[developer name]'
const mail = () => OWNER.contactEmail || '[contact email]'

export const privacy = (): LegalDoc => ({
  id: 'privacy', title: 'Privacy Policy',
  intro: `${APP_NAME} is a self-help diary and anxiety toolkit. It is built to work on your device without an account. This policy says exactly what is stored, what can leave your device, and what you can do about it. Last updated ${LEGAL_UPDATED}.`,
  sections: [
    { h: 'Who we are', p: [`${APP_NAME} is published by ${who()}. Questions or requests about your data: ${mail()}.`] },
    { h: 'The short version', li: [
      'Your entries, journal, anchors, worries and settings live on your device by default.',
      'We do not run analytics, advertising, tracking or any third-party SDK that collects data about you. We do not sell or share your data for advertising.',
      'Creating an account is optional. If you do, your entries sync to our database so they follow you between devices.',
      'AI features are off by default. If you turn them on, the text or audio you choose to send goes straight from your device to Google using your own API key.',
      'Health data: Apple Health sleep is read only if you turn it on, stays on your device and is never uploaded.',
    ] },
    { h: 'What is stored on your device', p: ['Everything you create in the app is saved on your device: mood entries, thoughts, emotions, tags, photos, voice memos, journal entries, daily anchors, worries, breathing and focus sessions, coins and settings. Deleting the app removes it. You can export your entries from More → Export data (photos and audio are not included in the export).'] },
    { h: 'If you create an account (optional)', p: ['You can sign in with email and password, Sign in with Apple, or Google. We then store:'],
      li: ['Your email address (and the name Apple or Google shares, if any) to identify your account.', 'Your entries, photos and voice memos, and the items synced from the journal, anchors, small steps, hand-logged sleep, purchases, reminder settings and theme.', 'Technical data the hosting provider needs to run the service (such as IP address in server logs).'] },
    { h: 'Where account data is kept', p: ['Account data is stored with our backend provider, Supabase, which acts as our processor. It is encrypted in transit and at rest, and access rules ensure each account can only read its own rows. We use it only to run the app for you: never for advertising, profiling or sale.'] },
    { h: 'Apple Health (iPhone app)', li: [
      'Writing: with your permission, breathing and grounding sessions are saved to Apple Health as Mindful Minutes.',
      'Reading: only if you turn it on, the app reads sleep analysis (for example from Apple Watch) to show your sleep next to your mood. It reads nothing else from Health.',
      'Health data is used only inside the app on your device to show it to you. It is not uploaded, not stored in iCloud by us, and never used for advertising or sold.',
      'You can withdraw access at any time in the Health app or iOS Settings.',
    ] },
    { h: 'Website and waitlist', p: ['This applies to wobbi.app, not to the app. The site has no analytics, advertising, tracking cookies or third-party scripts that collect data about visitors. Fonts and images are served from the site itself.', 'If you join the waitlist we store what you type into the form: your email address, and optionally your name, which topics interest you, which phone you use and a short note. We use it only to tell you when Wobbi is available and to decide what to build first. You agree to that with the consent box before sending. The list is kept in our backend (Supabase) and is readable only by us; nobody who visits the site can read it. We do not sell it or share it for advertising, and we will not use it for anything unrelated to Wobbi.', 'To be removed from the waitlist, or to see or correct what we hold, email ' + mail() + ' from the address you signed up with and we will delete it.'] },
    { h: 'AI helper (optional, off by default)', p: ['If you turn it on you add your own Google Gemini API key. The key stays on your device. When you tap an AI action (for example transcribe a voice memo or suggest reframes), only the text or audio for that action is sent from your device directly to Google. It does not pass through our servers.', 'Google handles it under its own terms. On Google’s free tier, Google may use what you send to improve its products and humans may review it, so do not send anything you would not want that to apply to. Text that looks like self-harm is never sent to an AI; the app shows support options instead.'] },
    { h: 'Focus guard (iPhone, optional)', p: ['If you turn on the Focus guard you choose apps with Apple’s Screen Time picker. iOS gives Wobbi only anonymous tokens for what you chose: we cannot see which apps they are, how you use them, or your Screen Time data. The choice and unlock times are stored on your device only and never uploaded. You can switch the guard off at any time.'] },
    { h: 'Purchases', p: ['Subscriptions are bought and managed through Apple. We never see your payment details. We only learn, from Apple, whether your Wobbi Pro subscription is active and when it ends, so we can unlock the Pro features on your device.'] },
    { h: 'Notifications', p: ['Reminders on the iPhone app are scheduled on your device and never leave it. On the web version, if you turn on push reminders, your browser’s push address is stored with your account so we can send them.'] },
    { h: 'Camera, microphone and photos', p: ['Only used when you tap the matching button to attach a photo or record a voice memo. Media stays on your device unless you are signed in, in which case it syncs with your entry.'] },
    { h: 'How long we keep data', p: ['On your device: until you delete it or the app. In your account: until you delete the account (More → Account → Delete account), which permanently removes your account, entries, photos and voice memos from our systems. Routine backups at our provider may take a short time to expire.'] },
    { h: 'Your rights', p: [`Depending on where you live (for example the EU/UK GDPR or California law) you can ask to access, correct, export or delete your data, or object to processing. Most of this you can do yourself in the app (edit, export, delete account). For anything else write to ${mail()}. You may also complain to your local data-protection authority.`] },
    { h: 'Children', p: [`${APP_NAME} is not directed to children under 13 and we do not knowingly collect their data. If you believe a child has created an account, contact us and we will delete it.`] },
    { h: 'Not medical care', p: [`${APP_NAME} is a self-help tool. It is not a medical device and does not diagnose, treat or prevent any condition. If you might be in danger, call your local emergency number.`] },
    { h: 'Changes', p: ['If this policy changes in a way that matters we will update the date above and tell you in the app.'] },
    { h: 'Contact', p: [`${who()} · ${mail()}`] },
  ],
})

export const terms = (): LegalDoc => ({
  id: 'terms', title: 'Terms of Service',
  intro: `These terms apply when you use ${APP_NAME}. By using the app you agree to them. Last updated ${LEGAL_UPDATED}.`,
  sections: [
    { h: 'What the app is', p: [`${APP_NAME} is a self-help diary, thought-record, journaling and calming toolkit. It is provided by ${who()} (“we”).`] },
    { h: 'Not medical advice', p: ['The app and anything in it (including summaries, progress, insights and AI output) is for general self-help and information only. It is not medical advice and is not a substitute for a doctor, therapist or emergency service. Do not ignore professional advice because of something you read here. If you are in crisis or might harm yourself or someone else, call your local emergency number or use the support options in the app.'] },
    { h: 'Who can use it', p: ['You must be at least 13 years old (or the minimum age in your country). If you are under 18, use it with a parent or guardian’s permission.'] },
    { h: 'Your account and your content', li: [
      'An account is optional. You are responsible for keeping your sign-in details safe.',
      'Your entries are yours. You give us only the permission needed to store and sync them for you.',
      'You are responsible for what you write and attach. Do not use the app to break the law.',
    ] },
    { h: 'Focus guard', p: ['The optional Focus guard uses iOS Screen Time to pause apps you choose until you finish a quick activity. Activities such as push-ups are on the honour system and must only be done if they are safe for you. It is self-help, not medical or parental-control software, and you can switch it off at any time.'] },
    { h: 'AI features', p: ['AI features are optional and use your own Google API key. Output can be wrong or unsuitable. It is untrusted suggestion, not advice. Your use of Google’s service is governed by Google’s terms and billing.'] },
    { h: 'Wobbi Pro (optional subscription)', p: ['Wobbi Pro is an optional auto-renewing monthly subscription sold through the Apple App Store. Payment is charged to your Apple ID at confirmation of purchase and renews each month unless you cancel at least 24 hours before the period ends. Manage or cancel it in your Apple ID settings (Settings → your name → Subscriptions). Any unused part of a free trial is forfeited when you subscribe. Prices may vary by country and are shown by the App Store before you confirm. Refunds are handled by Apple under its policies.', 'Things that keep you safe, and your own data, are never behind the subscription: the SOS siren, breathing and grounding, crisis support, check-ins, journal, worry time, reminders, and exporting or deleting your data.'] },
    { h: 'Coins and rewards', p: ['Coins are a fun in-app marker of your own activity. They have no cash value, cannot be bought with money and cannot be transferred.'] },
    { h: 'Acceptable use', li: ['No attempting to break, overload or reverse-engineer the service.', 'No using another person’s account.', 'No unlawful, harassing or harmful content.'] },
    { h: 'Availability and changes', p: ['We try to keep the app and sync working but cannot promise uninterrupted service. Features may change. Because the app works on your device, keep your own export if your data matters to you.'] },
    { h: 'Ending use', p: ['You can stop at any time and delete your account in the app. We may suspend accounts that abuse the service.'] },
    { h: 'Disclaimers and liability', p: ['The app is provided “as is” and “as available” without warranties of any kind, to the extent allowed by law. To the extent allowed by law we are not liable for indirect or consequential loss, or for loss of data. Nothing here limits liability that cannot be limited by law (for example for death or personal injury caused by negligence, or fraud).'] },
    { h: 'Apple', p: ['If you got the app from the Apple App Store: these terms are between you and us, not Apple. Apple has no obligation to provide support or maintenance, is not responsible for claims about the app, and is a third-party beneficiary of these terms with the right to enforce them. Apple’s standard licensed-application end-user terms also apply.'] },
    { h: 'Governing law', p: [`These terms are governed by ${OWNER.governingLaw || '[governing law]'}, without regard to conflict-of-law rules. Mandatory consumer rights where you live are not affected.`] },
    { h: 'Contact', p: [`${who()} · ${mail()}`] },
  ],
})

export const support = (): LegalDoc => ({
  id: 'support', title: 'Support',
  intro: `Help with ${APP_NAME}. For anything not answered here write to ${mail()}.`,
  sections: [
    { h: 'If you need help right now', p: ['If you might be in danger, call your local emergency number. Free, confidential lines:'],
      li: ['United States & Canada: call or text 988', 'United Kingdom & Ireland: Samaritans 116 123', 'Australia: Lifeline 13 11 14', 'Other countries: findahelpline.com'] },
    { h: 'Do I need an account?', p: ['No. Everything works on your device without one. An account only adds sync between devices.'] },
    { h: 'How do I delete my data?', p: ['On the device: delete the app. In your account: More → Account → Delete account. That permanently removes your account, entries, photos and voice memos.'] },
    { h: 'How do I export my entries?', p: ['More → Export data. You get a JSON file of your entries (photos and audio are not included).'] },
    { h: 'Apple Health', p: ['Turn it on or off in More → Apple Health. You can also manage access in the Health app → Sharing → Apps → Wobbi.'] },
    { h: 'Reminders are not arriving', p: ['Check iOS Settings → Notifications → Wobbi is allowed, and that the reminder is on in More → Reminders. Reminders are skipped for today once you have already done the thing.'] },
    { h: 'Is my AI key safe?', p: ['The key is stored only on your device and used only when you tap an AI action. It is never sent to us.'] },
    { h: 'Contact', p: [`${who()} · ${mail()}`] },
  ],
})

/** Third-party software and art bundled in the app. scripts/test-store.mjs checks every runtime dependency is listed. */
export const NOTICES: { name: string; license: string; by: string; url: string; npm?: string[] }[] = [
  { name: 'React', license: 'MIT', by: 'Meta Platforms, Inc. and affiliates', url: 'https://react.dev', npm: ['react', 'react-dom'] },
  { name: 'Capacitor', license: 'MIT', by: 'Ionic / Drifty Co.', url: 'https://capacitorjs.com', npm: ['@capacitor/app', '@capacitor/core', '@capacitor/haptics', '@capacitor/local-notifications', '@capacitor/splash-screen', '@capacitor/status-bar'] },
  { name: 'Supabase JS', license: 'MIT', by: 'Supabase, Inc.', url: 'https://supabase.com', npm: ['@supabase/supabase-js'] },
  { name: 'Lucide icons', license: 'ISC', by: 'Lucide Contributors (portions Cole Bemis, Feather)', url: 'https://lucide.dev', npm: ['lucide-react'] },
  { name: 'Phosphor Icons', license: 'MIT', by: 'Phosphor Icons (Tobias Fried, Helena Zhang)', url: 'https://phosphoricons.com', npm: ['@phosphor-icons/react'] },
  { name: 'Fluent Emoji', license: 'MIT', by: 'Microsoft Corporation', url: 'https://github.com/microsoft/fluentui-emoji' },
  { name: 'Nunito font', license: 'SIL Open Font License 1.1', by: 'The Nunito Project Authors (Vernon Adams, Jacques Le Bailly, Manvel Shmavonyan, Alexei Vanyashin)', url: 'https://github.com/googlefonts/nunito', npm: ['@fontsource-variable/nunito'] },
  { name: 'canvas-confetti', license: 'ISC', by: 'Kiril Vatev', url: 'https://github.com/catdad/canvas-confetti', npm: ['canvas-confetti'] },
  { name: 'Workbox', license: 'MIT', by: 'Google LLC', url: 'https://developer.chrome.com/docs/workbox', npm: ['workbox-precaching'] },
]

export const licenses = (): LegalDoc => ({
  id: 'licenses', title: 'Open-source notices',
  intro: `${APP_NAME} is built with the following open-source software and artwork. Thank you to their authors. The ${APP_NAME} name, mascot and app code are © 2026 ${who()}.`,
  sections: NOTICES.map(n => ({ h: n.name, p: [`${n.license} — ${n.by}.`, n.url] })).concat([
    { h: 'MIT License (applies to the MIT-licensed items above)', p: ['Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.', 'THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'] },
    { h: 'ISC License (Lucide, canvas-confetti)', p: ['Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies. THE SOFTWARE IS PROVIDED “AS IS” AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.'] },
    { h: 'SIL Open Font License 1.1 (Nunito)', p: ['The Nunito font is licensed under the SIL Open Font License, Version 1.1, available at https://openfontlicense.org. It is bundled unmodified.'] },
  ]),
})

export const DOCS = { privacy, terms, support, licenses }
