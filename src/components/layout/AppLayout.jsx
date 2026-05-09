import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import styles from './AppLayout.module.css'

/* ── Nav config ────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    to: '/', label: 'Painel', end: true,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm10 0a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V4ZM2 14a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4Zm10 0a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4Z"/>
      </svg>
    ),
  },
  {
    to: '/casos', label: 'Casos', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6Zm1.5 1.5a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5ZM7 9a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 7 9Zm.75 2.25a.75.75 0 0 0 0 1.5H10a.75.75 0 0 0 0-1.5H7.75Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/clientes', label: 'Clientes', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 17a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.575c.105.346-.151.658-.537.658h-3.69Z"/>
      </svg>
    ),
  },
  {
    to: '/propostas', label: 'Propostas', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm2 6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H7Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/tarefas', label: 'Tarefas', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/financeiro', label: 'Financeiro', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM1.75 14.5a.75.75 0 0 0 0 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 0 0-1.5 0v.784a.272.272 0 0 1-.35.26A49.43 49.43 0 0 0 1.75 14.5Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/vitrine', label: 'Vitrine', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909-.47-.47a.75.75 0 0 0-1.06 0L6.53 11.06l-4.03-4.03v4.03Zm13-7.56H3.25a.75.75 0 0 0-.75.75v1.69l3.72-3.72a.75.75 0 0 1 1.06 0l2.69 2.69 1.91-1.909a.75.75 0 0 1 1.06 0L15.5 5.81V3.5h1.25a.75.75 0 0 0 .75-.75V5.25a.75.75 0 0 0-.75-.75ZM6.5 7.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    to: '/configuracoes', label: 'Configurações', end: false,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 0 1 1.262.125l1.669 1.667a1 1 0 0 1 .125 1.263l-.834 1.25c.245.444.443.919.587 1.416l1.472.294a1 1 0 0 1 .804.98v2.361a1 1 0 0 1-.804.98l-1.472.295a6.95 6.95 0 0 1-.587 1.416l.834 1.25a1 1 0 0 1-.125 1.262l-1.667 1.669a1 1 0 0 1-1.263.125l-1.25-.834a6.953 6.953 0 0 1-1.416.587l-.294 1.472a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.295-1.472a6.957 6.957 0 0 1-1.416-.587l-1.25.834a1 1 0 0 1-1.262-.125l-1.669-1.667a1 1 0 0 1-.125-1.263l.834-1.25a6.957 6.957 0 0 1-.587-1.416l-1.472-.294A1 1 0 0 1 1 11.18V8.82a1 1 0 0 1 .804-.98l1.472-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 0 1 .125-1.262L4.82 1.95a1 1 0 0 1 1.263-.125l1.25.834a6.957 6.957 0 0 1 1.416-.587L8.82 1Zm-1.09 8.196a2.75 2.75 0 1 1 5.5 0 2.75 2.75 0 0 1-5.5 0Z" clipRule="evenodd"/>
      </svg>
    ),
  },
]

/* ── Page title map ─────────────────────────────────────────────────── */
const PAGE_TITLES = {
  '/':               'Painel',
  '/casos':          'Casos',
  '/clientes':       'Clientes',
  '/propostas':      'Propostas',
  '/tarefas':        'Tarefas',
  '/financeiro':     'Financeiro',
  '/configuracoes':  'Configurações',
  '/vitrine':        'Vitrine',
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

/* ── Layout ─────────────────────────────────────────────────────────── */
export default function AppLayout() {
  const { lawyer, session } = useAuth()
  const location = useLocation()

  const initials = lawyer?.full_name
    ? lawyer.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AL'

  const firmName  = lawyer?.firm_name ?? 'Atlas Lex'
  const firmShort = firmName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Atlas Lex'

  return (
    <div className={styles.shell}>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>

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
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userRow}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {lawyer?.full_name?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? '—'}
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
            Sair
          </button>
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className={styles.contentArea}>

        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <span className={styles.pageTitle}>{pageTitle}</span>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.livePill}>
              <span className={styles.liveDot} />
              Online
            </div>
            <Clock />
          </div>
        </header>

        {/* Page content */}
        <main className={styles.main}>
          <Outlet />
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          <span>{firmName} © {new Date().getFullYear()}</span>
          <span>Atlas Lex v1.0</span>
        </footer>

      </div>
    </div>
  )
}
