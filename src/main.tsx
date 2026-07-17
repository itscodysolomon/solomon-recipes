import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import './index.css'

async function bootstrap() {
  // Magic-link redirects land with auth tokens in the URL hash. HashRouter
  // rewrites the hash on first render, so let Supabase consume the tokens
  // and establish the session before the router mounts.
  if (supabase && /access_token|refresh_token|error_description/.test(window.location.hash)) {
    await supabase.auth.getSession()
    if (/access_token|refresh_token|error_description/.test(window.location.hash)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </StrictMode>,
  )
}

void bootstrap()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {
      // Ignore registration failures in local/dev contexts.
    })
  })
}
