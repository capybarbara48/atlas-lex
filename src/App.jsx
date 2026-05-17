import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Onboarding from '@/components/onboarding/Onboarding'
import Login from '@/pages/Login'
import AppLayout from '@/components/layout/AppLayout'

/* ── Lazy page chunks ───────────────────────────────────────────────── */
const Dashboard    = lazy(() => import('@/pages/Dashboard'))
const Cases        = lazy(() => import('@/pages/Cases'))
const Clients      = lazy(() => import('@/pages/Clients'))
const ClientDetail = lazy(() => import('@/pages/ClientDetail'))
const Proposals    = lazy(() => import('@/pages/Proposals'))
const Tasks        = lazy(() => import('@/pages/Tasks'))
const Financials   = lazy(() => import('@/pages/Financials'))
const Settings     = lazy(() => import('@/pages/Settings'))
const Notes        = lazy(() => import('@/pages/Notes'))
const Interns      = lazy(() => import('@/pages/Interns'))
const Vitrine      = lazy(() => import('@/pages/Vitrine'))
const DevSeed      = lazy(() => import('@/pages/DevSeed'))

/* ── Admin chunks ───────────────────────────────────────────────────── */
const AdminLayout   = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminUsers    = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminFeedback = lazy(() => import('@/pages/admin/AdminFeedback'))

/* ── Auth guard ─────────────────────────────────────────────────────── */
function PrivateRoute({ children }) {
  const { session, lawyer, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        fontFamily: 'inherit',
        color: 'var(--text-2)',
        background: 'var(--bg)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(4,59,97,0.15)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (!lawyer || !lawyer.onboarding_completed) {
    return <Onboarding />
  }

  return children
}

/* ── Admin guard ────────────────────────────────────────────────────── */
function AdminRoute({ children }) {
  const { session, lawyer, loading, isAdmin } = useAuth()
  if (loading) return null
  if (!session || !lawyer) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

/* ── Routes ─────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* ── Admin panel ── */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index              element={<AdminDashboard />} />
        <Route path="usuarios"    element={<AdminUsers />} />
        <Route path="feedback"    element={<AdminFeedback />} />
      </Route>

      {/* ── Main app ── */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index                element={<Dashboard />} />
        <Route path="casos"         element={<Cases />} />
        <Route path="clientes"      element={<Clients />} />
        <Route path="clientes/:id"  element={<ClientDetail />} />
        <Route path="propostas"     element={<Proposals />} />
        <Route path="tarefas"       element={<Tasks />} />
        <Route path="financeiro"    element={<Financials />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="notas"         element={<Notes />} />
        <Route path="estagiarios"   element={<Interns />} />
        <Route path="vitrine"       element={<Vitrine />} />
        <Route path="dev/seed"      element={<DevSeed />} />
      </Route>
    </Routes>
  )
}
