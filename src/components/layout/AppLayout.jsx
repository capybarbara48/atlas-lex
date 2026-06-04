import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { useState, useEffect, useRef, Suspense } from 'react'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import FeedbackButton from '@/components/ui/FeedbackButton'
import SearchPalette from '@/components/ui/SearchPalette'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences } from '@/hooks/usePreferences'
import { supabase } from '@/lib/supabase'
import styles from './AppLayout.module.css'

/* ── Line icons (stroke, minimalist) ───────────────────────────────── */
const ICONS = {
  painel: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5"/>
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5"/>
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5"/>
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5"/>
    </svg>
  ),
  casos: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4a1 1 0 0 1 1-1h6l4 4v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4Z"/>
      <path d="M11 3v4h4"/>
      <path d="M7 9h6M7 12h6M7 15h4"/>
    </svg>
  ),
  clientes: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="6" r="2.5"/>
      <path d="M2 17c0-3.038 2.462-5.5 5.5-5.5S13 13.962 13 17"/>
      <path d="M14.5 5a2 2 0 1 1 0 4"/>
      <path d="M18 17c0-2.21-1.79-4-4-4"/>
    </svg>
  ),
  propostas: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h8l4 4v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/>
      <path d="M12 2v5h5"/>
      <path d="M7 10h6M7 13.5h4"/>
    </svg>
  ),
  tarefas: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="14" height="13" rx="2"/>
      <path d="M7 2v3M13 2v3M3 9h14"/>
      <path d="M7 12l2 2 4-4"/>
    </svg>
  ),
  notas: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3.5a2.121 2.121 0 0 1 3 3L7 16.5H4v-3L14 3.5Z"/>
      <path d="M11.5 6l3 3"/>
    </svg>
  ),
  financeiro: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="16" height="12" rx="2"/>
      <path d="M2 9h16"/>
      <circle cx="14.5" cy="14" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  equipe: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="6" r="2.5"/>
      <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6"/>
      <path d="M15.5 4.5a2 2 0 1 1 0 4"/>
      <path d="M18.5 15.5c0-2.071-1.49-3.794-3.5-4.35"/>
    </svg>
  ),
  vitrine: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="16" height="10" rx="1.5"/>
      <path d="M7 18h6M10 14v4"/>
    </svg>
  ),
  workspace: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5"/>
      <path d="M10 6v4.5l3 1.5"/>
      <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  metricas: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5"/>
      <path d="M10 10 L10 3"/>
      <path d="M10 10 L16 13.5"/>
      <path d="M10 10 L4.5 14.5"/>
    </svg>
  ),
  configs: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 5h14M3 10h14M3 15h14"/>
      <circle cx="7" cy="5" r="2" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="10" r="2" fill="currentColor" stroke="none"/>
      <circle cx="8" cy="15" r="2" fill="currentColor" stroke="none"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8.5" cy="8.5" r="5.5"/>
      <path d="m13 13 4 4"/>
    </svg>
  ),
  signout: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3"/>
      <path d="M13 14l4-4-4-4M17 10H8"/>
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3"/>
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M4.1 15.9l1.4-1.4M14.5 5.5l1.4-1.4"/>
    </svg>
  ),
}

/* ── Nav config ────────────────────────────────────────────────────── */
const ALL_NAV_ITEMS = [
  { to: '/painel',               label: 'Painel',        end: true,  icon: ICONS.painel,     roles: ['advogado','estagiario'] },
  { to: '/painel/casos',         label: 'Casos',         end: false, icon: ICONS.casos,      roles: ['advogado','estagiario'] },
  { to: '/painel/clientes',      label: 'Clientes',      end: false, icon: ICONS.clientes,   roles: ['advogado','estagiario'] },
  { to: '/painel/propostas',     label: 'Propostas',     end: false, icon: ICONS.propostas,  roles: ['advogado','estagiario'] },
  { to: '/painel/tarefas',       label: 'Tarefas',       end: false, icon: ICONS.tarefas,    roles: ['advogado','estagiario'] },
  { to: '/painel/notas',         label: 'Notas',         end: false, icon: ICONS.notas,      roles: ['advogado','estagiario'] },
  { to: '/painel/financeiro',    label: 'Financeiro',    end: false, icon: ICONS.financeiro, roles: ['advogado'] },
  { to: '/painel/estagiarios',   label: 'Equipe',        end: false, icon: ICONS.equipe,     roles: ['advogado','estagiario'] },
  { to: '/painel/vitrine',       label: 'Vitrine',       end: false, icon: ICONS.vitrine,    roles: ['advogado','estagiario'] },
  { to: '/painel/workspace',     label: 'Espaço de Trabalho', end: false, icon: ICONS.workspace,  roles: ['advogado','estagiario'] },
  { to: '/painel/metricas',      label: 'Métricas',      end: false, icon: ICONS.metricas,   roles: ['advogado'] },
  { to: '/painel/configuracoes', label: 'Configurações', end: false, icon: ICONS.configs,    roles: ['advogado'] },
]

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
  '/painel/workspace':     'Espaço de Trabalho',
  '/painel/metricas':      'Métricas',
}

