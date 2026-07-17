import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

export function AuthPage() {
  const { loading, session, localMode, signInWithPassword, enterLocalMode } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-main pad stack">
          <p className="muted">Loading…</p>
        </div>
      </div>
    )
  }

  if (session || localMode) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithPassword(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="app-main pad stack" style={{ paddingTop: 48 }}>
        <h1 className="page-title">
          The Solomons <em style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>Cook</em>
        </h1>
        <p className="muted">Sign in to your shared cookbook.</p>

        {!isSupabaseConfigured ? (
          <div className="note-card">
            <div className="label">Local mode</div>
            <p>
              Supabase keys aren&apos;t configured yet. You can still try the full app on this device —
              data stays in local storage until you connect Supabase.
            </p>
            <button type="button" className="btn primary" style={{ marginTop: 12, width: '100%' }} onClick={enterLocalMode}>
              Continue locally
            </button>
          </div>
        ) : (
          <form className="stack" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
