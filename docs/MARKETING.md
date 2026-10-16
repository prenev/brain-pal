# Wobbi: marketing & growth strategy

**Goal:** make Wobbi the app people reach for first when their head is loud: the one-tap check-in, the siren when anxiety spikes, the buddy that keeps them going. "Household name" is a 3–5 year outcome that nobody can promise or buy; what *can* be built on purpose is a growth engine that compounds: great store presence, a mascot people love, content that gets shared, a product that gets recommended, and money spent only where it measurably pays back.

> **Honesty box.** Every number below (installs, conversion, costs per install) is a **planning assumption** from typical ranges in this category, not a measurement and not a promise. Replace them with your own data after the first 30 days. The first job of this plan is to *learn cheaply*, then scale what works.
> Nothing here needs a lawyer except the health-claims rules in §11. Read those before you spend a cent.

---

## 1. Where we stand (what we already have that marketing can use)
| Asset | Why it matters for growth |
|---|---|
| **Wobbi**, a cute lavender brain character with 16 poses, animation strips, sticker-ready art | Characters make apps famous (Duolingo's owl, Finch's bird). Wobbi is our #1 brand asset: use it everywhere. |
| **Offline-first, no account, no ads, no tracking** | A rare, honest promise in a category full of data-hungry apps. Trust is the product. |
| **SOS siren, free forever** | The "essential on everyone's phone" hook: people keep an app they might need at 2 a.m. |
| **Focus guard** (anti brain-rot: do push-ups to unlock apps) | A *viral, headline-able, TikTok-able* feature in a topic everybody is already talking about. |
| **Worry time → one small step**, thought records, journal, sleep, proof of progress | Genuine depth competitors lack (see `docs/COMPETITORS.md`). |
| Pro subscription with a free tier that is a complete app (`docs/MONETIZATION.md`) | Free users are the growth engine, paying users fund it. |
| App Store pack: icon, screenshots, listing, legal pages (`docs/APPSTORE.md`) | Ready to ship. |

**Gaps to close before spending money on ads:** a real landing page (started: `npm run site`), the app live in the store with ≥10 genuine ratings, the in-app share features in §7, and a way to measure without spying (§10).

---

## 2. Positioning: one sentence, one enemy, one promise
- **Category we want to own:** *"the calm, private pocket buddy for an overthinking brain"*, not "mental-health app" (crowded, clinical, regulated) and not "habit tracker" (crowded, shallow).
- **One sentence:** *Wobbi is the free, private buddy that helps you calm down, get unstuck and build tiny habits, with no account, no ads and no judgement.*
- **The enemy** (every great brand has one): **doom-scrolling, spiralling thoughts, and apps that farm your data and your attention.** Wobbi is the anti-brain-rot buddy.
- **Three proof points** to repeat everywhere: (1) *Works offline, no sign-up, nothing leaves your phone.* (2) *The SOS siren is always free.* (3) *Do 10 push-ups to unlock TikTok* (curiosity hook → Focus guard).
- **Tone:** warm, a bit funny, never preachy, never clinical, never fear-based. Wobbi talks like a kind friend who is slightly dramatic about snacks.
- **Name check:** do the trademark search from `docs/APPSTORE.md` before spending on brand ads. If "Wobbi" collides, rename *now*; it only gets more expensive later.

## 3. Who we're talking to (in launch order)
| # | Segment | Why first | Where they are | Hook |
|---|---|---|---|---|
| 1 | **Gen Z / students (16–25) fighting brain rot and exam/social anxiety** | Biggest virality, loves characters, hates being nagged | TikTok, Instagram Reels, YouTube Shorts, Reddit, Discord | "I did push-ups to unlock TikTok" · "my brain app is a tiny purple brain" |
| 2 | **Overthinkers & anxious 20–40s** (work stress, sleep, rumination) | Highest need and willingness to pay | Reddit (r/Anxiety, r/CBT, r/getdisciplined), podcasts, newsletters, X | "Park your worries for 10 minutes a day" · "free SOS, no account" |
| 3 | **ADHD / productivity crowd** | Obsessive sharers, love systems and gadgets | ADHD TikTok/YouTube, r/ADHD, Product Hunt | "From worry to one tiny step" · Focus guard |
| 4 | **Privacy-minded people** | Great word of mouth, easy press angle | Hacker News, r/privacy, tech press | "A mental-health app that works offline and doesn't track you" |
| 5 | **Therapists/coaches recommending a free tool to clients** | Slow but sticky and trusted; powerful social proof | LinkedIn, newsletters, therapist communities | "A free thought-record + breathing tool your client already has on their phone" |
| 6 | **Employers / universities** (later, B2B2C) | Big numbers per deal | Direct outreach | Wellbeing perk, aggregated nothing (we hold no data: say so) |

