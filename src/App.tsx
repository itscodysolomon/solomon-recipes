import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout, FlushLayout } from './components/Layout'
import { useAuth } from './hooks/useAuth'
import { AddRecipePage } from './pages/AddRecipePage'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { ListPage } from './pages/ListPage'
import { PlanPage } from './pages/PlanPage'
import { RecipePage } from './pages/RecipePage'

function RequireAuth() {
  const { loading, session, localMode } = useAuth()
  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-main pad">
          <p className="muted">Loading…</p>
        </div>
      </div>
    )
  }
  if (!session && !localMode) return <Navigate to="/auth" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<FlushLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/recipes/:id" element={<RecipePage />} />
          <Route path="/add" element={<AddRecipePage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/list" element={<ListPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
