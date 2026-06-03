import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import styles from './AdminUsers.module.css'

const STATUS_LABELS = {
  pending_admin:  'Aguardando aprovação',
  pending_invite: 'Aprovado — aguardando cadastro',
  active:         'Ativo',
  disabled:       'Desativado',
}
const STATUS_CLASS = {
  pending_admin:  'badge-pendente',
  pending_invite: 'st-teal',
  active:         'st-green',
  disabled:       'st-gray',
}
const ROLE_LABELS = { advogado: 'Advogado', estagiario: 'Estagiário' }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminTeamInvites() {
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
      toast.error('Erro ao carregar convites.')
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
      toast.error('Erro ao aprovar convite.')
    } else {
      setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'pending_invite' } : i))
      toast.success('Convite aprovado. O responsável pode agora orientar o membro a se cadastrar.')
    }
    setUpdating(null)
  }

  async function reject(id) {
    if (!window.confirm('Rejeitar e excluir este convite?')) return
    setUpdating(id)
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao rejeitar convite.')
    } else {
      setInvites(prev => prev.filter(i => i.id !== id))
      toast.success('Convite rejeitado e removido.')
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
            Convites de Equipe
            {pendingCount > 0 && (
              <span className="badge badge-alta" style={{ marginLeft: '0.5rem' }}>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
            )}
          </h1>
          <p className={styles.sub}>{invites.length} convite{invites.length !== 1 ? 's' : ''} no total</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <select
          className={styles.roleFilter}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="pending_admin">Aguardando aprovação</option>
          <option value="pending_invite">Aprovados</option>
          <option value="active">Ativos</option>
          <option value="disabled">Desativados</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>Nenhum convite encontrado.</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Membro</span>
            <span>Escritório</span>
            <span>Função</span>
            <span>Status</span>
            <span>Data</span>
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
                  {ROLE_LABELS[inv.role] ?? inv.role}
                </span>
              </div>
              <div>
                <span className={`badge ${STATUS_CLASS[inv.status] ?? 'st-gray'}`}>
                  {STATUS_LABELS[inv.status] ?? inv.status}
                </span>
              </div>
              <div className={styles.userEmail}>{fmtDate(inv.invited_at)}</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {inv.status === 'pending_admin' && (
                  <>
                    <button
                      className={styles.roleBtn}
                      style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
                      disabled={updating === inv.id}
                      onClick={() => approve(inv.id)}
                    >
                      {updating === inv.id ? '…' : 'Aprovar'}
                    </button>
                    <button
                      className={styles.roleBtn}
                      style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
                      disabled={updating === inv.id}
                      onClick={() => reject(inv.id)}
                    >
                      Rejeitar
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
                    {updating === inv.id ? '…' : 'Remover'}
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
