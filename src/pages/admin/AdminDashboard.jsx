import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import styles from './AdminDashboard.module.css'

const fmt = (n, locale) => n?.toLocaleString(locale) ?? '—'

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={styles.kpiCard} style={accent ? { borderTopColor: accent } : undefined}>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  )
}

function roleLabel(t, role) {
  if (role === 'admin') return t('admin.role.admin')
  if (role === 'beta')  return t('admin.role.beta')
  return t('admin.role.member')
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
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
          <h1 className={styles.title}>{t('admin.dashboard.title')}</h1>
          <p className={styles.sub}>{t('admin.dashboard.subtitle')}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label={t('admin.dashboard.kpi.totalUsers')}
          value={fmt(stats.total, locale)}
          sub={t('admin.dashboard.kpi.newThisMonthSub', { count: stats.newThisMonth })}
          accent="var(--accent)"
        />
        <KpiCard
          label={t('admin.dashboard.kpi.onboardingComplete')}
          value={fmt(stats.onboarded, locale)}
          sub={stats.total > 0 ? t('admin.dashboard.kpi.percentOfTotal', { percent: Math.round((stats.onboarded / stats.total) * 100) }) : undefined}
          accent="#22a84a"
        />
        <KpiCard
          label={t('admin.dashboard.kpi.newThisMonth')}
          value={fmt(stats.newThisMonth, locale)}
          accent="#3b82f6"
        />
        <KpiCard
          label={t('admin.dashboard.kpi.feedbackReceived')}
          value={fmt(stats.feedbackTotal, locale)}
          sub={t('admin.dashboard.kpi.feedbackSub')}
          accent="#f59e0b"
        />
      </div>

      {/* Recent users */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>{t('admin.dashboard.recentUsers')}</h2>
          <button className={styles.seeAll} onClick={() => navigate('/admin/usuarios')}>
            {t('admin.dashboard.seeAll')}
          </button>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('admin.dashboard.table.name')}</th>
                <th>{t('admin.dashboard.table.email')}</th>
                <th>{t('admin.dashboard.table.firm')}</th>
                <th>{t('admin.dashboard.table.role')}</th>
                <th>{t('admin.dashboard.table.status')}</th>
                <th>{t('admin.dashboard.table.signupDate')}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.empty}>{t('admin.dashboard.noUsers')}</td>
                </tr>
              )}
              {users.map(u => (
                <tr key={u.id} className={styles.row}>
                  <td className={styles.nameCell}>{u.full_name || '—'}</td>
                  <td className={styles.emailCell}>{u.email || '—'}</td>
                  <td>{u.firm_name || '—'}</td>
                  <td>
                    <span className={u.role === 'admin' ? styles.badgeAdmin : u.role === 'beta' ? styles.badgeBeta : styles.badgeMember}>
                      {roleLabel(t, u.role)}
                    </span>
                  </td>
                  <td>
                    <span className={u.onboarding_completed ? styles.badgeActive : styles.badgePending}>
                      {u.onboarding_completed ? t('admin.status.active') : t('admin.status.pending')}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
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
