import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import styles from './AdminUsers.module.css'

const ROLES = ['member', 'beta', 'admin']

function roleLabel(t, role) {
  if (role === 'admin') return t('admin.role.admin')
  if (role === 'beta')  return t('admin.role.beta')
  return t('admin.role.member')
}

export default function AdminUsers() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [updating, setUpdating] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lawyers')
      .select('id, full_name, email, firm_name, role, onboarding_completed, created_at, oab_number')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error(t('admin.users.loadError'))
    } else {
      setUsers(data ?? [])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  async function changeRole(userId, newRole) {
    setUpdating(userId)
    const { error } = await supabase
      .rpc('admin_set_role', { target_id: userId, new_role: newRole })
    if (error) {
      const isLastAdminError = error.message?.toLowerCase().includes('último administrador')
        || error.message?.toLowerCase().includes('last remaining administrator')
      toast.error(isLastAdminError ? t('admin.users.lastAdminError') : (error.message || t('admin.users.updateError')))
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success(t('admin.users.roleUpdated', { role: roleLabel(t, newRole) }))
    }
    setUpdating(null)
  }

  const q = search.toLowerCase()
  const filtered = users.filter(u => {
    const matchSearch = !q
      || (u.full_name ?? '').toLowerCase().includes(q)
      || (u.email ?? '').toLowerCase().includes(q)
      || (u.firm_name ?? '').toLowerCase().includes(q)
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>{t('admin.users.title')}</h1>
          <p className={styles.sub}>{t('admin.users.subtitle', { count: users.length })}</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder={t('admin.users.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
        >
          <option value="all">{t('admin.users.allRoles')}</option>
          <option value="admin">{t('admin.role.admin')}</option>
          <option value="beta">{t('admin.role.beta')}</option>
          <option value="member">{t('admin.role.member')}</option>
        </select>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loadWrap}><div className={styles.spinner} /></div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('admin.users.table.user')}</th>
                  <th>{t('admin.users.table.firm')}</th>
                  <th>{t('admin.users.table.oab')}</th>
                  <th>{t('admin.users.table.role')}</th>
                  <th>{t('admin.users.table.status')}</th>
                  <th>{t('admin.users.table.signupDate')}</th>
                  <th>{t('admin.users.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      {search || filterRole !== 'all' ? t('admin.users.noResults') : t('admin.users.noUsers')}
                    </td>
                  </tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} className={styles.row}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.avatar}>
                          {(u.full_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.userName}>{u.full_name || '—'}</div>
                          <div className={styles.userEmail}>{u.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.firmCell}>{u.firm_name || '—'}</td>
                    <td className={styles.oabCell}>{u.oab_number || '—'}</td>
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
                    <td>
                      <select
                        className={styles.roleSelect}
                        value={u.role ?? 'member'}
                        disabled={updating === u.id}
                        onChange={e => changeRole(u.id, e.target.value)}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{roleLabel(t, r)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
