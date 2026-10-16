# Focus guard (anti brain-rot) — how it works and what you must do

**What it is:** in the iPhone app, *More → Focus guard*. You pick the apps that eat your time (with Apple's own picker). They stay paused (iOS shows its "Screen Time" shield) until you earn a few minutes in Brain Pal with a quick activity: push-ups, squats, plank, a walk, a minute of slow breathing, or one honest journal line. You choose which activities count and how long you earn (5/10/15/30 min). Switch it off any time: it never traps you.

**Built and tested here (web + simulated bridge):** the pure rules (`src/lib/guard.ts`, `scripts/test-guard.mjs`), the setup / status / challenge screens (`src/components/Guard.tsx`), the honour-system rep counter (taps faster than ~1/second don't count), persistence, practice mode on the web, and the full flow against the simulated iOS bridge (3 e2e tests).

**Written but NOT verified on a device (Swift compiles on macOS CI, nothing more):** `ScreenTimeGuard` in `ios-native/MindfulPlugin.swift` — `FamilyControls` authorization, the `FamilyActivityPicker`, and `ManagedSettingsStore` shields. We never read what you use: iOS hands us anonymous tokens (`test-ios` fails if usage-reading APIs appear).

## What you must do
1. **Entitlement.** Screen Time APIs need the **Family Controls** capability.
   - *Development builds* (Xcode on your own iPhone): `npm run ios:sync && npm run ios:screentime` (adds the entitlement; re-run after every sync). In Xcode → Signing & Capabilities you should see **Family Controls**.
   - *App Store / TestFlight:* Apple must approve the **Family Controls (Distribution)** entitlement first. Request it at <https://developer.apple.com/contact/request/family-controls-distribution> (describe: "a self-help app where the user chooses apps to pause until they complete an activity"). Approval can take days to weeks. **Until then, ship without `ios:screentime`**: the guard then says "Not available in this build" and nothing else changes. Don't put the entitlement in a build you upload before approval; it fails signing.
2. Test on a real iPhone (iOS 16+): allow → choose apps → switch on → open a chosen app (you should see the shield) → earn time → app opens → after the time, lock again.

## Known limits (be honest with yourself and with users)
- **Re-locking while Brain Pal is closed.** Unlock removes the shield; re-lock happens when Brain Pal next comes to the front (and via "Lock again now"). For automatic re-lock you need a small **DeviceActivity Monitor extension** (a second Xcode target + an App Group to share the selection). Not included in v1: it can't be wired or tested without a Mac. Sketch: schedule `DeviceActivityCenter.startMonitoring` for the unlock window and, in `intervalDidEnd`, re-apply the shield from the shared selection.
- **The shield screen** is iOS's default. Customising its text/button ("Open Brain Pal") needs Shield Configuration/Action extensions (same story).
- Reps are honour-system by design; we can't verify push-ups. We say so in the app.
- iOS lets people turn off Screen Time restrictions in Settings. This is a nudge you set up for yourself, not parental control.
- iPhone only. The web/PWA can't block anything (practice mode only).

## App Store notes
Add to the review notes when the entitlement is approved: *"Focus guard (More → Focus guard) uses Screen Time (Family Controls, individual authorization) so the user can pause apps they choose until they finish a quick activity. We never see which apps were chosen."* The privacy policy already describes it. Keep the Focus guard out of the store description until you've verified it on a device.
