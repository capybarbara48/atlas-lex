import { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCaseStats, useCases } from '@/hooks/useCases'
import { useClientCount } from '@/hooks/useClients'
import { useTodayTasks } from '@/hooks/useTasks'
import { useMonthFinancials, useRecentEntries } from '@/hooks/useFinancials'
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
    id:        c.id,
    titulo:    c.title,
    status:    c.status,
    tribunal:  c.court ?? '—',
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

/* ── kanban columns (DB statuses) ─────────────────────────────────────── */
const DASH_COLS = [
  { key: 'ativo',     title: 'Ativo',     color: 'st-green' },
  { key: 'suspenso',  title: 'Suspenso',  color: 'st-gold' },
  { key: 'encerrado', title: 'Encerrado', color: 'st-blue' },
  { key: 'arquivado', title: 'Arquivado', color: 'st-dark' },
]

/* ── sub-components ───────────────────────────────────────────────────── */
function StatBox({ num, label }) {
  return (
    <div className={styles.statBox}>
      <div className={styles.statBoxNum}>{num}</div>
      <div className={styles.statBoxLabel}>{label}</div>
    </div>
  )
}

function KanbanBoard({ cases }) {
  return (
    <div className={styles.kanbanWrapper}>
      <div className={styles.kanbanBoard}>
        {DASH_COLS.map(col => {
          const items = cases.filter(c => c.status === col.key)
          return (
            <div key={col.key} className={styles.kanbanCol}>
              <div className={styles.kanbanColHeader}>
                <span className={`${styles.kanbanColTitle} ${col.color}`}>{col.title}</span>
                <span className={styles.kanbanColCount}>{items.length}</span>
              </div>
              <div className={styles.kanbanItems}>
                {items.length === 0
                  ? <div className={styles.kanbanEmpty}>Vazio</div>
                  : items.map(item => (
                      <div key={item.id} className={styles.kanbanItem}>
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

function TarefaItem({ t }) {
  const vencida = !t.concluida && t.prazo && t.prazo < new Date().toISOString().split('T')[0]
  return (
    <div className={`${styles.taskItem} ${t.concluida ? styles.taskDone : ''} ${vencida ? styles.taskOverdue : ''}`}>
      <div className={`${styles.taskCheck} ${t.concluida ? styles.checked : ''}`} />
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

/* ── main dashboard ───────────────────────────────────────────────────── */
export default function Dashboard() {
  const { lawyer } = useAuth()
  const nome = lawyer?.full_name?.split(' ')[0] ?? 'Advogado'

  /* data hooks */
  const { data: caseStats }    = useCaseStats()
  const { data: rawCases }     = useCases()
  const { data: rawClients }   = useClientCount()
  const { data: rawTasks }     = useTodayTasks()
  const { data: finMonth }     = useMonthFinancials()
  const { data: rawEntries }   = useRecentEntries({ limit: 6 })

  /* derived data */
  const cases   = useMemo(() => (rawCases   ?? []).map(mapDashCase),  [rawCases])
  const tasks   = useMemo(() => (rawTasks   ?? []).map(mapDashTask),  [rawTasks])
  const entries = useMemo(() => (rawEntries ?? []).map(mapDashEntry), [rawEntries])

  const today        = new Date().toISOString().split('T')[0]
  const overdueTasks = tasks.filter(t => t.prazo && t.prazo < today)
  const todayTasks   = tasks.filter(t => t.prazo === today)

  const casosTotal   = caseStats?.total    ?? '—'
  const casosAtivos  = caseStats?.ativo    ?? '—'
  const clientesTotal = (rawClients ?? []).length
  const tarefasHoje  = overdueTasks.length + todayTasks.length
  const receita      = finMonth?.receita   ?? 0
  const despesa      = finMonth?.despesa   ?? 0
  const saldo        = finMonth?.saldo     ?? 0

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
          <StatBox num={brl(receita)}  label="Receitas / mês" />
          <StatBox num={brl(saldo)}    label="Saldo / mês" />
        </div>

        <button className={styles.btnNovo}>
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
            <a href="/casos" className={styles.cardLink}>Ver todos →</a>
          </div>
          <KanbanBoard cases={cases} />
        </div>

        {/* ── Card: Tarefas atrasadas ── */}
        <div className={`${styles.card} ${styles.cardAudiencias}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={`${styles.cardIcon} ${styles.iconBlue}`}>⚠</div>
              <div>
                <div className={styles.cardTitle}>Atrasadas &amp; Urgentes</div>
                <div className={styles.cardSubtitle}>
                  {overdueTasks.length > 0 ? `${overdueTasks.length} tarefa(s) vencida(s)` : 'Nenhuma tarefa atrasada'}
                </div>
              </div>
            </div>
            <a href="/tarefas" className={styles.cardLink}>Ver todas →</a>
          </div>
          <div className={styles.cardBody}>
            {overdueTasks.length === 0
              ? <div className={styles.emptyHint}>Tudo em dia!</div>
              : overdueTasks.map(t => <TarefaItem key={t.id} t={t} />)
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
            <a href="/tarefas" className={styles.cardLink}>Ver todas →</a>
          </div>
          <div className={styles.cardBody}>
            {todayTasks.length === 0
              ? <div className={styles.emptyHint}>Nenhuma tarefa agendada para hoje</div>
              : todayTasks.map(t => <TarefaItem key={t.id} t={t} />)
            }
          </div>
        </div>

        {/* ── Card: Financeiro ── */}
        <div className={`${styles.card} ${styles.cardFinanceiro}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={`${styles.cardIcon} ${styles.iconPurple}`}>💰</div>
              <div>
                <div className={styles.cardTitle}>Financeiro — mês corrente</div>
                <div className={styles.cardSubtitle}>Resumo do mês</div>
              </div>
            </div>
            <a href="/financeiro" className={styles.cardLink}>Ver mais →</a>
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
        </div>

      </div>
    </div>
  )
}
