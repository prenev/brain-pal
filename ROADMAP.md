# Brain Pal roadmap

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
| 7 | Reports & extras: weekly/monthly reports, goals, theme picker, push-to-talk "quick log" | ⏳ |
