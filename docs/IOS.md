# Wobbi for iPhone (Capacitor)

The iPhone app is this same web app in a native shell. It adds what browsers can't do:

| Feature | In the app |
|---|---|
| **Apple Health** | Saves each breathing / grounding session as *Mindful Minutes* (write). **Reads sleep only**, and only if you connect it under *Stats → Sleep* (no other health data is ever read — `scripts/test-ios.mjs` enforces that) |
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
3. Open the **Health** app ▸ **Browse ▸ Mindfulness** → *Mindful Minutes* — the session is there, with Wobbi as the source.
4. **Save past sessions** (same screen) back-fills sessions logged before you connected.

The Simulator can test Health permissions and saving, but **not haptics** (use a real phone for those).

## Accounts inside the app
Email + password works as-is. For magic-link / password-reset emails to open the app, add `brainpal://auth` under **Supabase ▸ Authentication ▸ URL Configuration ▸ Redirect URLs**. Google and Apple sign-in buttons show automatically once the provider is enabled in Supabase; setup, and why Apple needs a paid developer account, is in `docs/SUPABASE.md`. For Apple run `npm run ios:apple` (adds the capability) instead of plain `ios-patch.py`.

## How it's put together
- `capacitor.config.ts` – app id/name, colours. `ios/` – the generated Xcode project (Swift Package Manager, no CocoaPods).
- `ios-native/` – our Swift: `MindfulPlugin.swift` (HealthKit + keep-awake), `MainViewController.swift` (registers it), `App.entitlements`.
- `scripts/ios-patch.py` – idempotent script that wires those files, the permission strings (`Info.plist`), the `brainpal://` URL scheme and portrait-only into the project. `npm run ios:sync` runs it for you; if you ever delete `ios/` and run `npx cap add ios`, run it again.
- JS side: `src/lib/native.ts`, `nativeCore.ts` (pure, unit-tested), `health.ts`, `nativeReminders.ts`, `haptics.ts`.
- App icon / splash: `npm run icons` (renders the mascot in `public/icon.svg` into the PWA icons, the 1024 App Store icon and the launch image).

## Honest status
- **Verified:** the JavaScript, 8 unit suites, 5 browser tests that simulate the iOS bridge, and a JS↔Swift contract test. On every iOS-related push, the **`iOS build` GitHub Action compiles the whole app (Capacitor + our Swift HealthKit plugin) for the iOS Simulator on a macOS runner — it passes** (unsigned build).
- **Not yet verified:** running on a physical iPhone — i.e. the HealthKit permission sheet, saving to the Health app, real Taptic feedback and local notifications. Your first ▶ Run is that test. If anything misbehaves, send me what Xcode or the phone shows.
- Not verified on a real device: Google sheet and Sign in with Apple (compile-checked by CI only; Apple needs a paid account).
- Not done: Android, push notifications via APNs (local reminders are used instead), App Store submission assets (screenshots, privacy policy, health-data disclosures).


## Sleep from your Apple Watch (Phase 10)
*Stats → Sleep → Connect Apple Health sleep* asks iOS for permission to **read sleep analysis** and shows last night, the last week, bedtime consistency and (with enough days) how sleep and mood relate. Notes:
- iOS never tells an app whether *read* access was granted. If nothing shows up, check **Settings → Health → Data Access & Devices → Wobbi → Sleep**, and that the Watch (or iPhone Sleep schedule) is actually tracking sleep.
- Sleep stages (Deep / REM / Core) need an Apple Watch with watchOS 9+/iOS 16+; older data shows as plain "asleep".
- When the Watch and iPhone both report the same minutes they are merged (named stage wins; an explicit *awake* beats sleep), so time is never counted twice. Short blips (< 20 min) are ignored, naps are kept apart from the night, and a night belongs to the morning you woke up.
- The Health permission text (`NSHealthShareUsageDescription`) now says it reads sleep; `python3 scripts/ios-patch.py` updates existing projects.
- Not verified on a real Watch yet: the Swift query is compile-checked on the macOS CI job and the JS side is tested with simulated segments (`scripts/native-stub.mjs`).


## Native tab bar (Liquid Glass)

In the iPhone app the bottom bar is a **real `UITabBar`** added by `MindfulPlugin` (`setTabs` / `selectTab` / `setTabsHidden`, event `tabSelected`), drawn above the web view. We never set its background or appearance, so when the app is built with Xcode 26 and run on iOS 26 the system draws it as Liquid Glass; on older iOS it is the standard blurred bar. Icons are SF Symbols (`house`, `chart.bar`, `calendar`, `wind`, `ellipsis.circle`). The web bar (the CSS capsule) is only used in browsers/PWA, or if the native call fails.

