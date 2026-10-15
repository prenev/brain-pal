// Shared by e2e.mjs and screens.mjs: serialised into the page with addInitScript, so it must stay self-contained.
export /** Injected before the app loads to impersonate Capacitor's iOS bridge; records every native call in window.__native. */
function nativeStub() {
  window.__native = []
  const reply = {
    'Mindful.isAvailable': { available: true }, 'Mindful.requestAuthorization': { granted: true }, 'Mindful.authorizationStatus': { status: 'authorized' },
    'LocalNotifications.checkPermissions': { display: 'prompt' }, 'LocalNotifications.requestPermissions': { display: 'granted' }, 'LocalNotifications.schedule': { notifications: [] },
  }
  const methods = {
    Haptics: ['impact', 'notification', 'vibrate', 'selectionStart', 'selectionChanged', 'selectionEnd'],
    Mindful: ['isAvailable', 'requestAuthorization', 'authorizationStatus', 'saveSession', 'keepAwake'],
    LocalNotifications: ['checkPermissions', 'requestPermissions', 'schedule', 'cancel', 'getPending'],
    StatusBar: ['setStyle', 'setBackgroundColor', 'show', 'hide', 'setOverlaysWebView'],
    SplashScreen: ['hide', 'show'],
  }
  window.webkit = { messageHandlers: { bridge: { postMessage() {} } } }   // makes @capacitor/core report platform "ios"
  window.Capacitor = {
    PluginHeaders: [...Object.entries(methods).map(([name, ms]) => ({ name, methods: ms.map(n => ({ name: n, rtype: 'promise' })) })),
      { name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }] }],
    nativePromise: async (plugin, method, options) => { window.__native.push({ plugin, method, options, at: Date.now() }); return reply[`${plugin}.${method}`] ?? {} },
    nativeCallback: (plugin, method, options) => { window.__native.push({ plugin, method, options, listener: true }); return 'cb' },
  }
}
