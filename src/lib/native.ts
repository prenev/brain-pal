import { Capacitor, registerPlugin } from '@capacitor/core'

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
  /** System web-auth sheet (ASWebAuthenticationSession): opens `url`, resolves with the brainpal://… URL it is redirected to. Rejects with code CANCELLED if dismissed. */
  webAuth(opts: { url: string; callbackScheme: string }): Promise<{ url: string }>
  /** Native "Sign in with Apple" sheet. `nonce` is the raw nonce (its SHA-256 was sent to Apple). Rejects with code CANCELLED if dismissed. */
  appleSignIn(): Promise<{ idToken: string; nonce: string; email?: string; givenName?: string; familyName?: string }>
}
export const Mindful = registerPlugin<MindfulPlugin>('Mindful')
