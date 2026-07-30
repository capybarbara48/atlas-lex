import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCaseStats, useCases, updateCaseSituation, updateDespachoAttempts } from '@/hooks/useCases'
import { useKanbanSituations } from '@/hooks/useKanbanSituations'
import { useClientCount } from '@/hooks/useClients'
import { useTodayTasks, updateTaskStatus } from '@/hooks/useTasks'
import { useUpcomingHearings } from '@/hooks/useHearings'
import { useMonthFinancials } from '@/hooks/useFinancials'
import { useProposals } from '@/hooks/useProposals'
import Modal from '@/components/ui/Modal'
import CaseForm from '@/components/forms/CaseForm'
import TaskForm from '@/components/forms/TaskForm'
import ProposalForm from '@/components/forms/ProposalForm'
import EntryForm from '@/components/forms/EntryForm'
import styles from './Dashboard.module.css'

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

/* ── helpers ─────────────────────────────────────────────────────────── */
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
    id:               c.id,
    titulo:           c.title,
    status:           c.status,
    situation:        c.situation ?? null,
    situationChangedAt: c.situation_changed_at ?? null,
    area:             c.area ?? null,
    despachoAttempts: Array.isArray(c.despacho_attempts) ? [...c.despacho_attempts, null, null, null].slice(0, 3) : [null, null, null],
    tribunal:         c.court ?? '—',
    trib_color:       tribColor(c.court),
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

/* ── sub-components ───────────────────────────────────────────────────── */
function StatBox({ num, label }) {
  return (
    <div className={styles.statBox}>
      <div className={styles.statBoxNum}>{num}</div>
      <div className={styles.statBoxLabel}>{label}</div>
    </div>
  )
}

