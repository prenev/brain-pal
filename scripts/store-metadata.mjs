// The App Store listing text. Single source: `npm run store:meta` writes it to fastlane/metadata/ (what `fastlane deliver` uploads)
// and scripts/test-store.mjs checks Apple's limits and the wording rules. Edit here, not in the generated files.
export const SITE = 'https://wobbi.app'

export const LISTING = {
  name: 'Wobbi: Mood & Calm',                       // ≤ 30
  subtitle: 'Diary, journal & calm toolkit',            // ≤ 30
  promotional_text: 'One-tap mood check-ins, a private journal, slow breathing and a gentle plan for worries. No ads, no tracking, works without an account.', // ≤ 170, can be changed any time without review
  keywords: 'mood,journal,diary,anxiety,breathing,cbt,worry,gratitude,habits,sleep,calm,thoughts,selfcare,mindful', // ≤ 100 incl. commas, never the app name or other brands
  description: `Wobbi is a friendly, private mood diary and calming toolkit. Check in with how you feel in one tap, write things down, breathe, and take one small step at a time.

CHECK IN IN ONE TAP
• Tap a face to log your mood — add details only when you want to.
• Thought records guide you gently from a worrying thought to a kinder, more balanced one.
• See patterns in a calendar, in simple charts and in plain-language weekly and monthly summaries.

CALM YOUR BODY
• Slow breathing with soft haptics (in 4, out 6, or box breathing).
• 5-4-3-2-1 grounding.
• “Anxious right now?” walks you through rating, calming and re-rating, so you can see it help.

PARK WORRIES
• Write a worry down and let it wait for your daily Worry Time.
• Decide for each one: take one small step, or let it go.
• Start that step with a calm minute and a gentle focus timer.

JOURNAL, YOUR WAY
• A private journal with optional prompts, moods and tags. Drafts save themselves.
• Search and filter whenever you like.

FIVE SMALL ANCHORS
• Pick up to five tiny daily habits — a walk, a glass of water, one line in your journal.
• Some tick themselves when you breathe or write. No endless to-do lists.

SEE YOUR PROGRESS
• Skill levels grow with what you actually do, and they never go down.
• “Proof” cards only appear when there is enough of your own data to say something real.
• Earn coins for showing up and use them for colour themes or rest days that protect your streak.

REMINDERS THAT RESPECT YOU
• Breathe at 07:00 and again at night, or whenever suits you. Reminders skip themselves once you have already done the thing.

SLEEP (OPTIONAL)
• Connect Apple Health to see last night’s sleep, from Apple Watch or iPhone, next to your mood. Wobbi only reads sleep, only if you allow it, and it never leaves your device.

WOBBI PRO (OPTIONAL MONTHLY SUBSCRIPTION)
• Unlock advanced analytics: before-and-after proof of your progress, plus weekly and monthly summaries.
• The SOS siren, breathing, crisis support, check-ins, journal, worry time, reminders and exporting your data are always free.
• Payment is charged to your Apple ID at confirmation of purchase. The subscription renews automatically each month unless cancelled at least 24 hours before the end of the current period. Manage or cancel in Settings → your name → Subscriptions.
• Terms of Service: https://wobbi.app/terms/ · Privacy Policy: https://wobbi.app/privacy/

PRIVATE BY DESIGN
• Works fully offline with no account. Everything stays on your device by default; an account is optional and only adds sync.
• No ads. No analytics. No tracking. We never sell your data.
• AI helpers are off by default and use your own key. Anything that looks like self-harm is never sent to an AI; support options are shown instead.

Wobbi is a self-help tool and is not medical care. It does not diagnose or treat any condition. If you might be in danger, call your local emergency number.`,   // ≤ 4000
  release_notes: 'Welcome to Wobbi 1.0 — mood check-ins, journal, breathing, worry time, daily anchors, sleep and progress, all private on your device.', // ≤ 4000
  support_url: `${SITE}/support/`,
  marketing_url: SITE,
  privacy_url: `${SITE}/privacy/`,
}

