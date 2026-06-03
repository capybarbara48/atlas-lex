import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Suspense } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import styles from './AdminLayout.module.css'

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid rgba(var(--accent-rgb),0.12)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.75s linear infinite',
      }} />
    </div>
  )
}

export default function AdminLayout() {
  const { lawyer, session } = useAuth()
  const navigate = useNavigate()

  const name = lawyer?.full_name?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? '—'

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>A</div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>Atlas Adv</span>
              <span className={styles.brandSub}>Admin</span>
            </div>
          </div>

          <nav className={styles.nav}>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/usuarios"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}
            >
              Usuários
            </NavLink>
            <NavLink
              to="/admin/feedback"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}
            >
              Feedback
            </NavLink>
            <NavLink
              to="/admin/suporte"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}
            >
              Suporte
            </NavLink>
            <NavLink
              to="/admin/equipe"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}
            >
              Equipe
            </NavLink>
          </nav>
        </div>

        <div className={styles.topbarRight}>
          <button className={styles.backBtn} onClick={() => navigate('/painel')}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd"/>
            </svg>
            Voltar ao app
          </button>
          <div className={styles.userChip}>
            <div className={styles.userDot} />
            {name}
          </div>
          <button className={styles.signOut} onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </div>
      </header>

      <main className={styles.content}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
