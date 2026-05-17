import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import styles from './AdminFeedback.module.css'

const TIPOS = ['sugestão', 'bug', 'elogio']

function tipoClass(tipo) {
  if (tipo === 'bug') return styles.tipoBug
  if (tipo === 'elogio') return styles.tipoElogio
  return styles.tipoSugestao
}

export default function AdminFeedback() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState('all')
  const [filterLida, setFilterLida] = useState('all')
  const [marking, setMarking] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('feedback')
      .select('id, tipo, titulo, mensagem, lida, created_at, lawyer_id, lawyers(full_name, email, firm_name)')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Erro ao carregar feedbacks.')
    } else {
      setItems(data ?? [])
    }
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  async function toggleLida(id, current) {
    setMarking(id)
    const { error } = await supabase
      .from('feedback')
      .update({ lida: !current })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao atualizar.')
    } else {
      setItems(prev => prev.map(f => f.id === id ? { ...f, lida: !current } : f))
    }
    setMarking(null)
  }

  const filtered = items.filter(f => {
    const matchTipo = filterTipo === 'all' || f.tipo === filterTipo
    const matchLida = filterLida === 'all'
      || (filterLida === 'lida' && f.lida)
      || (filterLida === 'nao_lida' && !f.lida)
    return matchTipo && matchLida
  })

  const unread = items.filter(f => !f.lida).length

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>
            Feedback
            {unread > 0 && <span className={styles.unreadBadge}>{unread} novo{unread !== 1 ? 's' : ''}</span>}
          </h1>
          <p className={styles.sub}>{items.length} envio{items.length !== 1 ? 's' : ''} recebido{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <select
          className={styles.filterSelect}
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
        >
          <option value="all">Todos os tipos</option>
          {TIPOS.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={filterLida}
          onChange={e => setFilterLida(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="nao_lida">Não lido</option>
          <option value="lida">Lido</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loadWrap}><div className={styles.spinner} /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>Nenhum feedback encontrado.</div>
      ) : (
        <div className={styles.list}>
          {filtered.map(f => (
            <div key={f.id} className={`${styles.item} ${!f.lida ? styles.unread : ''}`}>
              <div className={styles.itemHeader}>
                <div className={styles.itemMeta}>
                  <span className={`${styles.tipoBadge} ${tipoClass(f.tipo)}`}>{f.tipo}</span>
                  <span className={styles.itemUser}>
                    {f.lawyers?.full_name ?? f.lawyers?.email ?? '—'}
                    {f.lawyers?.firm_name && <span className={styles.itemFirm}> · {f.lawyers.firm_name}</span>}
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <span className={styles.itemDate}>
                    {new Date(f.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    className={`${styles.lidaBtn} ${f.lida ? styles.lidaBtnLida : ''}`}
                    disabled={marking === f.id}
                    onClick={() => toggleLida(f.id, f.lida)}
                    title={f.lida ? 'Marcar como não lido' : 'Marcar como lido'}
                  >
                    {f.lida ? (
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd"/>
                      </svg>
                    )}
                    {f.lida ? 'Lido' : 'Marcar lido'}
                  </button>
                </div>
              </div>
              <div className={styles.itemTitle}>{f.titulo}</div>
              <div className={styles.itemBody}>{f.mensagem}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
