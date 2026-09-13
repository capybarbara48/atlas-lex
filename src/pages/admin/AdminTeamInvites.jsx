import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import styles from './AdminUsers.module.css'

const STATUS_CLASS = {
  pending_admin:  'badge-pendente',
  pending_invite: 'st-teal',
  active:         'st-green',
  disabled:       'st-gray',
}

function statusLabel(t, status) {
  return t(`admin.teamInvites.status.${status}`, { defaultValue: status })
}

function roleLabel(t, role) {
  return t(`admin.teamInvites.role.${role}`, { defaultValue: role })
}

function fmtDate(iso, locale) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminTeamInvites() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const toast = useToast()
  const [invites,  setInvites]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(null)
  const [filter,   setFilter]   = useState('pending_admin')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('team_members')
      .select('*, lawyers!team_members_lawyer_id_fkey(full_name, firm_name, email)')
      .order('invited_at', { ascending: false })
    if (error) {
      toast.error(t('admin.teamInvites.loadError'))
    } else {
      setInvites(data ?? [])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  async function approve(id) {
    setUpdating(id)
    const { error } = await supabase
      .from('team_members')
      .update({ status: 'pending_invite', approved_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error(t('admin.teamInvites.approveError'))
    } else {
      setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'pending_invite' } : i))
      toast.success(t('admin.teamInvites.approveSuccess'))
    }
    setUpdating(null)
  }

  async function reject(id) {
    if (!window.confirm(t('admin.teamInvites.rejectConfirm'))) return
    setUpdating(id)
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (error) {
      toast.error(t('admin.teamInvites.rejectError'))
    } else {
      setInvites(prev => prev.filter(i => i.id !== id))
      toast.success(t('admin.teamInvites.rejectSuccess'))
    }
    setUpdating(null)
  }

  const filtered = filter === 'todos'
    ? invites
    : invites.filter(i => i.status === filter)

  const pendingCount = invites.filter(i => i.status === 'pending_admin').length

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>
            {t('admin.teamInvites.title')}
            {pendingCount > 0 && (
              <span className="badge badge-alta" style={{ marginLeft: '0.5rem' }}>{t('admin.teamInvites.pendingBadge', { count: pendingCount })}</span>
            )}
          </h1>
          <p className={styles.sub}>{t('admin.teamInvites.subtitle', { count: invites.length })}</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <select
          className={styles.roleFilter}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="pending_admin">{t('admin.teamInvites.filter.pendingAdmin')}</option>
          <option value="pending_invite">{t('admin.teamInvites.filter.pendingInvite')}</option>
          <option value="active">{t('admin.teamInvites.filter.active')}</option>
          <option value="disabled">{t('admin.teamInvites.filter.disabled')}</option>
          <option value="todos">{t('admin.teamInvites.filter.all')}</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>{t('admin.teamInvites.empty')}</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>{t('admin.teamInvites.table.member')}</span>
            <span>{t('admin.teamInvites.table.firm')}</span>
            <span>{t('admin.teamInvites.table.role')}</span>
            <span>{t('admin.teamInvites.table.status')}</span>
            <span>{t('admin.teamInvites.table.date')}</span>
            <span></span>
          </div>
          {filtered.map(inv => (
            <div key={inv.id} className={styles.tableRow}>
              <div>
                <div className={styles.userName}>{inv.full_name}</div>
                <div className={styles.userEmail}>{inv.invited_email}</div>
              </div>
              <div>
                <div className={styles.userName}>{inv.lawyers?.firm_name ?? '—'}</div>
                <div className={styles.userEmail}>{inv.lawyers?.email ?? inv.lawyers?.full_name ?? '—'}</div>
              </div>
              <div>
                <span className={`badge ${inv.role === 'advogado' ? 'st-blue' : 'st-teal'}`}>
                  {roleLabel(t, inv.role)}
                </span>
              </div>
              <div>
                <span className={`badge ${STATUS_CLASS[inv.status] ?? 'st-gray'}`}>
                  {statusLabel(t, inv.status)}
                </span>
              </div>
              <div className={styles.userEmail}>{fmtDate(inv.invited_at, locale)}</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {inv.status === 'pending_admin' && (
                  <>
                    <button
                      className={styles.roleBtn}
                      style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
                      disabled={updating === inv.id}
                      onClick={() => approve(inv.id)}
                    >
                      {updating === inv.id ? '…' : t('admin.teamInvites.approve')}
                    </button>
                    <button
                      className={styles.roleBtn}
                      style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
                      disabled={updating === inv.id}
                      onClick={() => reject(inv.id)}
                    >
                      {t('admin.teamInvites.reject')}
                    </button>
                  </>
                )}
                {inv.status !== 'pending_admin' && (
                  <button
                    className={styles.roleBtn}
                    style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
                    disabled={updating === inv.id}
                    onClick={() => reject(inv.id)}
                  >
                    {updating === inv.id ? '…' : t('admin.teamInvites.remove')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
