import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import { useAllTasks } from '@/hooks/useTasks'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import PageShell from '@/components/ui/PageShell'
import ViewToggle from '@/components/ui/ViewToggle'
import Modal from '@/components/ui/Modal'
import TaskForm from '@/components/forms/TaskForm'
import styles from './Tasks.module.css'

/* ── Calendar helpers ───────────────────────────────────────────────── */
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const PRI_DOT = { urgente: 'var(--red)', alta: 'var(--red)', media: '#f59e0b', baixa: 'var(--accent)' }
const PRI_DOT_HEX = { urgente: '#ef4444', alta: '#ef4444', media: '#f59e0b', baixa: '#4361ee' }

const RESP_COLORS = ['#4361ee','#7c3aed','#2a9d8f','#e76f51','#f4a261','#264653','#1d3557','#c77dff','#e63946','#06b6d4']

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function startOfWeek(d) {
  const sd = new Date(d)
  sd.setDate(d.getDate() - d.getDay())
  return sd
}
function addDays(d, n) {
  const nd = new Date(d)
  nd.setDate(d.getDate() + n)
  return nd
}
function respColor(name, responsaveis) {
  const idx = responsaveis.indexOf(name)
  return idx >= 0 ? RESP_COLORS[idx % RESP_COLORS.length] : '#888'
}

