import { useAuth } from '@/context/AuthContext'
import styles from './Dashboard.module.css'

/* ───────────────────────────────────────────────────────────────────
   DADOS FALSOS — substituir pelas queries Supabase depois
──────────────────────────────────────────────────────────────────── */
const MOCK = {
  stats: {
    casosAtivos:   14,
    casosTotal:    31,
    clientesTotal: 28,
    tarefasHoje:    5,
    receitaMes:  18750.00,
    despesaMes:   4320.00,
  },

  kanban: [
    {
      id: 'investigacao',
      title: 'Investigação',
      color: 'st-blue',
      items: [
        { id: 1, titulo: 'Costa vs. Seguradora Alfa', tribunal: 'TJSP', trib_color: 'st-blue' },
        { id: 2, titulo: 'Silva — Revisão Contratual', tribunal: 'TJRJ', trib_color: 'st-teal' },
      ],
    },
    {
      id: 'em_andamento',
      title: 'Em Andamento',
      color: 'st-gold',
      items: [
        { id: 3, titulo: 'Pereira & Filhos — Trabalhista', tribunal: 'TRT-2', trib_color: 'st-purple' },
        { id: 4, titulo: 'Família Matos — Inventário', tribunal: 'TJSP', trib_color: 'st-blue' },
        { id: 5, titulo: 'Construtora Nova — Contrato', tribunal: 'TJSP', trib_color: 'st-blue' },
        { id: 6, titulo: 'Lima vs. Banco Nacional', tribunal: 'STJ', trib_color: 'st-dark' },
      ],
    },
    {
      id: 'audiencia',
      title: 'Audiência',
      color: 'st-orange',
      items: [
        { id: 7, titulo: 'Rodrigues — Acidente de Trânsito', tribunal: 'TJSP', trib_color: 'st-blue' },
        { id: 8, titulo: 'MEI Santos — Rescisão', tribunal: 'TRT-15', trib_color: 'st-purple' },
      ],
    },
    {
      id: 'aguardando',
      title: 'Aguardando',
      color: 'st-teal',
      items: [
        { id: 9,  titulo: 'Souza — Divórcio Consensual', tribunal: 'TJSP', trib_color: 'st-blue' },
        { id: 10, titulo: 'Ferreira — Pensão Alimentícia', tribunal: 'TJSP', trib_color: 'st-blue' },
        { id: 11, titulo: 'Grupo XYZ — Societário', tribunal: 'TJRJ', trib_color: 'st-teal' },
      ],
    },
    {
      id: 'encerrado',
      title: 'Encerrado',
      color: 'st-dark',
      items: [
        { id: 12, titulo: 'Alves — Execução Fiscal', tribunal: 'TRF-3', trib_color: 'st-green' },
        { id: 13, titulo: 'Neto vs. Locadora', tribunal: 'TJSP', trib_color: 'st-blue' },
      ],
    },
  ],

  audiencias: [
    { id: 1, dia: 14, mes: 'ABR', weekday: 'TER', titulo: 'Rodrigues vs. Seguradora Beta', tipo: 'Audiência de Instrução', local: 'TJSP — 3ª Vara Cível', hora: '09:30', hoje: true },
    { id: 2, dia: 14, mes: 'ABR', weekday: 'TER', titulo: 'Família Matos — Audiência Inicial', tipo: 'Vara de Família', local: 'TJSP — 7ª Vara de Família', hora: '14:00', hoje: true },
    { id: 3, dia: 16, mes: 'ABR', weekday: 'QUI', titulo: 'Lima vs. Banco Nacional', tipo: 'Julgamento STJ', local: 'STJ — Sala Virtual', hora: '10:00', hoje: false },
    { id: 4, dia: 17, mes: 'ABR', weekday: 'SEX', titulo: 'MEI Santos — Reclamação Trabalhista', tipo: 'Audiência de Conciliação', local: 'TRT-15 — 2ª Vara', hora: '11:30', hoje: false },
    { id: 5, dia: 22, mes: 'ABR', weekday: 'QUA', titulo: 'Pereira & Filhos — Recurso', tipo: 'Sustentação Oral', local: 'TRT-2 — 5ª Câmara', hora: '15:00', hoje: false },
  ],

  tarefas: [
    { id: 1, titulo: 'Protocolar recurso — Costa vs. Segurada', prazo: '2026-04-14', prioridade: 'alta',  concluida: false, caso: 'Costa vs. Seguradora Alfa' },
    { id: 2, titulo: 'Enviar documentos ao perito — Matos',      prazo: '2026-04-14', prioridade: 'alta',  concluida: false, caso: 'Família Matos — Inventário' },
    { id: 3, titulo: 'Revisar minuta de contrato — Grupo XYZ',   prazo: '2026-04-15', prioridade: 'media', concluida: false, caso: 'Grupo XYZ — Societário' },
    { id: 4, titulo: 'Ligação com cliente Pereira',               prazo: '2026-04-15', prioridade: 'media', concluida: true,  caso: 'Pereira & Filhos — Trabalhista' },
    { id: 5, titulo: 'Calcular honorários — Alves',               prazo: '2026-04-16', prioridade: 'baixa', concluida: false, caso: 'Alves — Execução Fiscal' },
    { id: 6, titulo: 'Notificação extrajudicial — Lima',          prazo: '2026-04-17', prioridade: 'alta',  concluida: false, caso: 'Lima vs. Banco Nacional' },
  ],

  financeiro: {
    lancamentos: [
      { id: 1, desc: 'Honorários — Rodrigues',      tipo: 'receita', valor: 4500.00, status: 'pago',    data: '2026-04-12' },
      { id: 2, desc: 'Honorários — Costa',           tipo: 'receita', valor: 6200.00, status: 'pago',    data: '2026-04-10' },
      { id: 3, desc: 'Aluguel escritório — Abril',   tipo: 'despesa', valor: 2800.00, status: 'pago',    data: '2026-04-05' },
      { id: 4, desc: 'Honorários — Lima (parcela)',  tipo: 'receita', valor: 3500.00, status: 'pendente', data: '2026-04-18' },
      { id: 5, desc: 'Custas processuais — Matos',   tipo: 'despesa', valor: 820.00,  status: 'pago',    data: '2026-04-08' },
      { id: 6, desc: 'Honorários — Pereira & Filhos',tipo: 'receita', valor: 4550.00, status: 'pendente', data: '2026-04-22' },
    ],
  },
}

