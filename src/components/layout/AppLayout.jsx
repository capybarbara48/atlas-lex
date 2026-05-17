import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { useState, useEffect, Suspense } from 'react'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import FeedbackButton from '@/components/ui/FeedbackButton'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import styles from './AppLayout.module.css'

/* ── Nav config ────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    to: '/painel', label: 'Painel', end: true,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm10 0a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V4ZM2 14a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4Zm10 0a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4Z"/>
      </svg>
    ),
  },
  {
    to: '/painel/casos', label: 'Casos', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6Zm1.5 1.5a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5ZM7 9a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 7 9Zm.75 2.25a.75.75 0 0 0 0 1.5H10a.75.75 0 0 0 0-1.5H7.75Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/painel/clientes', label: 'Clientes', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.575c.105.346-.151.658-.537.658h-3.69Z"/>
      </svg>
    ),
  },
  {
    to: '/painel/propostas', label: 'Propostas', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm2 6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H7Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/painel/tarefas', label: 'Tarefas', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/painel/notas', label: 'Notas', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z"/>
      </svg>
    ),
  },
  {
    to: '/painel/financeiro', label: 'Financeiro', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM1.75 14.5a.75.75 0 0 0 0 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 0 0-1.5 0v.784a.272.272 0 0 1-.35.26A49.43 49.43 0 0 0 1.75 14.5Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/painel/estagiarios', label: 'Equipe', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z"/>
      </svg>
    ),
  },
  {
    to: '/painel/vitrine', label: 'Vitrine', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909-.47-.47a.75.75 0 0 0-1.06 0L6.53 11.06l-4.03-4.03v4.03Zm13-7.56H3.25a.75.75 0 0 0-.75.75v1.69l3.72-3.72a.75.75 0 0 1 1.06 0l2.69 2.69 1.91-1.909a.75.75 0 0 1 1.06 0L15.5 5.81V3.5h1.25a.75.75 0 0 0 .75-.75V5.25a.75.75 0 0 0-.75-.75ZM6.5 7.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/painel/configuracoes', label: 'Configurações', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 0 1 1.262.125l1.669 1.667a1 1 0 0 1 .125 1.263l-.834 1.25c.245.444.443.919.587 1.416l1.472.294a1 1 0 0 1 .804.98v2.361a1 1 0 0 1-.804.98l-1.472.295a6.95 6.95 0 0 1-.587 1.416l.834 1.25a1 1 0 0 1-.125 1.262l-1.667 1.669a1 1 0 0 1-1.263.125l-1.25-.834a6.953 6.953 0 0 1-1.416.587l-.294 1.472a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.295-1.472a6.957 6.957 0 0 1-1.416-.587l-1.25.834a1 1 0 0 1-1.262-.125l-1.669-1.667a1 1 0 0 1-.125-1.263l.834-1.25a6.957 6.957 0 0 1-.587-1.416l-1.472-.294A1 1 0 0 1 1 11.18V8.82a1 1 0 0 1 .804-.98l1.472-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 0 1 .125-1.262L4.82 1.95a1 1 0 0 1 1.263-.125l1.25.834a6.957 6.957 0 0 1 1.416-.587L8.82 1Zm-1.09 8.196a2.75 2.75 0 1 1 5.5 0 2.75 2.75 0 0 1-5.5 0Z" clipRule="evenodd"/>
      </svg>
    ),
  },
]

/* ── Page title map ─────────────────────────────────────────────────── */
const PAGE_TITLES = {
  '/painel':               'Painel',
  '/painel/casos':         'Casos',
  '/painel/clientes':      'Clientes',
  '/painel/propostas':     'Propostas',
  '/painel/tarefas':       'Tarefas',
  '/painel/notas':         'Notas',
  '/painel/financeiro':    'Financeiro',
  '/painel/configuracoes': 'Configurações',
  '/painel/estagiarios':   'Equipe',
  '/painel/vitrine':       'Vitrine',
}

/* ── Clock ──────────────────────────────────────────────────────────── */
function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })

  return (
    <div className={styles.clock}>
      <span className={styles.clockTime}>{time}</span>
      <span className={styles.clockDate}>{date}</span>
    </div>
  )
}

/* ── Page loader (Suspense fallback) ────────────────────────────────── */
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: '240px',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid rgba(var(--accent-rgb),0.12)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.75s linear infinite',
      }} />
    </div>
  )
}

