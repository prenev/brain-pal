# Brain Pal roadmap

> **Vision:** Brain Pal is a *whole-wellbeing companion*, not just a thought recorder: mood + thoughts, calm tools, sleep, small daily anchors, journaling, gentle reminders, and a little reward loop that makes showing up feel good. Self-help only — never diagnosis, never guilt.
>
> Live work tracking: [`docs/KANBAN.md`](docs/KANBAN.md) (board) · GitHub issues (labels `phase-N`) · [`TODO.md`](TODO.md) (things only the owner can do).

Run `npm run screens` to regenerate screenshots of every screen into `screenshots/` (git-ignored).

Each phase ships as its own commit(s) and is pushed to the branch when done.

| # | Phase | Status |
|---|---|---|
| 0 | Scaffold: PWA, local + Supabase data layer, thought records, box breathing, streaks | ✅ done |
| 1 | Mood-diary UI: mood faces, entries timeline, stats, calendar, More menu, glass dock | ✅ done |
| 2 | **Accounts**: email+password, sign-up, magic link, password reset, Apple/Google sign-in (when configured), account screen, import local data | ✅ done (untested against a live Supabase project) |
| 3 | **Reminders**: hourly push sender (edge function + cron), streak-saver messages, reminder time picker, delete account | ✅ done (server side untested against a live project) |
| 4 | **Anxiety toolkit**: SOS flow (rate → breathing or 5-4-3-2-1 grounding → re-rate), calming presets (4-6, 4-7-8), thinking-traps helper + reframe questions, anxiety insights (triggers, traps, time of day, what helps), support resources + rough-patch nudge | ✅ done |
| 4.5 | **Playful redesign**: Duolingo-style dark theme, Fluent emoji for moods/emotions/tags/tabs, daily goals, celebration screen + confetti | ✅ done |
| 5 | **iPhone app (Capacitor)**: Taptic haptics, Apple Health Mindful Minutes, on-device reminders, keep-awake, icon/splash, brainpal:// auth links, macOS CI build | ✅ done; compiles on macOS CI, awaiting first run on a real iPhone (docs/IOS.md) |
| 6 | **Voice memos & worry time**: record voice memos, optional Gemini transcript / auto-fill thought record / reframe ideas (opt-in, bring-your-own free key), worry-postponement box, unit + end-to-end tests, CI | ✅ done (cloud + live-Gemini paths untested) |
| 5.5 | **Cloud connection**: Supabase project `brain-pal` set up (migrations, row-level security, private bucket, delete-account function), DB + contract tests, `check:supabase`, CI Postgres | ✅ done; dashboard auth settings + first real sign-in pending (docs/SUPABASE.md) |
| 5.6 | **Sign-in hardening**: PKCE auth flow, Google + Apple sign-in (buttons auto-detected from Supabase; iPhone uses the system sheet / native Apple sheet), redirect troubleshooting | ✅ done in code + mocked e2e; Google/Apple providers need dashboard setup, Apple needs a paid developer account; real-device run pending |

---

# What's next (phases 7 → 13)

Order is deliberate: each phase is shippable on its own, small enough to finish + test in one sitting, and later phases build on earlier ones.
Every phase follows the CLAUDE.md loop: plan → build → unit + e2e tests → `tsc && npm test && build && e2e` → screens → push → CI green → docs.

Order of work (changed after the competitor analysis in [`docs/COMPETITORS.md`](docs/COMPETITORS.md): differentiators first, device-dependent work later):

