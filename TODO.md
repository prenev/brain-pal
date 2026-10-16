# Owner to-do (things only a human can do)

Short and honest. Tick them off; delete when done. The agent adds to this list whenever a task needs your account, keys, a Mac or a phone.

## Right now
- [ ] **Supabase → Auth → URL Configuration:** Redirect URLs contain exactly `brainpal://auth` (not `brainpan`); Site URL = `brainpal://auth` while iPhone-only.
- [ ] **Confirm your account:** request a new confirmation/magic-link email after fixing the URL (or ask the agent to confirm it in the DB, or turn "Confirm email" off temporarily).
- [ ] **Google provider:** Google Cloud → OAuth client type **Web application**, redirect `https://dncodogkvsjzvptquqnn.supabase.co/auth/v1/callback`; paste ID + secret into Supabase → Providers → Google.
- [ ] **Apple provider:** Supabase → Providers → Apple → Client ID `com.brainpal.app`; App ID has *Sign in with Apple* enabled; Xcode: paid Team + capability (`npm run ios:apple` after every `ios:sync`).
- [ ] **Signed-in round trip:** make a throwaway account, then `CHECK_EMAIL=… CHECK_PASSWORD=… npm run check:supabase` — proves signed-in users can save data/photos (not yet verified; if it says *permission denied for table*, tables need `grant select, insert, update, delete … to authenticated`).
- [ ] **Run on your iPhone** and tell the agent what Apple/Google sign-in did (errors verbatim).

- [ ] **Two-device sync check (Phase 12):** sign in on the iPhone and in the browser with the same account; write a journal entry on one, open the other → it should appear within a few seconds (More → Account → *Sync now* forces it). Report any error text.
- [ ] **Supabase → Authentication → Sign In / Providers → Email → enable "Prevent use of leaked passwords"** (Advisor warning; a dashboard-only setting).

## Soon
- [ ] Custom SMTP (Resend/Postmark) before inviting other people — Supabase's built-in email sender is heavily rate-limited.
- [ ] Web push reminders (optional): generate VAPID keys, add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` as Edge Function secrets, deploy `send-reminders`, run `supabase/cron.sql`.
- [ ] Deploy the web app (Vercel/Netlify) and set the two `VITE_SUPABASE_*` vars there; add its URL to Supabase Redirect URLs.

## Needs a real device (CI can't verify) — the agent will add items here per phase
- [ ] Haptics during breathing; keep-awake; Apple Health Mindful Minutes written
- [ ] Rituals fire at the set times (try 07:00 + a time 2 minutes from now), and tapping one opens Breathe / journal / check-in *(Phase 9)*
- [ ] Stats → Sleep → *Connect Apple Health sleep*: last night's hours and (with a Watch) Deep/REM/Core match what the Health app shows *(Phase 10)*
- [ ] Delete-account function end-to-end on a throwaway account

## App Store (everything else is prepared — follow docs/APPSTORE.md §3; `npm run store:check` shows what's blank)
- [ ] Fill in **your name, public contact e-mail, governing law, copyright, App Review contact** (`src/lib/legal.ts` → `OWNER`; `scripts/store-metadata.mjs` → `APP.copyright`, `REVIEW`), then `npm run site && npm run store:meta`, commit
- [ ] **Trademark / name search for "Brain Pal"** (App Store, USPTO, EUIPO, WIPO) — change the name now if it collides
- [ ] GitHub repo → Settings → **Pages → Source: GitHub Actions** (publishes the privacy policy / terms / support pages the App Store links to)
- [ ] developer.apple.com → App ID `com.brainpal.app` with **HealthKit** + **Sign in with Apple**
- [ ] App Store Connect → new app (name, SKU, bundle id) → **App Privacy** questionnaire (answers in docs/APPSTORE.md §3 step 6) → **EU trader status** → age rating
- [ ] Upload the build (Mac: Xcode Archive, or add the 4 secrets and run the *TestFlight upload* workflow), install via TestFlight and tick the device checklist in docs/APPSTORE.md §8
- [ ] Replace the marketing screenshots with real-device ones if you prefer (same captions), then submit for review

- [ ] **iPhone: check the native Liquid Glass tab bar** (docs/IOS.md → "Native tab bar"): glass look on iOS 26, taps switch tabs, hides behind sheets, nothing cut off at the bottom, + button position. Tell me if it should be the floating capsule (needs a UITabBarController shell).
