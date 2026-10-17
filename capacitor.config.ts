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
    // like any iPhone app: the keyboard slides up over the app (nothing shrinks, so nothing black shows); iOS scrolls the field into view
    Keyboard: { resize: 'none', resizeOnFullScreen: false },
  },
}
export default config