| Order | # | Phase | Why it matters | Status |
|---|---|---|---|---|
| 1 | 7 | **Daily Anchors** — up to 5 non-negotiables | The "do these and the day counts" habit loop | ✅ done (device-local until P12) |
| 2 | 7b | **Today & ease of use** — one next action, ≤2-tap logging, short lists, tap-budget tests | "Easy to use af" | 🔨 Today card, one-tap mood + undo, short lists ✅; first-run screens + reduced-motion pending |
| 3 | 8 | **Journal** — free writing + gentle prompts | A place for thoughts that aren't a CBT record | ✅ editor, drafts, list/search/tags, edit/delete, crisis support; voice-note in journal pending |
| 4 | 14 | **Worry → Focus bridge** ("Start tiny") | Our unique anxiety→action loop; competitors only have a timer | ✅ step picker (worry plans first), calm start, 5/10/25 focus, pause/stop, wired from SOS, Today card, + menu |
| 5 | 15 | **Summaries** — daily recap, weekly/monthly digest, shareable | Understand your week in 20 seconds | ✅ Summary view (today/week/month) + share; evening "wind down" recap on the Today card pending |
| 6 | 16 | **Level-up proof** — skill levels backed by your own before/after data | Evidence, not points | ✅ skills, proof cards, milestones, level-up moment; Journaling/Focus skills appear when P8/P14 ship |
| 7 | 9 | **Rituals & reminders** — breathe at 07:00 and at night | Reminders that *do* something | ✅ iPhone: 4 rituals with times/weekdays, tap-to-open, skip-when-done, migration; delivery on a real phone not verified; web multi-time needs `send-reminders` deployed |
| 8 | 10 | **Sleep** — Apple Watch via Apple Health (+ manual log) | Sleep drives mood | ✅ pure logic (mutation-checked), Swift read-only query (compiles on macOS CI), Sleep view, manual log, weekly-summary line; real Watch data not verified (see TODO.md) |
| 9 | 11 | **Coins & rewards** | Showing up feels good, no shame mechanics | ✅ derived earnings with caps, wallet, accent themes, rest days (extend the streak), self-named treats, +N toast; Pal outfits / confetti styles not built |
| 10 | 12 | **Cloud sync for the new data** | Everything on every device | ⏳ |
| 11 | 13 | **Reflection extras** — theme picker, optional AI "reflect with me" | Polish | ⏳ |
| – | 17+ | Idea backlog (bottom of this file) | | 💡 |

## Cross-cutting rules for these phases
- **Privacy first.** Sleep data is health data: read only after an explicit opt-in, stays on-device unless you're signed in (then it syncs only to *your* row-level-secured account), never goes to an AI. Update the "write-only" promise honestly (`test-ios.mjs` is changed to allow reading **sleep analysis only**, still no other types).
- **Safety.** Journal text is run through `looksLikeCrisis` before any AI feature and surfaces `Support` — same as thought records. No streak-shaming, no "you failed" copy, no loss-aversion dark patterns. A missed day is neutral.
- **Local-first.** Everything works with no keys; native calls guarded by `isNative()`; failures swallowed.
- **Old data keeps loading.** New localStorage keys get defaults in `localRepo`; extend the legacy-data e2e test.
- **Few things, done well.** Anchors are capped at 5 *on purpose*. No subtasks, due dates, or priorities.

---

## Phase 7 — Daily Anchors (5 non-negotiables)
**Goal:** pick at most five small things that make a day "count" (e.g. *Walk 10 min*, *Take meds*, *Sunlight*, *Slow breathing*, *Write one line*). Tick them off daily. That's it.

**UX**
- Home (Entries tab) gets an **Anchors card** at the top: 5 chunky round checkboxes, emoji + short label, a progress ring (`3/5`), confetti + Celebrate when all done.
- *More → Daily anchors* to add/rename/reorder/remove (hard cap 5, friendly message at the cap). Starter suggestions as chips (emoji from the existing Fluent set).
- Optional **link to a tool**: an anchor can be "auto-ticked" by doing a thing in the app (`breathe`, `journal`, `check-in`, `worry-time`) — so *Slow breathing* ticks itself after a breathing session.
- Streak = consecutive days with **all** anchors done, plus a softer "days with ≥1" count. Missing a day shows nothing negative; the streak pauses (rest day via Phase 11).
- Day boundary uses local time; late-night grace until 03:00 optional later.

**Data** (`Anchor { id, label, emoji, link: null|'breathing'|'journal'|'checkin'|'worry', order, archivedAt }`, `AnchorCheck { anchorId, day: 'YYYY-MM-DD', at }`).
Local: `bp.anchors`, `bp.anchorChecks`. Pure logic in `src/lib/anchors.ts` (no DOM): `dayProgress`, `anchorStreak`, `autoChecks(links, thoughts, sessions, journal)`, `canAdd`.
**Tests:** unit — cap, progress, streak across month/year boundary, DST-safe day keys, auto-links, archived anchors don't break old days; e2e — add/tick/untick/persist across reload/cap message/auto-tick via breathing; legacy data (no anchors key).
**Risks:** over-engineering into a todo app → hard cap + no extra fields. **Done =** CLAUDE.md definition of done.

