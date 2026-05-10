import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Onboarding from '@/components/onboarding/Onboarding'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Cases from '@/pages/Cases'
import Clients from '@/pages/Clients'
import Proposals from '@/pages/Proposals'
import Tasks from '@/pages/Tasks'
import Financials from '@/pages/Financials'
import Settings from '@/pages/Settings'
import Vitrine from '@/pages/Vitrine'
import DevSeed from '@/pages/DevSeed'
import AppLayout from '@/components/layout/AppLayout'

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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  // Lawyer row loaded but onboarding not completed → show wizard
  if (lawyer && !lawyer.onboarding_completed) {
    return <Onboarding />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        <Route path="propostas"     element={<Proposals />} />
        <Route path="tarefas"       element={<Tasks />} />
        <Route path="financeiro"    element={<Financials />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="vitrine"       element={<Vitrine />} />
        <Route path="dev/seed"      element={<DevSeed />} />
      </Route>
    </Routes>
  )
}
