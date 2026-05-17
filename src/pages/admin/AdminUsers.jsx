import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import styles from './AdminUsers.module.css'

const ROLES = ['member', 'admin']

function roleLabel(role) {
  return role === 'admin' ? 'Admin' : 'Membro'
}

export default function AdminUsers() {
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
      toast.error('Erro ao carregar usuários.')
    } else {
      setUsers(data ?? [])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  async function changeRole(userId, newRole) {
    setUpdating(userId)
    const { error } = await supabase
      .from('lawyers')
      .update({ role: newRole })
      .eq('id', userId)
    if (error) {
      toast.error('Erro ao atualizar perfil.')
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success(`Perfil atualizado para ${roleLabel(newRole)}.`)
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
          <h1 className={styles.title}>Usuários</h1>
          <p className={styles.sub}>{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Buscar por nome, e-mail ou escritório…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
        >
          <option value="all">Todos os perfis</option>
          <option value="admin">Admin</option>
          <option value="member">Membro</option>
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
                  <th>Usuário</th>
                  <th>Escritório</th>
                  <th>OAB</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      {search || filterRole !== 'all' ? 'Nenhum resultado encontrado.' : 'Nenhum usuário.'}
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
                      <span className={u.role === 'admin' ? styles.badgeAdmin : styles.badgeMember}>
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
                    <td>
                      <select
                        className={styles.roleSelect}
                        value={u.role ?? 'member'}
                        disabled={updating === u.id}
                        onChange={e => changeRole(u.id, e.target.value)}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{roleLabel(r)}</option>
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