## Phase 7b — Today & ease of use ("easy to use af")
**Goal:** a person who is anxious and tired can use this with one thumb and no thinking.
- **Today card** at the top of Entries: a single primary button whose label adapts — *"How are you feeling?"* (no entry yet) → *"Next small step"* (a parked worry has a plan; Phase 14) → *"Wind down"* (after 20:00 once anchors done). Quick-mood row: tap a face on the home screen to log a mood-only entry in **one tap** (editable afterwards).
- **Short lists:** emotions sorted by *your* recent use with the top 6 shown, rest behind "More"; tags likewise.
- **Tap budgets (tested):** log a mood ≤ 2 taps from cold start; start breathing ≤ 2; tick an anchor 1; park a worry ≤ 3. An e2e test counts the taps.
- **First-run:** 3 skippable screens (what it is, privacy promise, pick anchors) — never a paywall, never an account wall in local mode.
- **Reduced motion** honoured for confetti / breathing animation; larger tap targets (≥ 44 pt) audit via the existing accessible-name scan + a size check.
**Tests:** e2e tap-budget tests; unit for `topEmotions` ordering; a11y scan extended.

## Phase 14 — Worry → Focus bridge ("Start tiny")
**Why:** Flourish/Umbrella/HolistiQ each have a timer; none start from *your anxiety* and *your parked worries*.
- After an SOS/breathing session (relief rated) or a worry review where you chose "make a plan", offer **"One small step?"** — shows your parked worry actions as one-tap choices (or type one).
- **Calm start:** 60-second box-breathing → **5 / 10 / 25-minute focus** with a gentle end chime/haptic → "Done? Nice." → mark the worry's step done (status stays yours) → log a *focus session* (counts toward summaries and levels).
- No gamified pressure: pausing is free, no "failed session", no leaderboards.
**Data:** `FocusSession { id, createdAt, minutes, completed, worryId|null, note }` (device-local until Phase 12). Pure `focus.ts` (timer maths with pause/resume, drift-proof via timestamps) unit-tested; e2e uses a faked clock.

## Phase 15 — Summaries
- **Daily recap** (evening card, also the "Wind down" Today state): what you did today in one sentence each — mood, anchors n/m, breathing minutes, one thing you wrote.
- **Weekly & monthly digest** ("Your week"): mood trend vs previous week, best day, most common emotion/trap, what helped (tools with the best relief), anchors consistency, worries let go, focus minutes, sleep average (when available). Each line has a plain-language sentence generated **by templates, not AI** (works offline; AI "reflect" is a later opt-in).
- **Share** as text or print-friendly page (local, user-initiated) — useful for a therapist visit.
**Pure `summaries.ts`** (`weekSummary`, `monthSummary`, `sentenceFor`) with fixtures + unit tests (empty weeks, partial data, DST, month edges). Wording reviewed against the safety rule: no diagnosis, correlations phrased as "tended to".

## Phase 16 — Level-up proof
**Goal:** show, with evidence from *your* data, that you're getting better at coping — the thing no streak counter proves.
- **Skills** (each Level 1→10 from consistent practice, thresholds in a pure table): *Breathing*, *Reframing* (alternate thoughts written, traps named), *Worry mastery* (let-go / planned), *Consistency* (days active), *Focus*, *Journaling*, *Sleep rhythm* (when data exists).
- **Proof cards** (the point of the phase): before/after comparisons over rolling 30 days — "relief after SOS: 1.8 → 3.4", "time to log after a bad mood: shorter", "worries let go: 12% → 41%", "alternate thought written on 3 of 10 entries → 7 of 10". Shown only with enough data (≥ 5 points per side) and labelled as *your* trend, not a clinical measure.
- **Level-up moments:** a quiet celebration with the evidence line ("Reframing → Level 4: you've rewritten 15 thoughts") and a **timeline** of milestones (first SOS, first let-go, 7-day anchors…).
- Levels never go down; no comparisons with other people.
**Pure `levels.ts` + `proof.ts`** with exhaustive unit tests (thresholds, edge counts, insufficient data returns null, monotonic levels).

## Phase 8 — Journal
**Goal:** a calm place to just write — separate from the structured thought record.

