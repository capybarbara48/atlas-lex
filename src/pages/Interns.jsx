import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAllTasks, updateTaskStatus, updateTaskAssignee } from '@/hooks/useTasks'
import { supabase } from '@/lib/supabase'
import PageShell from '@/components/ui/PageShell'
import styles from './Interns.module.css'

const PRI_CSS    = { urgente: 'badge-alta', alta: 'badge-alta', media: 'badge-media', baixa: 'badge-baixa' }
const PRI_LABELS = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' }

const ST_LABELS = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' }
const ST_CSS    = { pendente: 'badge-pendente', em_andamento: 'badge-pendente', concluida: 'badge-concluida', cancelada: 'badge-cancelada' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d.split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function isOverdue(task) {
  if (!task.due_date) return false
  if (task.status === 'concluida' || task.status === 'cancelada') return false
  return task.due_date.split('T')[0] < new Date().toISOString().split('T')[0]
}

/* ── Member overview card ───────────────────────────────────────────── */
function MemberCard({ name, tasks, onClick }) {
  const total    = tasks.length
  const done     = tasks.filter(t => t.status === 'concluida').length
  const active   = tasks.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length
  const overdue  = tasks.filter(t => isOverdue(t)).length
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className={styles.memberCard} onClick={onClick}>
      <div className={styles.memberCardAvatar}>{initials(name)}</div>
      <div className={styles.memberCardName}>{name}</div>
      <div className={styles.memberCardStats}>
        <span>{total} tarefas</span>
        {overdue > 0 && <span className={`badge badge-alta`}>{overdue} atrasada{overdue > 1 ? 's' : ''}</span>}
      </div>
      <div className={styles.progressWrap}>
        <div className={styles.progressBar} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.progressLabels}>
        <span>{active} ativas</span>
        <span className={styles.progressPct}>{pct}% concluídas</span>
      </div>
    </div>
  )
}

/* ── Task row ───────────────────────────────────────────────────────── */
function TaskRow({ task, showMember, onStatusChange, responsaveis, onCycleAssignee }) {
  const overdue = isOverdue(task)
  return (
    <div className={`${styles.taskRow} ${overdue ? styles.taskRowOverdue : ''}`}>
      <div className={styles.taskRowMain}>
        <div className={`${styles.taskRowTitle} ${task.status === 'concluida' ? styles.taskDone : ''}`}>
          {task.title}
        </div>
        {task.cases?.title && (
          <div className={styles.taskRowCase}>{task.cases.title}</div>
        )}
      </div>
      <div className={styles.taskRowMeta}>
        {showMember && task.assigned_to && (
          <span
            className="badge st-teal"
            style={{ cursor: responsaveis?.length > 0 ? 'pointer' : 'default' }}
            title={responsaveis?.length > 0 ? 'Clique para mudar responsável' : task.assigned_to}
            onClick={e => { e.stopPropagation(); onCycleAssignee?.(task.id, task.assigned_to) }}
          >{task.assigned_to}</span>
        )}
        <span className={`badge ${PRI_CSS[task.priority]}`}>{PRI_LABELS[task.priority]}</span>
        <select
          className={styles.statusSelect}
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value)}
          onClick={e => e.stopPropagation()}
        >
          {Object.entries(ST_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <span className={`${styles.taskRowDate} ${overdue ? styles.taskRowDateOverdue : ''}`}>
          {fmtDate(task.due_date)}
          {overdue && <span className={styles.overdueTag}>Atrasada</span>}
        </span>
      </div>
    </div>
  )
}

