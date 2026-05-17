import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './AdminDashboard.module.css'

const fmt = n => n?.toLocaleString('pt-BR') ?? '—'

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={styles.kpiCard} style={accent ? { borderTopColor: accent } : undefined}>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  )
}

function roleLabel(role) {
  if (role === 'admin') return 'Admin'
  if (role === 'beta')  return 'Beta'
  return 'Membro'
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, newThisMonth: 0, onboarded: 0, feedbackTotal: 0 })
  const [users, setUsers] = useState([])

  useEffect(() => {
    async function load() {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [
        { count: total },
        { count: newThisMonth },
        { count: onboarded },
        { count: feedbackTotal },
        { data: recentUsers },
      ] = await Promise.all([
        supabase.from('lawyers').select('*', { count: 'exact', head: true }),
        supabase.from('lawyers').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('lawyers').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true),
        supabase.from('feedback').select('*', { count: 'exact', head: true }),
        supabase
          .from('lawyers')
          .select('id, full_name, email, firm_name, role, onboarding_completed, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      setStats({
        total: total ?? 0,
        newThisMonth: newThisMonth ?? 0,
        onboarded: onboarded ?? 0,
        feedbackTotal: feedbackTotal ?? 0,
      })
      setUsers(recentUsers ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className={styles.loadWrap}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.sub}>Visão geral da plataforma Atlas Lex</p>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Usuários totais"
          value={fmt(stats.total)}
          sub={`${fmt(stats.newThisMonth)} novos este mês`}
          accent="var(--accent)"
        />
        <KpiCard
          label="Onboarding completo"
          value={fmt(stats.onboarded)}
          sub={stats.total > 0 ? `${Math.round((stats.onboarded / stats.total) * 100)}% do total` : undefined}
          accent="#22a84a"
        />
        <KpiCard
          label="Novos este mês"
          value={fmt(stats.newThisMonth)}
          accent="#3b82f6"
        />
        <KpiCard
          label="Feedbacks recebidos"
          value={fmt(stats.feedbackTotal)}
          sub="sugestões, bugs e elogios"
          accent="#f59e0b"
        />
      </div>

      {/* Recent users */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Usuários recentes</h2>
          <button className={styles.seeAll} onClick={() => navigate('/admin/usuarios')}>
            Ver todos →
          </button>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Escritório</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.empty}>Nenhum usuário encontrado.</td>
                </tr>
              )}
              {users.map(u => (
                <tr key={u.id} className={styles.row}>
                  <td className={styles.nameCell}>{u.full_name || '—'}</td>
                  <td className={styles.emailCell}>{u.email || '—'}</td>
                  <td>{u.firm_name || '—'}</td>
                  <td>
                    <span className={u.role === 'admin' ? styles.badgeAdmin : u.role === 'beta' ? styles.badgeBeta : styles.badgeMember}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td>
                    <span className={u.onboarding_completed ? styles.badgeActive : styles.badgePending}>
                      {u.onboarding_completed ? 'Ativo' : 'Pendente'}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
