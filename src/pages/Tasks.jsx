import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import { useAllTasks } from '@/hooks/useTasks'
import PageShell from '@/components/ui/PageShell'
import ViewToggle from '@/components/ui/ViewToggle'
import styles from './Tasks.module.css'

/* ── data mapper ────────────────────────────────────────────────────── */
function mapTask(t) {
  return {
    id:         t.id,
    titulo:     t.title,
    status:     t.status,
    prioridade: t.priority,
    vencimento: t.due_date?.split('T')[0] ?? null,
    caso:       t.cases?.title ?? '—',
  }
}

/* ── constants ─────────────────────────────────────────────────────── */
const KANBAN_COLS = [
  { key: 'pendente',     label: 'Pendente',     color: 'st-gold' },
  { key: 'em_andamento', label: 'Em Andamento', color: 'st-blue' },
  { key: 'concluida',    label: 'Concluída',    color: 'st-green' },
  { key: 'cancelada',    label: 'Cancelada',    color: 'st-dark' },
]

const PRI_CSS    = { urgente: 'badge-alta', alta: 'badge-alta', media: 'badge-media', baixa: 'badge-baixa' }
const PRI_LABELS = { urgente: 'Urgente',   alta: 'Alta',       media: 'Média',       baixa: 'Baixa' }

function fmtDate(d, opts) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', opts)
}

/* ── sub-components ─────────────────────────────────────────────────── */
function KanbanView({ tasks }) {
  const today = new Date().toISOString().split('T')[0]
  return (
    <div className={styles.kanbanWrapper}>
      <div className={styles.kanbanBoard}>
        {KANBAN_COLS.map(col => {
          const items = tasks.filter(t => t.status === col.key)
          return (
            <div key={col.key} className={styles.kanbanCol}>
              <div className={styles.kanbanColHeader}>
                <span className={`${styles.kanbanColTitle} ${col.color}`}>{col.label}</span>
                <span className={styles.kanbanColCount}>{items.length}</span>
              </div>
              <div className={styles.kanbanItems}>
                {items.length === 0
                  ? <div className={styles.kanbanEmpty}>Vazio</div>
                  : items.map(t => {
                      const vencida = t.status !== 'concluida' && t.vencimento && t.vencimento < today
                      return (
                        <div key={t.id} className={`${styles.kanbanCard} ${vencida ? styles.overdue : ''}`}>
                          <div className={styles.kanbanCardTitle}>{t.titulo}</div>
                          <div className={styles.kanbanCardMeta}>
                            <span className={`badge ${PRI_CSS[t.prioridade]}`}>{PRI_LABELS[t.prioridade]}</span>
                            {t.vencimento && (
                              <span className={`${styles.kanbanDate} ${vencida ? styles.overdueDate : ''}`}>
                                {fmtDate(t.vencimento, { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </div>
                          {t.caso !== '—' && <div className={styles.kanbanCase}>{t.caso}</div>}
                        </div>
                      )
                    })
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListView({ tasks }) {
  const today = new Date().toISOString().split('T')[0]
  if (tasks.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>✓</div>
      <p>Nenhuma tarefa encontrada</p>
    </div>
  )
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr><th>Tarefa</th><th>Caso</th><th>Prioridade</th><th>Status</th><th>Vencimento</th></tr>
        </thead>
        <tbody>
          {tasks.map(t => {
            const vencida = t.status !== 'concluida' && t.vencimento && t.vencimento < today
            return (
              <tr key={t.id} className={`${styles.tableRow} ${vencida ? styles.overdueRow : ''}`}>
                <td className={styles.taskTitleCell}>{t.titulo}</td>
                <td className={styles.caseCell}>{t.caso}</td>
                <td><span className={`badge ${PRI_CSS[t.prioridade]}`}>{PRI_LABELS[t.prioridade]}</span></td>
                <td><span className={`badge badge-${t.status === 'em_andamento' ? 'pendente' : t.status}`}>
                  {KANBAN_COLS.find(c => c.key === t.status)?.label ?? t.status}
                </span></td>
                <td className={`${styles.dateCell} ${vencida ? styles.overdueDate : ''}`}>
                  {fmtDate(t.vencimento, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  {vencida && <span className={styles.vencidaTag}>Vencida</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function Tasks() {
  const { lawyer } = useAuth()
  const prefs = loadPreferences(lawyer?.id)

  const [view, setView]         = useState(prefs.tarefas_view ?? 'kanban')
  const [search, setSearch]     = useState('')
  const [filterPri, setFilterPri] = useState('todos')

  const { data: rawTasks, loading, error } = useAllTasks()
  const tasks = useMemo(() => (rawTasks ?? []).map(mapTask), [rawTasks])

  function handleViewChange(v) {
    setView(v)
    savePreferences(lawyer?.id, { tarefas_view: v })
  }

  const filtered = useMemo(() => {
    let list = tasks
    if (filterPri !== 'todos') list = list.filter(t => t.prioridade === filterPri)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.titulo.toLowerCase().includes(q) || t.caso.toLowerCase().includes(q))
    }
    return list
  }, [tasks, search, filterPri])

  const pendentes = tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length

  return (
    <PageShell
      title="Tarefas"
      subtitle={loading ? 'Carregando…' : `${tasks.length} tarefas · ${pendentes} pendentes`}
      viewToggle={<ViewToggle value={view} onChange={handleViewChange} />}
      action={
        <button className={styles.btnNovo}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Nova tarefa
        </button>
      }
      filters={
        <>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.856a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar tarefa ou caso..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            {[{ v: 'todos', l: 'Todas' }, { v: 'urgente', l: 'Urgente' }, { v: 'alta', l: 'Alta' }, { v: 'media', l: 'Média' }, { v: 'baixa', l: 'Baixa' }].map(({ v, l }) => (
              <button
                key={v}
                className={`${styles.filterBtn} ${filterPri === v ? styles.filterActive : ''}`}
                onClick={() => setFilterPri(v)}
              >{l}</button>
            ))}
          </div>
        </>
      }
    >
      {error
        ? <div className={styles.emptyState}><p>Erro ao carregar tarefas.</p></div>
        : view === 'kanban' ? <KanbanView tasks={filtered} /> : <ListView tasks={filtered} />
      }
    </PageShell>
  )
}
