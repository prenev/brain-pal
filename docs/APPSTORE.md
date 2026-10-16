# Publishing Wobbi to the App Store

Everything here was prepared and checked as far as a Linux sandbox allows. **What is verified, what is not, and what only you can do is spelled out in §1.** Apple renames menu items now and then; the *questions* stay the same.

> Not legal advice. The Privacy Policy and Terms were written to match what the app really does, but have a lawyer (or at least a careful read) before you publish.

---

## 1. Where things stand

| Area | Status |
|---|---|
| App icon (smiling brain mascot), launch image, PWA icons | ✅ made (`public/icon.svg` → `npm run icons`); 1024×1024, RGB, **no alpha** (checked by `npm test`) |
| App Store screenshots (6 captions × 2 sizes) | ✅ `store/screenshots/` — real app screens + captions, exact sizes (`npm run store:screens`) |
| Listing text (name, subtitle, description, keywords, promo, What's New, URLs, review notes) | ✅ `scripts/store-metadata.mjs` → `fastlane/metadata/` (limits + wording rules tested) |
| Privacy policy, Terms, Support, open-source notices | ✅ `src/lib/legal.ts` → in-app (More → About & legal) and static pages (`npm run site`) |
| Privacy manifest (`PrivacyInfo.xcprivacy`), export-compliance flag, iPhone-only, version 1.0.0, 64-bit | ✅ in the Xcode project (checked by `npm test`) |
| Native Liquid Glass tab bar, Sign in with Apple, in-app account deletion, crisis support | ✅ built (Swift compiles on macOS CI); **not yet seen on a real iPhone** |
| Automation: TestFlight upload, listing + screenshot upload | 🟡 written (`fastlane/`, `.github/workflows/testflight.yml`) but **never run** — needs your Apple secrets |
| Apple Developer account, App Store Connect record, API key, Pages switch, your name/e-mail in the legal text, trademark check, device test | 👤 **you** — §3 and `TODO.md` |

`npm run store:check` prints exactly what is still blank.

---

> **Focus guard & the App Store:** the Screen Time guard needs Apple's **Family Controls (Distribution)** approval. Until you have it, build **without** `npm run ios:screentime`; the guard then shows "not available" and nothing else is affected. Details: `docs/SCREENTIME.md`.

## 2. What it costs and what you need
- **Apple Developer Program: US$99 / year** (you said you have the account). Individuals sign up with an Apple ID; companies need a D-U-N-S number.
- A **Mac with Xcode** *or* the GitHub Actions workflow in §5 (still needs a Mac once if you prefer Xcode to the API key route).
- An **iPhone** for the final check (TestFlight).
- A **public contact e-mail** for the privacy policy / App Store (a dedicated address is better than your personal one).

---

## 3. Step by step (in this order)

### Step 1 — Fill in your details (10 min)
1. `src/lib/legal.ts` → `OWNER`: `developerName`, `contactEmail`, `governingLaw` (e.g. "the laws of England and Wales").
2. `scripts/store-metadata.mjs` → `APP.copyright` (e.g. `2026 Jane Doe`) and `REVIEW` (your name, e-mail, phone — Apple may call you).
3. `npm run site && npm run store:meta && npm test`, commit, push.
4. **Trademark / name check** (15 min, do not skip): search "Wobbi" in the App Store, Google Play, [USPTO](https://tmsearch.uspto.gov), [EUIPO](https://euipo.europa.eu/eSearch/) and [WIPO Global Brand DB](https://branddb.wipo.int). If another mental-health/health app uses the same or a confusingly similar name, change it **now** (name lives in `scripts/store-metadata.mjs`, `Info.plist` `CFBundleDisplayName`, `src/lib/legal.ts`). Apple also rejects a name already taken by another app.

### Step 2 — Put the legal pages online (5 min)
GitHub repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then merge to `main` (or run the *Legal site (GitHub Pages)* workflow). Pages go live at **https://prenev.github.io/brain-pal/** with `privacy.html`, `terms.html`, `support.html`, `licenses.html`. Check with `npm run store:check -- --online`.
*(If the repo is private, Pages needs a paid GitHub plan; otherwise host the `site/` folder anywhere (Netlify, Cloudflare Pages) and change `SITE_URL` in `src/lib/legal.ts` and `SITE` in `scripts/store-metadata.mjs`.)*

### Step 3 — Apple Developer portal (10 min) · developer.apple.com → Certificates, Identifiers & Profiles
1. **Identifiers → + → App IDs → App**. Description *Wobbi*, **Bundle ID (Explicit): `com.brainpal.app`**.
2. Tick capabilities: **HealthKit** (leave "Clinical Health Records" and "Background Delivery" **off**), **Sign in with Apple**. (Nothing else: no Push, no iCloud, no In-App Purchase.)
3. If you use Google sign-in you already did the Google console part (`docs/SUPABASE.md`).

### Step 4 — Create the app in App Store Connect (10 min) · appstoreconnect.apple.com → Apps → +
| Field | Answer |
|---|---|
| Platforms | iOS |
| Name | `Wobbi: Mood & Calm` (if taken: `Wobbi – Mood & Calm`, or pick another) |
| Primary language | English (U.S.) |
| Bundle ID | `com.brainpal.app` (pick it from the list; appears after Step 3) |
| SKU | `brainpal-ios-1` (anything unique, never shown) |
| User access | Full access |

### Step 5 — Get a build to TestFlight

**Route A — your Mac + Xcode (simplest, no secrets):**
```bash
git pull && npm ci
npm run ios:sync        # builds the web app, syncs Capacitor, re-applies our native files
npm run ios:apple       # adds the Sign in with Apple entitlement (re-run after EVERY ios:sync)
npm run ios:open
```
In Xcode: select target **App** → *Signing & Capabilities* → Team = yours, "Automatically manage signing" on; confirm **HealthKit** and **Sign in with Apple** are listed. Set the run destination to **Any iOS Device (arm64)** → **Product → Archive** → **Distribute App → App Store Connect → Upload**. After ~10–30 min of processing the build appears in App Store Connect → TestFlight (answer *Export compliance → none of the above* if asked; the Info.plist already says "no non-exempt encryption").

**Route B — automated (GitHub Actions + fastlane):** create an API key once, add four secrets, click *Run workflow*. See §5.

Then install via the **TestFlight** iPhone app and run the checklist in §8.

### Step 6 — Fill in the listing (20 min) — every answer, copy-paste
Text fields are already in `fastlane/metadata/en-US/*.txt` (and §4 shows where each goes). Upload screenshots from `store/screenshots/` (§4).

**App Information**
- **Subtitle** `Diary, journal & calm toolkit` · **Category** primary **Health & Fitness**, secondary **Lifestyle**. *(Do not choose "Medical": it triggers stricter review and we make no medical claims.)*
- **Content Rights** — "Does your app contain, show or access third-party content?" → **Yes, and I have the rights** (open-source emoji art under the MIT licence + the Nunito font under the OFL; notices ship in the app).
- **Age Rating** — answer every item **None**, except **Medical or Wellness topics / medical treatment information → Infrequent/Mild** (self-help content about mood and anxiety, not treatment). Also: Unrestricted web access **No** · User-generated content **No** · Messaging/chat **No** · Advertising **No** · Parental controls **No** · Age assurance **No**. Apple computes the rating (expect **4+ to 12+**); don't try to game it.
- **Regulated medical device?** (new question in some regions) → **No**.

**Pricing and Availability** — Price **Free** (US$0) · Availability **all countries** (or untick any you don't want) · no pre-order.

**App Privacy** (App Store Connect → App Privacy → Get Started) — Privacy Policy URL `https://prenev.github.io/brain-pal/privacy.html`. Then:
- *Do you or your third-party partners collect data from this app?* → **Yes** (only because of the optional account; most users store nothing on our servers).
- Tick these and nothing else, then for **each**: *Linked to you* **Yes** · *Used for tracking* **No** · Purpose **App Functionality** only.
  - **Contact Info → Email Address** · **Contact Info → Name** (nickname / name Apple or Google shares)
  - **User Content → Photos or Videos** · **Audio Data** · **Other User Content** (entries, journal, voice memos' text, anchors…)
- Do **not** tick Health & Fitness: sleep and Mindful Minutes stay on the device / in Apple Health and are not collected by us. Do **not** tick Usage Data, Diagnostics, Identifiers, Location, Purchases.
- *Tracking* → **No, we don't track**. (No App Tracking Transparency prompt is needed; there is none.)
- Note on AI: when a person turns on the AI helper, the text/audio they choose goes from their device straight to Google with their own key. We never see it. If you prefer the most conservative label, additionally treat it as "Other User Content shared with a third party"; the policy already discloses it.
- Same answers as `ios-native/PrivacyInfo.xcprivacy` and `fastlane/app_privacy_details.json` (test-checked to agree).

**EU Digital Services Act → Trader status** (App Store Connect → Business / Agreements). Choose **Non-trader** only if you are an individual not acting for a business and the app is a hobby/free; if you plan to earn money from it, you're a **trader** and your address, phone and e-mail become public on the EU listing (use a business address/PO box). Apple explains the test on that page.

**Version 1.0 page**
| Field | Answer |
|---|---|
| Promotional text, Description, Keywords, What's New | from `fastlane/metadata/en-US/` (paste or upload with `fastlane ios metadata`) |
| Support URL | `https://prenev.github.io/brain-pal/support.html` |
| Marketing URL | `https://prenev.github.io/brain-pal/` |
| Copyright | `2026 <your name>` |
| Build | the one you uploaded |
| Version release | **Manually release** (you choose the day) · tick **Phased release for automatic updates** later |
| Sign-in required? | **No** (uncheck "Sign-in required"; no demo account) |
| App Review contact | your name, e-mail, phone |
| Notes | paste `fastlane/metadata/review_information/notes.txt` (explains no-login, Health use, AI opt-in, native features) |
| Advertising Identifier (IDFA) | **No** |
| Export compliance | **Yes it uses encryption but only exempt/standard HTTPS** → the Info.plist key `ITSAppUsesNonExemptEncryption=false` answers this for every build; no documents needed |
| Content rights, Age rating | done above |

### Step 7 — Submit
**Add for Review → Submit.** Typical first review: 24–48 h. If rejected, read §7; fix and resubmit.

---

## 4. Every asset and where it goes
| Asset | File(s) | Goes to |
|---|---|---|
| **App icon** 1024×1024 PNG, opaque | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (source `public/icon.svg`) | inside the app; App Store Connect shows it automatically from the build |
| Launch image | `ios/.../Splash.imageset/*` | inside the app |
| **Screenshots 6.9″** (1320×2868) | `store/screenshots/6.9-inch/01…06-*.png` | Version page → iPhone 6.9″ Display (Apple scales it to 6.7″/6.5″/6.3″/6.1″ if you give no smaller set) |
| **Screenshots 6.5″** (1284×2778) | `store/screenshots/6.5-inch/*` | iPhone 6.5″ Display (only if App Store Connect demands it) |
| iPad screenshots | not needed: the app is **iPhone-only** for 1.0 | — |
| App preview video | optional, skipped | — |
| Privacy Policy URL | `…/privacy.html` | App Privacy + Version page |
| Terms of Service | `…/terms.html` (+ in-app) | optional "License Agreement": leave Apple's standard EULA, or paste the Terms |
| Support URL | `…/support.html` | Version page |
| Name / subtitle / description / keywords / promo / What's New | `scripts/store-metadata.mjs` | Version page |

Screenshot captions: *Check in with one tap · Calm your body in minutes · See your month at a glance · Park worries, plan one small step · Proof you're growing · A private place to write.* They are real app screens in a simulated iPhone shell; the web build draws the CSS tab bar where the real app shows the native glass bar. **Better for the final upload:** take the same six screens on a real iPhone/Simulator (iPhone 16/17 Pro Max) after the build runs, and reuse the captions. Regenerate any time with `npm run store:screens`.

---

## 5. Automation: what can and cannot be automated
**Can** (written, unverified until you add secrets):
- `npm run store:meta` → writes the listing + review notes + age rating + privacy JSON for fastlane.
- `bundle exec fastlane ios metadata` → uploads listing text, review info, age rating (no binary, no submit).
- `bundle exec fastlane ios screenshots` → uploads `store/screenshots`.
- `bundle exec fastlane ios beta` / GitHub Action **TestFlight upload** → archive, sign, upload to TestFlight (build number = run number).
- `.github/workflows/pages.yml` → publishes the legal site on every change.

**One-time secrets for the API route** (App Store Connect → Users and Access → **Integrations → App Store Connect API → Team Keys → +**, role **App Manager**; download the `.p8` once):
- Repo → Settings → Secrets and variables → Actions → add `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (paste the whole file text), `APPLE_TEAM_ID` (developer.apple.com → Membership).
- Never commit the `.p8`.

**Cannot be automated** (Apple only allows these by hand): creating the developer account and agreements, the App Privacy questionnaire (web form), the DSA trader declaration, pressing *Submit for Review*, and the first TestFlight device check. Automatic signing from CI also needs the key's role to allow cloud-managed certificates; if the first run complains about certificates, do Route A once on a Mac.

---

## 6. "Will Daylio / anyone sue us?" — what protects you, honestly
Ideas and features (mood diary, calendar, streaks, breathing timers, CBT thought records) are not owned by anyone. What *is* protected is specific expression: names, logos, artwork, text, screens' exact look (trade dress), code. So:
- **Name** — "Wobbi" is ours to the extent nobody else has it: do the §3 Step 1 search. Never use another app's name anywhere (metadata, keywords, description, screenshots) — a test fails if a known competitor name appears.
- **Art** — the brain mascot/icon is original. Emoji are Microsoft **Fluent Emoji (MIT)** — attribution + licence text ship in the app. Font Nunito is **OFL**. Icons Lucide (**ISC**).
- **Code and copy** — written from scratch; no competitor assets or text were copied.
- **Look** — chunky rounded dark UI is a common visual idiom, but keep it ours: don't adopt another brand's mascot, exact colour system, sound or character; don't imitate a competitor's screenshots layout.
- **Medical claims** — none; stating them is both a rejection and a liability risk.
- Risk is never zero. If the app earns money or grows, a short consultation with an IP lawyer is cheap insurance. `docs/COMPETITORS.md` is internal research only — don't publish it with competitor claims you haven't verified.

---

## 7. Review risks specific to a mental-health app, and our answers
| Guideline (short) | Risk | What we did |
|---|---|---|
| 1.4.1 Medical/physical harm | claims that can't be supported | no diagnosis/treatment claims; "self-help, not medical care" in the listing, the app, Terms; crisis resources in More → Get support and the SOS flow |
| 2.1 Completeness | crashes, broken links, demo logins | no login needed; links point to pages that must be live **before** submitting (Step 2); test on a real device |
| 4.2 Minimum functionality | "just a website in a wrapper" | native tab bar, haptics, on-device notifications, HealthKit, Sign in with Apple, offline-first; listed in the review notes |
| 4.8 Login services | third-party login without an equivalent | Sign in with Apple is offered next to Google/email |
| 5.1.1 Privacy & (v) account deletion | policy missing; no in-app deletion | policy URL + in-app copy; **More → Account → Delete account** really deletes (Edge Function) |
| 5.1.2 Data use | undisclosed sharing | AI sends data only on explicit opt-in with the user's own key; disclosed in app + policy; self-harm text never sent |
| 5.1.3 Health data | HealthKit misuse | Mindful Minutes write + opt-in sleep read only; never used for ads, not stored in iCloud by us; `test-ios` fails if anything else is read |
| Metadata | other brands, screenshots not showing the app, promos | tested wording rules; screenshots are real screens |
If Apple asks "why does a mood app need HealthKit?" → breathing sessions are saved as Mindful Minutes and (optional) sleep is shown beside mood; both described in the permission prompts.

---

## 8. Real-device checklist (the part I could not do) — in TestFlight
- [ ] Launch image appears, no white flash; icon looks right on the Home Screen.
- [ ] Native tab bar looks like glass (iOS 26), taps switch tabs, hides behind the + menu, nothing cut off at the bottom of scrolled screens.
- [ ] Log a mood in one tap; write a thought entry and a journal entry; kill the app and reopen: still there.
- [ ] Breathing: haptics feel right, screen stays awake, session appears in **Health → Browse → Mindfulness**.
- [ ] Reminders: turn on 07:00/night, wait for one (or use "Send test notification"); tapping opens the right screen.
- [ ] Sleep: Stats → Sleep → connect → allow Health read → last night shows (needs Watch/iPhone sleep data).
- [ ] Sign in with Apple, Google, e-mail; entries appear on a second device; **Delete account** works.
- [ ] Airplane mode: everything except sync/AI still works.
- [ ] Dynamic Type / VoiceOver quick pass; Dark mode is the only mode (set).
- [ ] More → About & legal opens all four documents; Privacy/Support URLs open in Safari.

---

## 9. After approval
- Release manually, then enable **phased release** for updates.
- Next version: bump `package.json`, `src/lib/appInfo.ts`, `scripts/store-metadata.mjs` (`APP.version`) and Xcode `MARKETING_VERSION` together (a test checks they match); the build number comes from the workflow run.
- Promotional text can change any time without review; description/screenshots need a new version.
- Answer reviews, watch crash reports in Xcode Organizer. There is no analytics in the app by design.

## 10. Quick fixes for common rejections
- *Guideline 2.1 — broken privacy link* → Pages not enabled / not deployed yet (Step 2).
- *5.1.1 — account deletion* → point reviewers to More → Account (visible only when sync is configured): make sure the **release build has the Supabase keys** (`.env` at `ios:sync` time) or say so in the notes.
- *4.8* → ensure the Sign in with Apple button appears on the login screen (Apple provider switched on in Supabase, `docs/SUPABASE.md`).
- *Metadata mentions "anxiety disorder/depression treatment"* → remove; keep "self-help".
- *Icon has alpha* → run `npm run icons` (it flattens) and `npm test`.
