import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

/** True inside the iPhone/iPad app (Capacitor shell); false in browsers and the installed PWA. */
export const isNative = (): boolean => Capacitor.isNativePlatform()
export const isIOSApp = (): boolean => Capacitor.getPlatform() === 'ios'

/** Our own Swift plugin (ios-native/MindfulPlugin.swift). */
export interface MindfulPlugin {
  isAvailable(): Promise<{ available: boolean }>
  requestAuthorization(): Promise<{ granted: boolean }>
  authorizationStatus(): Promise<{ status: 'authorized' | 'denied' | 'notDetermined' | 'unavailable' }>
  /** start/end are ms since epoch. */
  saveSession(opts: { start: number; end: number }): Promise<void>
  /** Prevents the screen auto-locking (so breathing sessions aren't interrupted). */
  keepAwake(opts: { enabled: boolean }): Promise<void>
  /** Asks Health for permission to READ sleep (the only thing we read). `granted` only means the sheet was handled — iOS never reveals read access. */
  requestSleepAuthorization(): Promise<{ granted: boolean }>
  /** Sleep segments between two times (ms since 1970); kind is inBed | asleep | core | deep | rem | awake. */
  readSleep(opts: { from: number; to: number }): Promise<{ segments: { start: number; end: number; kind: string }[] }>
  /** System web-auth sheet (ASWebAuthenticationSession): opens `url`, resolves with the brainpal://… URL it is redirected to. Rejects with code CANCELLED if dismissed. */
  webAuth(opts: { url: string; callbackScheme: string }): Promise<{ url: string }>
  /** Native "Sign in with Apple" sheet. `nonce` is the raw nonce (its SHA-256 was sent to Apple). Rejects with code CANCELLED if dismissed. */
  appleSignIn(): Promise<{ idToken: string; nonce: string; email?: string; givenName?: string; familyName?: string }>
  /** Shows the real UIKit tab bar (Liquid Glass on iOS 26) over the web view. `height` is how many points it covers. */
  setTabs(opts: { items: { id: string; label: string; symbol: string }[]; selected: string }): Promise<{ native: boolean; height: number }>
  /** Moves the native highlight (does not fire tabSelected). */
  selectTab(opts: { id: string }): Promise<void>
  /** Hide / show the native tab bar (hidden while sheets and full-screen flows are open). */
  setTabsHidden(opts: { hidden: boolean }): Promise<void>
  /** Focus guard (iOS Screen Time). `available` is false before iOS 16; calls fail softly without the Family Controls entitlement. */
  screenTimeStatus(): Promise<{ available: boolean; authorized: boolean; appCount: number; unlockedUntil?: number }>
  screenTimeRequestAuth(): Promise<{ authorized: boolean; error?: string }>
  /** Opens the system app picker; resolves with how many apps/categories/sites were chosen. */
  screenTimePickApps(): Promise<{ count: number }>
  screenTimeLock(): Promise<{ locked: boolean }>
  /** Removes the shields for `minutes`; `until` is ms since 1970. */
  screenTimeUnlock(opts: { minutes: number }): Promise<{ until: number }>
  screenTimeClear(): Promise<void>
  /** Brain Pal Pro (StoreKit 2). `until` is ms since 1970. */
  proProducts(): Promise<{ products: { id: string; price: string; trialDays?: number }[]; error?: string }>
  proPurchase(): Promise<{ status: 'purchased' | 'pending' | 'cancelled' | 'unverified' | 'unavailable' | 'failed' | 'unknown'; active?: boolean; until?: number; error?: string }>
  proRestore(): Promise<{ active: boolean; until?: number }>
  proStatus(): Promise<{ active: boolean; until?: number }>
  proRedeemCode(): Promise<{ shown: boolean }>
  requestReview(): Promise<void>
  /** Fired when a native tab is tapped. */
  addListener(eventName: 'tabSelected', cb: (e: { id: string }) => void): Promise<PluginListenerHandle>
}
export const Mindful = registerPlugin<MindfulPlugin>('Mindful')
