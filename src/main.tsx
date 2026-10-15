import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import '@fontsource-variable/nunito'
import './styles.css'
import { isNative } from './lib/native'
import { initNative } from './lib/nativeInit'


// The app's web view can't register a service worker (and bundles its files anyway).
if (isNative()) void initNative(); else registerSW({ immediate: true })
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