export const APP = {
  bundle_id: 'com.brainpal.app',
  primary_category: 'HEALTH_AND_FITNESS',
  secondary_category: 'LIFESTYLE',
  copyright: '2026 Pranav Ajay',    // OWNER: "year + your name", e.g. "2026 Jane Doe"
  version: '1.0.0',
  price_tier: 'Free',
}

export const REVIEW = {
  first_name: 'Pranav', last_name: 'Ajay', email_address: 'pranavajay2002@gmail.com', phone_number: '+61 493 235 794',   // OWNER (Apple may contact you during review)
  demo_user: '', demo_password: '',                                    // none needed: the app works without an account
  notes: `Wobbi is a self-help mood diary and calming toolkit. No account is needed: everything works on the device, so there are no demo credentials.

Where to find things:
• Home tab → tap a face to log a mood; the + button opens the menu (thought entry, journal entry, park a worry, breathing, "anxious right now").
• More → Reminders (iPhone app schedules local notifications), Apple Health (writes Mindful Minutes; optionally reads sleep only, after the user turns it on under Stats → Sleep), AI helper (off by default; the user supplies their own Google Gemini key; nothing is sent unless they turn it on and tap an AI action), About & legal.
• More → Account appears only when the optional sync backend is configured: Sign in with Apple, Google and email are offered together; Account → Delete account permanently deletes the account and its data in-app.

Health data: HealthKit is used only to (1) save breathing sessions as Mindful Minutes and (2) read sleep analysis if the user opts in. Health data is never uploaded or used for advertising. Privacy policy: ${SITE}/privacy.html

In-app purchase: Wobbi Pro, an auto-renewing monthly subscription (product com.brainpal.app.pro.monthly, StoreKit 2). To test: Settings of the sandbox account, then More → Wobbi Pro (or tap a locked feature: Home → Progress or Summary → Week). Restore purchases is on the paywall. The SOS siren, breathing, crisis support and data export are never locked.

Native features beyond a web view: native tab bar, Taptic Engine haptics, on-device scheduled notifications, HealthKit, Sign in with Apple, system web authentication.

Safety: text that looks like self-harm is never sent to an AI and the app shows crisis support options (More → Get support). The app makes no medical claims.`,
}

/** Age-rating answers in the format `fastlane deliver` accepts (0 = none, 1 = infrequent/mild, 2 = frequent/intense). The web form asks the same questions: see docs/APPSTORE.md. Answer honestly; Apple computes the rating. */
export const AGE_RATING = {
  CARTOON_FANTASY_VIOLENCE: 0, REALISTIC_VIOLENCE: 0, PROLONGED_GRAPHIC_SADISTIC_REALISTIC_VIOLENCE: 0,
  PROFANITY_CRUDE_HUMOR: 0, MATURE_SUGGESTIVE: 0, HORROR: 0, ALCOHOL_TOBACCO_DRUGS: 0,
  SEXUAL_CONTENT_NUDITY: 0, GRAPHIC_SEXUAL_CONTENT_NUDITY: 0, GAMBLING: 0, GAMBLING_CONTESTS: 0,
  MEDICAL_TREATMENT_INFO: 1,     // wellness / mental-health self-help content (not treatment advice): the honest, conservative answer
  UNRESTRICTED_WEB_ACCESS: 0,
}

/** Privacy "nutrition label" (App Store Connect → App Privacy). Mirrors ios-native/PrivacyInfo.xcprivacy. */
export const PRIVACY_LABEL = [
  { category: 'EMAIL_ADDRESS', purposes: ['APP_FUNCTIONALITY'], data_protections: ['DATA_LINKED_TO_YOU'] },
  { category: 'NAME', purposes: ['APP_FUNCTIONALITY'], data_protections: ['DATA_LINKED_TO_YOU'] },
  { category: 'OTHER_USER_CONTENT', purposes: ['APP_FUNCTIONALITY'], data_protections: ['DATA_LINKED_TO_YOU'] },
  { category: 'PHOTOS_OR_VIDEOS', purposes: ['APP_FUNCTIONALITY'], data_protections: ['DATA_LINKED_TO_YOU'] },
  { category: 'AUDIO_DATA', purposes: ['APP_FUNCTIONALITY'], data_protections: ['DATA_LINKED_TO_YOU'] },
]