- The bar is hidden while a sheet or full-screen flow is open (so it never covers one) and before the app proper shows (login, first-run).
- The web page leaves room via `--native-tab-h` (height the bar covers) and the + button sits above it.
- **Not verified on a device:** the Swift compiles on macOS CI, and the JS side is covered by e2e with the simulated bridge, but I could not see the real bar. Check on your iPhone: glass look on iOS 26, tab taps switch screens, bar hides behind the + menu, nothing is cut off at the bottom of scrolled screens, and the + button position.
- Because it is a standalone `UITabBar` (not a `UITabBarController`), iOS 26 may draw it docked rather than as the floating capsule. If you want the floating capsule exactly, the next step is a `UITabBarController` shell — say so.

## Siri, Shortcuts and the Action button (Phase 20)
`ios-native/BrainPalIntents.swift` (App Intents, iOS 16+) gives three zero-setup Siri phrases: *"I'm anxious in Wobbi"* (opens SOS), *"Breathe with Wobbi"*, *"Log my mood in Wobbi"*. Each intent opens our own `brainpal://sos|breathe|checkin|journal` link, handled by `parseRouteLink` in `nativeInit.ts`. The same links work in the Shortcuts app ("Open URL") and can be bound to the **Action button** (Settings → Action Button → Shortcut). The links and the JS side are unit/e2e tested; the Swift is compiled only by the macOS CI job and **not verified on a device** (check: say the phrase, it should open SOS).

**Not built yet:** an **Apple Watch** app (mood tap, haptic breathing).

## Widgets, Live Activity and Controls (Phase 24)
A WidgetKit extension (`WobbiWidgets`, iOS 17+, bundle id `com.brainpal.app.widgets`) is embedded in the app. Sources: `ios-native/Widgets/` (copied to `ios/App/WobbiWidgets/` by `ios-patch.py`, which also adds the target to the Xcode project); `ios-native/WobbiShared.swift` is compiled into both the app and the extension.

- **How data flows:** the app builds one small JSON snapshot (`src/lib/widgetData.ts`: streak, the week's moods + sleep, today's anchors, parked-worry count, the day's journal prompt, coins, Focus-guard counts, one line from Wobbi) and saves it in the App Group `group.com.brainpal.app` (`Mindful.widgetUpdate`). Widgets only read it. No entry text, no network.
- **Interactive widgets** (mood faces, anchor ticks) can't run our JS: they update the snapshot straight away and queue an action; the app applies the queue the next time it becomes active (`widgetTake` → `planActions`). Anchor ticks only count for the day they were made.
- **Home screen:** Streak buddy, Breathe, SOS, Worry jar, Focus guard (small + large board), Journal prompt, Sleep, Wobbi says, Mood check-in (interactive), Daily anchors (interactive), Mood week, Calm kit, Today (large), Night stand (StandBy clock). **Lock screen:** streak ring, breathe, mood faces (interactive), worries inline. **Live Activity:** breathing and the focus timer count down on the lock screen and in the Dynamic Island. A pomodoro hands over the phases that start by themselves (`next`), so the activity moves from the block to the break while the app sleeps (iOS redraws it at the stale date = end of the block); colour and Wobbi's pose follow the phase. Notifications are scheduled for every phase change. **Controls (iOS 18):** SOS, Breathe, Park a worry, Focus guard — for Control Center, the lock screen and the Action button.
- **Focus guard widgets show what the app itself records** (apps paused, challenges, reps, minutes earned). They never show per-app screen time: we don't read what you use.
- Widget images are PNGs made from the same Wobbi/emoji drawings: `npm run widget:assets` after changing `lib/pal.ts` or adding emoji.
- **Signing:** the app and the extension both use the App Group, so a free Personal Team can't sign them (it doesn't support App Groups). With the paid team, `xcodebuild -allowProvisioningUpdates` registers the group and the extension's App ID automatically. TestFlight (`fastlane ios beta`) signs automatically too, but the App Group + the widget App ID must exist in the developer account (they do once a device build has run).
- **Verified:** compiles (simulator + signed device build), installs on an iPhone 15, the app writes a real snapshot into the shared container (read back from the device). **Not verified by me:** how each widget looks on the home screen, tapping the interactive buttons, the Live Activity and the iOS 18 controls on a device — add them from the home-screen editor and check.

## Rating prompt and offer codes
`Mindful.requestReview` shows the system rating prompt (`SKStoreReviewController`); JS asks only after a celebration, ≥7 days after first launch, ≥120 days apart, max 3 times (`lib/review.ts`). `Mindful.proRedeemCode` opens Apple's "Redeem code" sheet from the paywall's "Have a code?" link; create the codes in App Store Connect → the subscription → Offer Codes. Both are mocked in e2e, **not verified on a device**.
