# Brain Pal — instructions for the agent

Mood diary + CBT thought records + anxiety toolkit (SOS, breathing, grounding, worry time), as a PWA and an iPhone app (Capacitor).
Stack: React 18 + TypeScript + Vite, local-first (localStorage + IndexedDB) with optional Supabase sync, Capacitor 8 for iOS.
Read `ROADMAP.md` (phases + status), `README.md` (features, limits) and `docs/IOS.md` (iPhone app) before big changes.

## How to work (follow this every time)

1. **Plan in phases.** Pick the next item from `ROADMAP.md`. Say briefly what you'll build; for anything non-trivial, split into small steps.
2. **Track.** Keep `docs/KANBAN.md` current (one card *In progress*; move it in the same commit as the work). Anything only the owner can do (accounts, keys, a Mac, a phone) goes into `TODO.md`; real bugs/chores become GitHub issues.
3. **Branch.** Develop on the branch the session names. Commit + **push after every update** (`git push -u origin <branch>`). Never open a PR unless asked.
4. **Write tests with the change** (see *Testing*). New logic → unit test in `scripts/test-*.mjs`. New/changed user flow → e2e in `scripts/e2e.mjs`. A bug fix → a test that fails without the fix.
5. **Verify before pushing** — all of these must pass:
   ```bash
   npx tsc --noEmit && npm test && npm run build && npm run test:e2e -- --no-build
   ```
   (`npm run test:e2e -- --grep="part of name"` runs one test; failures save a screenshot + page text in `test-results/`.)
6. **After any UI change run `npm run screens` and send the user ALL screens** (`screenshots/*.png` plus the contact sheet `screenshots/_all.png`) with `SendUserFile`. Mention which are new. Add new screens to `scripts/screens.mjs` for new UI. The sheet may be scaled down when very tall — say so.
7. **Check CI after pushing.** Use the GitHub MCP tools (`actions_list` → `list_workflow_runs` for the branch, `get_job_logs` with `failed_only`). Fix red runs before moving on; say plainly what failed. The `iOS build` job (macOS) only runs when `ios/**`, `ios-native/**`, `capacitor.config.ts` or `package*.json` change.
8. **Update docs:** `ROADMAP.md` status, `README.md` if behaviour/limits changed, `docs/IOS.md` for iOS. Keep "not verified" notes honest.
9. **Report honestly.** Say what is verified, what is only mocked/simulated, and what needs the user (a Mac, a phone, accounts/keys). Never claim something works that you only typed. If you can't test it, say so.

## Commands

| | |
|---|---|
| `npm run dev` | local dev server (works with no backend) |
| `npm test` | unit suites (also schema contract + check:supabase logic; DB tests run when `TEST_DATABASE_URL` is set) (`scripts/test-*.mjs`, Node strips TS types; library files they import must use **no extensionless relative imports**) |
| `npm run test:e2e` | ~20 headless-Chromium flows: fake mic, mocked Gemini, simulated iOS bridge (`scripts/native-stub.mjs`) |
| `npm run screens` | builds + screenshots every screen into `screenshots/` (git-ignored) |
| `npm run ios:sync` / `ios:open` | build web → `cap sync ios` → re-apply our native patch / open Xcode (Mac only) |
| `npm run icons` / `store:screens` / `store:meta` / `site` / `store:check` | mascot → icons; App Store screenshots; fastlane listing files; legal static site; what the owner still has to fill in (see `docs/APPSTORE.md`) |
| `node scripts/extract-emoji.mjs` | regenerate `src/lib/emojiData.ts` (Fluent Emoji, MIT) after adding names to the script |
| `python3 scripts/ios-patch.py` | copy `ios-native/*` into `ios/` and wire project/plist/entitlements (idempotent) |

The sandbox's browser is auto-detected by `scripts/chromium.mjs` (never hardcode a path; CI uses Playwright's own).

## Map

