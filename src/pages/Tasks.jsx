import { useState, useMemo, Fragment } from 'react'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import { useAllTasks, updateTaskStatus, updateTaskOrder, updateTaskAssignee } from '@/hooks/useTasks'
import { useUpcomingHearings } from '@/hooks/useHearings'
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

/* ── Card icons ─────────────────────────────────────────────────────── */
const ICON_TODAY = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
    <path d="M5.5 1.5v3M10.5 1.5v3M2 7h12"/>
    <circle cx="8" cy="10.5" r="2" fill="currentColor" stroke="none"/>
  </svg>
)

const ICON_NODATE = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
    <path d="M5.5 1.5v3M10.5 1.5v3M2 7h12"/>
    <path d="M5.5 10.5h5"/>
  </svg>
)

const ICON_TMR = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
    <path d="M5.5 1.5v3M10.5 1.5v3M2 7h12"/>
    <path d="M5.5 10.5h2.5M10.5 8.5l2 2-2 2"/>
  </svg>
)

const ICON_UPCOMING = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
    <path d="M5.5 1.5v3M10.5 1.5v3M2 7h12"/>
    <circle cx="5"  cy="9.5"  r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="8"  cy="9.5"  r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="11" cy="9.5"  r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="5"  cy="12.5" r="0.9" fill="currentColor" stroke="none" opacity="0.4"/>
    <circle cx="8"  cy="12.5" r="0.9" fill="currentColor" stroke="none" opacity="0.4"/>
    <circle cx="11" cy="12.5" r="0.9" fill="currentColor" stroke="none" opacity="0.4"/>
  </svg>
)

const ICON_HEARING = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 14.5h13"/>
    <rect x="2.5" y="10" width="11" height="4" rx="0.5"/>
    <path d="M4.5 10V8M8 10V8M11.5 10V8"/>
    <path d="M2.5 8h11"/>
    <path d="M8 2.5l5.5 5.5H2.5L8 2.5z"/>
  </svg>
)

function CardIcon({ icon }) {
  return <span className={styles.agendaCardIcon}>{icon}</span>
}

function HearingEventItem({ h, todayISO }) {
  const isToday = h.date === todayISO
  const d = new Date(h.date + 'T12:00:00')
  return (
    <div className={styles.eventItem}>
      <div className={styles.evDateCol}>
        <span className={styles.evWeekday}>{WEEKDAYS_SHORT[d.getDay()]}</span>
        <span className={styles.evDay}>{d.getDate()}</span>
      </div>
      <div className={styles.evSep} />
      <div className={styles.evBody}>
        <div className={styles.evTitle}>{h.title}</div>
        <div className={styles.evMeta}>
          <span className={`${styles.evTag} ${isToday ? styles.evTagHoje : styles.evTagProx}`}>
            {isToday ? 'Hoje' : d.toLocaleDateString('pt-BR', { month: 'short' })}
          </span>
          {h.cases?.title && <span>{h.cases.title}</span>}
          {h.location && <span>{h.location}</span>}
        </div>
      </div>
      {h.time && <span className={styles.evHora}>{h.time.slice(0, 5)}</span>}
    </div>
  )
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

function AgendaTaskRow({ t, todayISO, responsaveis, onClick, onCheck, onOrderChange, onDragStart, onDragEnd, isDragging, onCycleAssignee }) {
  const overdue = t.due_date && t.due_date.split('T')[0] < todayISO && !['concluida','cancelada'].includes(t.status)
  const done    = t.status === 'concluida'
  return (
    <div
      className={`${styles.agendaTaskRow} ${overdue ? styles.agendaTaskOverdue : ''} ${done ? styles.agendaTaskDone : ''} ${isDragging ? styles.agendaTaskDragging : ''}`}
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart?.(t.id) }}
      onDragEnd={e => { e.stopPropagation(); onDragEnd?.() }}
    >
      <input
        type="number"
        min="1"
        max="99"
        className={styles.agendaOrderInput}
        defaultValue={t.sort_order ?? ''}
        placeholder="–"
        title="Ordem (1 = primeira)"
        onClick={e => e.stopPropagation()}
        onBlur={e => onOrderChange(t.id, e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.target.blur() } }}
      />
      <button
        className={`${styles.agendaCheckBtn} ${done ? styles.agendaCheckBtnDone : ''}`}
        onClick={e => { e.stopPropagation(); onCheck(t.id) }}
        title={done ? 'Desmarcar' : 'Marcar como concluída'}
      />
      <span className={styles.agendaTaskDot} style={{ background: PRI_DOT_HEX[t.priority] ?? '#888' }} />
      <span className={styles.agendaTaskTitle} onClick={() => onClick(t.id)}>{t.title}</span>
      {t.assigned_to && (
        <span
          className={styles.agendaTaskResp}
          style={{
            background: respColor(t.assigned_to, responsaveis) + '22',
            color: respColor(t.assigned_to, responsaveis),
            cursor: responsaveis.length > 0 ? 'pointer' : 'default',
          }}
          title={responsaveis.length > 0 ? 'Clique para mudar responsável' : t.assigned_to}
          onClick={e => { e.stopPropagation(); onCycleAssignee?.(t.id, t.assigned_to) }}
        >
          {t.assigned_to.split(' ')[0]}
        </span>
      )}
    </div>
  )
}