/* ── Layout ─────────────────────────────────────────────────────────── */
export default function AppLayout() {
  const { lawyer, session, isAdmin, isBeta } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [overdueCount, setOverdueCount] = useState(0)

  useEffect(() => {
    const today = new Date().toISOString()
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("concluida","cancelada")')
      .lt('due_date', today)
      .then(({ count }) => setOverdueCount(count ?? 0))
  }, [location.pathname])

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const initials = lawyer?.full_name
    ? lawyer.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AL'

  const firmName  = lawyer?.firm_name ?? 'Atlas Lex'
  const firmShort = firmName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const pageTitle = PAGE_TITLES[location.pathname]
    ?? (location.pathname.startsWith('/painel/clientes/') ? 'Cliente'
      : location.pathname.startsWith('/painel/casos/') ? 'Processo'
      : 'Atlas Lex')


  return (
    <div className={styles.shell}>

      {/* ── Backdrop (mobile overlay) ── */}
      {sidebarOpen && (
        <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>

        {/* Brand */}
        <div className={styles.sidebarBrand}>
          {lawyer?.logo_url
            ? <img src={lawyer.logo_url} alt="logo" className={styles.logoImg} />
            : <div className={styles.logoMark}>{firmShort}</div>
          }
          <div className={styles.firmInfo}>
            <div className={styles.firmName}>{firmName}</div>
            {lawyer?.oab_number && (
              <div className={styles.firmSub}>OAB {lawyer.oab_number}</div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.sidebarNav}>
          <span className={styles.navSection}>Menu</span>
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{icon}</span>
              <span className={styles.navLabel}>{label}</span>
              {label === 'Tarefas' && overdueCount > 0 && (
                <span className={styles.navBadge}>{overdueCount > 99 ? '99+' : overdueCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className={styles.sidebarFooter}>
          {isAdmin && (
            <Link to="/admin" className={styles.adminLink}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                <path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 0 1 1.262.125l.962.962.707.707a1 1 0 0 1 .125 1.263l-.834 1.25c.245.444.443.919.587 1.416l1.472.294a1 1 0 0 1 .804.98v1.361a1 1 0 0 1-.804.98l-1.472.295a6.95 6.95 0 0 1-.587 1.416l.834 1.25a1 1 0 0 1-.125 1.262l-.707.707-.962.962a1 1 0 0 1-1.263.125l-1.25-.834a6.953 6.953 0 0 1-1.416.587l-.294 1.472a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.295-1.472a6.957 6.957 0 0 1-1.416-.587l-1.25.834a1 1 0 0 1-1.262-.125l-.962-.962-.707-.707a1 1 0 0 1-.125-1.263l.834-1.25a6.957 6.957 0 0 1-.587-1.416l-1.472-.294A1 1 0 0 1 1 10.68V9.32a1 1 0 0 1 .804-.98l1.472-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 0 1 .125-1.262l.707-.707.962-.962a1 1 0 0 1 1.263-.125l1.25.834a6.957 6.957 0 0 1 1.416-.587L8.34 1.804ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd"/>
              </svg>
              <span className={styles.adminLinkLabel}>Painel Admin</span>
            </Link>
          )}
          <div className={styles.userRow}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {lawyer?.full_name?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? '—'}
                {isBeta && <span className={styles.betaPill}>Beta</span>}
              </span>
              <span className={styles.userEmail}>{session?.user?.email}</span>
            </div>
          </div>
          <button
            className={styles.signOut}
            onClick={() => supabase.auth.signOut()}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Zm9.47 4.22a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 1 1-1.06-1.06l.97-.97H8a.75.75 0 0 1 0-1.5h5.44l-.97-.97a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/>
            </svg>
            <span className={styles.signOutLabel}>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className={styles.contentArea}>

        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.hamburger}
              onClick={() => setSidebarOpen(v => !v)}
              aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {sidebarOpen
                ? <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>
                : <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd"/></svg>
              }
            </button>
            <span className={styles.pageTitle}>{pageTitle}</span>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.livePill}>
              <span className={styles.liveDot} />
              <span className={styles.liveLabel}>Online</span>
            </div>
            <Clock />
          </div>
        </header>

        {/* Page content */}
        <main className={styles.main}>
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          <span>{firmName} © {new Date().getFullYear()}</span>
          <span>Atlas Lex v1.0</span>
        </footer>

      </div>

      {/* Floating feedback button */}
      <FeedbackButton />

    </div>
  )
}
