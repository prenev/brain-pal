// Shared by e2e.mjs and screens.mjs: serialised into the page with addInitScript, so it must stay self-contained.
export /** Injected before the app loads to impersonate Capacitor's iOS bridge; records every native call in window.__native. */
function nativeStub() {
  window.__native = []
  window.__listeners = []
  window.__fire = (plugin, event, data) => window.__listeners.filter(l => l.plugin === plugin && l.event === event).forEach(l => l.callback(data))   // tests simulate native events (e.g. a tapped notification)
  const reply = {
    'Mindful.isAvailable': { available: true }, 'Mindful.requestAuthorization': { granted: true }, 'Mindful.authorizationStatus': { status: 'authorized' },
    'LocalNotifications.checkPermissions': { display: 'prompt' }, 'LocalNotifications.requestPermissions': { display: 'granted' }, 'LocalNotifications.schedule': { notifications: [] },
  }
  const methods = {
    Haptics: ['impact', 'notification', 'vibrate', 'selectionStart', 'selectionChanged', 'selectionEnd'],
    Mindful: ['isAvailable', 'requestAuthorization', 'authorizationStatus', 'saveSession', 'keepAwake', 'webAuth', 'appleSignIn'],
    LocalNotifications: ['checkPermissions', 'requestPermissions', 'schedule', 'cancel', 'getPending', 'addListener', 'removeListener'],
    StatusBar: ['setStyle', 'setBackgroundColor', 'show', 'hide', 'setOverlaysWebView'],
    SplashScreen: ['hide', 'show'],
  }
  window.webkit = { messageHandlers: { bridge: { postMessage() {} } } }   // makes @capacitor/core report platform "ios"
  window.Capacitor = {
    PluginHeaders: [...Object.entries(methods).map(([name, ms]) => ({ name, methods: ms.map(n => ({ name: n, rtype: n === 'addListener' ? 'callback' : 'promise' })) })),
      { name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }] }],
    nativePromise: async (plugin, method, options) => {
      window.__native.push({ plugin, method, options, at: Date.now() })
      const r = (window.__reply ?? {})[`${plugin}.${method}`] ?? reply[`${plugin}.${method}`] ?? {}   // tests may preset window.__reply
      if (r && r.__reject) { const e = new Error(r.message ?? 'rejected'); e.code = r.__reject; throw e }
      return r
    },
    nativeCallback: (plugin, method, options, callback) => {
      window.__native.push({ plugin, method, options, listener: true })
      if (typeof callback === 'function') window.__listeners.push({ plugin, event: options && options.eventName, callback })
      return 'cb'
    },
  }
}
