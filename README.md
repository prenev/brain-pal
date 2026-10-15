# Brain Pal

Mood diary with CBT thought records: pick a mood, tag emotions, log the situation → thought → internal/external behaviour → alternate thought, plus box breathing with haptic pulses, streaks, calendar, stats, tags and photos. Dark, glass-style UI laid out like a classic mood-tracker app. An installable PWA: runs in any browser, and on iPhone via **Share → Add to Home Screen**.

## Run

```bash
npm install
npm run dev        # works immediately in local mode (data stays in this browser)
```

## Cloud sync (Supabase, free tier)

1. Create a project at supabase.com and run `supabase/schema.sql` in the SQL editor (tables, RLS, private `photos` bucket).
2. Auth → URL config: add your site URL(s) as redirect URLs. Auth → Providers: Email is on by default (password, sign-up, magic link, password reset all work). For *Continue with Google/Apple*, enable the provider in Supabase and set `VITE_OAUTH_PROVIDERS=google,apple`. Without Supabase keys the app runs account-free in local mode.
3. `cp .env.example .env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. `npm run build` and deploy `dist/` to Vercel/Netlify/Cloudflare Pages (HTTPS is required for PWA + push).

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

## Anxiety toolkit

- **SOS ("Anxious right now?")** — on the Entries tab, Breathe tab and the + menu. Rate anxiety 0–10 → pick slow breathing (in 4 / out 6), 5-4-3-2-1 grounding or box breathing → re-rate and see the change. Results feed *Stats → Anxiety Insights*.
- **Thinking traps** — the thought record lists 10 common cognitive distortions with a "try asking" prompt for each, plus tap-to-add reframing questions.
- **Insights** — likely triggers (tags), common traps, time of day, and how much the exercises help you.
- **Support** — crisis lines and a gentle nudge after a rough patch. This is a self-help tool, not medical care.

## What works / what doesn't

| Feature | Status |
|---|---|
| Thought records, tags, photos, streaks, search, JSON export | ✅ |
| Box breathing timer + session log | ✅ |
| Vibration | ✅ Android/desktop. **iPhone Safari has no Vibration API**; a best-effort Safari 17.4+ fallback is included but iOS may ignore it outside a tap. Reliable iOS haptics need the native wrapper. |
| Web push reminders | Client, service worker and sender (`supabase/functions/send-reminders`) written; the scheduling logic is unit-tested (`npm test`) but the deployed pipeline is not. Needs one-time setup below. On iOS the app must be on the Home Screen (16.4+). |
| Delete account | `supabase/functions/delete-account` (needs deploying). |
| Apple Health | ❌ Not possible from a web app. Next step: wrap with Capacitor and write *Mindful Minutes* through a HealthKit plugin (needs a Mac + Apple Developer account). |
| Insights / SOS logic | Unit-tested (`npm test`). Not clinically validated; breathing/grounding techniques are standard CBT-style self-help. |
| Cloud (Supabase) path | Written but not yet tested against a live project. |

## Roadmap
1. Push sender edge function + cron
2. Capacitor iOS shell: native haptics, HealthKit mindful minutes
3. Insights: emotion trends, before/after intensity