function KanbanBoard({ cases, situations, onMove, onDespachoToggle }) {
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
                  : items.map(item => {
                      const days = item.situationChangedAt
                        ? Math.floor((Date.now() - new Date(item.situationChangedAt).getTime()) / 86400000)
                        : null
                      const dStyle = days === null ? null
                        : days < 30  ? { color: 'var(--text-3)', bg: 'rgba(0,0,0,0.06)' }
                        : days < 60  ? { color: '#ea580c', bg: 'rgba(234,88,12,0.1)' }
                        :              { color: '#dc2626', bg: 'rgba(220,38,38,0.1)' }
                      const isDespacho = /despachar/i.test(sit.value)
                      return (
                        <div
                          key={item.id}
                          className={`${styles.kanbanItem} ${draggingId === item.id ? styles.kanbanItemDragging : ''}`}
                          draggable
                          onDragStart={e => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => navigate('/painel/casos/' + item.id)}
                        >
                          <div className={styles.kanbanItemTitle}>{item.titulo}</div>
                          <div className={styles.kanbanItemMeta}>
                            <span className={styles.kanbanTribunal} style={{ background: col + '22', color: col, border: `1px solid ${col}44` }}>
                              {item.tribunal}
                            </span>
                            {dStyle && (
                              <span style={{ marginLeft: 'auto', fontSize: '0.58rem', fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: 4, background: dStyle.bg, color: dStyle.color, whiteSpace: 'nowrap' }}>
                                {days}d
                              </span>
                            )}
                          </div>
                          {isDespacho && (
                            <div className={styles.despachoRow} onClick={e => e.stopPropagation()}>
                              <span className={styles.despachoLabel}>DESP.</span>
                              {item.despachoAttempts.map((ts, i) => (
                                <div key={i} className={styles.despachoWrap}>
                                  <button
                                    className={`${styles.despachoBox} ${ts ? styles.despachoBoxChecked : ''}`}
                                    onClick={e => { e.stopPropagation(); onDespachoToggle?.(item.id, item.despachoAttempts, i) }}
                                    title={ts ? `${i+1}° despacho: ${new Date(ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}` : `Registrar ${i+1}° despacho`}
                                  >
                                    {ts && <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="8" height="8"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>}
                                  </button>
                                  <span className={styles.despachoNum}>{i+1}°</span>
                                </div>
                              ))}
                            </div>
                          )}
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

/* ── Financeiro do mês (isolado: só monta o hook/consulta p/ quem pode ver) ── */
function FinanceCard() {
  const { data: fin } = useMonthFinancials()

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleGroup}>
          <div className={`${styles.cardIcon} ${styles.iconGreen}`}>$</div>
          <div>
            <div className={styles.cardTitle}>Financeiro do Mês</div>
            <div className={styles.cardSubtitle}>Receitas, despesas e pendências</div>
          </div>
        </div>
        <Link to="/painel/financeiro" className={styles.cardLink}>Ver financeiro →</Link>
      </div>
      <div className={styles.cardBody} style={{ overflow: 'visible', maxHeight: 'none' }}>
        <div className={styles.finStatsRow}>
          <div className={styles.finStat}>
            <span className={styles.finStatLabel}>Receita</span>
            <span className={`${styles.finStatVal} ${styles.positive}`}>{brl(fin?.receita)}</span>
          </div>
          <div className={styles.finStatDiv} />
          <div className={styles.finStat}>
            <span className={styles.finStatLabel}>Despesa</span>
            <span className={`${styles.finStatVal} ${styles.negative}`}>{brl(fin?.despesa)}</span>
          </div>
          <div className={styles.finStatDiv} />
          <div className={styles.finStat}>
            <span className={styles.finStatLabel}>Saldo</span>
            <span className={`${styles.finStatVal} ${(fin?.saldo ?? 0) >= 0 ? styles.positive : styles.negative}`}>{brl(fin?.saldo)}</span>
          </div>
          <div className={styles.finStatDiv} />
          <div className={styles.finStat}>
            <span className={styles.finStatLabel}>Pendente</span>
            <span className={styles.finStatVal}>{brl(fin?.pendente)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Distribuição de casos por área ─────────────────────────────────── */
const AREA_COLORS = ['abar_accent', 'abar_blue', 'abar_green', 'abar_purple', 'abar_orange', 'abar_gray']

function AreaDistributionCard({ cases }) {
  const rows = useMemo(() => {
    const counts = {}
    cases.forEach(c => {
      const key = c.area?.trim() || 'Sem área'
      counts[key] = (counts[key] ?? 0) + 1
    })
    const total = cases.length || 1
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([area, count], i) => ({
        area, count,
        pct: Math.round((count / total) * 100),
        color: AREA_COLORS[i % AREA_COLORS.length],
      }))
  }, [cases])

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleGroup}>
          <div className={`${styles.cardIcon} ${styles.iconPurple}`}>◧</div>
          <div>
            <div className={styles.cardTitle}>Distribuição por Área</div>
            <div className={styles.cardSubtitle}>{cases.length} casos ativos</div>
          </div>
        </div>
        <Link to="/painel/metricas" className={styles.cardLink}>Ver métricas →</Link>
      </div>
      <div className={styles.cardBody} style={{ overflow: 'visible', maxHeight: 'none' }}>
        {rows.length === 0
          ? <div className={styles.emptyHint}>Nenhum caso ativo para exibir</div>
          : rows.map(r => (
            <div key={r.area} className={styles.abarRow}>
              <div className={styles.abarInfo}>
                <span className={styles.abarLabel}>{r.area}</span>
                <span className={styles.abarPct}>{r.count} · {r.pct}%</span>
              </div>
              <div className={styles.abarTrack}>
                <div className={`${styles.abarFill} ${styles[r.color]}`} style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

const PROPOSAL_STATUS = {
  enviada:  { label: 'Aguardando', color: '#d97706' },
  aceita:   { label: 'Aceita',     color: 'var(--green)' },
  recusada: { label: 'Recusada',   color: 'var(--red)' },
  rascunho: { label: 'Rascunho',   color: 'var(--text-3)' },
}

function ProposalRow({ p }) {
  const st = PROPOSAL_STATUS[p.status] ?? PROPOSAL_STATUS.rascunho
  const cliente = p.clients?.full_name ?? p.client_name_override ?? '—'
  return (
    <div className={styles.entryRow}>
      <div className={styles.entryLeft}>
        <span className={styles.entryDesc}>{p.title}</span>
        <div className={styles.entryMeta}>
          <span className={styles.entryStatus} style={{ color: st.color }}>{st.label}</span>
          <span style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>{cliente}</span>
        </div>
      </div>
      {p.fee_amount != null && <span className={styles.entryVal}>{brl(p.fee_amount)}</span>}
    </div>
  )
}

function ProposalsCard({ proposals }) {
  const pendentes = proposals.filter(p => p.status === 'enviada')
  const shown = proposals.slice(0, 5)
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleGroup}>
          <div className={`${styles.cardIcon} ${styles.iconGold}`}>✎</div>
          <div>
            <div className={styles.cardTitle}>Propostas</div>
            <div className={styles.cardSubtitle}>
              {pendentes.length > 0 ? `${pendentes.length} aguardando resposta` : 'Nenhuma pendente'}
            </div>
          </div>
        </div>
        <Link to="/painel/propostas" className={styles.cardLink}>Ver todas →</Link>
      </div>
      <div className={styles.cardBody}>
        {shown.length === 0
          ? <div className={styles.emptyHint}>Nenhuma proposta cadastrada</div>
          : shown.map(p => <ProposalRow key={p.id} p={p} />)
        }
      </div>
    </div>
  )
}

/* ── main dashboard ───────────────────────────────────────────────────── */
export default function Dashboard() {
  const { lawyer, teamRole } = useAuth()
  const [caseFormOpen,     setCaseFormOpen]     = useState(false)
  const [taskFormOpen,     setTaskFormOpen]     = useState(false)
  const [proposalFormOpen, setProposalFormOpen] = useState(false)
  const [entryFormOpen,    setEntryFormOpen]    = useState(false)
  const [financeKey,       setFinanceKey]       = useState(0)

  /* data hooks */
  const { data: caseStats }                         = useCaseStats()
  const { data: rawCases,   refetch: refetchCases } = useCases()
  const { situations }                              = useKanbanSituations()
  const { data: clientesTotal }                     = useClientCount()
  const { data: rawTasks,   refetch: refetchTasks } = useTodayTasks()
  const { data: rawHearings }                       = useUpcomingHearings()
  const { data: rawProposals, refetch: refetchProposals } = useProposals({ limit: 20 })

  /* derived data */
  const cases   = useMemo(() => (rawCases ?? []).filter(c => c.status !== 'finalizado').map(mapDashCase), [rawCases])
  const tasks   = useMemo(() => (rawTasks   ?? []).map(mapDashTask),  [rawTasks])
  const today        = new Date().toISOString().split('T')[0]
  const overdueTasks = tasks.filter(t => t.prazo && t.prazo < today)
  const todayTasks   = tasks.filter(t => t.prazo === today)
  const hearings     = rawHearings ?? []
  const proposals    = rawProposals ?? []

  const casosTotal  = caseStats?.total ?? '—'
  const casosAtivos = caseStats?.ativo ?? '—'
  async function handleTaskCheck(taskId) {
    await updateTaskStatus(taskId, 'concluida')
    refetchTasks()
  }

  async function handleMoveCase(caseId, situationId) {
    await updateCaseSituation(caseId, situationId)
    refetchCases()
  }

  async function handleDespachoToggle(caseId, currentAttempts, idx) {
    const arr = [...(Array.isArray(currentAttempts) ? currentAttempts : [null, null, null])]
    arr[idx] = arr[idx] ? null : new Date().toISOString()
    const payload = arr.every(x => !x) ? null : arr
    await updateDespachoAttempts(caseId, payload)
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
          <StatBox num={todayTasks.length} label="Tarefas hoje" />
          {overdueTasks.length > 0 && (
            <div className={`${styles.statBox} ${styles.statBoxRed}`}>
              <div className={styles.statBoxNum}>{overdueTasks.length}</div>
              <div className={styles.statBoxLabel}>Vencidas</div>
            </div>
          )}
        </div>

        <button className={styles.btnNovo} onClick={() => setCaseFormOpen(true)}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Novo caso
        </button>
      </div>

      {/* ── Quick actions ── */}
      <div className={styles.quickActions}>
        <button className={styles.quickBtn} onClick={() => setTaskFormOpen(true)}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Nova tarefa
        </button>
        <button className={styles.quickBtn} onClick={() => setProposalFormOpen(true)}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Nova proposta
        </button>
        {teamRole !== 'estagiario' && (
          <button className={styles.quickBtn} onClick={() => setEntryFormOpen(true)}>
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
            Novo lançamento
          </button>
        )}
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
          <KanbanBoard cases={cases} situations={situations} onMove={handleMoveCase} onDespachoToggle={handleDespachoToggle} />
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
                  {overdueTasks.length > 0
                    ? `${overdueTasks.length} vencida(s) · ${todayTasks.length} para hoje`
                    : todayTasks.length > 0 ? `${todayTasks.length} tarefa(s) para hoje` : 'Nenhuma tarefa para hoje'}
                </div>
              </div>
            </div>
            <Link to="/painel/tarefas" className={styles.cardLink}>Ver todas →</Link>
          </div>
          <div className={styles.cardBody}>
            {overdueTasks.length === 0 && todayTasks.length === 0
              ? <div className={styles.emptyHint}>Nenhuma tarefa agendada para hoje</div>
              : <>
                  {overdueTasks.length > 0 && (
                    <>
                      <p className={`${styles.taskSectionLabel} ${styles.taskSectionLabelRed}`}>Vencidas</p>
                      {overdueTasks.map(t => <TarefaItem key={t.id} t={t} onCheck={handleTaskCheck} />)}
                    </>
                  )}
                  {todayTasks.length > 0 && (
                    <>
                      <p className={`${styles.taskSectionLabel} ${styles.taskSectionLabelMuted}`}>Hoje</p>
                      {todayTasks.map(t => <TarefaItem key={t.id} t={t} onCheck={handleTaskCheck} />)}
                    </>
                  )}
                </>
            }
          </div>
        </div>

        {/* ── Card: Financeiro do mês (oculto para estagiários) ── */}
        {teamRole !== 'estagiario' && <FinanceCard key={financeKey} />}

        {/* ── Card: Distribuição de casos por área ── */}
        <AreaDistributionCard cases={cases} />

        {/* ── Card: Propostas ── */}
        <ProposalsCard proposals={proposals} />

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

      {/* ── New task modal ── */}
      {taskFormOpen && (
        <Modal title="Nova Tarefa" onClose={() => setTaskFormOpen(false)} size="lg">
          <TaskForm
            onClose={() => setTaskFormOpen(false)}
            onSave={() => { setTaskFormOpen(false); refetchTasks() }}
          />
        </Modal>
      )}

      {/* ── New proposal modal ── */}
      {proposalFormOpen && (
        <Modal title="Nova Proposta" onClose={() => setProposalFormOpen(false)} size="lg">
          <ProposalForm
            onClose={() => setProposalFormOpen(false)}
            onSave={() => { setProposalFormOpen(false); refetchProposals() }}
          />
        </Modal>
      )}

      {/* ── New financial entry modal (advogado only, gated by quick-action button) ── */}
      {entryFormOpen && teamRole !== 'estagiario' && (
        <Modal title="Novo Lançamento" onClose={() => setEntryFormOpen(false)} size="lg">
          <EntryForm
            onClose={() => setEntryFormOpen(false)}
            onSave={() => { setEntryFormOpen(false); setFinanceKey(k => k + 1) }}
          />
        </Modal>
      )}

    </div>
  )
}