**UX**
- *New entry menu* gets **Write in journal**. Full-screen editor: optional title, body textarea (autosave draft locally so nothing is lost), mood face (optional), tags (reuse), date.
- **Prompts** (rotating, offline, no AI): gratitude ("Three things that went okay"), release ("What's taking up space in my head?"), tomorrow ("One thing I'll do for future me"), kindness ("What would I tell a friend in this spot?").
- Journal list with search, filter by tag, month grouping; read view; edit; delete (with confirm). Word count + streak contribution.
- Optional voice-note → transcript reuses the Phase 6 recorder (opt-in AI transcription unchanged).
- Entries count toward the day streak and the *Journal* anchor link.
- **Safety:** crisis-wording detection on save shows the Support card (no AI involved, just a gentle prompt).

**Data** `JournalEntry { id, createdAt, updatedAt, title, body, mood|null, tags[], prompt|null }`. Local `bp.journal`. Pure helpers `src/lib/journal.ts`: `searchJournal`, `groupByMonth`, `wordCount`, `pickPrompt(date)`.
**Tests:** unit (search, grouping, deterministic prompt, word count); e2e (write → autosave draft restored after reload → save → appears → edit → delete; hostile text rendered as text; crisis wording → Support; legacy no-journal data).

## Phase 9 — Rituals & reminders ("breathe at 7 and at night")
**Goal:** reminders that carry a purpose and open the right tool.

**UX**
- *More → Reminders* becomes a **list of rituals**. Defaults offered: *Morning breathe 07:00*, *Evening breathe 21:30*, *Check-in 20:00* (existing), *Anchors nudge 12:00 (off)*. Each: time, label, days of week, kind (`breathe`/`checkin`/`journal`/`anchors`/`custom`), on/off.
- Tapping a notification **deep-links** into that tool (Capacitor `localNotificationActionPerformed` → route; web push `notificationclick` → URL).
- Smart skip (existing idea, generalised): a *check-in* reminder is dropped for today once you've checked in; a *breathe* reminder is dropped once you've done a breathing session after the previous ritual time; *anchors* nudge is dropped when all done.
- Quiet by default: max 4 rituals, no repeat nagging, copy is kind and varied (small rotating set, never guilt).
- Web/PWA: keeps the single push reminder (server cron) — multi-time on web is phase 9b once `send-reminders` is deployed (needs VAPID secrets).

**Technical**
- Generalise `nativeCore.planReminderDates` → `planRituals(now, rituals, activity)` pure + unit-tested (days-of-week, 14-day rolling window, iOS 64-pending-notification limit — budget: 4 rituals × 14 days = 56 ✔).
- Notification ids partitioned per ritual. Migration of the old single reminder (`bp.reminder`) into one ritual so existing users keep theirs.
**Tests:** unit (planning, weekdays, skip rules, id budget, migration of old setting, copy rotation is deterministic); e2e native-stub (schedule calls for 07:00 + night, skip-after-activity, deep-link action routes to Breathe, disable cancels only that ritual). Real-device delivery is **not** verifiable in CI → stays on TODO.md.

## Phase 10 — Sleep (Apple Watch via Apple Health)
**Goal:** see last night's sleep and how it relates to mood, with zero manual work on iPhone — and a manual fallback everywhere else.

**Native (Swift, `Mindful` plugin):** new `requestSleepAuthorization()` and `readSleep({ from, to })` using `HKCategoryType(.sleepAnalysis)` read-only; returns raw sample segments `{ start, end, value }` (inBed / asleepCore / asleepDeep / asleepREM / awake). Info.plist `NSHealthShareUsageDescription` text updated honestly (it now *does* read sleep). `test-ios.mjs`: replace "never reads" with "reads **only** sleepAnalysis" (regex allow-list) + JS↔Swift parity.
**Pure logic `src/lib/sleep.ts`:** merge overlapping segments (Watch + iPhone both report), group into nights (a night belongs to the *wake* date; split gaps > 3 h, ignore naps < 20 min as "naps"), compute `{ asleepMin, inBedMin, deepMin, remMin, coreMin, awakeMin, bedtime, wake, efficiency }`, 7-/30-day averages, consistency (stddev of bedtime). Heavily unit-tested with fixtures: overnight across midnight, DST change night, double-reported data, naps, gaps, no data.
**UX:** *Sleep* card on Stats/Home (last night: hours, stage bar, bedtime→wake), *Sleep page* (7/30-day bars, average, consistency), **sleep ↔ mood** insight ("On days after < 6 h your mood averaged 2.8 vs 3.9") — only shown with ≥ 7 paired days and framed as correlation, never advice-as-diagnosis. Manual log (bed/wake time sliders + quality 1-5) for web and for people without a Watch.
**Tests:** unit as above; e2e native-stub returns fixture segments → card + page render; manual log persists; permission-denied message; web shows manual-only. **Not verifiable here:** the real HealthKit query and real Watch data → TODO.md (needs a Mac + a Watch that tracks sleep).

