import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import App from './App.tsx'

/**
 * PWARegistrar — registers the service worker when running from a production
 * build or `vite preview`. Has no effect in dev (devOptions.enabled: false).
 * Returns null; mounts alongside <App /> with no visible UI.
 */
function PWARegistrar() {
  useRegisterSW({
    onRegistered(r) {
      if (import.meta.env.DEV) console.debug('SW registered:', r)
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
  })
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PWARegistrar />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