Start with 1 + 2 + 4 (cheapest to reach, strongest fit). Add 3 in month 2, 5 in month 3, 6 only after 50k users.

---

## 4. The growth engine (how people hear, try, stay, and tell others)
```
AWARENESS → STORE PAGE → INSTALL → FIRST-DAY WIN → HABIT → LOVE → TELL OTHERS → (loops back)
 content,PR,   ASO, ratings,  one-tap    Wobbi + tip +   reminders,   levels,    share cards,
 creators,ads  custom pages   onboarding  mood in 10s   streaks      proof      stickers, invites
```
Rule of thumb: **fix the leakiest step first.** Don't pour traffic into a funnel with a bad store page or a bad first day.

## 5. App Store Optimisation (free, and the highest-return work in month 1)
1. **Keywords**: already in `scripts/store-metadata.mjs`. Add Apple Search Ads **Search Terms** data after week 2 and rotate the 100-character field monthly. Never use competitor names (rejection + legal risk; a test enforces it).
2. **Name + subtitle** carry two jobs: brand + the keyword people type. Test variants: "Wobbi: Mood & Calm" vs "Wobbi: Anxiety & Mood". (Name changes need a new version.)
3. **Custom Product Pages** (up to 35, free): one page per audience, each with its own screenshots and promo text, and a unique link for ads/creators. Build: *Anti brain-rot* (Focus guard), *Overthinking & worry*, *Sleep & mood*, *Free SOS*.
4. **Product Page Optimization** (A/B test icon, screenshots, text, free in App Store Connect): test icon (Wobbi full body vs Wobbi face), first screenshot caption, with a 2-week minimum per test.
5. **First 3 screenshots do 80% of the work.** Lead with Wobbi + the hook: *"Do 10 push-ups to unlock TikTok"* → *"Free SOS when anxiety spikes"* → *"Works offline. No account."*
6. **App Preview video** (15–30 s, Wobbi on screen, subtitles, no voice needed): strongly recommended; autoplays in search.
7. **Ratings**: ask once, at a *happy moment* (e.g. after the all-anchors celebration or a level-up, never after SOS or a bad-mood entry) via `SKStoreReviewController` (build item B4). Target ≥4.7 stars; reply to every review in the first 90 days.
8. **Localisation = cheapest multiplier.** After English: Spanish, Portuguese (Brazil), German, French, Japanese, Korean, Hindi, Indonesian, Turkish. Localise *listing text first* (free, instant), the app later. App Store search is per-storefront: a translated listing often doubles impressions there.
9. **Apple features**: submit for **Today tab / App of the Day** consideration via Apple's nomination form (they like native features: Live Activities, widgets, Health, Liquid Glass; we have several) and for **"Apps We Love"**. Timing: launch week and each major update.