## Phase 11 — Coins & rewards
**Principle:** reward *showing up*, not perfection; nothing is ever taken away; spending is optional and cosmetic or kind.
- **Earn (derived, retroactive, can't be gamed twice):** check-in +5 (once per entry, max 3/day), breathing/grounding session +3 (max 3/day), journal entry +4 (max 2/day), each anchor +2, all-anchors bonus +5, worry let-go +2, sleep logged +2, streak milestones (3/7/14/30/60/100 days) +10/20/30/50/80/120. Balance = `earned(events) − spent`. Because earnings are recomputed from data, they sync for free and survive reinstall; only **spends** are stored.
- **Spend:** accent colour themes, Pal faces/outfits, confetti styles, **Rest day** (30 coins, max 2/month: freezes the anchor/day streak for one missed day — the kind alternative to streak loss), a "treat jar" the user defines themselves (*"coffee at my favourite place"*) — self-reward, redeemable by honesty.
- **UX:** coin counter in the top bar, a small *Wallet* page (balance, recent earnings, shop), a gentle +N toast on earn (no sound, haptic tick on iPhone), never a pop-up that blocks.
- **Anti-dark-pattern checklist (reviewed in the PR):** no countdown timers, no "you'll lose", no purchases with real money, no leaderboards, no loot boxes.
**Pure logic `src/lib/rewards.ts`** (`earnings(events)`, `daily caps`, `milestones`, `balance`, `canBuy`). Tests: caps, milestone edges, retroactivity, double-spend refused, rest-day limits, idempotence.

## Phase 12 — Cloud sync for the new data
Migrations (new files, plain SQL, **no `DO` blocks**; apply via the connector, then mirror the version it records): `journal_entries`, `anchors`, `anchor_checks`, `sleep_nights`, `wallet_spends`, `rituals` — all with RLS (`to authenticated`, `(select auth.uid()) = user_id`), anon revoked, check constraints (length limits), indexes. Extend `Repo` + `cloudRepo`, importLocal, `delete-account` cascade, `rls.sql` tests, contract test, `check:supabase` table list. Run `get_advisors` (security) after.

## Phase 13 — Reflection
Weekly review screen (and optional Sunday-evening ritual): mood trend, best/worst day, what helped (tools used, anchors hit), sleep average, 1 prompt. Optional Gemini "reflect with me" (opt-in, same privacy rules, crisis-safe). Theme picker (uses Phase 11 unlocks). Goals ("breathe 5×/week") as a *view over anchors*, not a new system.

## Idea backlog (not committed — vote with issues)
- **Wind-down routine:** 3-step evening flow (dim screen tip → journal one line → slow breathing) as a single tap.
- **Body check-in:** tap where you feel it (chest/stomach/shoulders) — builds interoception.
- **Apple Watch glance / complications** and **Home-Screen widgets** (today's anchors + streak) — Swift WidgetKit; needs a Mac.
- **Siri Shortcuts / Action button:** "Start SOS breathing".
- **Mindful minutes charts** from Health; **HRV / resting heart-rate** trend read (opt-in, same privacy rules).
- **Weather / daylight correlation** (sunlight anchor ↔ mood).
- **Medication-time reminders** as a ritual kind (reminders only — no medical advice).
- **Trusted-person share:** one-tap "I'm struggling" message to a chosen contact (local `sms:` link, no server).
- **Weekly letter to future self** (journal feature, opens in 30 days).
- **Gratitude jar** (aggregate of gratitude prompts, shake to re-read).
- **Export as PDF/Markdown** for a therapist session (local, user-initiated).
- **Accessibility pass** (Dynamic Type, VoiceOver labels audit, reduced-motion for confetti/breathing).
- **Code-splitting** (bundle is 1.4 MB): lazy-load Stats/Gemini/emoji data.
- **Web Apple sign-in** (Services ID + rotating secret) if a web audience matters.
