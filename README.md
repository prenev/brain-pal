# Brain Pal

Mood diary with CBT thought records: pick a mood, tag emotions, log the situation → thought → internal/external behaviour → alternate thought, plus box breathing with haptic pulses, streaks, calendar, stats, tags and photos. Dark, glass-style UI laid out like a classic mood-tracker app. An installable PWA: runs in any browser, and on iPhone via **Share → Add to Home Screen**.

## Run

```bash
npm install
npm run dev        # works immediately in local mode (data stays in this browser)
```

## Cloud sync (Supabase, free tier)

1. Create a project at supabase.com. The schema lives in `supabase/migrations/` — apply it via the GitHub integration, `supabase db push`, or by pasting the files in order into the SQL editor (tables, row-level security, private `photos` bucket). Full guide: **[docs/SUPABASE.md](docs/SUPABASE.md)**.
2. Auth → URL config: add your site URL(s) as redirect URLs. Auth → Providers: Email is on by default (password, sign-up, magic link, password reset all work). For *Continue with Google / Apple*, just enable the provider in Supabase (setup in `docs/SUPABASE.md`) — the buttons appear automatically, nothing to configure in the app. Without Supabase keys the app runs account-free in local mode.
3. `cp .env.example .env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. Verify with `npm run check:supabase`.
5. `npm run build` and deploy `dist/` to Vercel/Netlify/Cloudflare Pages (HTTPS is required for PWA + push).

Why Supabase over Neon: auth, photo storage and row-level security come with the Postgres in one free project; Neon is Postgres only.

Anyone who used local mode first can sign in and tap **More → Account → Import into my account** to move their entries to the cloud.

See `ROADMAP.md` for the phases.

## Reminders & account-deletion setup (one time)

```bash
npx web-push generate-vapid-keys                  # public key -> .env VITE_VAPID_PUBLIC_KEY
supabase functions deploy send-reminders delete-account
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com CRON_SECRET=<random>
```
Then fill the two placeholders in `supabase/cron.sql` and run it in the SQL editor (hourly job). Users pick their hour in More → Reminders; they're only nudged if they haven't checked in that day.

## Look & feel

Playful dark theme following Duolingo-style UI principles: chunky 3D buttons that press down, thick-bordered cards, rounded bold type (Nunito, bundled offline), bright colour on deep navy, visible progress (daily goals), and a celebration screen with confetti after you save an entry. Emoji are Microsoft's **Fluent Emoji** (MIT licence) — the ~70 we use are extracted into `src/lib/emojiData.ts` by `scripts/extract-emoji.mjs` so the app stays offline-capable. To use another emoji, add its name to that script and re-run it.

## Anxiety toolkit

- **Home** — the first tab. A switch at the top: **Today** (mood faces, anchors, SOS, today’s entries), **Entries** (the month list with search) and **Journal**. The **+** button opens one menu: *Write* (thought entry, journal entry, park a worry), *Calm & focus* (anxious now, breathe, small step) and *entry for another day*. The + is hidden on More and Breathe.
- **SOS ("Anxious right now?")** — the red siren button in the action bar of Home and Breathe. Rate anxiety 0–10 → pick slow breathing (in 4 / out 6), 5-4-3-2-1 grounding or box breathing → re-rate and see the change. Results feed *Stats → Anxiety Insights*.
- **Thinking traps** — the thought record lists 10 common cognitive distortions with a "try asking" prompt for each, plus tap-to-add reframing questions.
- **Insights** — likely triggers (tags), common traps, time of day, and how much the exercises help you.
- **Support** — crisis lines and a gentle nudge after a rough patch. This is a self-help tool, not medical care.

## Daily wellbeing (anchors, Today card)

- **First run** — three short, skippable screens the very first time (what it is, what happens to your data, pick up to 3 anchors). Never shown to anyone who already has data. Reduced-motion is respected everywhere; every control is at least 24 px (primary ones 44 px) — a test enforces it.
- **Today card** — one obvious next thing. Before you've checked in it's five faces: **one tap logs a mood** (with Undo / "Add details"). After that it points at what's left: unfinished anchors, parked worries, or "you're all set".
- **Daily anchors** — pick **up to 5** small non-negotiables (walk, sunlight, slow breathing, …). Tick them on the home screen; some tick themselves (e.g. a breathing session). Streak = days with *every* anchor done. The cap is deliberate — it is not a to-do list.
- **Short lists** — the emotion/tag pickers start with your most-used six; *More* or search shows everything.
- **Journal** (+ menu → *Write in journal*, or More → Journal) — free writing with an optional title, mood and tags, a gentle daily prompt if you want one, a **draft that autosaves** so nothing is lost, search + tag filter, edit and delete. Crisis wording shows the support options. Counts toward anchors ("Write one line"), your Journaling skill and the summaries.
- **One small step** (+ menu → *Start a small step*, after an SOS that helped, or from the Today card when you've made a plan for a parked worry) — pick the tiniest next thing (your own worry plans come first), settle with a minute of slow breathing (skippable), then a 5/10/25-minute focus timer. Pausing is free, stopping early is neutral (it just doesn't count as finished), the clock can't drift if the app is backgrounded. Finished steps feed your *Small steps* skill, summaries and a "One small step" anchor.
- **Rituals** (iPhone app: More → Reminders) — a few purposeful reminders instead of one generic one: *Morning breathe* (07:00), *Evening breathe* (21:30), *Daily check-in*, *Anchors nudge*. Each has its own time and weekdays, **opens the matching tool when tapped**, uses varied gentle wording, and is **skipped for today once you've already done the thing**. Scheduled on-device (no server), 14 days ahead, max 4 rituals (iOS allows 64 pending notifications). An existing daily reminder carries over as the check-in ritual. The web app keeps its single daily reminder.
- **Sleep** (Stats → Sleep) — on the iPhone app, connect Apple Health to **read your sleep** (e.g. from an Apple Watch; opt-in, read-only, stays on the device). Shows last night (with Deep / REM / Core when your Watch provides stages), the last 7 nights, average bedtime and how much it varies, and — once there are 7+ days of both sleep and mood — how your mood differed after longer vs shorter nights (worded as a pattern, never a cause). On the web, or without a Watch, log a night by hand. Apple Health is read for sleep only; nothing else, ever.
- **Coins** (More → Coins) — a small reward for *showing up*, derived from your own activity (check-ins 5, calming 3, journal 4, small steps 4, worries processed 2, anchors 2 each + 5 when all done, sleep logged 2, streak milestones 10–120), each with a **daily cap** so there's nothing to farm. Spend them on accent colours, **rest days** (cover one missed day so the streak keeps going, max 2 a month) or a **treat you name yourself**. Coins are recomputed from your data (retroactive, nothing to sync) and **never decrease from anything but your own spending**. No timers, no real money, no leaderboards.
- **Progress** (Stats → Progress) — skill levels (Calming, Reframing, Worry mastery, Showing up) and **proof you're improving** from your own data: e.g. "your average relief after calming was 4 points this month vs 2 the month before". Comparisons appear only with enough data (5+ points in each of two 30-day windows); otherwise an all-time figure from 3+ points, otherwise nothing. Levels never go down; a level-up gets a quiet celebration with the evidence ("You've written a balanced thought on 15 entries").
- **Summary** (Stats → Summary) — plain-language recap of today / this week / this month written from templates (offline, no AI), with Share.
- In cloud mode (Supabase), anchors, journal, focus sessions, hand-logged sleep, coins/purchases, ritual settings and your theme **sync to your account** (see *Account sync* below); without Supabase they simply stay on this device.
- Why these choices: see `docs/COMPETITORS.md` (gap matrix + design principles) and `ROADMAP.md`.

## Account sync for the wellbeing extras
Mood entries, calming sessions and worries live in their own Supabase tables. Everything else (journal, anchors + ticks, focus sessions, hand-logged sleep, purchases, ritual settings, theme) syncs as small private *documents* in one table, `user_docs` (row-level security: only you can read or write your rows; the anon role has no access).
- **Newest edit wins** per item, **deletes stay deleted** on your other devices (tombstones), and an offline device keeps working and catches up later. First sign-in pushes whatever was already on the device.
- Measured Apple Health sleep is **not** synced (it is re-read from Health on each device); only nights you log by hand are.
- **Sign out clears this device's copies** (after syncing; it warns if something couldn't be saved yet), so the next person on a shared browser never sees your journal.
- Not verified against the live service from this sandbox (its network blocks Supabase): the table, policies and constraints are tested on a real Postgres, the sync engine by unit tests and a two-device end-to-end simulation. Your first real sign-in on two devices is the check — see `TODO.md`.

## iPhone app (Apple Health, real haptics, on-device reminders)

The same code runs as a native iPhone app via Capacitor — see **[docs/IOS.md](docs/IOS.md)** for the Mac steps (`npm ci && npm run ios:sync && npm run ios:open`, then ▶ Run).

## Voice memos, transcripts & the optional AI helper

- **Voice memo** — in the new-entry editor, record up to 5 minutes. Stored on-device (IndexedDB) in local mode, or in your private Supabase bucket in cloud mode. Play it back from the entry; you can type or edit a transcript by hand.
- **AI helper (opt-in)** — *More → AI helper*. With **your own free Gemini API key** ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)) you can: transcribe a memo, **fill the thought record from what you said**, and get three reframe suggestions. The key stays in your browser. The model is discovered from your key (names change often) and the first one that works on your plan is used.
- **Privacy:** audio/text is sent to Google. On Google's free tier it may be used to improve their products and read by reviewers, and UK/EEA/Swiss users may need a paid project. The app asks for explicit consent, keeps AI **off by default**, and **never sends text that looks like self-harm** — it shows support options instead.
- **Worry time** — park worries from the + menu, then review them in one sitting: *can I act on it?* → plan a tiny step, or let it go. Stats shows how many were out of your control.

## Testing

```bash
npm test            # 9 unit suites (breathing timer, native logic, AI client w/ mocked network, audio/WAV encoding, insights, reminders, worries, streaks)
npm run test:e2e    # 20 browser flows (incl. simulated iPhone-app bridge) (fake microphone, mocked Gemini): create/delete, legacy-data migration, voice memo,
                    # AI helper, crisis guard, XSS, worry time, SOS, photos, export, offline PWA, accessible names
