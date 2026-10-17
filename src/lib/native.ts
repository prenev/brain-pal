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
  /** Wobbi Pro (StoreKit 2). `until` is ms since 1970. */
  proProducts(): Promise<{ products: { id: string; price: string; trialDays?: number }[]; error?: string }>
  proPurchase(): Promise<{ status: 'purchased' | 'pending' | 'cancelled' | 'unverified' | 'unavailable' | 'failed' | 'unknown'; active?: boolean; until?: number; error?: string }>
  proRestore(): Promise<{ active: boolean; until?: number }>
  proStatus(): Promise<{ active: boolean; until?: number }>
  proRedeemCode(): Promise<{ shown: boolean }>
  requestReview(): Promise<void>
  audioSession(opts: { mode: 'playback' | 'ambient' }): Promise<void>
  /** Widgets: stores the JSON snapshot (lib/widgetData.ts) in the shared App Group and asks iOS to redraw the widgets. */
  widgetUpdate(opts: { snapshot: string }): Promise<void>
  /** Widgets: returns and clears what interactive widgets / controls queued (JSON array of actions) and the screen one asked to open. */
  widgetTake(): Promise<{ actions: string; route?: string }>
  /** Live Activity (lock screen + Dynamic Island) for a breathing session or a focus timer. Times are ms since 1970. No-op before iOS 16.2. */
  liveActivityStart(opts: { kind: 'breathe' | 'focus'; title: string; subtitle: string; startsAt: number; endsAt: number }): Promise<{ started: boolean }>
  /** `remainingSec` set = paused (the clock stops at that value); otherwise counts down to `endsAt`. */
  liveActivityUpdate(opts: { title: string; subtitle: string; startsAt: number; endsAt: number; remainingSec?: number }): Promise<void>
  liveActivityEnd(): Promise<void>
  /** Live captions for the voice journal. `available` only when the phone can recognise speech ON the device (nothing is ever sent to Apple's servers). */
  speechAvailable(): Promise<{ available: boolean; onDevice: boolean }>
  /** Asks for speech permission if needed, then streams `speechResult` events until speechStop. */
  speechStart(opts: { locale?: string }): Promise<void>
  speechStop(): Promise<{ text: string }>
  /** Voice journal (native): one mic tap records an .m4a and, when the phone can do it offline, streams `speechResult` captions + `voiceLevel`. */
  voiceStart(opts: { locale?: string }): Promise<{ captions: boolean }>
  /** Stops and returns the recording (base64 m4a) plus its file path for native playback. */
  voiceStop(): Promise<{ path: string; durationSec: number; mime: string; base64: string; transcript: string }>
  /** Plays the file through the speaker; progress arrives as `voicePlayback` events. */
  voicePlay(opts: { path: string }): Promise<void>
  voicePause(): Promise<void>
  /** Stops playback and deletes the temporary file. */
  voiceDiscard(opts: { path?: string }): Promise<void>
  /** Writes a saved clip to a temporary file for native playback. */
  voiceLoad(opts: { base64: string; mime: string }): Promise<{ path: string }>
  voiceSeek(opts: { at: number }): Promise<void>
  /** Fired when a native tab is tapped. */
  addListener(eventName: 'tabSelected', cb: (e: { id: string }) => void): Promise<PluginListenerHandle>
  /** Live captions: the whole phrase heard so far (it grows and is replaced); isFinal closes the phrase. */
  addListener(eventName: 'speechResult', cb: (e: { text: string; isFinal: boolean }) => void): Promise<PluginListenerHandle>
  /** Voice journal: the whole transcript so far (settled words + the phrase being worked out), kept across recogniser restarts. */
  addListener(eventName: 'voiceTranscript', cb: (e: { final: string; interim: string }) => void): Promise<PluginListenerHandle>
  /** Microphone level while recording, or playback loudness while playing: 0–1, about 12 times a second. */
  addListener(eventName: 'voiceLevel', cb: (e: { level: number; path?: string }) => void): Promise<PluginListenerHandle>
  addListener(eventName: 'voicePlayback', cb: (e: { state: 'playing' | 'paused' | 'ended'; at: number; duration: number; path?: string }) => void): Promise<PluginListenerHandle>
}
export const Mindful = registerPlugin<MindfulPlugin>('Mindful')