/* ── Brand Header ───────────────────────────────────────────────────── */
function BrandHeader() {
  const { lawyer, session, isAdmin, isBeta, memberName, teamRole } = useAuth()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const h = now.getHours()
  const greeting = h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite'
  const timeStr  = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr  = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const displayName = memberName ?? lawyer?.full_name
  const initials   = displayName
    ? displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AL'
  const firmName   = lawyer?.firm_name ?? 'Atlas Adv'
  const firmShort  = firmName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const firstName  = displayName?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? '—'
  const firmNameUp = firmName.toUpperCase()

  const isDaytime = h >= 5 && h < 18
  const TimeIcon  = isDaytime ? (
    <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="2.5"/>
      <path d="M6.5 1v1.5M6.5 10v1.5M1 6.5h1.5M10 6.5h1.5M2.9 2.9l1 1M9.1 9.1l1 1M2.9 10.1l1-1M9.1 3.9l1-1"/>
    </svg>
  ) : (
    <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 8A5 5 0 0 1 4.5 2 4.5 4.5 0 1 0 10.5 8Z"/>
    </svg>
  )

  return (
    <header className={styles.brandHeader}>
      <div className={styles.brandLeft}>
        {lawyer?.logo_url
          ? <img src={lawyer.logo_url} alt="logo" className={styles.brandLogo} />
          : <div className={styles.brandLogoMark}>{firmShort}</div>
        }
        <div className={styles.brandIdentity}>
          <span className={styles.brandFirmName}>{firmNameUp}</span>
          <span className={styles.brandGreeting}>
            <span className={styles.greetingIcon}>{TimeIcon}</span>
            {greeting}, {firstName}
          </span>
        </div>
      </div>

      <div className={styles.brandCenter}>
        <span className={styles.brandClock}>{timeStr}</span>
        <span className={styles.brandDate}>{dateStr}</span>
      </div>

      <div className={styles.brandRight}>
        <div className={styles.brandLivePill}>
          <span className={styles.liveDot} />
          <span className={styles.brandLiveLabel}>Online</span>
        </div>
        <div className={styles.brandAvatar}>{initials}</div>
        <span className={styles.brandUserName}>
          {firstName}
          {isBeta && <span className={styles.betaPill}>Beta</span>}
        </span>
        {isAdmin && (
          <Link to="/admin" className={styles.brandAdminBtn} title="Painel Admin">
            <span className={styles.brandBtnIcon}>{ICONS.admin}</span>
          </Link>
        )}
        <button className={styles.brandSignOutBtn} onClick={() => supabase.auth.signOut()}>
          <span className={styles.brandBtnIcon}>{ICONS.signout}</span>
          <span className={styles.brandSignOutLabel}>Sair</span>
        </button>
      </div>
    </header>
  )
}

function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', minHeight:'240px' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid rgba(var(--accent-rgb),0.12)', borderTopColor:'var(--accent)', animation:'spin 0.75s linear infinite' }} />
    </div>
  )
}