/* ── helpers ─────────────────────────────────────────────────────── */
function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/* ── sub-components ──────────────────────────────────────────────── */
function StatBox({ num, label }) {
  return (
    <div className={styles.statBox}>
      <div className={styles.statBoxNum}>{num}</div>
      <div className={styles.statBoxLabel}>{label}</div>
    </div>
  )
}

function KanbanBoard() {
  return (
    <div className={styles.kanbanWrapper}>
      <div className={styles.kanbanBoard}>
        {MOCK.kanban.map(col => (
          <div key={col.id} className={styles.kanbanCol}>
            <div className={styles.kanbanColHeader}>
              <span className={`${styles.kanbanColTitle} ${col.color}`}>
                {col.title}
              </span>
              <span className={styles.kanbanColCount}>{col.items.length}</span>
            </div>
            <div className={styles.kanbanItems}>
              {col.items.length === 0
                ? <div className={styles.kanbanEmpty}>Vazio</div>
                : col.items.map(item => (
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
        ))}
      </div>
    </div>
  )
}

function AudienciaItem({ ev }) {
  return (
    <div className={styles.eventItem}>
      <div className={styles.evDateCol}>
        <span className={styles.evWeekday}>{ev.weekday}</span>
        <span className={styles.evDay}>{ev.dia}</span>
      </div>
      <div className={styles.evSep} />
      <div className={styles.evBody}>
        <div className={styles.evTitle}>{ev.titulo}</div>
        <div className={styles.evMeta}>
          <span>{ev.local}</span>
          <span className={`${styles.evTag} ${ev.hoje ? styles.evTagHoje : styles.evTagProx}`}>
            {ev.hoje ? 'Hoje' : ev.mes + ' ' + ev.dia}
          </span>
        </div>
      </div>
      <div className={styles.evHora}>{ev.hora}</div>
    </div>
  )
}

function TarefaItem({ t }) {
  const vencida = !t.concluida && t.prazo < new Date().toISOString().split('T')[0]
  return (
    <div className={`${styles.taskItem} ${t.concluida ? styles.taskDone : ''} ${vencida ? styles.taskOverdue : ''}`}>
      <div className={`${styles.taskCheck} ${t.concluida ? styles.checked : ''}`} />
      <div className={styles.taskBody}>
        <span className={styles.taskTitle}>{t.titulo}</span>
        <span className={styles.taskCase}>{t.caso}</span>
      </div>
      <div className={styles.taskRight}>
        <span className={`badge badge-${t.prioridade}`}>{t.prioridade}</span>
        <span className={`${styles.taskPrazo} ${vencida ? styles.prazoVencido : ''}`}>
          {new Date(t.prazo + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </span>
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

/* ── Main Dashboard ──────────────────────────────────────────────── */
export default function Dashboard() {
  const { lawyer } = useAuth()
  const nome = lawyer?.full_name?.split(' ')[0] ?? 'Elcimar'
  const s = MOCK.stats
  const saldo = s.receitaMes - s.despesaMes

  return (
    <div className={styles.page}>

      {/* ── Stats banner ── */}
      <div className={`${styles.card} ${styles.statsBanner}`}>
        <div className={styles.activeCounter}>
          <span className={styles.activeNum}>{s.casosAtivos}</span>
          <div className={styles.activeLabel}>
            <strong>Casos ativos</strong>
            <span>{s.casosTotal} no total · {s.clientesTotal} clientes</span>
          </div>
        </div>

        <div className={styles.statsMini}>
          <StatBox num={s.tarefasHoje} label="Tarefas hoje" />
          <StatBox num={brl(s.receitaMes)} label="Receitas / mês" />
          <StatBox num={brl(saldo)}       label="Saldo / mês" />
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
                <div className={styles.cardSubtitle}>{s.casosTotal} processos · {s.casosAtivos} ativos</div>
              </div>
            </div>
            <a href="/casos" className={styles.cardLink}>Ver todos →</a>
          </div>
          <KanbanBoard />
        </div>

        {/* ── Card: Audiências ── */}
        <div className={`${styles.card} ${styles.cardAudiencias}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={`${styles.cardIcon} ${styles.iconBlue}`}>📅</div>
              <div>
                <div className={styles.cardTitle}>Audiências & Prazos</div>
                <div className={styles.cardSubtitle}>Próximos compromissos</div>
              </div>
            </div>
            <a href="/casos" className={styles.cardLink}>Calendário →</a>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.eventList}>
              {MOCK.audiencias.map(ev => <AudienciaItem key={ev.id} ev={ev} />)}
            </div>
          </div>
        </div>

        {/* ── Card: Tarefas ── */}
        <div className={`${styles.card} ${styles.cardTarefas}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={`${styles.cardIcon} ${styles.iconGreen}`}>✓</div>
              <div>
                <div className={styles.cardTitle}>Tarefas</div>
                <div className={styles.cardSubtitle}>
                  {MOCK.tarefas.filter(t => !t.concluida).length} pendentes · {MOCK.tarefas.filter(t => t.concluida).length} concluídas
                </div>
              </div>
            </div>
            <a href="/tarefas" className={styles.cardLink}>Ver todas →</a>
          </div>
          <div className={styles.cardBody}>
            {MOCK.tarefas.map(t => <TarefaItem key={t.id} t={t} />)}
          </div>
        </div>

        {/* ── Card: Financeiro ── */}
        <div className={`${styles.card} ${styles.cardFinanceiro}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <div className={`${styles.cardIcon} ${styles.iconPurple}`}>💰</div>
              <div>
                <div className={styles.cardTitle}>Financeiro — Abril 2026</div>
                <div className={styles.cardSubtitle}>Resumo do mês corrente</div>
              </div>
            </div>
            <a href="/financeiro" className={styles.cardLink}>Ver mais →</a>
          </div>

          {/* Mini stats row */}
          <div className={styles.finStatsRow}>
            <div className={styles.finStat}>
              <span className={styles.finStatLabel}>Receitas</span>
              <span className={`${styles.finStatVal} ${styles.positive}`}>{brl(s.receitaMes)}</span>
            </div>
            <div className={styles.finStatDiv} />
            <div className={styles.finStat}>
              <span className={styles.finStatLabel}>Despesas</span>
              <span className={`${styles.finStatVal} ${styles.negative}`}>{brl(s.despesaMes)}</span>
            </div>
            <div className={styles.finStatDiv} />
            <div className={styles.finStat}>
              <span className={styles.finStatLabel}>Saldo</span>
              <span className={`${styles.finStatVal} ${saldo >= 0 ? styles.positive : styles.negative}`}>{brl(saldo)}</span>
            </div>
          </div>

          {/* Progress bars */}
          <div className={styles.abarSection}>
            <div className={styles.analyticsTitle}>Distribuição de receitas</div>
            {[
              { label: 'Honorários recebidos',  pct: 76, color: 'accent' },
              { label: 'Honorários pendentes',  pct: 48, color: 'blue' },
              { label: 'Custas reembolsadas',   pct: 22, color: 'green' },
            ].map(bar => (
              <div key={bar.label} className={styles.abarRow}>
                <div className={styles.abarInfo}>
                  <span className={styles.abarLabel}>{bar.label}</span>
                  <span className={styles.abarPct}>{bar.pct}%</span>
                </div>
                <div className={styles.abarTrack}>
                  <div
                    className={`${styles.abarFill} ${styles['abar_' + bar.color]}`}
                    style={{ width: bar.pct + '%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Lançamentos recentes */}
          <div className={styles.recentTitle}>Lançamentos recentes</div>
          <div className={styles.cardBody}>
            {MOCK.financeiro.lancamentos.map(e => <EntradaItem key={e.id} e={e} />)}
          </div>
        </div>

      </div>
    </div>
  )
}
