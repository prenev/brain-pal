# Brain Pal

Thought records (situation → thought → emotions → internal/external behaviour → alternate thought), box breathing with haptic pulses, streaks, tags and photos. An installable PWA: runs in any browser, and on iPhone via **Share → Add to Home Screen**.

## Run

```bash
npm install
npm run dev        # works immediately in local mode (data stays in this browser)
```

## Cloud sync (Supabase, free tier)

1. Create a project at supabase.com and run `supabase/schema.sql` in the SQL editor (tables, RLS, private `photos` bucket).
2. Auth → URL config: add your site URL(s) as redirect URLs. Login is by magic link.
3. `cp .env.example .env` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. `npm run build` and deploy `dist/` to Vercel/Netlify/Cloudflare Pages (HTTPS is required for PWA + push).

Why Supabase over Neon: auth, photo storage and row-level security come with the Postgres in one free project; Neon is Postgres only.

## What works / what doesn't

| Feature | Status |
|---|---|
| Thought records, tags, photos, streaks, search, JSON export | ✅ |
| Box breathing timer + session log | ✅ |
| Vibration | ✅ Android/desktop. **iPhone Safari has no Vibration API**; a best-effort Safari 17.4+ fallback is included but iOS may ignore it outside a tap. Reliable iOS haptics need the native wrapper. |
| Web push | Client, schema and service worker done; **sender not built yet** (needs VAPID keys + a scheduled edge function). On iOS the app must be on the Home Screen (16.4+). |
| Apple Health | ❌ Not possible from a web app. Next step: wrap with Capacitor and write *Mindful Minutes* through a HealthKit plugin (needs a Mac + Apple Developer account). |
| Cloud (Supabase) path | Written but not yet tested against a live project. |

## Roadmap
1. Push sender edge function + cron
2. Capacitor iOS shell: native haptics, HealthKit mindful minutes
3. Insights: emotion trends, before/after intensity