/* ── data mapper ────────────────────────────────────────────────────── */
function mapTask(t) {
  return {
    id:          t.id,
    titulo:      t.title,
    status:      t.status,
    prioridade:  t.priority,
    vencimento:  t.due_date?.split('T')[0] ?? null,
    caso:        t.cases?.title ?? '—',
    responsavel: t.assigned_to ?? null,
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

/* ── Agenda: shared sub-components ─────────────────────────────────── */
function RespPills({ responsaveis, value, onChange }) {
  if (responsaveis.length === 0) return null
  return (
    <div className={styles.respPills}>
      <button
        className={`${styles.respPill} ${value === 'todos' ? styles.respPillActiveTodos : ''}`}
        onClick={() => onChange('todos')}
      >Todos</button>
      {responsaveis.map((r, i) => {
        const col = RESP_COLORS[i % RESP_COLORS.length]
        const active = value === r
        return (
          <button
            key={r}
            className={`${styles.respPill} ${active ? styles.respPillActive : ''}`}
            style={active ? { background: col, color: '#fff', borderColor: col } : {}}
            onClick={() => onChange(r)}
          >
            <span className={styles.respPillDot} style={{ background: col }} />
            {r}
          </button>
        )
      })}
    </div>
  )
}

function AgendaTaskRow({ t, todayISO, responsaveis, onClick }) {
  const overdue = t.due_date && t.due_date.split('T')[0] < todayISO && !['concluida','cancelada'].includes(t.status)
  const done    = t.status === 'concluida'
  return (
    <div
      className={`${styles.agendaTaskRow} ${overdue ? styles.agendaTaskOverdue : ''} ${done ? styles.agendaTaskDone : ''}`}
      onClick={() => onClick(t.id)}
    >
      <span className={styles.agendaTaskDot} style={{ background: PRI_DOT_HEX[t.priority] ?? '#888' }} />
      <span className={styles.agendaTaskTitle}>{t.title}</span>
      {t.assigned_to && (
        <span
          className={styles.agendaTaskResp}
          style={{
            background: respColor(t.assigned_to, responsaveis) + '22',
            color: respColor(t.assigned_to, responsaveis),
          }}
        >
          {t.assigned_to.split(' ')[0]}
        </span>
      )}
    </div>
  )
}

/* ── Agenda view ────────────────────────────────────────────────────── */
function AgendaView({ rawTasks, responsaveis, session, onEdit, onNewWithDate, refetch }) {
  const today    = new Date()
  const todayISO = toISO(today)
  const tomorrowISO = toISO(addDays(today, 1))

  const [dayOffset,  setDayOffset]  = useState(0)
  const [filterDay,  setFilterDay]  = useState('todos')
  const [filterNDL,  setFilterNDL]  = useState('todos')
  const [filterTmr,  setFilterTmr]  = useState('todos')
  const [filterWk,   setFilterWk]   = useState('todos')
  const [quickTitle, setQuickTitle] = useState('')
  const [addingQuick, setAddingQuick] = useState(false)

  const selectedISO = toISO(addDays(today, dayOffset))

  function byResp(tasks, filter) {
    if (filter === 'todos') return tasks
    return tasks.filter(t => t.assigned_to === filter)
  }

  const active = rawTasks.filter(t => !['concluida','cancelada'].includes(t.status))

  const todayTasks    = byResp(active.filter(t => t.due_date?.split('T')[0] === selectedISO), filterDay)
  const noDateTasks   = byResp(active.filter(t => !t.due_date), filterNDL)
  const tomorrowTasks = byResp(active.filter(t => t.due_date?.split('T')[0] === tomorrowISO), filterTmr)

  const weekDays = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => {
      const d   = addDays(today, i)
      const iso = toISO(d)
      return {
        d, iso,
        isToday: iso === todayISO,
        tasks: rawTasks.filter(t =>
          t.due_date?.split('T')[0] === iso &&
          (filterWk === 'todos' || t.assigned_to === filterWk)
        ),
      }
    })
  , [rawTasks, filterWk, todayISO])

  function dayTitle() {
    if (dayOffset === 0) return 'Hoje'
    if (dayOffset === 1) return 'Amanhã'
    if (dayOffset === -1) return 'Ontem'
    return new Date(selectedISO + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  async function handleQuickAdd(e) {
    e.preventDefault()
    const title = quickTitle.trim()
    if (!title) return
    setAddingQuick(true)
    await supabase.from('tasks').insert({
      lawyer_id:   session.user.id,
      title,
      priority:    'media',
      status:      'pendente',
      due_date:    null,
      assigned_to: filterNDL !== 'todos' ? filterNDL : null,
    })
    setAddingQuick(false)
    setQuickTitle('')
    refetch()
  }

  return (
    <div className={styles.agendaGrid}>

      {/* ── Card 1: Tarefas do Dia ── */}
      <div className={styles.agendaCard}>
        <div className={styles.agendaCardHeader}>
          <div className={styles.agendaNavRow}>
            <button className={styles.agendaNavBtn} onClick={() => setDayOffset(d => d - 1)}>‹</button>
            <button className={styles.agendaNavBtnToday} onClick={() => setDayOffset(0)}>Hoje</button>
            <button className={styles.agendaNavBtn} onClick={() => setDayOffset(d => d + 1)}>›</button>
          </div>
          <span className={styles.agendaCardTitle}>
            Tarefas e Compromissos — <em>{dayTitle()}</em>
          </span>
          <button
            className={styles.agendaAddBtn}
            onClick={() => onNewWithDate(selectedISO, filterDay !== 'todos' ? filterDay : null)}
            title="Nova tarefa"
          >+</button>
        </div>
        <RespPills responsaveis={responsaveis} value={filterDay} onChange={setFilterDay} />
        <div className={styles.agendaCardBody}>
          {todayTasks.length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma tarefa neste dia</div>
            : todayTasks.map(t => (
                <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} />
              ))
          }
        </div>
      </div>

      {/* ── Card 2: Tarefas Sem Prazo ── */}
      <div className={styles.agendaCard}>
        <div className={styles.agendaCardHeader}>
          <span className={styles.agendaCardTitle}>Tarefas Sem Prazo</span>
        </div>
        <RespPills responsaveis={responsaveis} value={filterNDL} onChange={setFilterNDL} />
        <form className={styles.agendaQuickAdd} onSubmit={handleQuickAdd}>
          <input
            className={styles.agendaQuickInput}
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder="Nova tarefa sem prazo…"
            disabled={addingQuick}
          />
          <button type="submit" className={styles.agendaQuickBtn} disabled={addingQuick || !quickTitle.trim()}>
            + Adicionar
          </button>
        </form>
        <div className={styles.agendaCardBody}>
          {noDateTasks.length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma tarefa sem prazo</div>
            : noDateTasks.map(t => (
                <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} />
              ))
          }
        </div>
      </div>

      {/* ── Card 3: Amanhã ── */}
      <div className={styles.agendaCard}>
        <div className={styles.agendaCardHeader}>
          <span className={styles.agendaCardTitle}>Amanhã</span>
          <span className={styles.agendaCardSub}>
            {new Date(tomorrowISO + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          <button
            className={styles.agendaAddBtn}
            onClick={() => onNewWithDate(tomorrowISO, filterTmr !== 'todos' ? filterTmr : null)}
            title="Nova tarefa para amanhã"
          >+</button>
        </div>
        <RespPills responsaveis={responsaveis} value={filterTmr} onChange={setFilterTmr} />
        <div className={styles.agendaCardBody}>
          {tomorrowTasks.length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma tarefa para amanhã</div>
            : tomorrowTasks.map(t => (
                <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} />
              ))
          }
        </div>
      </div>

      {/* ── Card 4: Esta Semana e Próxima ── */}
      <div className={`${styles.agendaCard} ${styles.agendaCardFull}`}>
        <div className={styles.agendaCardHeader}>
          <span className={styles.agendaCardTitle}>Esta Semana e Próxima</span>
          <button
            className={styles.agendaAddBtn}
            onClick={() => onNewWithDate(null, filterWk !== 'todos' ? filterWk : null)}
            title="Nova tarefa"
          >+</button>
        </div>
        <RespPills responsaveis={responsaveis} value={filterWk} onChange={setFilterWk} />
        <div className={styles.weekGrid}>
          {weekDays.map(({ d, iso, isToday, tasks }) => (
            <div key={iso} className={`${styles.weekDayCol} ${isToday ? styles.weekDayColToday : ''}`}>
              <div className={styles.weekDayLabel}>
                <span className={styles.weekDayWkd}>{WEEKDAYS_SHORT[d.getDay()]}</span>
                <span className={`${styles.weekDayNum} ${isToday ? styles.weekDayNumToday : ''}`}>{d.getDate()}</span>
              </div>
              <div className={styles.weekDayTasks}>
                {tasks.slice(0, 3).map(t => (
                  <div
                    key={t.id}
                    className={styles.weekTaskChip}
                    style={{ borderLeftColor: PRI_DOT_HEX[t.priority] ?? '#888' }}
                    onClick={() => onEdit(t.id)}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
                {tasks.length > 3 && (
                  <div className={styles.weekTaskMore}>+{tasks.length - 3}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

/* ── KanbanView ─────────────────────────────────────────────────────── */
function KanbanView({ tasks, onEdit }) {
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
                        <div key={t.id} className={`${styles.kanbanCard} ${vencida ? styles.overdue : ''}`}
                          onClick={() => onEdit(t.id)} style={{ cursor: 'pointer' }}>
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

/* ── ListView ───────────────────────────────────────────────────────── */
function ListView({ tasks, onEdit }) {
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
              <tr key={t.id} className={`${styles.tableRow} ${vencida ? styles.overdueRow : ''}`}
                onClick={() => onEdit(t.id)} style={{ cursor: 'pointer' }}>
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

/* ── Calendar view ──────────────────────────────────────────────────── */
function CalendarView({ tasks, onEdit }) {
  const [calMode, setCalMode] = useState('mes')
  const [anchor,  setAnchor]  = useState(() => new Date())

  const todayISO = new Date().toISOString().split('T')[0]

  const tasksByDate = useMemo(() => {
    const map = {}
    for (const t of tasks) {
      if (t.vencimento) {
        if (!map[t.vencimento]) map[t.vencimento] = []
        map[t.vencimento].push(t)
      }
    }
    return map
  }, [tasks])

  function navigate(dir) {
    const d = new Date(anchor)
    if (calMode === 'mes')    d.setMonth(d.getMonth() + dir)
    else if (calMode === 'semana') d.setDate(d.getDate() + dir * 7)
    else                      d.setDate(d.getDate() + dir)
    setAnchor(d)
  }

  let periodLabel
  if (calMode === 'mes') {
    periodLabel = `${MONTHS_PT[anchor.getMonth()]} ${anchor.getFullYear()}`
  } else if (calMode === 'semana') {
    const sun = startOfWeek(anchor)
    const sat = addDays(sun, 6)
    periodLabel = `${sun.getDate()} ${MONTHS_PT[sun.getMonth()].slice(0,3)} – ${sat.getDate()} ${MONTHS_PT[sat.getMonth()].slice(0,3)} ${sat.getFullYear()}`
  } else {
    periodLabel = anchor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function renderMonth() {
    const year  = anchor.getFullYear()
    const month = anchor.getMonth()
    const firstDay  = new Date(year, month, 1)
    const startDay  = new Date(firstDay)
    startDay.setDate(1 - firstDay.getDay())

    const cells = []
    for (let i = 0; i < 42; i++) {
      const d   = addDays(startDay, i)
      const iso = toISO(d)
      cells.push({ d, iso, isCurrentMonth: d.getMonth() === month, isToday: iso === todayISO, dayTasks: tasksByDate[iso] ?? [] })
    }
    const last7   = cells.slice(35)
    const trimmed = last7.every(c => !c.isCurrentMonth) ? cells.slice(0, 35) : cells

    return (
      <div className={styles.calGrid}>
        <div className={styles.calGridHeader}>
          {WEEKDAYS_SHORT.map(w => <div key={w} className={styles.calWeekday}>{w}</div>)}
        </div>
        <div className={styles.calMonthBody}>
          {trimmed.map(({ d, iso, isCurrentMonth, isToday, dayTasks }) => (
            <div
              key={iso}
              className={`${styles.calCell} ${!isCurrentMonth ? styles.calCellOther : ''} ${isToday ? styles.calCellToday : ''}`}
              onClick={() => { setAnchor(d); setCalMode('dia') }}
            >
              <span className={styles.calCellNum}>{d.getDate()}</span>
              <div className={styles.calCellTasks}>
                {dayTasks.slice(0, 3).map(t => (
                  <div
                    key={t.id}
                    className={styles.calChip}
                    style={{ borderLeftColor: PRI_DOT[t.prioridade] ?? 'var(--accent)' }}
                    onClick={e => { e.stopPropagation(); onEdit(t.id) }}
                  >
                    {t.titulo}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className={styles.calChipMore}>+{dayTasks.length - 3} mais</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderWeek() {
    const sun  = startOfWeek(anchor)
    const days = Array.from({ length: 7 }, (_, i) => addDays(sun, i))
    return (
      <div className={styles.calWeek}>
        {days.map(d => {
          const iso      = toISO(d)
          const isToday  = iso === todayISO
          const dayTasks = tasksByDate[iso] ?? []
          return (
            <div key={iso} className={`${styles.calWeekCol} ${isToday ? styles.calWeekColToday : ''}`}>
              <div className={styles.calWeekColHeader} onClick={() => { setAnchor(d); setCalMode('dia') }}>
                <span className={styles.calWeekWkd}>{WEEKDAYS_SHORT[d.getDay()]}</span>
                <span className={`${styles.calWeekNum} ${isToday ? styles.calWeekNumToday : ''}`}>{d.getDate()}</span>
              </div>
              <div className={styles.calWeekItems}>
                {dayTasks.map(t => (
                  <div
                    key={t.id}
                    className={`${styles.calWeekTask} ${t.status === 'concluida' ? styles.calTaskDone : ''}`}
                    style={{ borderLeftColor: PRI_DOT[t.prioridade] ?? 'var(--accent)' }}
                    onClick={() => onEdit(t.id)}
                  >
                    <span className={styles.calWeekTaskTitle}>{t.titulo}</span>
                    {t.caso !== '—' && <span className={styles.calWeekTaskCase}>{t.caso}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderDay() {
    const iso      = toISO(anchor)
    const dayTasks = tasksByDate[iso] ?? []
    return (
      <div className={styles.calDay}>
        {dayTasks.length === 0
          ? <div className={styles.calDayEmpty}>Nenhuma tarefa neste dia.</div>
          : dayTasks.map(t => (
            <div
              key={t.id}
              className={`${styles.calDayTask} ${t.status === 'concluida' ? styles.calTaskDone : ''}`}
              style={{ borderLeftColor: PRI_DOT[t.prioridade] ?? 'var(--accent)' }}
              onClick={() => onEdit(t.id)}
            >
              <div className={styles.calDayTaskMain}>
                <span className={styles.calDayTaskTitle}>{t.titulo}</span>
                {t.caso !== '—' && <span className={styles.calDayTaskCase}>{t.caso}</span>}
              </div>
              <div className={styles.calDayTaskMeta}>
                <span className={`badge ${PRI_CSS[t.prioridade]}`}>{PRI_LABELS[t.prioridade]}</span>
                <span className={`badge badge-${t.status === 'em_andamento' ? 'pendente' : t.status}`}>
                  {KANBAN_COLS.find(c => c.key === t.status)?.label ?? t.status}
                </span>
              </div>
            </div>
          ))
        }
      </div>
    )
  }

  return (
    <div className={styles.calendarWrap}>
      <div className={styles.calToolbar}>
        <div className={styles.calNav}>
          <button className={styles.calNavBtn} onClick={() => navigate(-1)}>‹</button>
          <button className={styles.calTodayBtn} onClick={() => setAnchor(new Date())}>Hoje</button>
          <button className={styles.calNavBtn} onClick={() => navigate(1)}>›</button>
        </div>
        <span className={styles.calPeriod}>{periodLabel}</span>
        <div className={styles.calModeToggle}>
          {[['mes','Mês'],['semana','Semana'],['dia','Dia']].map(([m, l]) => (
            <button
              key={m}
              className={`${styles.calModeBtn} ${calMode === m ? styles.calModeBtnActive : ''}`}
              onClick={() => setCalMode(m)}
            >{l}</button>
          ))}
        </div>
      </div>
      {calMode === 'mes'    && renderMonth()}
      {calMode === 'semana' && renderWeek()}
      {calMode === 'dia'    && renderDay()}
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function Tasks() {
  const { lawyer, session } = useAuth()
  const toast = useToast()
  const prefs = loadPreferences(lawyer?.id)
  const responsaveis = lawyer?.preferences?.responsaveis ?? []

  const [view, setView]         = useState(prefs.tarefas_view ?? 'agenda')
  const [search, setSearch]     = useState('')
  const [filterPri, setFilterPri] = useState('todos')
  const [formOpen, setFormOpen] = useState(false)
  const [editing,  setEditing]  = useState(null)

  const { data: rawTasks, loading, error, refetch } = useAllTasks()
  const tasks = useMemo(() => (rawTasks ?? []).map(mapTask), [rawTasks])

  const rawById = useMemo(() =>
    Object.fromEntries((rawTasks ?? []).map(r => [r.id, r]))
  , [rawTasks])

  function openNew()    { setEditing(null); setFormOpen(true) }
  function openEdit(id) { setEditing(rawById[id] ?? null); setFormOpen(true) }
  function handleSave() {
    refetch()
    setFormOpen(false)
    toast.success(editing ? 'Tarefa atualizada.' : 'Tarefa criada.')
  }

  function handleViewChange(v) {
    setView(v)
    savePreferences(lawyer?.id, { tarefas_view: v })
  }

  function openNewWithDate(dateISO, assignedTo) {
    setEditing({
      due_date:    dateISO ? dateISO + 'T12:00:00' : null,
      assigned_to: assignedTo ?? '',
    })
    setFormOpen(true)
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
      viewToggle={<ViewToggle value={view} onChange={handleViewChange} showCalendar showAgenda />}
      action={
        <button className={styles.btnNovo} onClick={openNew}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Nova tarefa
        </button>
      }
      filters={view !== 'agenda'
        ? (
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
        )
        : null
      }
    >
      {error
        ? <div className={styles.emptyState}><p>Erro ao carregar tarefas.</p></div>
        : view === 'agenda'
          ? <AgendaView
              rawTasks={rawTasks ?? []}
              responsaveis={responsaveis}
              session={session}
              onEdit={openEdit}
              onNewWithDate={openNewWithDate}
              refetch={refetch}
            />
          : view === 'kanban'
            ? <KanbanView tasks={filtered} onEdit={openEdit} />
            : view === 'calendario'
              ? <CalendarView tasks={filtered} onEdit={openEdit} />
              : <ListView tasks={filtered} onEdit={openEdit} />
      }

      {formOpen && (
        <Modal title={editing?.id ? 'Editar tarefa' : 'Nova tarefa'} onClose={() => setFormOpen(false)}>
          <TaskForm initial={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </Modal>
      )}
    </PageShell>
  )
}
