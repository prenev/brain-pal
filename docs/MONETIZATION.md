# Monetisation: Brain Pal Pro (monthly subscription, Apple devices)

**Decision:** one optional auto-renewing **monthly subscription** through Apple In-App Purchase (StoreKit 2), with a 7-day free trial. The app stays genuinely useful for free, works fully **offline with no account**, and the things that keep people safe or are their own data are **never** behind the paywall.

> Competitor figures below are from general knowledge of the category, **not freshly verified**: prices and feature splits change often. Check the App Store pages before you finalise your own price.

## How the category monetises (and the lesson for us)
| App (type) | Typical model | What sits behind the paywall | Lesson |
|---|---|---|---|
| Daylio (mood/diary) | Free + "Premium" subscription or one-off | extra stats, backups, themes/icons, unlimited customisation | Free tier is the whole logging loop; money comes from backup, depth and polish |
| Finch (self-care pet) | Free + monthly/annual Plus | more activities, cosmetics, insights | The mascot/reward loop sells itself: people pay to support a character they love |
| Flourish, HolistiQ (guided wellbeing) | Free trial → subscription | guided programs / content library | Content libraries justify subscriptions; we are tool-first, so we sell tools + sync |
| Rootd (anxiety/panic) | Free core tools + Pro | full lessons, more tools | Panic tools stay free (trust), depth is paid |
| Bearable, How We Feel (tracking) | Free + optional paid | exports/insights or donation | Users resent paywalled *data*; keep export free |
| Umbrella Journal | Free + premium | prompts/analytics | Writing stays free; analysis is paid |
Common pattern: **core free, depth/sync/polish paid, annual cheaper than monthly, 3–7 day trial, restore button, no dark patterns.** You asked for monthly: it is built; add an annual plan later (it converts better and lowers churn).

## What is Pro, what is free (and why)
| Free forever | Pro |
|---|---|
| SOS siren, breathing, grounding, crisis support (**safety is never sold**) | Sync across devices (account) |
| Mood check-ins, thought records, journal, worry time, calendar | Focus guard (Screen Time) |
| Reminders, coins/themes, Today summary, 3 daily anchors, skill levels | Sleep insights (Apple Watch) |
| Export or delete your data (**your data is never held hostage**) | Weekly + monthly summaries, proof of progress, 4th and 5th anchor |
Rationale: Pro features are the ones with real running cost (sync/servers), real novelty (Focus guard), or "power-user depth" (insights). A free user still gets a complete, kind app; a paying user gets more *depth*, not the right to feel safe.

## Price and trial
- **US$4.99 / month**, **7-day free trial** (set in App Store Connect; the app reads price and trial from the store, it never hard-codes them). Sensible range for the category: $3.99–$6.99/month. Consider an annual plan at ~$29.99 (≈50% off) as the next step.
- Apple takes 30% (15% in year two of a subscriber's life, and 15% for everyone under the **App Store Small Business Program**: apply for it, it needs revenue under US$1M/yr).

## Paywall principles (so it is honest and App-Review-safe)
1. Shown only when someone taps something locked, or More → Brain Pal Pro. Never at launch, never during SOS, never mid-crisis.
2. States price, billing period, trial, auto-renew terms and how to cancel (Apple guideline 3.1.2), with Terms, Privacy and Apple's EULA links, and a working **Restore purchases**.
3. Says plainly what stays free. No fake urgency, no countdowns, no guilt copy.
4. Locked features show a preview card (what it is), not a blank screen.

## What is built (all in this repo)
- `src/lib/pro.ts` (pure, tested): the feature list, `ALWAYS_FREE`, entitlement parsing, 3-day offline grace, price/disclosure copy.
- `src/lib/proStore.ts`: cached entitlement + StoreKit calls; **the App Store is the authority** (an ended subscription locks again on the next check; an unreachable store never locks you out early).
- `ios-native/MindfulPlugin.swift`: StoreKit 2 (`proProducts`, `proPurchase`, `proRestore`, `proStatus`, plus `Transaction.updates`). Only **verified** transactions count (`test-ios` fails if `.unverified` appears).
- `src/components/Pro.tsx`: `ProGate`, the paywall, `PaywallProvider`. Gates: Focus guard, Sleep, week/month Summary, Progress proof, 4th anchor, Sync sign-in.
- `ios-native/BrainPal.storekit`: local StoreKit test config (Xcode: Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration) so you can test purchases without the store.
- Offline first: no sign-in screen at launch; the account is an optional Pro step; first sign-in auto-moves on-device data into the account.

## Not built / honest limits
- **No server-side receipt validation.** The device trusts StoreKit's verified local entitlement (standard for indie apps). Someone with a jailbroken phone could bypass it; that is acceptable at this scale. Add App Store Server Notifications + a webhook if you ever need cross-device entitlement or refund handling.
- The web/PWA build has **no purchases** (Apple rules: digital goods on iOS use IAP). It shows "Pro is part of the iPhone app".
- A lapsed subscriber who is already signed in keeps their session (data is never held hostage); new sign-ins need Pro.
- Real StoreKit purchase, restore and renewal have **not** been run on a device (CI compiles the Swift; the JS side is tested with the simulated bridge).

## Owner steps (App Store Connect), in order
1. **Business**: accept the *Paid Apps Agreement*, add bank + tax info (without this, subscriptions can't go live).
2. **Monetization → Subscriptions**: create a group **"Brain Pal Pro"**; add **Brain Pal Pro (monthly)**, product ID **`com.brainpal.app.pro.monthly`**, duration 1 month, price $4.99 (pick your storefront prices), **Introductory offer: free, 1 week**; fill localisation (display name + description), add a review screenshot of the paywall.
3. Add the subscription to the version you submit ("In-App Purchases and Subscriptions" section) so review tests it.
4. **Sandbox testers**: Users and Access → Sandbox → create one; sign into it on the iPhone (Settings → App Store → Sandbox Account); test buy, cancel, restore, expiry (sandbox months last ~5 minutes).
5. Apply for the **Small Business Program** (15% fee).
6. Review notes already explain how to reach the paywall and that safety features are free (`scripts/store-metadata.mjs`).

## Ideas, in order of expected value
1. Annual plan + "save 50%" (best conversion, lower churn). 2. A gentle one-time Pro mention after the first level-up or 7-day streak (still tap-to-open, never a popup wall). 3. Offer codes for friends/press. 4. Family Sharing. 5. Win-back offer for lapsed subscribers. 6. Bundles with content packs (guided programs) if you decide to add content.
