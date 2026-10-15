# Brain Pal — working board

The agent's own board. **Rules:** one card *In progress* at a time · a card moves to *Done* only when the CLAUDE.md "definition of done" holds (tests green, pushed, CI green, docs updated) · update this file in the same commit as the work · cards link to the GitHub issue (`#n`) when one exists. Details for every phase live in [`ROADMAP.md`](../ROADMAP.md); things only the owner can do live in [`TODO.md`](../TODO.md).

Legend: 🧱 build · 🧪 tests · 🗄 data/migration · 📱 iOS/native · 📄 docs · 🐞 bug/chore

## 🔜 Backlog (ordered)
- **P8** 🧱🧪 Journal: pure `journal.ts` (search, month groups, word count, daily prompt) + unit tests
- **P8** 🧱 Journal editor (autosave draft, prompts, mood, tags) + list/search/read/edit/delete + crisis-wording → Support
- **P8** 🧪 e2e journal flows + legacy data; hook into streak
- **P9** 🧱🧪 Pure `rituals.ts`: `planRituals`, weekday rules, skip rules, id budget, migrate old reminder + unit tests
- **P9** 🧱 Rituals list UI (Morning breathe 07:00, Evening breathe 21:30, check-in, anchors nudge), per-ritual toggle/time/days
- **P9** 📱 Notification deep-links (`localNotificationActionPerformed` → Breathe/journal/anchors) + e2e with native stub
- **P10** 🧱🧪 Pure `sleep.ts`: merge segments, group nights, stages, averages, consistency + fixtures/unit tests
- **P10** 📱 Swift `requestSleepAuthorization` / `readSleep` (sleepAnalysis read-only) + `test-ios.mjs` allow-list + parity
- **P10** 🧱 Sleep card + Sleep page + manual log; sleep↔mood insight (≥7 paired days)
- **P10** 🧪📄 e2e (fixture segments, manual log, denied, web) + honest privacy docs + TODO device checks
- **P11** 🧱🧪 Coins: pure `rewards.ts` (earn rules, caps, milestones, balance) + unit tests
- **P11** 🧱 Wallet page, coin counter, +N toast, shop (themes, Pal outfits, confetti)
- **P11** 🧱 Rest day (freeze streak, max 2/month) + self-defined treat jar
- **P12** 🗄 Migrations: journal_entries, anchors, anchor_checks, sleep_nights, wallet_spends, rituals (+RLS, rls.sql tests, contract test, advisors)
- **P12** 🧱 cloudRepo + importLocal for the new data, delete-account cascade check
- **P13** 🧱 Weekly review screen (+ optional Sunday ritual); sleep↔mood and anchors↔mood insights
- **P13** 🧱 Theme picker (unlockable themes); optional Gemini "reflect with me" (opt-in, crisis-safe)
- **chore** 🐞 Code-split the 1.4 MB bundle (lazy Stats / emoji data / Gemini)
- **chore** 🐞 Replace "Sam / presentation" demo text in the screens seed with neutral placeholders
- **chore** 📱 Siri shortcut / widgets *(needs a Mac session)*

## ⏭ Next up
- **P7** 🧪 e2e: add/tick/untick/persist/cap message/auto-tick via breathing + legacy data
- **P7** 📄 docs/ROADMAP/README + screens for the Anchors UI

## 🔨 In progress
- **P7** 🧱🧪 Daily Anchors: pure `anchors.ts` (cap 5, progress, streak, auto-links) + unit tests

## 🔎 Verify / blocked on the owner
- Google + Apple sign-in on a real iPhone (Swift compiled in CI only) — see TODO.md
- First real sign-in against the live Supabase project; confirm the existing unconfirmed account
- `send-reminders` Edge Function not deployed (needs VAPID secrets)

## ✅ Done
- P0–P6: scaffold, mood diary, accounts, reminders (server), anxiety toolkit, playful redesign, iPhone app, voice memos + Gemini + worry time
- P5.5: Supabase project, migrations mirrored, RLS tests, `check:supabase`, delete-account function
- P5.6: PKCE + Google/Apple sign-in, redirect troubleshooting docs
- UI: liquid-glass floating tab bar, line icons + Fluent nib for Entries (fixes invisible unselected More icon); e2e/screens build key-free so a local `.env` can't break them
- Planning: roadmap for phases 7–13 + idea backlog, this board, TODO.md, GitHub issues
