# Brain Pal for iPhone (Capacitor)

The iPhone app is this same web app in a native shell. It adds what browsers can't do:

| Feature | In the app |
|---|---|
| **Apple Health** | Saves each breathing / grounding session as *Mindful Minutes* (write-only; never reads your data) |
| **Real haptics** | Taptic Engine taps shaped like the breathing pattern (swell on inhale, fade on exhale) |
| **Reminders** | Scheduled on the phone — no server, no Supabase, no VAPID keys. Today's nudge is dropped once you've checked in |
| **Screen stays on** | During a breathing session the phone won't auto-lock |
| Voice memos / photos | Same as web, with proper iOS permission prompts |

## What you need
- A Mac with the latest **Xcode** (App Store). Open it once so it installs its components.
- **Node 22** (`node -v`) and this repo.
- An **Apple ID**. A free one is enough to run on your own iPhone (the app expires after 7 days and must be re-run from Xcode). TestFlight / the App Store need the paid Apple Developer Program.

## Run it on your iPhone

```bash
git pull
npm ci                                  # also required: Xcode's Swift packages point into node_modules
cp .env.example .env                    # optional: add your Supabase URL + anon key if you use accounts/sync
npm run ios:sync                        # builds the web app, copies it into ios/, re-applies our native patch
npm run ios:open                        # opens Xcode
```

In Xcode:
1. Click **App** (blue icon, top of the left sidebar) → target **App** → **Signing & Capabilities**.
2. **Team**: pick your Apple ID (Xcode ▸ Settings ▸ Accounts to add it). If the Bundle Identifier `com.brainpal.app` is taken, change it to something unique (e.g. `com.yourname.brainpal`) — and the same in `capacitor.config.ts`.
3. You should see **HealthKit** listed under capabilities (it comes from `App.entitlements`). If Xcode complains about it on a free account, remove HealthKit — everything else still works, only Apple Health sync won't.
4. Plug in your iPhone, unlock it, pick it in the device menu at the top, press **▶ Run**.
5. First time only: on the iPhone turn on **Settings ▸ Privacy & Security ▸ Developer Mode** (it restarts the phone), and after the first install trust yourself under **Settings ▸ General ▸ VPN & Device Management**.

Every time you change web code: `npm run ios:sync`, then ▶ Run again.

## Try the Apple Health bit
1. In the app: **More ▸ Apple Health ▸ switch on** → iOS shows a permission sheet → allow *Mindful Minutes*.
2. Do a breathing session of 10 seconds or more.
3. Open the **Health** app ▸ **Browse ▸ Mindfulness** → *Mindful Minutes* — the session is there, with Brain Pal as the source.
4. **Save past sessions** (same screen) back-fills sessions logged before you connected.

The Simulator can test Health permissions and saving, but **not haptics** (use a real phone for those).

## Accounts inside the app
Email + password works as-is. For magic-link / password-reset emails to open the app, add `brainpal://auth` under **Supabase ▸ Authentication ▸ URL Configuration ▸ Redirect URLs**. (Google/Apple sign-in buttons need extra native setup and aren't wired for the app yet.)

## How it's put together
- `capacitor.config.ts` – app id/name, colours. `ios/` – the generated Xcode project (Swift Package Manager, no CocoaPods).
- `ios-native/` – our Swift: `MindfulPlugin.swift` (HealthKit + keep-awake), `MainViewController.swift` (registers it), `App.entitlements`.
- `scripts/ios-patch.py` – idempotent script that wires those files, the permission strings (`Info.plist`), the `brainpal://` URL scheme and portrait-only into the project. `npm run ios:sync` runs it for you; if you ever delete `ios/` and run `npx cap add ios`, run it again.
- JS side: `src/lib/native.ts`, `nativeCore.ts` (pure, unit-tested), `health.ts`, `nativeReminders.ts`, `haptics.ts`.
- App icon / splash: `npm run` … see `scripts/make-store-assets.mjs`; then `npx @capacitor/assets generate --ios`.

## Honest status
- **Verified:** the JavaScript, 8 unit suites, 5 browser tests that simulate the iOS bridge, and a JS↔Swift contract test. On every iOS-related push, the **`iOS build` GitHub Action compiles the whole app (Capacitor + our Swift HealthKit plugin) for the iOS Simulator on a macOS runner — it passes** (unsigned build).
- **Not yet verified:** running on a physical iPhone — i.e. the HealthKit permission sheet, saving to the Health app, real Taptic feedback and local notifications. Your first ▶ Run is that test. If anything misbehaves, send me what Xcode or the phone shows.
- Not done: Android, push notifications via APNs (local reminders are used instead), Sign in with Apple / Google inside the app, App Store submission assets (screenshots, privacy policy, health-data disclosures).
