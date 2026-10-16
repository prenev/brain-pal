# Wobbi — working board

The agent's own board. **Rules:** one card *In progress* at a time · a card moves to *Done* only when the CLAUDE.md "definition of done" holds (tests green, pushed, CI green, docs updated) · update this file in the same commit as the work · cards link to the GitHub issue (`#n`) when one exists. Details for every phase live in [`ROADMAP.md`](../ROADMAP.md); things only the owner can do live in [`TODO.md`](../TODO.md).

Legend: 🧱 build · 🧪 tests · 🗄 data/migration · 📱 iOS/native · 📄 docs · 🐞 bug/chore

## 🔜 Backlog (ordered — see ROADMAP "Order of work")
- **Focus hub follow-ups** 🧱 #30 background timer + Live Activity (mostly done: runs while closed, island follows phases; verify on device) · #31 to-do v2/sync · #32 focus stats · #33 auto-block during a block · #34 blocked-app icons on the tile · #35 sounds + widget/Siri
- **P13** 🧱 Theme picker; optional Gemini "reflect with me"
- **chore** 🐞 Code-split bundle · neutral demo seed text · Apple Watch (Mac)

## ⏭ Next up
- **P13** 🧱 Weekly review nudge (Today card on Sunday evening), optional Gemini "reflect with me"
- **chore** 🐞 Code-split the 1.4 MB bundle

## 🔨 In progress
- **P20 Growth** 📄 marketing strategy written (docs/MARKETING.md); share cards, stickers, invite, rating prompt, Siri links done; next: landing page + waitlist, Watch (Mac)
- **P18 Wobbi + Focus guard** 🧱 mascot, onboarding story, notch fix, Screen Time guard — verify, CI, screens
- (done earlier) **P17 App Store pack** 📄 mascot icon, screenshots, listing, legal pages (in-app + site), privacy manifest, fastlane/TestFlight, docs/APPSTORE.md — verify + CI, then owner steps in TODO.md

## 🔎 Verify / blocked on the owner
- Google + Apple sign-in on a real iPhone (Swift compiled in CI only) — see TODO.md
- First real sign-in against the live Supabase project; confirm the existing unconfirmed account
- `send-reminders` Edge Function not deployed (needs VAPID secrets)

## ✅ Done
- P24 Widgets: 14 home/lock-screen widgets (interactive mood + anchors), Live Activity (breathing / focus), 4 iOS 18 controls; App Group snapshot + action queue — unit + e2e (mutation-checked), simulator + signed device build, snapshot verified on the iPhone; widget looks/taps on device pending
- P19 Offline first + Pro monthly subscription (StoreKit 2 + paywall + gates), What's new, SOS-first coach, no scroll bars, streak box removed — verified with the simulated bridge; real purchases need a device + App Store Connect setup
- SOS is a siren in the Home/Breathe action bar (cards + menu entry removed), no daily-goals card, tools strip starts level with the cards, Wobbi's corner coach replaces the swipe tip
- Home tools strip scrolls (Thoughts leads; Sleep/Progress/Summary/Coins no longer buried), Wobbi tips per section, splash screen, Wobbi v3 (no centre line), fix: "+N coins" toast could stay forever (its timer was cancelled by later coin changes; e2e fails without the fix)
- UI: Home tools row (Focus guard · Worry time · Journal) above the anchors, each opens its own screen; Today/Entries/Journal switch removed (month list → *All entries*); Notes-style journal editor (borderless title + growing page, mood/tags in a glass toolbar)
- Native UITabBar (Liquid Glass on iOS 26) via MindfulPlugin; web bar only as fallback (device check pending)
- UX pass: Home tab (Today / Entries / Journal), grouped + menu, uniform tab icons, calendar fix
- Fix: CI flake — anchors e2e crossed midnight UTC (clock pinned)
- Fix: calendar today cell was squashed (`.today` CSS collided with the Today card)
- P0–P6: scaffold, mood diary, accounts, reminders (server), anxiety toolkit, playful redesign, iPhone app, voice memos + Gemini + worry time
- P7b first-run + reduced motion + tap-target audit (found/fixed: adding several anchors in one tick kept only the last)
- P12 Cloud sync (user_docs, newest-wins + tombstones, offline-safe, sign-out clears device) — migration live, engine mutation-checked, 3 two-device e2e
- P11 Coins (derived earnings with caps, themes, rest days, treats) — pure logic mutation-checked, 4 e2e
- P10 Sleep (Apple Health read-only, nights/stages/consistency, sleep↔mood, manual log) — pure logic mutation-checked, 3 e2e; real Watch data pending
- P9 Rituals (07:00/21:30 breathe, check-in, anchors nudge; tap-to-open; skip-when-done) — native-stub e2e; real-device delivery pending
- P14 One small step (worry plan → calm start → focus timer, fake-clock e2e, pause/stop neutral)
- P8 Journal (editor, autosaved drafts, list/search/tags/edit/delete, crisis support) — 3 e2e, mutation-checked
- P15 Summary view + P16 Progress (skills, proof, milestones, level-ups) — pure logic mutation-checked, 4 new e2e
- P7 Daily Anchors + P7b Today card / one-tap mood / short lists (29 e2e)
- P5.5: Supabase project, migrations mirrored, RLS tests, `check:supabase`, delete-account function
- P5.6: PKCE + Google/Apple sign-in, redirect troubleshooting docs
- UI: liquid-glass floating tab bar, line icons + Fluent nib for Entries (fixes invisible unselected More icon); e2e/screens build key-free so a local `.env` can't break them
- Planning: roadmap, idea backlog, this board, TODO.md, GitHub issues, competitor analysis + gap matrix (docs/COMPETITORS.md)
