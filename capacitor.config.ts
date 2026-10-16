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
  },
}
export default config
