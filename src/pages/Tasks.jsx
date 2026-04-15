import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import PageShell from '@/components/ui/PageShell'
import ViewToggle from '@/components/ui/ViewToggle'
import styles from './Tasks.module.css'

/* ─── MOCK DATA — substituir por useTasks() do Supabase ──────────── */
const MOCK_TASKS = [
  { id: 1,  titulo: 'Protocolar recurso — Costa vs. Seguradora',  status: 'pendente',     prioridade: 'alta',  vencimento: '2026-04-14', caso: 'Costa vs. Seguradora Alfa' },
  { id: 2,  titulo: 'Enviar documentos ao perito — Matos',        status: 'em_andamento', prioridade: 'alta',  vencimento: '2026-04-14', caso: 'Família Matos — Inventário' },
  { id: 3,  titulo: 'Revisar minuta de contrato — Grupo XYZ',     status: 'pendente',     prioridade: 'media', vencimento: '2026-04-15', caso: 'Grupo XYZ — Societário' },
  { id: 4,  titulo: 'Ligação com cliente Pereira',                status: 'concluida',    prioridade: 'media', vencimento: '2026-04-15', caso: 'Pereira & Filhos — Trabalhista' },
  { id: 5,  titulo: 'Calcular honorários — Alves',                status: 'pendente',     prioridade: 'baixa', vencimento: '2026-04-16', caso: 'Alves — Execução Fiscal' },
  { id: 6,  titulo: 'Notificação extrajudicial — Lima',           status: 'em_andamento', prioridade: 'alta',  vencimento: '2026-04-17', caso: 'Lima vs. Banco Nacional' },
  { id: 7,  titulo: 'Preparar petição inicial — Rodrigues',       status: 'pendente',     prioridade: 'media', vencimento: '2026-04-18', caso: 'Rodrigues — Acidente' },
  { id: 8,  titulo: 'Audiência de instrução — Costa',             status: 'pendente',     prioridade: 'alta',  vencimento: '2026-04-19', caso: 'Costa vs. Seguradora Alfa' },
  { id: 9,  titulo: 'Relatório mensal de casos',                  status: 'pendente',     prioridade: 'baixa', vencimento: '2026-04-30', caso: '—' },
  { id: 10, titulo: 'Renovar procuração — Silva',                 status: 'concluida',    prioridade: 'media', vencimento: '2026-04-10', caso: 'Silva — Revisão Contratual' },
]

const KANBAN_COLS = [
  { key: 'pendente',     label: 'Pendente',     color: 'st-gold' },
  { key: 'em_andamento', label: 'Em Andamento', color: 'st-blue' },
  { key: 'concluida',    label: 'Concluída',    color: 'st-green' },
  { key: 'cancelada',    label: 'Cancelada',    color: 'st-dark' },
]

const PRI_CSS = { alta: 'badge-alta', media: 'badge-media', baixa: 'badge-baixa' }
const PRI_LABELS = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

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
                      const vencida = t.status !== 'concluida' && t.vencimento < today
                      return (
                        <div key={t.id} className={`${styles.kanbanCard} ${vencida ? styles.overdue : ''}`}>
                          <div className={styles.kanbanCardTitle}>{t.titulo}</div>
                          <div className={styles.kanbanCardMeta}>
                            <span className={`badge ${PRI_CSS[t.prioridade]}`}>{PRI_LABELS[t.prioridade]}</span>
                            <span className={`${styles.kanbanDate} ${vencida ? styles.overdueDate : ''}`}>
                              {new Date(t.vencimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
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
            const vencida = t.status !== 'concluida' && t.vencimento < today
            return (
              <tr key={t.id} className={`${styles.tableRow} ${vencida ? styles.overdueRow : ''}`}>
                <td className={styles.taskTitleCell}>{t.titulo}</td>
                <td className={styles.caseCell}>{t.caso}</td>
                <td><span className={`badge ${PRI_CSS[t.prioridade]}`}>{PRI_LABELS[t.prioridade]}</span></td>
                <td><span className={`badge badge-${t.status === 'em_andamento' ? 'pendente' : t.status}`}>
                  {KANBAN_COLS.find(c => c.key === t.status)?.label ?? t.status}
                </span></td>
                <td className={`${styles.dateCell} ${vencida ? styles.overdueDate : ''}`}>
                  {new Date(t.vencimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
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

export default function Tasks() {
  const { lawyer } = useAuth()
  const prefs = loadPreferences(lawyer?.id)

  const [view, setView] = useState(prefs.tarefas_view ?? 'kanban')
  const [search, setSearch] = useState('')
  const [filterPri, setFilterPri] = useState('todos')

  function handleViewChange(v) {
    setView(v)
    savePreferences(lawyer?.id, { tarefas_view: v })
  }

  const filtered = useMemo(() => {
    let list = MOCK_TASKS
    if (filterPri !== 'todos') list = list.filter(t => t.prioridade === filterPri)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.titulo.toLowerCase().includes(q) || t.caso.toLowerCase().includes(q))
    }
    return list
  }, [search, filterPri])

  const pendentes = MOCK_TASKS.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length

  return (
    <PageShell
      title="Tarefas"
      subtitle={`${MOCK_TASKS.length} tarefas · ${pendentes} pendentes`}
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
            {[{ v: 'todos', l: 'Todas' }, { v: 'alta', l: 'Alta' }, { v: 'media', l: 'Média' }, { v: 'baixa', l: 'Baixa' }].map(({ v, l }) => (
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
      {view === 'kanban' ? <KanbanView tasks={filtered} /> : <ListView tasks={filtered} />}
    </PageShell>
  )
}
