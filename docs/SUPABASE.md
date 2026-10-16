# Supabase (cloud sync + accounts)

Wobbi is local-first: with **no keys** it keeps everything in the browser/phone. Add a Supabase project and the same app gets
**accounts, sync across devices, and private photo/voice-memo storage**.

## What's already set up in the `brain-pal` project
Everything below is created by the SQL in `supabase/migrations/` (the exact files recorded in the project's migration history):

| | |
|---|---|
| Tables | `thoughts`, `breath_sessions`, `worries`, `push_subscriptions`, `user_docs` — each row belongs to one user (`user_id`, cascades on account delete) · `waitlist_signups` (the Wobbi website waitlist, see below) |
| Security | Row-level security on every table: signed-in users see **only their own rows**; the `anon` role has **no access at all** — except one insert-only policy on `waitlist_signups` |
| Data checks | mood 1–5, intensities 0–100 / 0–10, worry status, hour 0–23 … enforced by the database |
| Storage | private bucket `photos` (25 MB limit, images + audio only); a user can only read/write files under `<their user id>/` |
| Edge function | `delete-account` (powers *More → Account → Delete account*; JWT required) |
| Not deployed yet | `send-reminders` (only for **web**-push reminders; the iPhone app schedules reminders on the phone) |

The migrations are tested against a real Postgres on every push (`npm run test:db`, see *Tests*), and the live schema was verified identical to them.

## Website waitlist (`waitlist_signups`)
The landing page (separate repo, `brainpal-landing-`, wobbi.app) posts sign-ups straight to `/rest/v1/waitlist_signups` with the publishable key:
- `anon` can **only insert** (policy `waitlist_signups_anon_insert`, `consent = true`); it cannot select, update or delete, and signed-in users have no access either. Read the list in the dashboard (Table editor) or with the service role.
- Every column is checked by the database: lower-case email format and length, name ≤ 80, ≤ 6 interests, device in (iPhone, Android, Both, Other), notes ≤ 500, `consent` must be true.
- Email is unique. A repeat sign-up returns `23505`, which the website treats as success so it never reveals who is on the list (`on conflict` would need select access, so it is not used).
- Tested in `supabase/tests/rls.sql`. There is no email notification yet; check the table, or add a Database Webhook / Edge Function with your own email provider key.

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
3. Optional: Google / Apple sign-in — see **Social sign-in** below. The buttons appear by themselves once a provider is enabled.
4. Optional, **web push reminders only**: generate keys with `npx web-push generate-vapid-keys`, add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` as Edge Function secrets,
   deploy `supabase/functions/send-reminders`, and run `supabase/cron.sql` (fill the two placeholders). Put the public key in `.env` as `VITE_VAPID_PUBLIC_KEY`.

## Social sign-in (Google, Apple)
The login screen asks Supabase which providers are on and shows only those. Nothing to set in the app or `.env`.

**Google** (free)
1. Google Cloud Console → create a project → *APIs & Services → OAuth consent screen* (User type *External*; add your email as a test user while it is in "Testing").
2. *Credentials → Create credentials → OAuth client ID → Web application*. Under **Authorized redirect URIs** add `https://dncodogkvsjzvptquqnn.supabase.co/auth/v1/callback`.
3. Copy the Client ID and Client secret into Supabase → *Authentication → Sign In / Providers → Google* → enable → save.
On the iPhone the app opens Google in the system sign-in sheet and returns to `brainpal://auth` (so that URL must be on the Redirect URLs list).

**Apple** (needs the paid Apple Developer Program, US$99/yr). Apple's App Review rule 4.8 requires it if you offer Google sign-in in an App Store build.
- *iPhone app only (simplest, no secret key to rotate):* Supabase → Providers → Apple → enable, and under **Client IDs** enter the bundle ID `com.brainpal.app`. In Xcode add the *Sign in with Apple* capability (or run `npm run ios:apple` before building, which adds the entitlement). Apple's own sheet is used; the app sends its identity token to Supabase.
- *Also on the web:* create a Services ID + a Sign in with Apple key in the Apple developer portal, add `…/auth/v1/callback` as its return URL, and paste the Services ID and a generated client secret (a JWT signed with the key; **expires every 6 months** and must be regenerated) into the same Supabase screen.
Without a paid account, leave Apple disabled: the button then simply isn't shown. Free "Personal Team" Xcode signing rejects the capability, which is why `ios-patch.py` only adds it with `--apple-signin`.

## If the confirmation email opens "Safari can't open the page" / localhost
That means the link's redirect target wasn't on the allow-list, so Supabase fell back to the **Site URL**.
1. *Authentication → URL Configuration → Redirect URLs* must contain exactly `brainpal://auth` (check the spelling: `brainpal`, not `brainpan`), plus your web URLs.
2. While you only use the iPhone app, set *Site URL* to `brainpal://auth` too, so a mismatch can never land on a dead `localhost` page. Switch it to your deployed web URL when you host the web app.
3. Links in already-sent emails keep the old target: request a new one (*Sign in → Email me a link*, or sign up again) after fixing the settings. Or, to test quickly, turn *Confirm email* off under Providers → Email.
(The allow-list isn't visible through Supabase's public API, so `npm run check:supabase` can't verify it — check it in the dashboard.)

## Sync table: `user_docs` (Phase 12)
One row per synced item: `(user_id, kind, id)` primary key, `data jsonb`, `deleted boolean`, `updated_at timestamptz`. `kind` is allow-listed (journal, anchor, anchor_check, focus, manual_night, purchase, rituals, theme); `deleted` ⇔ `data is null`; a document must be < 32 KB; `updated_at` may be at most a day in the future (stops a wrong clock from "winning" forever). RLS: `to authenticated`, `auth.uid() = user_id` for all commands; `anon` revoked; deleting the account cascades. Migration `20261015234220_user_docs.sql` (applied to the live project; the advisor run afterwards showed only the pre-existing *leaked password protection* warning, which is an Auth dashboard toggle).

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
