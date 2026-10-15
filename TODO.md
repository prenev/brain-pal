# Owner to-do (things only a human can do)

Short and honest. Tick them off; delete when done. The agent adds to this list whenever a task needs your account, keys, a Mac or a phone.

## Right now
- [ ] **Supabase → Auth → URL Configuration:** Redirect URLs contain exactly `brainpal://auth` (not `brainpan`); Site URL = `brainpal://auth` while iPhone-only.
- [ ] **Confirm your account:** request a new confirmation/magic-link email after fixing the URL (or ask the agent to confirm it in the DB, or turn "Confirm email" off temporarily).
- [ ] **Google provider:** Google Cloud → OAuth client type **Web application**, redirect `https://dncodogkvsjzvptquqnn.supabase.co/auth/v1/callback`; paste ID + secret into Supabase → Providers → Google.
- [ ] **Apple provider:** Supabase → Providers → Apple → Client ID `com.brainpal.app`; App ID has *Sign in with Apple* enabled; Xcode: paid Team + capability (`npm run ios:apple` after every `ios:sync`).
- [ ] **Run on your iPhone** and tell the agent what Apple/Google sign-in did (errors verbatim).

## Soon
- [ ] Custom SMTP (Resend/Postmark) before inviting other people — Supabase's built-in email sender is heavily rate-limited.
- [ ] Web push reminders (optional): generate VAPID keys, add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` as Edge Function secrets, deploy `send-reminders`, run `supabase/cron.sql`.
- [ ] Deploy the web app (Vercel/Netlify) and set the two `VITE_SUPABASE_*` vars there; add its URL to Supabase Redirect URLs.

## Needs a real device (CI can't verify) — the agent will add items here per phase
- [ ] Haptics during breathing; keep-awake; Apple Health Mindful Minutes written
- [ ] Local reminders fire at the set times; tapping opens the right screen *(Phase 9)*
- [ ] Sleep data from Apple Watch appears (needs a Watch with sleep tracking + Health permission) *(Phase 10)*
- [ ] Delete-account function end-to-end on a throwaway account

## Later / App Store (if you decide to publish)
- [ ] Privacy policy + health-data disclosures, screenshots, review notes (no medical claims), age rating
