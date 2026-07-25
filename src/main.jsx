import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { applyTheme, loadTheme } from './config/theme.js'
import { RELEASE_ID } from './utils/release.js'
import { DataProvider } from './context/DataContext.jsx'
import { normalizeUrlForCleanRouting } from './utils/supabase.js'

// Clean URLs replaced the old HashRouter. This converts any legacy
// "…/#/route" link or raw Supabase recovery fragment into a clean path
// before the router boots, so old bookmarks and password-reset emails
// keep working.
normalizeUrlForCleanRouting()

applyTheme(loadTheme())
document.documentElement.dataset.apexRelease = RELEASE_ID

// import.meta.env.BASE_URL comes from vite.config.js ('base'). On GitHub
// Pages the build sets it to "/<repo-name>/" via VITE_BASE_PATH so clean
// URLs resolve correctly from the project-site subfolder.
const routerBasename = import.meta.env.BASE_URL

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?release=${RELEASE_ID}`)
      await registration.update()

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
    } catch {
      // Offline mode is best-effort; ignore registration/update failures.
    }
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const key = `apex-reloaded-${RELEASE_ID}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={routerBasename}>
        <DataProvider>
          <App />
        </DataProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