/* ── Agenda view ────────────────────────────────────────────────────── */
function AgendaView({ rawTasks, responsaveis, filterResp, session, onEdit, onNewWithDate, refetch, onCycleAssignee }) {
  const today    = new Date()
  const todayISO = toISO(today)
  const tomorrowISO = toISO(addDays(today, 1))

  const [dayOffset,  setDayOffset]  = useState(0)
  const [weekOffset, setWeekOffset] = useState(2)
  const [quickTitle, setQuickTitle] = useState('')
  const [addingQuick, setAddingQuick] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const { data: rawHearings } = useUpcomingHearings()

  const selectedISO = toISO(addDays(today, dayOffset))

  function handleDragStart(taskId) { setDraggingId(taskId) }
  function handleDragEnd()          { setDraggingId(null); setDropTarget(null) }

  function handleDragOver(key, e) {
    e.preventDefault()
    if (dropTarget !== key) setDropTarget(key)
  }
  function handleDragLeave(e) {
    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) setDropTarget(null)
  }

  async function handleDropOnZone(dueDate) {
    if (!draggingId) return
    setDropTarget(null)
    await supabase.from('tasks').update({ due_date: dueDate }).eq('id', draggingId)
    setDraggingId(null)
    refetch()
  }

  async function handleCheck(taskId) {
    await updateTaskStatus(taskId, 'concluida')
    refetch()
  }

  async function handleOrderChange(taskId, value) {
    await updateTaskOrder(taskId, value)
    refetch()
  }

  function byResp(tasks, filter) {
    if (filter === 'todos') return tasks
    return tasks.filter(t => t.assigned_to === filter)
  }

  function byOrder(tasks) {
    return [...tasks].sort((a, b) => {
      if (a.sort_order == null && b.sort_order == null) return 0
      if (a.sort_order == null) return 1
      if (b.sort_order == null) return -1
      return a.sort_order - b.sort_order
    })
  }

  const active = rawTasks.filter(t => !['concluida','cancelada'].includes(t.status))

  const todayTasks    = byOrder(byResp(active.filter(t => t.due_date?.split('T')[0] === selectedISO), filterResp))
  const noDateTasks   = byOrder(byResp(active.filter(t => !t.due_date), filterResp))
  const tomorrowTasks = byOrder(byResp(active.filter(t => t.due_date?.split('T')[0] === tomorrowISO), filterResp))

  const weekDays = useMemo(() =>
    Array.from({ length: 21 }, (_, i) => {
      const d   = addDays(today, weekOffset + i)
      const iso = toISO(d)
      return {
        d, iso,
        isToday: iso === todayISO,
        tasks: byOrder(rawTasks.filter(t =>
          t.due_date?.split('T')[0] === iso &&
          (filterResp === 'todos' || t.assigned_to === filterResp)
        )),
      }
    })
  , [rawTasks, filterResp, todayISO, weekOffset])

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
      assigned_to: filterResp !== 'todos' ? filterResp : null,
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
          <CardIcon icon={ICON_TODAY} />
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
            onClick={() => onNewWithDate(selectedISO, filterResp !== 'todos' ? filterResp : null)}
            title="Nova tarefa"
          >+</button>
        </div>
        <div
          className={`${styles.agendaCardBody} ${dropTarget === 'today' ? styles.agendaCardBodyDrop : ''}`}
          onDragOver={e => handleDragOver('today', e)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDropOnZone(selectedISO + 'T12:00:00')}
        >
          {todayTasks.length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma tarefa neste dia</div>
            : todayTasks.map(t => (
                <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} onCheck={handleCheck} onOrderChange={handleOrderChange} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isDragging={draggingId === t.id} onCycleAssignee={onCycleAssignee} />
              ))
          }
        </div>
      </div>

      {/* ── Card 2: Tarefas Sem Prazo ── */}
      <div className={styles.agendaCard}>
        <div className={styles.agendaCardHeader}>
          <CardIcon icon={ICON_NODATE} />
          <span className={styles.agendaCardTitle}>Tarefas Sem Prazo</span>
        </div>
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
        <div
          className={`${styles.agendaCardBody} ${dropTarget === 'nodate' ? styles.agendaCardBodyDrop : ''}`}
          onDragOver={e => handleDragOver('nodate', e)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDropOnZone(null)}
        >
          {noDateTasks.length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma tarefa sem prazo</div>
            : noDateTasks.map(t => (
                <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} onCheck={handleCheck} onOrderChange={handleOrderChange} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isDragging={draggingId === t.id} onCycleAssignee={onCycleAssignee} />
              ))
          }
        </div>
      </div>

      {/* ── Card 3: Amanhã ── */}
      <div className={`${styles.agendaCard} ${styles.agendaCardFull}`}>
        <div className={styles.agendaCardHeader}>
          <CardIcon icon={ICON_TMR} />
          <span className={styles.agendaCardTitle}>Amanhã</span>
          <span className={styles.agendaCardSub}>
            {new Date(tomorrowISO + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          <button
            className={styles.agendaAddBtn}
            onClick={() => onNewWithDate(tomorrowISO, filterResp !== 'todos' ? filterResp : null)}
            title="Nova tarefa para amanhã"
          >+</button>
        </div>
        <div
          className={`${styles.agendaCardBody} ${dropTarget === 'tmr' ? styles.agendaCardBodyDrop : ''}`}
          onDragOver={e => handleDragOver('tmr', e)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDropOnZone(tomorrowISO + 'T12:00:00')}
        >
          {tomorrowTasks.length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma tarefa para amanhã</div>
            : tomorrowTasks.map(t => (
                <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} onCheck={handleCheck} onOrderChange={handleOrderChange} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isDragging={draggingId === t.id} onCycleAssignee={onCycleAssignee} />
              ))
          }
        </div>
      </div>

      {/* ── Card 4: Próximos 21 Dias ── */}
      <div className={`${styles.agendaCard} ${styles.agendaCardFull}`}>
        <div className={styles.agendaCardHeader}>
          <CardIcon icon={ICON_UPCOMING} />
          <span className={styles.agendaCardTitle}>Próximos Dias</span>
          <div className={styles.weekOffsetToggle}>
            <button
              className={`${styles.weekOffsetBtn} ${weekOffset === 0 ? styles.weekOffsetBtnActive : ''}`}
              onClick={() => setWeekOffset(0)}
              title="Iniciar a partir de hoje"
            >
              <svg viewBox="0 0 16 14" fill="none" width="14" height="13">
                <rect x="1" y="2" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 1v2.5M11 1v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M1 6h14" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="5" cy="9.5" r="2" fill="currentColor"/>
              </svg>
            </button>
            <button
              className={`${styles.weekOffsetBtn} ${weekOffset === 2 ? styles.weekOffsetBtnActive : ''}`}
              onClick={() => setWeekOffset(2)}
              title="Iniciar depois de amanhã"
            >
              <svg viewBox="0 0 16 14" fill="none" width="14" height="13">
                <rect x="1" y="2" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 1v2.5M11 1v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M1 6h14" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="4" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
                <circle cx="8" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
                <circle cx="12" cy="9.5" r="2" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <button
            className={styles.agendaAddBtn}
            onClick={() => onNewWithDate(null, filterResp !== 'todos' ? filterResp : null)}
            title="Nova tarefa"
          >+</button>
        </div>
        <div className={styles.weekGrid}>
          {[0, 7, 14].map(rowStart => {
            const rowDays = weekDays.slice(rowStart, rowStart + 7)
            const f = rowDays[0]?.d, l = rowDays[6]?.d
            const label = f && l
              ? f.getMonth() === l.getMonth()
                ? `${f.getDate()}–${l.getDate()} ${MONTHS_PT[l.getMonth()].slice(0,3)}`
                : `${f.getDate()} ${MONTHS_PT[f.getMonth()].slice(0,3)} – ${l.getDate()} ${MONTHS_PT[l.getMonth()].slice(0,3)}`
              : ''
            return (
              <Fragment key={rowStart}>
                <div className={styles.weekRowDivider}>
                  <span className={styles.weekRowLabel}>{label}</span>
                </div>
                {rowDays.map(({ d, iso, isToday, tasks }) => (
                  <div
                    key={iso}
                    className={`${styles.weekCell} ${isToday ? styles.weekCellToday : ''} ${dropTarget === iso ? styles.weekCellDrop : ''}`}
                    onDragOver={e => handleDragOver(iso, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDropOnZone(iso + 'T12:00:00')}
                  >
                    <div className={styles.weekCellHeader}>
                      <span className={styles.weekDayWkd}>{WEEKDAYS_SHORT[d.getDay()]}</span>
                      <span className={`${styles.weekDayNum} ${isToday ? styles.weekDayNumToday : ''}`}>{d.getDate()}</span>
                    </div>
                    <div className={styles.weekCellTasks}>
                      {tasks.map(t => (
                        <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} onCheck={handleCheck} onOrderChange={handleOrderChange} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isDragging={draggingId === t.id} onCycleAssignee={onCycleAssignee} />
                      ))}
                    </div>
                  </div>
                ))}
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* ── Card 5: Audiências ── */}
      <div className={`${styles.agendaCard} ${styles.agendaCardFull}`}>
        <div className={styles.agendaCardHeader}>
          <CardIcon icon={ICON_HEARING} />
          <span className={styles.agendaCardTitle}>Audiências</span>
          <span className={styles.agendaCardSub}>
            {(rawHearings ?? []).length > 0 ? `${(rawHearings ?? []).length} próxima(s)` : 'Nenhuma agendada'}
          </span>
        </div>
        <div className={styles.agendaCardBody}>
          {(rawHearings ?? []).length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma audiência agendada — cadastre em Casos &rsaquo; editar caso</div>
            : <div className={styles.eventList}>
                {(rawHearings ?? []).map(h => (
                  <HearingEventItem key={h.id} h={h} todayISO={todayISO} />
                ))}
              </div>
          }
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
  const { lawyer, session, teamRole } = useAuth()
  const toast = useToast()
  const prefs = loadPreferences(lawyer)
  const responsaveis = lawyer?.preferences?.responsaveis ?? []

  const isIntern   = teamRole === 'estagiario'
  const internName = lawyer?.full_name ?? ''

  const [view, setView]           = useState(prefs.tarefas_view ?? 'agenda')
  const [search, setSearch]       = useState('')
  const [filterPri, setFilterPri] = useState('todos')
  const [filterResp, setFilterResp] = useState('todos')

  // Interns always see only their own tasks — override any filter value
  const effectiveFilterResp = isIntern ? internName : filterResp
  const [formOpen, setFormOpen]   = useState(false)
  const [editing,  setEditing]    = useState(null)

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
    savePreferences(lawyer, { tarefas_view: v })
  }

  async function handleCycleAssignee(taskId, currentAssignee) {
    if (responsaveis.length === 0) return
    const idx = responsaveis.indexOf(currentAssignee)
    const next = responsaveis[(idx + 1) % responsaveis.length]
    await updateTaskAssignee(taskId, next)
    refetch()
  }

  function openNewWithDate(dateISO, assignedTo) {
    setEditing({
      due_date:    dateISO ? dateISO + 'T12:00:00' : null,
      assigned_to: isIntern ? internName : (assignedTo ?? ''),
    })
    setFormOpen(true)
  }

  const filtered = useMemo(() => {
    let list = tasks
    if (isIntern) list = list.filter(t => !t.responsavel || t.responsavel === internName)
    if (filterPri !== 'todos') list = list.filter(t => t.prioridade === filterPri)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.titulo.toLowerCase().includes(q) || t.caso.toLowerCase().includes(q))
    }
    return list
  }, [tasks, search, filterPri, isIntern, internName])

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
      filters={
        view === 'agenda'
          ? (!isIntern && responsaveis.length > 0
              ? <RespPills responsaveis={responsaveis} value={filterResp} onChange={setFilterResp} />
              : null)
          : (
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
      }
    >
      {error
        ? <div className={styles.emptyState}><p>Erro ao carregar tarefas.</p></div>
        : view === 'agenda'
          ? <AgendaView
              rawTasks={rawTasks ?? []}
              responsaveis={responsaveis}
              filterResp={effectiveFilterResp}
              session={session}
              onEdit={openEdit}
              onNewWithDate={openNewWithDate}
              refetch={refetch}
              onCycleAssignee={handleCycleAssignee}
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
