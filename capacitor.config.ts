import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.brainpal.app', // change to your own reverse-DNS id before shipping (must match your Apple developer team)
  appName: 'Wobbi',
  webDir: 'dist',
  backgroundColor: '#0e1726',
  ios: { contentInset: 'never', backgroundColor: '#0e1726' },
  plugins: {
    SplashScreen: { backgroundColor: '#0e1726', launchAutoHide: true, launchShowDuration: 0 },
    LocalNotifications: { iconColor: '#35d07f' },
    // the web view shrinks to the space above the keyboard, so sticky/fixed bars sit right on top of it
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
  },
}
export default config
