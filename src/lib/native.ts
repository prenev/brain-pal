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
}
export const Mindful = registerPlugin<MindfulPlugin>('Mindful')
