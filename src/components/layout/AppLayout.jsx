import { Outlet, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import styles from './AppLayout.module.css'

const NAV_ITEMS = [
  { to: '/',               label: 'Painel' },
  { to: '/casos',          label: 'Casos' },
  { to: '/clientes',       label: 'Clientes' },
  { to: '/propostas',      label: 'Propostas' },
  { to: '/tarefas',        label: 'Tarefas' },
  { to: '/financeiro',     label: 'Financeiro' },
  { to: '/configuracoes',  label: 'Configurações' },
]

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const date = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className={styles.clockWrap}>
      <span className={styles.clockTime}>{time}</span>
      <span className={styles.clockDate}>{date}</span>
    </div>
  )
}

export default function AppLayout() {
  const { lawyer, session } = useAuth()

  const initials = lawyer?.full_name
    ? lawyer.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AL'

  const firmName  = lawyer?.firm_name  ?? 'Atlas Lex'
  const firmShort = firmName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className={styles.shell}>

      {/* ── Top Header ── */}
      <header className={styles.header}>

        <div className={styles.headerLeft}>
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

        <Clock />

        <div className={styles.headerRight}>
          <div className={styles.livePill}>
            <span className={styles.liveDot} />
            Online
          </div>
          <div className={styles.userName}>
            {lawyer?.full_name?.split(' ')[0] ?? session?.user?.email?.split('@')[0] ?? '—'}
          </div>
          <div className={styles.userAvatar}>{initials}</div>
          <button
            className={styles.signOut}
            onClick={() => supabase.auth.signOut()}
          >
            Sair
          </button>
        </div>
      </header>

      {/* ── Nav bar ── */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Page content ── */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span>{firmName} © {new Date().getFullYear()} — Sistema de gestão jurídica</span>
        <span>Atlas Lex v1.0</span>
      </footer>

    </div>
  )
}