npm run screens     # screenshots of every screen -> screenshots/
```
CI (`.github/workflows/ci.yml`) runs type-check, unit tests, build and e2e on every push.

## What works / what doesn't

| Feature | Status |
|---|---|
| Thought records, tags, photos, streaks, search, JSON export | ✅ |
| Box breathing timer + session log | ✅ |
| Vibration | ✅ Android/desktop. iPhone Safari has no Vibration API (best-effort fallback only) — **the iPhone app uses the Taptic Engine**. |
| Web push reminders | Client, service worker and sender (`supabase/functions/send-reminders`) written; the scheduling logic is unit-tested (`npm test`) but the deployed pipeline is not. Needs one-time setup below. On iOS the app must be on the Home Screen (16.4+). |
| Delete account | `supabase/functions/delete-account` (needs deploying). |
| Apple Health | iPhone app only (browsers can't reach HealthKit): writes *Mindful Minutes*. Compiles on a macOS CI runner (simulator); not yet run on a physical phone — see docs/IOS.md. |
| Insights / SOS logic | Unit-tested (`npm test`). Not clinically validated; breathing/grounding techniques are standard CBT-style self-help. |
| Gemini (live) | Request/response handling is unit- and e2e-tested against a **mocked** API. Not yet run against the real service. |
| Voice memos on iPhone | Uses MediaRecorder (Safari 14.1+, mp4/AAC). Recording inside an installed Home-Screen app works on recent iOS, but is untested here. |
| Cloud (Supabase) path | Written but not yet tested against a live project. |

## Roadmap
1. Push sender edge function + cron
2. Capacitor iOS shell: native haptics, HealthKit mindful minutes
3. Insights: emotion trends, before/after intensity

## Offline first, optional Pro
No account is needed: the app opens straight on Home and everything works on the device. **Brain Pal Pro** (optional monthly subscription on iPhone) adds sync across devices, Focus guard, sleep insights, weekly/monthly summaries, proof of progress and more anchors. The SOS siren, breathing, crisis support, check-ins, journal and data export are always free. See [`docs/MONETIZATION.md`](docs/MONETIZATION.md).

## Home & Pal's tips
Home's tools strip scrolls sideways: **Thoughts** (all thought entries, month by month, with search) leads, then Journal, Worry time, Focus guard, Sleep, Progress, Summary and Coins. Each section opens with a one-line tip from Pal (dismiss it once and it stays away; More → "Show Pal's tips again"). The app starts on a splash with Pal instead of a bare loading text.

## Pal & Focus guard
**Pal** is the mascot (poses and animation strips in `assets/`, `npm run sprites`). On first run Pal walks you through the app. **Focus guard** (iPhone, More → Focus guard): choose apps that stay paused until you do push-ups, squats, a plank, a walk, a minute of breathing or write a line; reps are honour-system. Needs iOS Screen Time + Apple's Family Controls entitlement: see [`docs/SCREENTIME.md`](docs/SCREENTIME.md).

## Publishing to the App Store
Everything needed is prepared: icon, screenshots, listing text, privacy policy/terms/support pages, privacy manifest and release automation. Start with [`docs/APPSTORE.md`](docs/APPSTORE.md) and run `npm run store:check` to see what only you can fill in.
