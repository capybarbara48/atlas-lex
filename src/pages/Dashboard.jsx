import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCaseStats, useCases, updateCaseSituation } from '@/hooks/useCases'
import { useKanbanSituations } from '@/hooks/useKanbanSituations'
import { useClientCount } from '@/hooks/useClients'
import { useTodayTasks, updateTaskStatus } from '@/hooks/useTasks'
import { useUpcomingHearings } from '@/hooks/useHearings'
import { useMonthFinancials, useRecentEntries } from '@/hooks/useFinancials'
import Modal from '@/components/ui/Modal'
import CaseForm from '@/components/forms/CaseForm'
import styles from './Dashboard.module.css'

/* ── helpers ─────────────────────────────────────────────────────────── */
function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function tribColor(court) {
  if (!court) return 'st-teal'
  const c = court.toUpperCase()
  if (c.startsWith('TJ'))         return 'st-blue'
  if (c.startsWith('TRT'))        return 'st-purple'
  if (c.startsWith('TRF'))        return 'st-green'
  if (c === 'STJ' || c === 'STF') return 'st-dark'
  return 'st-teal'
}

/* ── data mappers ─────────────────────────────────────────────────────── */
function mapDashCase(c) {
  return {
    id:         c.id,
    titulo:     c.title,
    status:     c.status,
    situation:  c.situation ?? null,
    tribunal:   c.court ?? '—',
    trib_color: tribColor(c.court),
  }
}

function mapDashTask(t) {
  return {
    id:         t.id,
    titulo:     t.title,
    prazo:      t.due_date?.split('T')[0] ?? '',
    prioridade: t.priority,
    concluida:  t.status === 'concluida',
    caso:       t.cases?.title ?? '—',
  }
}

function mapDashEntry(e) {
  return {
    id:     e.id,
    desc:   e.description ?? '—',
    tipo:   e.type,
    valor:  Number(e.amount) || 0,
    status: e.status,
  }
}

/* ── sub-components ───────────────────────────────────────────────────── */
function StatBox({ num, label }) {
  return (
    <div className={styles.statBox}>
      <div className={styles.statBoxNum}>{num}</div>
      <div className={styles.statBoxLabel}>{label}</div>
    </div>
  )
}

