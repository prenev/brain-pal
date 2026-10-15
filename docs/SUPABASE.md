# Supabase (cloud sync + accounts)

Brain Pal is local-first: with **no keys** it keeps everything in the browser/phone. Add a Supabase project and the same app gets
**accounts, sync across devices, and private photo/voice-memo storage**.

## What's already set up in the `brain-pal` project
Everything below is created by the SQL in `supabase/migrations/` (the exact files recorded in the project's migration history):

| | |
|---|---|
| Tables | `thoughts`, `breath_sessions`, `worries`, `push_subscriptions` — each row belongs to one user (`user_id`, cascades on account delete) |
| Security | Row-level security on every table: signed-in users see **only their own rows**; the `anon` role has **no access at all** |
| Data checks | mood 1–5, intensities 0–100 / 0–10, worry status, hour 0–23 … enforced by the database |
| Storage | private bucket `photos` (25 MB limit, images + audio only); a user can only read/write files under `<their user id>/` |
| Edge function | `delete-account` (powers *More → Account → Delete account*; JWT required) |
| Not deployed yet | `send-reminders` (only for **web**-push reminders; the iPhone app schedules reminders on the phone) |

The migrations are tested against a real Postgres on every push (`npm run test:db`, see *Tests*), and the live schema was verified identical to them.

## Connect the app (2 values)
In the Supabase dashboard open **Project Settings → API Keys** and copy:
```bash
cp .env.example .env
# VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=sb_publishable_...        # the *publishable* key (public by design; protected by row-level security)
```
**Never** use the *secret* / `service_role` key — it bypasses all security. `npm run check:supabase` refuses it.

Then verify the live project:
```bash
npm run check:supabase
# optional full round trip as a throwaway, already-confirmed test account (saves + deletes a thought, a worry and a photo,
# and proves another user's folder/rows are off-limits):
CHECK_EMAIL=you+test@example.com CHECK_PASSWORD='...' npm run check:supabase
```
It reports ✓ / ! / ✗ with the fix for each problem. For the web app, set the same two variables in your host (Vercel/Netlify) and rebuild;
for the iPhone app they're baked in at `npm run ios:sync` time (see `docs/IOS.md`).

## Things only the dashboard can do (one-time)
1. **Authentication → URL Configuration**
   - *Site URL*: where the web app is hosted (use `http://localhost:5173` until you deploy).
   - *Redirect URLs*: add `http://localhost:5173`, your deployed web URL, and **`brainpal://auth`** (iPhone app magic links / password reset).
2. **Authentication → Sign In / Providers → Email**: decide whether *Confirm email* stays on. On: new users must click an emailed link before signing in.
   Supabase's built-in email sender is **heavily rate-limited** — set up **custom SMTP** (e.g. Resend, Postmark) before inviting real users.
3. Optional: enable Google / Apple under Providers, then set `VITE_OAUTH_PROVIDERS=google,apple` (the iPhone app doesn't support these buttons yet).
4. Optional, **web push reminders only**: generate keys with `npx web-push generate-vapid-keys`, add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` as Edge Function secrets,
   deploy `supabase/functions/send-reminders`, and run `supabase/cron.sql` (fill the two placeholders). Put the public key in `.env` as `VITE_VAPID_PUBLIC_KEY`.

## GitHub integration
Supabase watches `supabase/` on the production branch: `migrations/*.sql` are applied in order, functions deploy per `config.toml`.
- The four existing migration files have the **same version numbers and names** as the project's history — keep them untouched.
- Add changes as **new** files: `supabase/migrations/<yyyymmddhhmmss>_<name>.sql`. Never edit an applied migration.
- `config.toml` sets `verify_jwt = false` for `send-reminders` (called by the database scheduler, not a user) and `true` for `delete-account`.
  Without that line the scheduler's calls would be rejected with 401.

## Tests
```bash
# needs psql + a throwaway Postgres you can create databases in (CI uses a postgres:16 service)
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
npm test            # also runs the app<->schema contract test and the check:supabase logic (no database needed)
```
`test:db` replays the migrations on a Supabase-like stub (auth/storage/roles), then as **two different users** and as an anonymous visitor proves:
you can't read, change, delete or forge another user's rows or files; bad values are rejected; defaults are right; deleting an account cascades.
`test-contract` fails if the app code mentions a column that isn't in the migrations.