## 6. Launch plan (the first 12 weeks)
### T-6 to T-1 weeks: seed
- **Landing page + waitlist** live (email only, double opt-in, no tracking pixels, honest copy). Goal 500–2,000 signups pre-launch from friends, communities, creators.
- **TestFlight beta** with 100–300 people from the waitlist: collect testimonials, bugs, screenshot-worthy quotes. Beta users become launch-day reviewers.
- **Creator seeding**: gift 30–50 micro-creators (5k–100k followers, anxiety/ADHD/productivity/study niches) early access + a **free lifetime Pro code** (App Store *offer codes*). No script, just honest reactions (and #ad disclosure, §11).
- **Press kit** (one page + folder): Wobbi art, screenshots, logo, founder story, facts, quote-able stats, contact. Build it in the site (item M2).
- **Prepare 30 days of short videos** in the bank (see §8).

### Launch week (the "spike")
| Day | Action |
|---|---|
| Mon | App goes live. Email the waitlist. Post the launch video everywhere. Ask beta users for ratings *after* a few days of use. |
| Tue | **Product Hunt** launch (prepare assets and a hunter; aim for a Tue–Thu, 12:01 a.m. PT). Wobbi is perfect PH material. |
| Wed | **Reddit** (value-first posts, not ads: "I built a free, offline thought-record app…" in r/SideProject, r/apple, r/IOSApps, r/ADHD where rules allow; read each sub's self-promo rules first). **Hacker News** "Show HN: a mental-health app that works offline and tracks nothing". |
| Thu | Creator wave 1 posts. Press pitches go out (see §9). |
| Fri | Founder AMA/stories, thank-you post, share first stats. |
| Weekend | Reply to every review/comment; fix the top 3 bugs; ship a 1.0.1 fast (momentum + algorithm love). |

### Weeks 2–12
- Weekly content cadence, monthly update with a **new headline feature** (each update = a news peg + store featuring chance).
- Start **Apple Search Ads** at week 2 (§12), custom product pages per audience.
- Month 2: creator program + referral loop live; month 3: therapist/coach outreach, first employer/university pilots, first localised storefronts.

## 7. Product-led growth: build the features that make people tell others (the highest-leverage section)
Marketing spend buys attention once; **these features keep generating it.** Each is a backlog item; start with the first four.
| # | Feature | Why it spreads | Notes (privacy-safe) |
|---|---|---|---|
| G1 | **Share cards**: a beautiful image of your streak / level-up / "proof you're improving" / weekly summary, with Wobbi and a small "Wobbi" tag | People love sharing progress (Duolingo streaks, Spotify Wrapped) | Generated on device from *numbers only*, no entry text; user taps Share; includes App Store link (custom product page). |
| G2 | **Wobbi sticker pack** (iMessage + WhatsApp/Telegram): 16 poses already drawn | Stickers carry the brand into every chat, free forever | Sprite sheet → sticker PNGs (512 px, transparent). Zero data. |
| G3 | **"Brain-rot saved" counter** in Focus guard: "You did 240 push-ups instead of scrolling this month" + shareable card | Concrete, funny, brag-able; ties to the trending topic | Local only. |
| G4 | **Invite a friend**: give both a week of Pro (App Store *promotional offers/offer codes*) | The cheapest installs are the ones friends send | Needs a redeem flow; no contact-list upload (privacy). |
| G5 | **Home-screen widgets + Lock Screen widget + Live Activity** (streak, one-tap mood, SOS) | Widgets = daily visibility and retention; also Apple-featuring bait | WidgetKit (needs a Mac session). |
| G6 | **Siri / Shortcuts / Action button**: "Hey Siri, I'm anxious" opens SOS | Essential-on-the-phone feeling; word of mouth | App Intents. |
| G7 | **Apple Watch app** (mood tap, breathing with haptics) | Big retention and featuring angle | Later. |
| G8 | **Weekly "Wobbi's recap"** notification/card (opt-in) | Habit loop + shareable | Template text, no AI needed. |
| G9 | **Celebrations everyone screenshots**: level-ups, streak milestones (3/7/30/100) with Wobbi | The moments that get posted | Exists partly; polish and add share. |
| G10 | **Seasonal Wobbi outfits / themes** unlocked with coins (beanie in winter) | Fresh social content four times a year; coin sink | Art only. |
| G11 | **"Wobbi says" daily tip** on the Today card (short, kind, rotating) | Reason to open daily, quote-able | Local content list. |

## 8. Content engine: Wobbi as a character people follow
**Principle:** be a *character brand with a calm purpose*, not an ad. Think "Duolingo owl meets a kind therapist friend". Wobbi gets a personality sheet (voice, likes, fears, catchphrases) and a posting calendar.
- **Channels, in priority order:** TikTok → Instagram Reels → YouTube Shorts (same videos) → Reddit (value posts) → X/Threads (founder voice) → Pinterest (calm quotes/infographics: long-tail search) → a newsletter.
- **Post 5–7 short videos/week** (15–30 s). Recipes:
  1. **Wobbi reacts**: Wobbi (animated sprites) reacts to relatable overthinking ("3 a.m. brain: what if…") → a kind reframe.
  2. **Screen-recording demos**: Focus guard ("I made my phone make me do push-ups"), worry time, SOS in 30 s.
  3. **POV / relatable skits**: "You vs the thought 'everyone noticed that'".
  4. **Mini lessons** (CBT-style, framed as self-help tips, with sources where possible): thinking traps, 4-6 breathing, 5-4-3-2-1 grounding.
  5. **Founder build-in-public**: honest numbers, design choices, mistakes; very shareable in the indie community.
  6. **User stories** (with permission, anonymous): "what changed after 14 days".
  7. **Challenges**: "7 days, one anchor", "brain-rot detox weekend" with a hashtag (#PalChallenge).
- **Hooks to test** (first 2 seconds): "This app makes you do push-ups before TikTok" · "A mental-health app that doesn't want your data" · "I put my anxiety on a schedule and it worked" · "Why your brain won't stop at 3 a.m. (and one thing to do)".
- **Animation tooling**: the sprite strips (`assets/pal-animations.png`) + a simple editor (CapCut, After Effects, or Rive/Lottie) so anyone can produce Wobbi clips; keep a `brand/` kit (colours, fonts, Wobbi poses, do/don't).
- **SEO/blog** on the website (long-term, compounding): "How to stop overthinking at night", "What is a thought record (with a free template)", "Box breathing, step by step", "How to stop doom-scrolling". Each ends with a soft CTA. Free printable PDFs → email list.
- **Community**: a Discord/Reddit space is *optional and risky* (moderation burden in a mental-health context). Start with a newsletter + creator network; open a community only with moderation rules and a crisis-resources pin.

## 9. Partnerships, PR and credibility
- **PR angles** (journalists need a hook, not a product): (a) *"The mental-health app that works offline and tracks nothing"* (privacy), (b) *"Do push-ups to unlock TikTok: the anti-brain-rot app"*, (c) *"A 22-year-old/solo founder built…"* (if true), (d) a **data-free survey** you run yourself ("73% of 18–24s say they doomscroll to avoid thoughts": commission a real poll through a panel for ~$300–$1,500; only publish if it's genuine). Target: tech and lifestyle press, student newspapers, wellness newsletters, podcasts. Use HARO-style services (Qwoted, Featured) for expert quotes.
- **Credibility layer** (important in this category): a **clinical advisory voice**: 1–2 licensed psychologists/CBT therapists who review the content and are named in the app (advisor honorarium or equity). It lets us say "reviewed by", not "treats". Cite sources for techniques on the website.
- **Creator partnerships**: 3 tiers: gifted micro-creators (30–100), paid mid-tier ($300–$3,000 per video, 10–20), a few macro or celebrity (only after product-market fit). Pay for *performance* where possible (CPI/rev-share via unique custom product page links).
- **Therapist/coach program**: free "Pro for your clients" codes, a one-page guide, a thought-record handout PDF.
- **Universities & employers**: wellbeing weeks, orientation partnerships, student societies; free Pro codes; no data collection means a *simple* privacy review. Later: B2B plan.
- **Platform partners**: Apple (editorial pitch, Developer relations), Product Hunt, Indie Hackers, Setapp-style bundles (careful: devalues price).
- **Charity tie-in** (optional, authentic): e.g. 1% of Pro revenue to a mental-health charity; publish it. Marketing and genuinely good.

## 10. Measurement without betraying the privacy promise
We say "no analytics, no tracking" and must keep saying it truthfully. So:
- **In-app: no analytics SDKs, no event tracking.** Keep it that way.
- **What we *can* see, legitimately:** App Store Connect analytics (impressions, product page views, conversion, downloads, retention, crashes, paying subs; Apple aggregates, users opt in at the OS level), **Apple Search Ads attribution** (AdServices), custom-product-page conversion, offer-code redemptions, review text, and **privacy-friendly website analytics** (Plausible/Fathom/GoatCounter: cookie-less) *disclosed in the website privacy text*.
- **North-star metric:** *weekly active people who completed ≥1 check-in or calming tool* (self-reported counts from App Store retention + subscription data are the proxy).
- **Funnel KPIs to watch** (store-page → install conversion, D1/D7/D30 retention from App Store Connect, trial→paid, monthly churn, review rating, referral/offer-code redemptions). Benchmarks to *aim* at (assumptions): product-page conversion 25–35% on warm traffic; D1 40%+, D30 10–15%; trial start 8–12% of installs; trial→paid 35–50%; monthly churn <8%.
- **If you want product analytics later:** make it **opt-in, anonymous and local-first aggregated** (e.g. a "help improve Wobbi" toggle off by default that sends counts only), update the privacy policy and App Privacy label first. Don't add it quietly.
- **Experiment discipline:** one change at a time, a hypothesis, a 2-week minimum, record results in a `docs/GROWTH_LOG.md` (create it when you run the first test).

## 11. Rules of the road (mental-health marketing is regulated and sensitive)
- **No medical claims.** Never "treats/cures/diagnoses/clinically proven" (also enforced by `test-store.mjs`). Say "self-help", "tools", "habits". Don't claim it replaces therapy.
- **Never target people in distress.** No ads keyed to "suicidal", "self-harm", etc.; no retargeting based on SOS use (we don't collect it anyway). Use interest/life-stage targeting only.
- **Creators must disclose** (#ad / "paid partnership") per FTC (US) and ASA/CMA (UK) rules; give them a fact sheet with the allowed/forbidden claims. You are responsible for their posts.
- **Reviews & testimonials must be real.** No fake reviews, no incentivised ratings (Apple prohibits it). Ask, don't bribe.
- **Children:** the app is 13+; don't target under-13s; TikTok/IG targeting 16+ minimum; follow COPPA/GDPR-K.
- **Crisis safety first:** every video about anxiety includes a pinned comment or caption line with crisis resources (US 988, UK Samaritans 116 123, findahelpline.com), same as in-app.
- **Apple rules:** no "#1"/"best" claims in metadata; don't mention other apps in keywords; use offer codes within Apple's limits.
- **Honesty about price:** say clearly what's free and what Pro includes (it is a selling point: "free forever for the important stuff").

## 12. Budget plans: pick a level (all numbers are rough estimates)
**Principle:** spend zero until the funnel works (≥25% store conversion, D1 ≥35%, rating ≥4.5). Then scale paid on the channel with the best payback.

| Plan | Monthly | What it buys | Realistic first-year outcome (assumption) |
|---|---|---|---|
| **A: Bootstrap ($0–$300)** | content + ASO only | founder-led TikTok/Reddit, waitlist, Product Hunt, ASO, creator gifting (free Pro codes), press outreach | 5k–50k installs *if* a few videos hit; high variance |
| **B: Focused push ($2k–$3k)** | ~$2.5k | + Apple Search Ads ($1k), 3–5 paid micro-creators ($1k), freelance video editor/animator ($500) | 30k–150k installs; learn CAC and LTV |
| **C: Growth ($10k–$15k)** | ~$12k | + TikTok/Meta/Snap UGC ads ($4k), creator program ($4k), localisation + ASO tools ($1k), part-time community/content manager ($2k), small survey/PR ($1k) | 150k–600k installs; proven playbook per audience |
| **D: Scale ($50k+)** | $50k+ | + agency or in-house UA, bigger creators, TV-style brand moments, partnerships/B2B sales | millions possible *only* with strong retention + Pro conversion |
Typical (assumed) costs: Apple Search Ads CPI ~$1.5–$4 in the US (mental-health is competitive, lower elsewhere); TikTok/Meta CPI ~$1.5–$5; micro-creator video ~$100–$500; mid-tier $500–$3,000. **Unit economics check:** if monthly price is $4.99, Apple keeps 15–30%, a paying user stays ~5–8 months, and ~3–5% of installs pay, then revenue per install is roughly **$0.50–$1.60**; so paid installs only pay back below ~$1 CPI *unless* you improve conversion/retention or add an annual plan. That is exactly why §5 (free ASO), §7 (viral loops) and §8 (organic content) come *before* ad spend.

**Where I'd put your first $10k** (if you're ready to invest): $1k Apple Search Ads (learn keywords/CPI) · $2k editor + animator to make Wobbi content weekly for 3 months · $3k paid micro-creators (10 × $300, performance-tracked via custom product pages) · $1k app-preview video + screenshot A/B tests · $1.5k survey/PR hook · $1.5k localisation (Spanish, Portuguese, German, French, Japanese) + review of clinical content by an advisor. Hold $0 for "brand ads": not yet.

## 13. 90-day calendar (condensed)
| Weeks | Focus | Output |
|---|---|---|
| 1–2 | Foundations | Trademark check, landing page + waitlist, press kit, analytics-free measurement set-up, 30 videos in the bank, TestFlight beta, creator list (200 names) |
| 3–4 | Pre-launch | Beta feedback → ratings prompt (B4), share cards (G1), sticker pack (G2), creator gifting wave 1, store page A/B ideas |
| 5 | **Launch week** | App live, Product Hunt, Reddit/HN, waitlist email, creator wave 1, fast 1.0.1 |
| 6–8 | Learn | Apple Search Ads starts, custom product pages per audience, first A/B tests, weekly content, review replies, therapist outreach |
| 9–10 | Loop | Invite-a-friend (G4), widgets (G5) shipped, **first big update + press push**, Apple editorial nomination |
| 11–12 | Decide | Review KPIs; double down on the best channel; localisation wave; decide budget level C vs staying lean |

## 14. Team, tools, and who does what
- **You (founder):** the face and voice, product, partnerships. Be on camera sometimes: people follow people *and* characters.
- **First hires/contractors:** a short-form video editor/animator (Wobbi clips), a part-time community/support person (reviews, DMs, crisis-safe replies), a clinical advisor (honorarium), a freelance translator/localiser.
- **Tools** (all free or cheap): CapCut/Premiere, Rive or Lottie (Wobbi animations), Canva/Figma, Buffer/Later (scheduling), Plausible (site analytics), a newsletter tool (Buttondown/Beehiiv/Substack), Notion/Linear (planning), App Store Connect + Apple Search Ads, a spreadsheet for experiments.
- **What I (the agent) can build in the repo now:** landing page, press-kit page, share-card generator, sticker exports, ASO text/variants, localised listing files, review prompt, invite/offer-code flow, widgets/App Intents (needs a Mac), website blog scaffolding. See `ROADMAP.md` Phase 20 and `docs/KANBAN.md`.

## 15. Risks and how to handle them
| Risk | Mitigation |
|---|---|
| Mental-health category is crowded and CAC is high | Differentiate on the enemy (brain rot) + privacy + character; lean on organic and product-led loops before paid |
| Retention is weak (typical for wellness apps) | Fix first-day win, widgets/shortcuts, Wobbi tips/coach, anchors/levels; don't scale ads until D30 ≥ 10% |
| A health claim slips into a creator video | Fact sheet + approval for paid creators; takedown process; claims tests in metadata |
| Review/rating dips after a bug | Fast patch cadence; reply publicly; in-app feedback link *before* the rating prompt |
| Apple rejects Screen Time / subscription details | Follow `docs/SCREENTIME.md` and `docs/MONETIZATION.md`; keep reviewer notes current |
| Trademark conflict on the name | Search now; keep a backup name and domain |
| Privacy promise vs. growth tooling | Measurement rules in §10; never add silent tracking |
| Founder burnout | Batch content, 1–2 hires early, say no to channels that don't work |

## 16. First 14 things to do (in order)
1. Trademark/name check + buy the domain (and @handles for TikTok/IG/YouTube/X: `brainpal`, `getbrainpal`).
2. Turn on GitHub Pages and publish the site (`TODO.md`); we upgrade it to a real landing page + waitlist (M1).
3. Create the TikTok/Instagram/YouTube accounts; post Wobbi's first 5 videos (even before launch).
4. Finish App Store Connect set-up and TestFlight; invite the first 50 beta users (friends, communities).
5. Build the **ratings prompt (B4)** and **share cards (G1)** before launch (I can do these now).
6. Make a 20-second **app preview video** and refresh the first three screenshots with hook captions.
7. Start the **creator list** (200 micro-creators in anxiety/ADHD/study/productivity niches) and write a one-page brief + claims fact sheet.
8. Recruit a **clinical advisor** (even one) and add "Reviewed by…" to the site/app.
9. Write the press kit and 3 pitch emails (privacy, brain-rot, founder story).
10. Plan **launch week** (Product Hunt assets, Reddit posts, HN post, waitlist email).
11. Run a small **creative test**: 5 hooks × 2 videos each; keep the best 2 formats.
12. Set up **Apple Search Ads** with a tiny budget ($10–$20/day) *after* launch week to learn keywords.
13. Add **offer codes** for creators/therapists/friends and the **invite-a-friend** flow (G4).
14. After 30 days, review the numbers, update this file with *real* data, and choose the next budget level.