/* ── Monthly history section ────────────────────────────────────────── */
function HistorySection({ lawyerId, responsaveis, selectedMember }) {
  const [month,        setMonth]        = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [tasks,        setTasks]        = useState([])
  const [desps,        setDesps]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [personFilter, setPersonFilter] = useState(null)

  useEffect(() => {
    setPersonFilter(selectedMember !== 'todos' && selectedMember !== 'sem_atribuicao' ? selectedMember : null)
  }, [selectedMember])

  function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  useEffect(() => {
    if (!lawyerId) return
    setLoading(true)
    const from = toISO(month)
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    const to   = toISO(next)
    let taskQ = supabase.from('tasks').select('id, title, updated_at, assigned_to')
      .eq('status', 'concluida').gte('updated_at', from).lt('updated_at', to)
      .order('updated_at', { ascending: false }).limit(200)
    if (selectedMember !== 'todos' && selectedMember !== 'sem_atribuicao')
      taskQ = taskQ.eq('assigned_to', selectedMember)
    else if (selectedMember === 'sem_atribuicao')
      taskQ = taskQ.is('assigned_to', null)
    let despQ = supabase.from('workspace_despachos')
      .select('id, case_title, tipo, done_at, responsavel')
      .eq('status', 'concluido').gte('done_at', from).lt('done_at', to)
      .order('done_at', { ascending: false }).limit(200)
    if (selectedMember !== 'todos' && selectedMember !== 'sem_atribuicao')
      despQ = despQ.eq('responsavel', selectedMember)
    Promise.all([taskQ, despQ])
      .then(([{ data: t }, { data: d }]) => { setTasks(t ?? []); setDesps(d ?? []); setLoading(false) })
  }, [lawyerId, month, selectedMember])

  const combined = useMemo(() => {
    const t = tasks.map(t => ({ key: 't'+t.id, type: 'task',     title: t.title,      sub: t.assigned_to, assignedTo: t.assigned_to, date: t.updated_at }))
    const d = desps.map(d => ({ key: 'd'+d.id, type: 'despacho', title: d.case_title, sub: d.tipo,        assignedTo: d.responsavel, date: d.done_at }))
    const all = [...t, ...d].sort((a, b) => new Date(b.date) - new Date(a.date))
    if (!personFilter) return all
    return all.filter(item => item.assignedTo === personFilter)
  }, [tasks, desps, personFilter])

  const monthLabel = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 23); cutoff.setDate(1); cutoff.setHours(0,0,0,0)
  const atLimit = month <= cutoff
  function fmtD(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }

  return (
    <div className={styles.histSection}>
      <div className={styles.histSectionHead}>
        <span className={styles.histSectionTitle}>Histórico de Atividade</span>
        <div className={styles.histNav}>
          <button className={styles.histNavBtn} onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} disabled={atLimit}>‹</button>
          <span className={styles.histNavLabel} style={{ textTransform: 'capitalize' }}>{monthLabel}</span>
          <button className={styles.histNavBtn} onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}>›</button>
        </div>
        {combined.length > 0 && <span className="badge st-gray">{combined.length}</span>}
      </div>
      {selectedMember === 'todos' && responsaveis.length > 0 && (
        <div className={styles.histFilter}>
          <button className={`${styles.histFilterBtn} ${!personFilter ? styles.histFilterActive : ''}`} onClick={() => setPersonFilter(null)}>Todos</button>
          {responsaveis.map(p => (
            <button key={p} className={`${styles.histFilterBtn} ${personFilter === p ? styles.histFilterActive : ''}`} onClick={() => setPersonFilter(prev => prev === p ? null : p)}>{p}</button>
          ))}
        </div>
      )}
      {loading ? (
        <div className={styles.histEmpty}>Carregando…</div>
      ) : combined.length === 0 ? (
        <div className={styles.histEmpty}>Nenhuma atividade registrada neste mês.</div>
      ) : (
        <div className={styles.histList}>
          {combined.map(item => (
            <div key={item.key} className={styles.histItem}>
              <div className={styles.histDot} style={{ background: item.type === 'task' ? 'var(--accent)' : 'var(--green)' }} />
              <div className={styles.histBody}>
                <span className={styles.histTitle}>{item.title}</span>
                {item.sub && <span className={styles.histSub}>{item.sub}</span>}
              </div>
              <div className={styles.histRight}>
                {item.type === 'despacho' && item.assignedTo && !personFilter && selectedMember === 'todos' && (
                  <span className="badge st-teal" style={{ fontSize: '0.6rem' }}>{item.assignedTo}</span>
                )}
                <span className={`badge ${item.type === 'task' ? 'st-blue' : 'badge-media'}`} style={{ fontSize: '0.6rem' }}>
                  {item.type === 'task' ? 'Tarefa' : 'Despacho'}
                </span>
                <span className={styles.histDate}>{fmtD(item.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function Interns() {
  const { lawyer } = useAuth()
  const responsaveis = lawyer?.preferences?.responsaveis ?? []

  const [member,       setMember]       = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')

  const { data: rawTasks, loading, refetch } = useAllTasks()
  const tasks = useMemo(() => rawTasks ?? [], [rawTasks])

  const memberTasks = useMemo(() => {
    if (member === 'todos') return tasks
    if (member === 'sem_atribuicao') return tasks.filter(t => !t.assigned_to)
    return tasks.filter(t => t.assigned_to === member)
  }, [tasks, member])

  const filtered = useMemo(() => {
    if (filterStatus === 'todos') return memberTasks
    return memberTasks.filter(t => t.status === filterStatus)
  }, [memberTasks, filterStatus])

  const stats = useMemo(() => ({
    total:        memberTasks.length,
    pendente:     memberTasks.filter(t => t.status === 'pendente').length,
    em_andamento: memberTasks.filter(t => t.status === 'em_andamento').length,
    concluida:    memberTasks.filter(t => t.status === 'concluida').length,
    atrasada:     memberTasks.filter(t => isOverdue(t)).length,
  }), [memberTasks])

  async function handleStatusChange(taskId, newStatus) {
    await updateTaskStatus(taskId, newStatus)
    refetch()
  }

  async function handleCycleAssignee(taskId, currentAssignee) {
    if (responsaveis.length === 0) return
    const idx = responsaveis.indexOf(currentAssignee)
    const next = responsaveis[(idx + 1) % responsaveis.length]
    await updateTaskAssignee(taskId, next)
    refetch()
  }

  const unassigned = tasks.filter(t => !t.assigned_to).length

  /* ── Empty setup state ── */
  if (responsaveis.length === 0) {
    return (
      <PageShell title="Equipe" subtitle="Gestão de tarefas por responsável">
        <div className={styles.emptySetup}>
          <div className={styles.emptySetupIcon}>👥</div>
          <h3 className={styles.emptySetupTitle}>Nenhum membro cadastrado</h3>
          <p className={styles.emptySetupText}>
            Adicione os nomes da sua equipe em{' '}
            <strong>Configurações → Responsáveis</strong> para começar a atribuir tarefas e visualizar a produtividade de cada membro.
          </p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Equipe"
      subtitle={loading ? 'Carregando…' : `${tasks.length} tarefas · ${responsaveis.length} membros`}
    >
      {/* ── Member selector ── */}
      <div className={styles.memberBar}>
        <button
          className={`${styles.memberPill} ${member === 'todos' ? styles.memberPillActive : ''}`}
          onClick={() => setMember('todos')}
        >
          Todos
        </button>
        {responsaveis.map(r => (
          <button
            key={r}
            className={`${styles.memberPill} ${member === r ? styles.memberPillActive : ''}`}
            onClick={() => setMember(r)}
          >
            <span className={styles.pillAvatar}>{initials(r)}</span>
            {r}
          </button>
        ))}
        {unassigned > 0 && (
          <button
            className={`${styles.memberPill} ${member === 'sem_atribuicao' ? styles.memberPillActive : ''}`}
            onClick={() => setMember('sem_atribuicao')}
          >
            Sem atribuição
            <span className={styles.pillCount}>{unassigned}</span>
          </button>
        )}
      </div>

      {/* ── Overview grid (Todos) or Stats row (member) ── */}
      {member === 'todos' ? (
        <div className={styles.overviewGrid}>
          {responsaveis.map(r => (
            <MemberCard
              key={r}
              name={r}
              tasks={tasks.filter(t => t.assigned_to === r)}
              onClick={() => setMember(r)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.statsRow}>
          {[
            { label: 'Total',         value: stats.total,        accent: false },
            { label: 'Pendente',      value: stats.pendente,     accent: false },
            { label: 'Em andamento',  value: stats.em_andamento, accent: false },
            { label: 'Concluída',     value: stats.concluida,    accent: false },
            { label: 'Atrasada',      value: stats.atrasada,     accent: stats.atrasada > 0 },
          ].map(s => (
            <div key={s.label} className={`${styles.statCard} ${s.accent ? styles.statCardDanger : ''}`}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Task list section ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            {member === 'todos'
              ? 'Todas as tarefas'
              : member === 'sem_atribuicao'
                ? 'Sem atribuição'
                : `Tarefas — ${member}`}
          </span>
          <div className={styles.filterGroup}>
            {[
              { v: 'todos',        l: 'Todas' },
              { v: 'pendente',     l: 'Pendente' },
              { v: 'em_andamento', l: 'Em andamento' },
              { v: 'concluida',    l: 'Concluída' },
            ].map(({ v, l }) => (
              <button
                key={v}
                className={`${styles.filterBtn} ${filterStatus === v ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus(v)}
              >{l}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nenhuma tarefa encontrada</p>
          </div>
        ) : (
          <div className={styles.taskList}>
            {filtered.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                showMember={member === 'todos' || member === 'sem_atribuicao'}
                onStatusChange={handleStatusChange}
                responsaveis={responsaveis}
                onCycleAssignee={handleCycleAssignee}
              />
            ))}
          </div>
        )}
      </div>

      <HistorySection lawyerId={lawyer?.id} responsaveis={responsaveis} selectedMember={member} />
    </PageShell>
  )
}