function KanbanBoard({ cases, situations, onMove }) {
  const navigate = useNavigate()
  const [draggingId, setDraggingId] = useState(null)
  const [dragOver,   setDragOver]   = useState(null)

  const bySituation = useMemo(() => {
    const map = {}
    situations.forEach(s => { map[s.id] = [] })
    map['__none__'] = []
    cases.forEach(c => {
      if (c.situation && map[c.situation] !== undefined) {
        map[c.situation].push(c)
      } else {
        map['__none__'].push(c)
      }
    })
    return map
  }, [cases, situations])

  const hasNone = (bySituation['__none__'] ?? []).length > 0
  const cols = [
    ...situations,
    ...(hasNone ? [{ id: '__none__', value: 'Não categorizado', color: '#94a3b8' }] : []),
  ]

  function handleDragStart(e, id) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOver(e, sitId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(sitId)
  }
  function handleDrop(e, sitId) {
    e.preventDefault()
    if (draggingId) onMove(draggingId, sitId === '__none__' ? null : sitId)
    setDraggingId(null)
    setDragOver(null)
  }
  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null)
  }
  function handleDragEnd() {
    setDraggingId(null)
    setDragOver(null)
  }

  return (
    <div className={styles.kanbanWrapper}>
      <div className={styles.kanbanBoard}>
        {cols.map(sit => {
          const items = bySituation[sit.id] ?? []
          const col = sit.color ?? '#888'
          const isOver = dragOver === sit.id
          return (
            <div
              key={sit.id}
              className={`${styles.kanbanCol} ${isOver ? styles.kanbanColOver : ''}`}
              onDragOver={e => handleDragOver(e, sit.id)}
              onDrop={e => handleDrop(e, sit.id)}
              onDragLeave={handleDragLeave}
            >
              <div className={styles.kanbanColHeader}>
                <span
                  className={styles.kanbanColTitle}
                  style={{ background: col + '28', color: col }}
                >
                  {sit.value}
                </span>
                <span className={styles.kanbanColCount}>{items.length}</span>
              </div>
              <div className={styles.kanbanItems}>
                {items.length === 0
                  ? <div className={styles.kanbanEmpty}>Vazio</div>
                  : items.map(item => (
                      <div
                        key={item.id}
                        className={`${styles.kanbanItem} ${draggingId === item.id ? styles.kanbanItemDragging : ''}`}
                        draggable
                        onDragStart={e => handleDragStart(e, item.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => navigate('/painel/casos/' + item.id)}
                      >
                        {item.titulo}
                        <span className={`${styles.kanbanTribunal} ${item.trib_color}`}>
                          {item.tribunal}
                        </span>
                      </div>
                    ))
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TarefaItem({ t, onCheck }) {
  const vencida = !t.concluida && t.prazo && t.prazo < new Date().toISOString().split('T')[0]
  return (
    <div className={`${styles.taskItem} ${t.concluida ? styles.taskDone : ''} ${vencida ? styles.taskOverdue : ''}`}>
      <div
        className={`${styles.taskCheck} ${t.concluida ? styles.checked : ''}`}
        onClick={() => !t.concluida && onCheck(t.id)}
        style={{ cursor: t.concluida ? 'default' : 'pointer' }}
        title={t.concluida ? 'Concluída' : 'Marcar como concluída'}
      />
      <div className={styles.taskBody}>
        <span className={styles.taskTitle}>{t.titulo}</span>
        <span className={styles.taskCase}>{t.caso}</span>
      </div>
      <div className={styles.taskRight}>
        <span className={`badge badge-${t.prioridade}`}>{t.prioridade}</span>
        {t.prazo && (
          <span className={`${styles.taskPrazo} ${vencida ? styles.prazoVencido : ''}`}>
            {new Date(t.prazo + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}

function EntradaItem({ e }) {
  return (
    <div className={styles.entryRow}>
      <div className={styles.entryLeft}>
        <span className={styles.entryDesc}>{e.desc}</span>
        <div className={styles.entryMeta}>
          <span className={`badge badge-${e.tipo}`}>{e.tipo === 'receita' ? 'Receita' : 'Despesa'}</span>
          <span className={styles.entryStatus}
            style={{ color: e.status === 'pago' ? 'var(--green)' : '#b45309' }}>
            {e.status === 'pago' ? 'Pago' : 'Pendente'}
          </span>
        </div>
      </div>
      <span className={`${styles.entryVal} ${e.tipo === 'despesa' ? styles.negative : styles.positive}`}>
        {e.tipo === 'despesa' ? '−' : '+'}{brl(e.valor)}
      </span>
    </div>
  )
}

const WDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function HearingEventItem({ h }) {
  const today = new Date().toISOString().split('T')[0]
  const isToday = h.date === today
  const d = new Date(h.date + 'T12:00:00')
  return (
    <div className={styles.eventItem}>
      <div className={styles.evDateCol}>
        <span className={styles.evWeekday}>{WDAYS[d.getDay()]}</span>
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

/* ── main dashboard ───────────────────────────────────────────────────── */
export default function Dashboard() {
  const { lawyer, teamRole } = useAuth()
  const [caseFormOpen, setCaseFormOpen] = useState(false)

  /* data hooks */
  const { data: caseStats }                         = useCaseStats()
  const { data: rawCases,   refetch: refetchCases } = useCases()
  const { situations }                              = useKanbanSituations()
  const { data: clientesTotal }                     = useClientCount()
  const { data: rawTasks,   refetch: refetchTasks } = useTodayTasks()
  const { data: finMonth }                          = useMonthFinancials()
  const { data: rawEntries }                        = useRecentEntries({ limit: 6 })
  const { data: rawHearings }                       = useUpcomingHearings()

  /* derived data */
  const cases   = useMemo(() => (rawCases   ?? []).map(mapDashCase),  [rawCases])
  const tasks   = useMemo(() => (rawTasks   ?? []).map(mapDashTask),  [rawTasks])
  const entries = useMemo(() => (rawEntries ?? []).map(mapDashEntry), [rawEntries])

  const today        = new Date().toISOString().split('T')[0]
  const overdueTasks = tasks.filter(t => t.prazo && t.prazo < today)
  const todayTasks   = tasks.filter(t => t.prazo === today)
  const hearings     = rawHearings ?? []

  const casosTotal  = caseStats?.total ?? '—'
  const casosAtivos = caseStats?.ativo ?? '—'
  const tarefasHoje = overdueTasks.length + todayTasks.length
  const receita      = finMonth?.receita   ?? 0
  const despesa      = finMonth?.despesa   ?? 0
  const saldo        = finMonth?.saldo     ?? 0

  async function handleTaskCheck(taskId) {
    await updateTaskStatus(taskId, 'concluida')
    refetchTasks()
  }

  async function handleMoveCase(caseId, situationId) {
    await updateCaseSituation(caseId, situationId)
    refetchCases()
  }

  return (
    <div className={styles.page}>

      {/* ── Stats banner ── */}
      <div className={`${styles.card} ${styles.statsBanner}`}>
        <div className={styles.activeCounter}>
          <span className={styles.activeNum}>{casosAtivos}</span>
          <div className={styles.activeLabel}>
            <strong>Casos ativos</strong>
            <span>{casosTotal} no total · {clientesTotal} clientes</span>
          </div>
        </div>

        <div className={styles.statsMini}>
          <StatBox num={tarefasHoje}   label="Tarefas hoje" />
          {teamRole !== 'estagiario' && <StatBox num={brl(receita)}  label="Receitas / mês" />}
          {teamRole !== 'estagiario' && <StatBox num={brl(saldo)}    label="Saldo / mês" />}
        </div>

        <button className={styles.btnNovo} onClick={() => setCaseFormOpen(true)}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Novo caso
        </button>
      </div>

      {/* ── Main 2-column grid ── */}
      <div className={styles.mainGrid}>

        {/* ── Card: Kanban de casos ── */}
        <div className={`${styles.card} ${styles.cardCasos}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={`${styles.cardIcon} ${styles.iconGold}`}>⚖</div>
              <div>
                <div className={styles.cardTitle}>Quadro de Casos</div>
                <div className={styles.cardSubtitle}>{casosTotal} processos · {casosAtivos} ativos</div>
              </div>
            </div>
            <Link to="/painel/casos" className={styles.cardLink}>Ver todos →</Link>
          </div>
          <KanbanBoard cases={cases} situations={situations} onMove={handleMoveCase} />
        </div>

        {/* ── Card: Audiências ── */}
        <div className={`${styles.card} ${styles.cardAudiencias}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={`${styles.cardIcon} ${styles.iconGold}`} style={{ color: 'var(--accent)' }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M1.5 14.5h13"/>
                  <rect x="2.5" y="10" width="11" height="4" rx="0.5"/>
                  <path d="M4.5 10V8M8 10V8M11.5 10V8"/>
                  <path d="M2.5 8h11"/>
                  <path d="M8 2.5l5.5 5.5H2.5L8 2.5z"/>
                </svg>
              </div>
              <div>
                <div className={styles.cardTitle}>Audiências</div>
                <div className={styles.cardSubtitle}>
                  {hearings.length > 0 ? `${hearings.length} próxima(s)` : 'Nenhuma agendada'}
                </div>
              </div>
            </div>
            <Link to="/painel/tarefas" className={styles.cardLink}>Ver agenda →</Link>
          </div>
          <div className={styles.cardBody}>
            {hearings.length === 0
              ? <div className={styles.emptyHint}>Nenhuma audiência agendada</div>
              : <div className={styles.eventList}>
                  {hearings.map(h => <HearingEventItem key={h.id} h={h} />)}
                </div>
            }
          </div>
        </div>

        {/* ── Card: Tarefas de hoje ── */}
        <div className={`${styles.card} ${styles.cardTarefas}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={`${styles.cardIcon} ${styles.iconGreen}`}>✓</div>
              <div>
                <div className={styles.cardTitle}>Tarefas de Hoje</div>
                <div className={styles.cardSubtitle}>
                  {todayTasks.length > 0 ? `${todayTasks.length} tarefa(s) para hoje` : 'Nenhuma tarefa para hoje'}
                </div>
              </div>
            </div>
            <Link to="/painel/tarefas" className={styles.cardLink}>Ver todas →</Link>
          </div>
          <div className={styles.cardBody}>
            {todayTasks.length === 0
              ? <div className={styles.emptyHint}>Nenhuma tarefa agendada para hoje</div>
              : todayTasks.map(t => <TarefaItem key={t.id} t={t} onCheck={handleTaskCheck} />)
            }
          </div>
        </div>

        {/* ── Card: Financeiro ── */}
        {teamRole !== 'estagiario' && <div className={`${styles.card} ${styles.cardFinanceiro}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={`${styles.cardIcon} ${styles.iconPurple}`}>💰</div>
              <div>
                <div className={styles.cardTitle}>Financeiro — mês corrente</div>
                <div className={styles.cardSubtitle}>Resumo do mês</div>
              </div>
            </div>
            <Link to="/painel/financeiro" className={styles.cardLink}>Ver mais →</Link>
          </div>

          {/* Mini stats row */}
          <div className={styles.finStatsRow}>
            <div className={styles.finStat}>
              <span className={styles.finStatLabel}>Receitas</span>
              <span className={`${styles.finStatVal} ${styles.positive}`}>{brl(receita)}</span>
            </div>
            <div className={styles.finStatDiv} />
            <div className={styles.finStat}>
              <span className={styles.finStatLabel}>Despesas</span>
              <span className={`${styles.finStatVal} ${styles.negative}`}>{brl(despesa)}</span>
            </div>
            <div className={styles.finStatDiv} />
            <div className={styles.finStat}>
              <span className={styles.finStatLabel}>Saldo</span>
              <span className={`${styles.finStatVal} ${saldo >= 0 ? styles.positive : styles.negative}`}>{brl(saldo)}</span>
            </div>
          </div>

          {/* Lançamentos recentes */}
          <div className={styles.recentTitle}>Lançamentos recentes</div>
          <div className={styles.cardBody}>
            {entries.length === 0
              ? <div className={styles.emptyHint}>Nenhum lançamento registrado</div>
              : entries.map(e => <EntradaItem key={e.id} e={e} />)
            }
          </div>
        </div>}

      </div>

      {/* ── New case modal ── */}
      {caseFormOpen && (
        <Modal title="Novo Caso" onClose={() => setCaseFormOpen(false)} size="lg">
          <CaseForm
            onClose={() => setCaseFormOpen(false)}
            onSave={() => { setCaseFormOpen(false); refetchCases() }}
          />
        </Modal>
      )}

    </div>
  )
}
