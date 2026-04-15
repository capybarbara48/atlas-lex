import { useState, useMemo } from 'react'
import PageShell from '@/components/ui/PageShell'
import styles from './Financials.module.css'

/* ─── MOCK DATA — substituir por useFinancials() do Supabase ──────── */
const MOCK_ENTRIES = [
  { id: 1,  desc: 'Honorários — Rodrigues (Acidente)',       tipo: 'receita', valor: 4500,  status: 'pago',    data: '2026-04-12', caso: 'Rodrigues — Acidente' },
  { id: 2,  desc: 'Honorários — Costa (Recurso)',            tipo: 'receita', valor: 6200,  status: 'pago',    data: '2026-04-10', caso: 'Costa vs. Seguradora Alfa' },
  { id: 3,  desc: 'Aluguel escritório — Abril',              tipo: 'despesa', valor: 2800,  status: 'pago',    data: '2026-04-05', caso: null },
  { id: 4,  desc: 'Honorários — Lima (1ª parcela)',          tipo: 'receita', valor: 3500,  status: 'pendente',data: '2026-04-18', caso: 'Lima vs. Banco Nacional' },
  { id: 5,  desc: 'Custas processuais — Matos',              tipo: 'despesa', valor: 820,   status: 'pago',    data: '2026-04-08', caso: 'Família Matos — Inventário' },
  { id: 6,  desc: 'Honorários — Pereira & Filhos (êxito)',   tipo: 'receita', valor: 4550,  status: 'pendente',data: '2026-04-22', caso: 'Pereira & Filhos — Trabalhista' },
  { id: 7,  desc: 'Assinatura Thomson Reuters',              tipo: 'despesa', valor: 380,   status: 'pago',    data: '2026-04-01', caso: null },
  { id: 8,  desc: 'Honorários — Silva (revisão)',            tipo: 'receita', valor: 2000,  status: 'pago',    data: '2026-04-03', caso: 'Silva — Revisão Contratual' },
  { id: 9,  desc: 'Despachante — protocolo STJ',             tipo: 'despesa', valor: 320,   status: 'pago',    data: '2026-04-11', caso: 'Lima vs. Banco Nacional' },
  { id: 10, desc: 'Honorários — Grupo XYZ (assessoria)',     tipo: 'receita', valor: 4500,  status: 'pendente',data: '2026-04-30', caso: 'Grupo XYZ — Societário' },
  { id: 11, desc: 'Material de escritório',                  tipo: 'despesa', valor: 145,   status: 'pago',    data: '2026-04-07', caso: null },
  { id: 12, desc: 'Honorários — Souza (divórcio)',           tipo: 'receita', valor: 3000,  status: 'pago',    data: '2026-03-28', caso: 'Souza — Divórcio Consensual' },
]

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className={styles.summaryCard} style={{ borderTopColor: color }}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue} style={{ color }}>{value}</span>
      {sub && <span className={styles.summarySub}>{sub}</span>}
    </div>
  )
}

export default function Financials() {
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = MOCK_ENTRIES
    if (filterTipo !== 'todos') list = list.filter(e => e.tipo === filterTipo)
    if (filterStatus !== 'todos') list = list.filter(e => e.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.desc.toLowerCase().includes(q) || (e.caso ?? '').toLowerCase().includes(q))
    }
    return list
  }, [filterTipo, filterStatus, search])

  const receitas  = MOCK_ENTRIES.filter(e => e.tipo === 'receita' && e.status === 'pago').reduce((s, e) => s + e.valor, 0)
  const despesas  = MOCK_ENTRIES.filter(e => e.tipo === 'despesa' && e.status === 'pago').reduce((s, e) => s + e.valor, 0)
  const pendentes = MOCK_ENTRIES.filter(e => e.status === 'pendente').reduce((s, e) => s + e.valor, 0)
  const saldo     = receitas - despesas

  return (
    <PageShell
      title="Financeiro"
      subtitle="Abril 2026 · Resumo do mês corrente"
      action={
        <button className={styles.btnNovo}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Novo lançamento
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
              placeholder="Buscar lançamento ou caso..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            {[{ v: 'todos', l: 'Tudo' }, { v: 'receita', l: 'Receitas' }, { v: 'despesa', l: 'Despesas' }].map(({ v, l }) => (
              <button key={v} className={`${styles.filterBtn} ${filterTipo === v ? styles.filterActive : ''}`} onClick={() => setFilterTipo(v)}>{l}</button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            {[{ v: 'todos', l: 'Todos' }, { v: 'pago', l: 'Pago' }, { v: 'pendente', l: 'Pendente' }].map(({ v, l }) => (
              <button key={v} className={`${styles.filterBtn} ${filterStatus === v ? styles.filterActive : ''}`} onClick={() => setFilterStatus(v)}>{l}</button>
            ))}
          </div>
        </>
      }
    >
      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <SummaryCard label="Receitas recebidas" value={brl(receitas)} sub={`${MOCK_ENTRIES.filter(e => e.tipo === 'receita' && e.status === 'pago').length} lançamentos`} color="var(--green)" />
        <SummaryCard label="Despesas pagas"     value={brl(despesas)} sub={`${MOCK_ENTRIES.filter(e => e.tipo === 'despesa' && e.status === 'pago').length} lançamentos`} color="var(--red)" />
        <SummaryCard label="Saldo do mês"       value={brl(saldo)}    color={saldo >= 0 ? 'var(--green)' : 'var(--red)'} />
        <SummaryCard label="A receber"          value={brl(pendentes)} sub={`${MOCK_ENTRIES.filter(e => e.status === 'pendente').length} lançamentos pendentes`} color="var(--blue)" />
      </div>

      {/* Entries table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr><th>Descrição</th><th>Caso</th><th>Tipo</th><th>Status</th><th>Valor</th><th>Data</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} className={styles.emptyRow}>Nenhum lançamento encontrado</td></tr>
              : filtered.map(e => (
                  <tr key={e.id} className={styles.tableRow}>
                    <td className={styles.descCell}>{e.desc}</td>
                    <td className={styles.caseCell}>{e.caso ?? '—'}</td>
                    <td><span className={`badge badge-${e.tipo}`}>{e.tipo === 'receita' ? 'Receita' : 'Despesa'}</span></td>
                    <td>
                      <span className={styles.entryStatus} style={{ color: e.status === 'pago' ? 'var(--green)' : '#b45309' }}>
                        {e.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                      </span>
                    </td>
                    <td className={`${styles.valorCell} ${e.tipo === 'despesa' ? styles.negative : styles.positive}`}>
                      {e.tipo === 'despesa' ? '−' : '+'}{brl(e.valor)}
                    </td>
                    <td className={styles.dateCell}>
                      {new Date(e.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}