- `src/pages/` screens · `src/components/` UI pieces (`Sos`, `WorryTime`, `VoiceRecorder`, `AiSettings`, `Celebrate`, …) · `src/lib/` logic.
- **Data:** `lib/repo.ts` (one `Repo` interface; `localRepo` = localStorage + IndexedDB blobs via `blobstore.ts`, `cloudRepo` = Supabase), `lib/store.tsx` (React context). Schema: `supabase/migrations/` — every table/column change is a **new** migration file (see *Supabase* below); update `lib/repo.ts` and the app↔schema contract test together with it.
- **Pure, unit-tested logic** (no DOM imports on purpose): `aiCore.ts` (Gemini client), `audio.ts`, `insights.ts`, `worries.ts`, `dates.ts`, `nativeCore.ts`, `anchors.ts`, `journal.ts`, `focus.ts`, `rituals.ts`, `sleep.ts`, `rewards.ts`, `levels.ts`, `proof.ts`, `summaries.ts`, `today.ts`, `theme.ts`, `sync.ts` + `syncItems.ts` (account sync: newest edit wins, tombstones), `legal.ts` (privacy/terms text, also rendered in-app and as the static site), `supabase/functions/_shared/reminder.ts`. Local-only extras are stored by `extras.ts`; `cloudDocs.ts` is the only network code for them.
- **iPhone:** `native.ts` (Capacitor facade + our `Mindful` plugin interface), `health.ts`, `nativeReminders.ts`, `nativeInit.ts`, `haptics.ts`. Swift lives in `ios-native/` (source of truth) and is copied into `ios/` by `ios-patch.py`.
- **Supabase:** schema = `supabase/migrations/*.sql` (mirrors the live project's history exactly), config = `supabase/config.toml`, functions in `supabase/functions/`, DB tests in `supabase/tests/` (+ `scripts/test-db.mjs`), live check = `npm run check:supabase`. Details: `docs/SUPABASE.md`.
- Design: `src/styles.css` — chunky Duolingo-style dark theme (3D buttons, thick-bordered cards, Nunito, Fluent emoji). Reuse the existing classes (`.card`, `.btn`, `.chip`, `.ig`, `.bar`, `.sheet`, `.overlay`) rather than inventing new styling.

## Supabase (project `brain-pal`, ref `dncodogkvsjzvptquqnn`)

If the Supabase MCP tools are available, they act on the **user's real project** — be careful:
- Work **only** on `brain-pal` (`dncodogkvsjzvptquqnn`). The account has other projects (e.g. `KGMOA-Connect-main`, `manova-bible`): never touch them.
- Schema changes: write a new file in `supabase/migrations/`, test it (`npm run test:db`), then apply it with `apply_migration`. The tool records its **own** version number, so afterwards call `list_migrations` and **name the repo file with that exact version + name** (the GitHub integration breaks if history and files disagree). Re-verify the live schema matches (compare `information_schema` / `pg_policies` with a local run) and run `get_advisors` (security) — it must stay clean.
- `apply_migration` **times out on `DO $$ … $$` blocks** — use plain SQL statements.
- Never print, store or commit the secret/`service_role` key. The publishable key is public but still lives in `.env` (git-ignored), not in the repo.
- Auth settings (redirect URLs, email confirmation, SMTP, providers) and Edge-Function secret values can't be set by you — tell the user the exact dashboard steps (`docs/SUPABASE.md`).
- The sandbox's network blocks `*.supabase.co`: you can't call the live API (so `check:supabase` can't run here). For DB tests start a throwaway Postgres: `useradd -m pgtest; su pgtest -c "/usr/lib/postgresql/16/bin/initdb -D /tmp/pgdata -A trust && /usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata -o '-p 54329 -k /tmp/pgsock -c listen_addresses=127.0.0.1' -l /tmp/pg.log start"` then `TEST_DATABASE_URL=postgres://pgtest@127.0.0.1:54329/postgres npm run test:db`.

## Rules that matter

- **Safety first (mental-health app).** Text that looks like self-harm must never be sent to an AI and must surface `components/Support.tsx` (`looksLikeCrisis` in `aiCore.ts`). Keep `components/Support.tsx` reachable from the SOS flow and More. No diagnosis or medical claims in copy; the app is self-help.
- **Privacy.** AI (Gemini) is **opt-in**, bring-your-own-key, key stays in the browser, with the explicit free-tier data-use disclosure in `AiSettings`. Never add analytics/telemetry or send entry text anywhere by default. Model output is untrusted: sanitise against allow-lists (`sanitizeStructured`/`sanitizeReframes`) and render as text only.
- **Local-first must keep working with no keys.** Don't make a feature depend on Supabase/Gemini/native being present; guard native calls with `isNative()` and swallow plugin failures (a failed Health sync or haptic must never break logging).
- **Old data must keep loading.** New fields get defaults in `localRepo.hydrate` / the cloud row mappers; `e2e` has a legacy-data test — extend it if you change stored shapes.
- **Gemini model names churn.** Never hardcode a model; `aiCore.createClient` discovers one from the user's key.
- **iOS native code:** edit `ios-native/*.swift`, then run `python3 scripts/ios-patch.py` and commit the `ios/` result. `scripts/test-ios.mjs` fails if the copies drift or JS/Swift method names disagree. You cannot compile Swift in this Linux sandbox — rely on the macOS CI job, and tell the user what is unverified on a real device.
- **Tests must not be racy.** Wait on the specific element/state you mean (not text that also appears elsewhere); beware selectors whose text changes while busy (e.g. "Transcribe" → "Transcribing…"). Don't loosen an assertion to make it pass — find the cause. If a test is flaky, reproduce it (`--grep`, repeat runs), fix the root cause.
- **App Store listing** lives in `scripts/store-metadata.mjs` (generated into `fastlane/`); no other app's name in it (tested). Privacy policy text in `lib/legal.ts` must match what the app really does — change both together; `test-store.mjs` also keeps the privacy manifest, label, version numbers and dependency notices consistent.
- **Don't commit** secrets, `.env`, `node_modules`, `dist`, `screenshots/*.png`, `test-results/`.
- Match the surrounding code style: small modules, comments only where the *why* isn't obvious, TypeScript strict (`noUnusedLocals`).

## Definition of done

Typecheck + unit + build + e2e green locally → committed and pushed → CI green on GitHub → screens sent (if UI changed) → docs/roadmap updated → honest summary of what is and isn't verified.
