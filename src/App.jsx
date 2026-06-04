import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Onboarding from '@/components/onboarding/Onboarding'
import Login from '@/pages/Login'
import Landing from '@/pages/Landing'
import AppLayout from '@/components/layout/AppLayout'

/* ── Lazy page chunks ───────────────────────────────────────────────── */
const Dashboard    = lazy(() => import('@/pages/Dashboard'))
const Cases        = lazy(() => import('@/pages/Cases'))
const Clients      = lazy(() => import('@/pages/Clients'))
const ClientDetail = lazy(() => import('@/pages/ClientDetail'))
const CaseDetail   = lazy(() => import('@/pages/CaseDetail'))
const Proposals    = lazy(() => import('@/pages/Proposals'))
const Tasks        = lazy(() => import('@/pages/Tasks'))
const Financials   = lazy(() => import('@/pages/Financials'))
const Settings     = lazy(() => import('@/pages/Settings'))
const Notes        = lazy(() => import('@/pages/Notes'))
const Interns      = lazy(() => import('@/pages/Interns'))
const Vitrine      = lazy(() => import('@/pages/Vitrine'))
const Metrics      = lazy(() => import('@/pages/Metrics'))
const DevSeed      = import.meta.env.DEV ? lazy(() => import('@/pages/DevSeed')) : null

/* ── Admin chunks ───────────────────────────────────────────────────── */
const AdminLayout        = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard     = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminUsers         = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminFeedback      = lazy(() => import('@/pages/admin/AdminFeedback'))
const AdminTickets       = lazy(() => import('@/pages/admin/AdminTickets'))
const AdminTeamInvites   = lazy(() => import('@/pages/admin/AdminTeamInvites'))

/* ── Auth guard ─────────────────────────────────────────────────────── */
function PrivateRoute({ children }) {
  const { session, lawyer, loading, isTeamMember } = useAuth()

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
          border: '3px solid rgba(var(--accent-rgb),0.15)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  if (!session) return <Navigate to="/" replace />

  // Team members bypass onboarding — they access the firm's data directly
  if (isTeamMember) return lawyer ? children : null

  if (!lawyer || !lawyer.onboarding_completed) {
    return <Onboarding />
  }

  return children
}

/* ── Role guard — blocks pages by teamRole ──────────────────────────── */
function RoleRoute({ children, allow }) {
  const { teamRole } = useAuth()
  if (!allow.includes(teamRole)) return <Navigate to="/painel" replace />
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
        <Route path="suporte"     element={<AdminTickets />} />
        <Route path="equipe"      element={<AdminTeamInvites />} />
      </Route>

      {/* ── Landing (public) ── */}
      <Route path="/" element={<Landing />} />

      {/* ── Main app ── */}
      <Route
        path="/painel"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index                        element={<Dashboard />} />
        <Route path="casos"                 element={<Cases />} />
        <Route path="casos/:id"             element={<CaseDetail />} />
        <Route path="clientes"     element={<Clients />} />
        <Route path="clientes/:id" element={<ClientDetail />} />
        <Route path="propostas"    element={<Proposals />} />
        <Route path="tarefas"      element={<Tasks />} />
        <Route path="financeiro"   element={<RoleRoute allow={['advogado']}><Financials /></RoleRoute>} />
        <Route path="configuracoes"         element={<RoleRoute allow={['advogado']}><Settings /></RoleRoute>} />
        <Route path="notas"                 element={<Notes />} />
        <Route path="estagiarios"           element={<Interns />} />
        <Route path="vitrine"               element={<Vitrine />} />
        <Route path="metricas"              element={<Metrics />} />
        {import.meta.env.DEV && DevSeed && <Route path="dev/seed" element={<DevSeed />} />}
      </Route>
    </Routes>
  )
}
