# Competitor analysis & gap matrix

**Purpose:** decide what Wobbi builds that the closest apps don't, and what to keep simple.
**How to read this honestly:** positioning below comes from the App Store listings you shared; weak points come from a quick web search of review sites (cited, with a confidence note). Several sources are third-party aggregators or single reviews, and for two apps (Umbrella, HolistiQ) I found little or no independent feedback. In the matrix, **✅ = the listing advertises it**, **– = not advertised in the listing (not proof it's absent)**, **◐ = partly**. Verify against the live apps before using any of this externally.

## The six competitors

| App | Pitch | Weak points we can see | Evidence / confidence |
|---|---|---|---|
| **Flourish** | All-in-one: guided journaling, stress/anxiety relief, habits, companion, task breakdown, Pomodoro | Paywall shown too early; very long emotion-label list; an unexplained "Flourish Score"; decoration competing with function for people who need simplicity most | One UX audit ([Contra case study](https://contra.com/david_balinga_8azdfj1k)) — *single reviewer, low-medium confidence*; no aggregated Flourish reviews found |
| **Umbrella Journal** | CBT thought records, mood, habit streaks, small actions, focus timer; ADHD/overthinking angle | Almost no independent feedback to learn from; positions itself as "digital therapy" (a stronger claim than self-help should make) | [App Store listing](https://apps.apple.com/app/id6447490753) only — *very low confidence, 2 ratings found* |
| **Finch** | Virtual pet + rewards + short self-care exercises | Deeper insights/customisation behind Plus; confusing trial/discount flow and a pricey renewal; an "energy" mechanic that gates progress; some reports of crashes, data loss and billing friction | [Headway review](https://makeheadway.com/blog/finch-app-review/), [Trustpilot](https://se.trustpilot.com/review/finchcare.com), aggregators — *medium confidence; other reviews say the free tier is generous* |
| **Rootd** | Panic button, guided breathing, lessons, visualisations, journaling | Billing/cancellation complaints (Oct 2024 reports); its strength is panic, not the everyday worry → back-to-life transition | [unitQ](https://unitq.com/unitq-scorecards/rootd) — *two individual reports, low confidence* |
| **Daylio** | Fast mood + activity icons, diary, stats, habit goals | Backups and advanced stats behind premium; entries are manual so data gets patchy; no guidance on *what to do next*; one reviewer wanted entries to save outside the reminder window | [Wikipedia](https://en.wikipedia.org/wiki/Daylio), aggregators — *medium for paywall/manual entry; the "no CBT" point is our own inference* |
| **HolistiQ** | Pomodoro + breathing + habits, "all-in-one wellness & focus" | Not researched (listing found on the Israeli storefront only); general-wellness framing rather than anxiety-first | *Unverified* |

**Cross-cutting pattern** (third-party analyses, [Unstar](https://unstar.app/blog/mental-health-app-reviews-what-users-say-about-wellbeing-apps-2026) and similar — medium confidence): mental-health apps draw the strongest subscription backlash of any category; apps with fewer complaints pair a genuinely useful free tier with plain talk about what paid adds.

## Gap matrix (advertised features)

| Capability | Flourish | Umbrella | Finch | Rootd | Daylio | HolistiQ | **Wobbi** (✅ built · 🛠 planned) |
|---|---|---|---|---|---|---|---|
| Mood diary + stats | ✅ | ✅ | ◐ | – | ✅ | – | ✅ |
| Full CBT thought record (situation → thought → emotions → behaviour → alternate thought) | ◐ | ✅ | – | – | – | – | ✅ |
| Thinking-trap tagging + reframe prompts | – | ✅ | – | – | – | – | ✅ |
| Panic / SOS flow with before→after relief score | – | – | – | ✅ | – | – | ✅ |
| Guided breathing with haptics | ◐ | – | ✅ | ✅ | – | ✅ | ✅ (Taptic) |
| **Worry time** (park a worry → scheduled review → let go / make a plan) | – | – | – | – | – | – | ✅ **unique** |
| **Worry → one tiny next step → focus timer** (anxiety-to-action bridge) | ◐ task breakdown + Pomodoro | ◐ focus timer | – | – | – | ◐ Pomodoro | ✅ P14 **unique link** |
| Journaling | ✅ | ✅ | ✅ | ✅ | ✅ | – | ✅ P8 |
| Voice memo → transcript → pre-filled thought record | – | – | – | – | – | – | ✅ (opt-in AI) **unique** |
| Capped daily "non-negotiables" (anchors) | ◐ habits | ◐ habits | ◐ habits | – | ◐ habits | ◐ habits | ✅ P7 (max 5, by design) |
| Habit/streak without shame | ? | ? | ◐ | – | ◐ | ? | ✅ (no loss mechanics) |
| Sleep from Apple Watch ↔ mood link | – | – | – | – | – | – | ✅ P10 **unique** |
| Plain-language summaries (daily / weekly / monthly) | – | – | ◐ | – | ◐ stats | – | ✅ P15 |
| **Evidence you're levelling up** (skill levels backed by *your own* before/after data) | – streak/score | – streaks | ◐ pet growth (cosmetic) | – | – | – | ✅ P16 **unique** |
| Reward loop that isn't cosmetic-only or manipulative | – | – | ✅ pet (energy-gated) | – | – | – | ✅ P11 |
| Works fully without an account; data stays on device | ? | ? | ? | ? | ? | ? | ✅ local-first |
| Optional sync (own private account), export, delete-account | ? | ? | ? | ? | ◐ paid backup | ? | ✅ / 🛠 P12 |
| Bring-your-own-key AI, off by default, crisis text never sent | – | – | – | – | – | – | ✅ **unique** |
| Everything free (no feature paywall) | ? | ? | ◐ | ◐ | ◐ | ? | ✅ (no paid tier planned) |

"?" = not established from what I could find.

## What only Wobbi will have (the moat)
1. **The anxiety → action loop:** SOS / breathing → rate relief → *"one tiny step?"* pulled from the worries you already parked → a short calm-start focus timer. Others have breathing *or* a timer; none connect them through your own worries.
2. **Worry time** as a first-class ritual (park, review later, let go or plan).
3. **Proof, not points:** levelling up is shown with real evidence from your data ("your average relief after SOS: 1.8 → 3.4 over 30 days"), not a streak counter or pet XP.
4. **Whole-person signal:** sleep (Watch) + mood + anchors + breathing in one place, with honest correlation wording.
5. **Trust:** local-first, no account required, no tracking, AI opt-in with your key, no paywall.

## Design principles for "easy to use af"
1. **One obvious next thing.** Home has a single primary action ("How are you?" → or "Next small step" if a worry is waiting). Everything else is one tap away, not on the page.
2. **Taps are a budget, enforced by tests.** Log a mood: **≤ 2 taps** from the home screen; start breathing: **≤ 2**; tick an anchor: **1**. An e2e test counts the taps so the budget can't silently rot (we have no telemetry, so tests are our usability metric).
3. **Short lists.** Show your 6 most-used emotions first, the rest behind "More"; anchors capped at 5; ideas as chips, not menus.
4. **No wall of settings.** Sensible defaults (rituals at 07:00 / 21:30 can be switched on in one tap); advanced stuff lives under More.
5. **Plain words.** No scores nobody can explain. Every number on screen has a one-line "what this means".
6. **Calm by default.** Reduced motion respected; no sounds by default; no guilt copy; no timers that punish.
7. **Free means free.** No paywall screens, ever, in the core experience.

## How this changes the roadmap
See ROADMAP.md. New phases added from this analysis: **7b Today & ease of use**, **14 Worry → Focus bridge**, **15 Summaries**, **16 Level-up proof**. They are scheduled *before* Sleep / Coins / Cloud because they are the differentiators and need no device or account.