/* ── Layout ─────────────────────────────────────────────────────────── */
export default function AppLayout() {
  const { lawyer, session, isAdmin, isBeta, teamRole, memberName } = useAuth()
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => item.roles.includes(teamRole))
  const location = useLocation()
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [overdueCount, setOverdueCount] = useState(0)
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [dockVisible,  setDockVisible]  = useState(false)
  const dockTimer = useRef(null)

  const [navMode, setNavMode] = useState(() =>
    loadPreferences(lawyer).nav_mode ?? 'sidebar'
  )

  useEffect(() => {
    function onPrefsChange() {
      setNavMode(loadPreferences(lawyer).nav_mode ?? 'sidebar')
    }
    window.addEventListener('atlasPrefsChanged', onPrefsChange)
    return () => window.removeEventListener('atlasPrefsChanged', onPrefsChange)
  }, [lawyer?.id])

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  const sidebarDisplayName = memberName ?? lawyer?.full_name
  const initials  = sidebarDisplayName
    ? sidebarDisplayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AL'
  const firmName  = lawyer?.firm_name ?? 'Atlas Adv'
  const firmShort = firmName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const pageTitle = PAGE_TITLES[location.pathname]
    ?? (location.pathname.startsWith('/painel/clientes/') ? 'Cliente'
      : location.pathname.startsWith('/painel/casos/') ? 'Processo'
      : 'Atlas Adv')

  function showDock() {
    clearTimeout(dockTimer.current)
    setDockVisible(true)
  }
  function hideDock() {
    dockTimer.current = setTimeout(() => setDockVisible(false), 350)
  }

  /* ── Shared sidebar content ──────────────────────────────────────── */
  function SidebarContent({ compact }) {
    return (
      <>
        <div className={styles.sidebarBrand}>
          {lawyer?.logo_url
            ? <img src={lawyer.logo_url} alt="logo" className={styles.logoImg} />
            : <div className={styles.logoMark}>{firmShort}</div>
          }
          {!compact && (
            <div className={styles.firmInfo}>
              <div className={styles.firmName}>{firmName}</div>
              {lawyer?.oab_number && <div className={styles.firmSub}>OAB {lawyer.oab_number}</div>}
            </div>
          )}
        </div>

        <nav className={styles.sidebarNav}>
          {!compact && <span className={styles.navSection}>Menu</span>}
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{icon}</span>
              {!compact && <span className={styles.navLabel}>{label}</span>}
              {!compact && label === 'Tarefas' && overdueCount > 0 && (
                <span className={styles.navBadge}>{overdueCount > 99 ? '99+' : overdueCount}</span>
              )}
              {compact && label === 'Tarefas' && overdueCount > 0 && (
                <span className={styles.navBadgeDot} />
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`${styles.sidebarFooter} ${compact ? styles.sidebarFooterCompact : ''}`}>
          {isAdmin && (
            <Link to="/admin" className={`${styles.adminLink} ${compact ? styles.adminLinkCompact : ''}`}>
              <span className={styles.navIcon}>{ICONS.admin}</span>
              {!compact && <span className={styles.adminLinkLabel}>Painel Admin</span>}
            </Link>
          )}
          <div className={`${styles.userRow} ${compact ? styles.userRowCompact : ''}`}>
            <div className={styles.userAvatar}>{initials}</div>
            {!compact && (
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {sidebarDisplayName?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? '—'}
                  {isBeta && <span className={styles.betaPill}>Beta</span>}
                  {teamRole === 'estagiario' && <span className={styles.betaPill} style={{ background: '#2a9d8f' }}>Estag.</span>}
                </span>
                <span className={styles.userEmail}>{session?.user?.email}</span>
              </div>
            )}
          </div>
          <button
            className={`${styles.signOut} ${compact ? styles.signOutCompact : ''}`}
            onClick={() => supabase.auth.signOut()}
          >
            <span className={styles.navIcon}>{ICONS.signout}</span>
            {!compact && <span className={styles.signOutLabel}>Sair</span>}
          </button>
        </div>
      </>
    )
  }

  /* ── Search trigger (shared) ─────────────────────────────────────── */
  function SearchBtn({ dark }) {
    return (
      <button
        className={`${styles.searchTrigger} ${dark ? styles.searchTriggerDark : ''}`}
        onClick={() => setSearchOpen(true)}
        title="Busca global (⌘K)"
      >
        <span className={styles.navIcon} style={{ width:15, height:15 }}>{ICONS.search}</span>
        <span className={styles.searchTriggerLabel}>Buscar</span>
        <kbd className={styles.searchKbd}>⌘K</kbd>
      </button>
    )
  }

  /* ── SIDEBAR MODE ────────────────────────────────────────────────── */
  if (navMode === 'sidebar') {
    return (
      <div className={`${styles.shell} ${styles.modeSidebar}`}>
        <BrandHeader />
        {sidebarOpen && <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />}

        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <SidebarContent compact={false} />
        </aside>

        <div className={styles.contentArea}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button
                className={styles.hamburger}
                onClick={() => setSidebarOpen(v => !v)}
                aria-label="Abrir menu"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="20" height="20">
                  <path d="M3 5h14M3 10h14M3 15h14"/>
                </svg>
              </button>
              <span className={styles.pageTitle}>{pageTitle}</span>
            </div>
            <SearchBtn dark={false} />
          </header>
          <main className={styles.main}>
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
            </ErrorBoundary>
          </main>
          <footer className={styles.footer}>
            <span>{firmName} © {new Date().getFullYear()}</span>
            <span>Atlas Adv v1.0</span>
          </footer>
        </div>

        <FeedbackButton />
        {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      </div>
    )
  }

  /* ── TOP MODE ────────────────────────────────────────────────────── */
  if (navMode === 'top') {
    return (
      <div className={`${styles.shell} ${styles.modeTop}`}>
        <BrandHeader />
        <header className={styles.topbarFull}>
          <nav className={styles.topNav}>
            {NAV_ITEMS.map(({ to, label, icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `${styles.topNavItem} ${isActive ? styles.topNavItemActive : ''}`}
              >
                <span className={styles.topNavIcon}>{icon}</span>
                <span className={styles.topNavLabel}>{label}</span>
                {label === 'Tarefas' && overdueCount > 0 && (
                  <span className={styles.navBadge}>{overdueCount > 99 ? '99+' : overdueCount}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className={styles.topbarNavRight}>
            <SearchBtn dark={true} />
          </div>
        </header>

        <main className={`${styles.main} ${styles.mainTop}`}>
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
          </ErrorBoundary>
        </main>
        <footer className={`${styles.footer} ${styles.footerTop}`}>
          <span>{firmName} © {new Date().getFullYear()}</span>
          <span>Atlas Adv v1.0</span>
        </footer>

        <FeedbackButton />
        {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      </div>
    )
  }

  /* ── BOTTOM DOCK MODE ────────────────────────────────────────────── */
  return (
    <div className={`${styles.shell} ${styles.modeBottom}`}>
      <BrandHeader />
      <header className={styles.topbarMinimal}>
        <div className={styles.topbarLeft}>
          <span className={styles.pageTitle}>{pageTitle}</span>
        </div>
        <SearchBtn dark={false} />
      </header>

      <main className={`${styles.main} ${styles.mainBottom}`}>
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
        </ErrorBoundary>
      </main>
      <footer className={`${styles.footer} ${styles.footerBottom}`}>
        <span>{firmName} © {new Date().getFullYear()}</span>
        <span>Atlas Adv v1.0</span>
      </footer>

      {/* Bottom dock */}
      <div
        className={`${styles.dockWrap} ${dockVisible ? styles.dockWrapVisible : ''}`}
        onMouseEnter={showDock}
        onMouseLeave={hideDock}
      >
        <div className={styles.dockHandle} />
        <nav className={`${styles.dock} ${dockVisible ? styles.dockVisible : ''}`}>
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${styles.dockItem} ${isActive ? styles.dockItemActive : ''}`}
            >
              <span className={styles.dockTooltip}>{label}</span>
              <span className={styles.dockIcon}>{icon}</span>
              {label === 'Tarefas' && overdueCount > 0 && (
                <span className={styles.navBadgeDot} />
              )}
            </NavLink>
          ))}
          <div className={styles.dockSep} />
          <button className={styles.dockItem} onClick={() => supabase.auth.signOut()} title="Sair">
            <span className={styles.dockTooltip}>Sair</span>
            <span className={styles.dockIcon}>{ICONS.signout}</span>
          </button>
        </nav>
      </div>

      <FeedbackButton />
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
