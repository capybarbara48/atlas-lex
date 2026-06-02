import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useKanbanSituations } from '@/hooks/useKanbanSituations'
import { updateCaseSituation } from '@/hooks/useCases'
import Modal from '@/components/ui/Modal'
import CaseForm from '@/components/forms/CaseForm'
import TaskForm from '@/components/forms/TaskForm'
import EntryForm from '@/components/forms/EntryForm'
import { Skeleton, SkeletonListItem } from '@/components/ui/Skeleton'
import styles from './CaseDetail.module.css'

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR')
}

const STATUS_CASE = {
  ativo:      { label: 'Ativo',      cls: 'st-teal'   },
  encerrado:  { label: 'Encerrado',  cls: 'st-gray'   },
  arquivado:  { label: 'Arquivado',  cls: 'st-gray'   },
  suspenso:   { label: 'Suspenso',   cls: 'st-orange'  },
}
const STATUS_TASK = {
  pendente:     { label: 'Pendente',     cls: 'st-orange' },
  em_andamento: { label: 'Em andamento', cls: 'st-blue'   },
  concluida:    { label: 'Concluída',    cls: 'st-teal'   },
  cancelada:    { label: 'Cancelada',    cls: 'st-gray'   },
}
const PRIORITY = {
  alta:    { label: 'Alta',    cls: 'st-red'    },
  urgente: { label: 'Urgente', cls: 'st-red'    },
  media:   { label: 'Média',   cls: 'st-orange' },
  baixa:   { label: 'Baixa',   cls: 'st-gray'   },
}
const STATUS_FIN = {
  pago:      { label: 'Pago',      cls: 'st-teal'   },
  pendente:  { label: 'Pendente',  cls: 'st-orange' },
  cancelado: { label: 'Cancelado', cls: 'st-gray'   },
}

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [caso,    setCaso]    = useState(null)
  const [tasks,   setTasks]   = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [editing,   setEditing]   = useState(false)
  const [newTask,   setNewTask]   = useState(false)
  const [newEntry,  setNewEntry]  = useState(false)

  const { situations } = useKanbanSituations()

  async function handleSituationChange(e) {
    const newSit = e.target.value || null
    await updateCaseSituation(id, newSit)
    setCaso(prev => ({ ...prev, situation: newSit }))
  }

  async function load() {
    setLoading(true)
    setError(null)

    const [caseRes, tasksRes, entriesRes] = await Promise.all([
      supabase
        .from('cases')
        .select('*, clients(id, full_name, email, phone)')
        .eq('id', id)
        .single(),
      supabase
        .from('tasks')
        .select('*')
        .eq('case_id', id)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('financial_entries')
        .select('*')
        .eq('case_id', id)
        .order('due_date', { ascending: false }),
    ])

    if (caseRes.error) { setError(caseRes.error.message); setLoading(false); return }

    setCaso(caseRes.data)
    setTasks(tasksRes.data ?? [])
    setEntries(entriesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Skeleton width="5rem" height="0.75rem" />
        <div className={styles.headerMain}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <Skeleton width="50%" height="1.1rem" />
            <Skeleton width="30%" height="0.7rem" />
          </div>
        </div>
      </div>
      <div className={styles.infoCard}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className={styles.infoRow}>
            <Skeleton width="45%" height="0.6rem" />
            <Skeleton width="70%" height="0.8rem" />
          </div>
        ))}
      </div>
      {[3, 3].map((rows, si) => (
        <div key={si} className={styles.section}>
          <div className={styles.sectionHeader}>
            <Skeleton width="5rem" height="0.75rem" />
            <Skeleton width="1.5rem" height="1.2rem" radius="999px" />
          </div>
          <div className={styles.sectionBody}>
            {Array.from({ length: rows }, (_, i) => <SkeletonListItem key={i} />)}
          </div>
        </div>
      ))}
    </div>
  )

  if (error) return (
    <div className={styles.loadWrap}>
      <p style={{ color: 'var(--text-2)' }}>Erro ao carregar: {error}</p>
    </div>
  )

  if (!caso) return null

  const st = STATUS_CASE[caso.status] ?? { label: caso.status, cls: 'st-gray' }
  const receita = entries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const despesa = entries.filter(e => e.type === 'despesa' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const saldo   = receita - despesa

  const overdueTasks = tasks.filter(t =>
    !['concluida', 'cancelada'].includes(t.status) &&
    t.due_date && t.due_date < new Date().toISOString()
  )

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/painel/casos')}>
          ← Casos
        </button>

        <div className={styles.headerMain}>
          <div className={styles.caseIcon}>⚖</div>
          <div>
            <div className={styles.caseName}>
              {caso.title}
              <span className={`badge ${st.cls}`}>{st.label}</span>
              {overdueTasks.length > 0 && (
                <span className={`badge st-red`}>{overdueTasks.length} atrasada{overdueTasks.length > 1 ? 's' : ''}</span>
              )}
            </div>
            {caso.case_number && <div className={styles.caseSub}>{caso.case_number}</div>}
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.editBtn} onClick={() => setEditing(true)}>Editar</button>
        </div>
      </div>

      {/* ── Info card ── */}
      <div className={styles.infoCard}>
        {caso.clients && (
          <InfoRow label="Cliente" value={
            <Link to={`/painel/clientes/${caso.clients.id}`} className={styles.clientLink}>
              {caso.clients.full_name}
            </Link>
          } />
        )}
        <InfoRow label="Área"       value={caso.area} />
        <InfoRow label="Tribunal"   value={caso.court} />
        <InfoRow label="Abertura"   value={fmt(caso.opened_at)} />
        <InfoRow label="Valor da causa" value={caso.valor > 0 ? brl(caso.valor) : null} />
        <InfoRow label="Situação" value={
          situations.length > 0 ? (
            <select
              className={styles.situationSelect}
              value={caso.situation ?? ''}
              onChange={handleSituationChange}
            >
              <option value="">— Não categorizado —</option>
              {situations.map(sit => {
                const col = sit.color ?? '#888'
                return <option key={sit.id} value={sit.id}>{sit.value}</option>
              })}
            </select>
          ) : null
        } />
        <InfoRow label="Encerramento"   value={fmt(caso.closed_at)} />
        {caso.description && (
          <div className={`${styles.infoRow} ${styles.infoRowFull}`}>
            <span className={styles.infoLabel}>Descrição</span>
            <span className={styles.infoValue}>{caso.description}</span>
          </div>
        )}
      </div>

      {/* ── Tarefas ── */}
      <Section title="Tarefas" count={tasks.length} onAdd={() => setNewTask(true)} addLabel="+ Tarefa">
        {tasks.length === 0
          ? <Empty text="Nenhuma tarefa vinculada" />
          : tasks.map(t => {
              const ts = STATUS_TASK[t.status] ?? { label: t.status, cls: 'st-gray' }
              const pr = PRIORITY[t.priority]  ?? { label: t.priority, cls: 'st-gray' }
              const overdue = !['concluida','cancelada'].includes(t.status) && t.due_date && t.due_date < new Date().toISOString()
              return (
                <div key={t.id} className={`${styles.listItem} ${overdue ? styles.listItemOverdue : ''}`}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{t.title}</span>
                    {t.description && <span className={styles.listSub}>{t.description}</span>}
                  </div>
                  <div className={styles.listMeta}>
                    <span className={`badge ${pr.cls}`}>{pr.label}</span>
                    <span className={`badge ${ts.cls}`}>{ts.label}</span>
                    {t.due_date && <span className={`${styles.listDate} ${overdue ? styles.dateOverdue : ''}`}>{fmt(t.due_date)}</span>}
                  </div>
                </div>
              )
            })
        }
      </Section>

      {/* ── Financeiro ── */}
      <Section
        title="Financeiro"
        count={entries.length}
        onAdd={() => setNewEntry(true)}
        addLabel="+ Lançamento"
        badge={entries.length > 0
          ? <span className={styles.saldoBadge} style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)', marginLeft: 'auto' }}>{brl(saldo)}</span>
          : null
        }
      >
        {entries.length === 0
          ? <Empty text="Nenhum lançamento vinculado" />
          : entries.map(e => {
              const es = STATUS_FIN[e.status] ?? { label: e.status, cls: 'st-gray' }
              return (
                <div key={e.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{e.description || '—'}</span>
                  </div>
                  <div className={styles.listMeta}>
                    <span className={`badge ${e.type === 'receita' ? 'st-teal' : 'st-red'}`}>
                      {e.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className={`badge ${es.cls}`}>{es.label}</span>
                    {e.due_date && <span className={styles.listDate}>{fmt(e.due_date)}</span>}
                    <span className={styles.listAmt} style={{ color: e.type === 'receita' ? 'var(--green)' : 'var(--red)' }}>
                      {e.type === 'receita' ? '+' : '−'}{brl(e.amount)}
                    </span>
                  </div>
                </div>
              )
            })
        }
      </Section>

      {editing && (
        <Modal title="Editar processo" onClose={() => setEditing(false)} size="lg">
          <CaseForm initial={caso} onSave={() => { setEditing(false); load() }} onClose={() => setEditing(false)} />
        </Modal>
      )}

      {newTask && (
        <Modal title="Nova tarefa" onClose={() => setNewTask(false)}>
          <TaskForm
            initial={{ case_id: caso.id }}
            onSave={() => { setNewTask(false); load() }}
            onClose={() => setNewTask(false)}
          />
        </Modal>
      )}

      {newEntry && (
        <Modal title="Novo lançamento" onClose={() => setNewEntry(false)}>
          <EntryForm
            initial={{ case_id: caso.id, client_id: caso.client_id }}
            onSave={() => { setNewEntry(false); load() }}
            onClose={() => setNewEntry(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  )
}

function Section({ title, count, badge, onAdd, addLabel, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{title}</span>
        {count !== undefined && <span className={styles.sectionCount}>{count}</span>}
        {badge}
        {onAdd && (
          <button className={styles.sectionAddBtn} onClick={onAdd}>{addLabel}</button>
        )}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function Empty({ text }) {
  return <p className={styles.empty}>{text}</p>
}
