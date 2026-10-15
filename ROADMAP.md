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
| 5 | iOS shell (Capacitor): reliable haptics for breathing, Apple Health Mindful Minutes, native notifications | ⏳ needs Mac + Apple Developer account |
| 6 | Reports & extras: weekly/monthly reports, goals, voice memo, worry-time journal, theme picker | ⏳ |
