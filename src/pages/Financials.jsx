import { useState, useMemo } from 'react'
import { useAllEntries } from '@/hooks/useFinancials'
import PageShell from '@/components/ui/PageShell'
import Modal from '@/components/ui/Modal'
import EntryForm from '@/components/forms/EntryForm'
import styles from './Financials.module.css'

/* ── data mapper ────────────────────────────────────────────────────── */
function mapEntry(e) {
  return {
    id:     e.id,
    desc:   e.description ?? '—',
    tipo:   e.type,
    valor:  Number(e.amount) || 0,
    status: e.status,
    data:   e.paid_at?.split('T')[0] ?? e.due_date?.split('T')[0] ?? e.created_at?.split('T')[0] ?? null,
    caso:   e.cases?.title ?? null,
  }
}

/* ── helpers ────────────────────────────────────────────────────────── */
function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
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

function MonthlyChart({ entries }) {
  const months = useMemo(() => {
    const result = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      result.push({ key, label })
    }
    return result
  }, [])

  const data = useMemo(() => months.map(({ key }) => {
    const paid = entries.filter(e => e.data?.startsWith(key) && e.status === 'pago')
    return {
      receita: paid.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0),
      despesa: paid.filter(e => e.tipo === 'despesa').reduce((s, e) => s + e.valor, 0),
    }
  }), [entries, months])

  const maxVal = Math.max(...data.flatMap(d => [d.receita, d.despesa]), 1)

  const W = 600, H = 170
  const padL = 8, padR = 8, padT = 12, padB = 28
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const groupW = chartW / months.length
  const barW = groupW * 0.3
  const gap = groupW * 0.06

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <span className={styles.chartTitle}>Últimos 6 meses (pagamentos)</span>
        <div className={styles.chartLegend}>
          <span className={styles.legendDot} style={{ background: 'var(--green)' }} />
          <span>Receitas</span>
          <span className={styles.legendDot} style={{ background: 'var(--red)', marginLeft: '0.75rem' }} />
          <span>Despesas</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f}
            x1={padL} x2={W - padR}
            y1={padT + chartH * (1 - f)} y2={padT + chartH * (1 - f)}
            stroke="rgba(128,128,128,0.1)" strokeWidth="1"
          />
        ))}
        {data.map((d, i) => {
          const cx = padL + i * groupW + groupW / 2
          const rH = Math.max((d.receita / maxVal) * chartH, d.receita > 0 ? 3 : 0)
          const dH = Math.max((d.despesa / maxVal) * chartH, d.despesa > 0 ? 3 : 0)
          return (
            <g key={i}>
              <rect x={cx - barW - gap / 2} y={padT + chartH - rH} width={barW} height={rH} rx={3}
                fill="var(--green)" opacity="0.75" />
              <rect x={cx + gap / 2} y={padT + chartH - dH} width={barW} height={dH} rx={3}
                fill="var(--red)" opacity="0.75" />
            </g>
          )
        })}
        {months.map((m, i) => (
          <text key={i}
            x={padL + i * groupW + groupW / 2}
            y={H - 8}
            textAnchor="middle" fontSize="11" fill="var(--text-3)" fontFamily="inherit"
          >{m.label}</text>
        ))}
      </svg>
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function Financials() {
  const [filterTipo, setFilterTipo]     = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [search, setSearch]             = useState('')
  const [formOpen, setFormOpen]         = useState(false)
  const [editing,  setEditing]          = useState(null)

  const { data: rawEntries, loading, error, refetch } = useAllEntries()
  const entries = useMemo(() => (rawEntries ?? []).map(mapEntry), [rawEntries])

  const rawById = useMemo(() =>
    Object.fromEntries((rawEntries ?? []).map(r => [r.id, r]))
  , [rawEntries])

  function openNew()    { setEditing(null); setFormOpen(true) }
  function openEdit(id) { setEditing(rawById[id] ?? null); setFormOpen(true) }
  function handleSave() { refetch(); setFormOpen(false) }

  const filtered = useMemo(() => {
    let list = entries
    if (filterTipo   !== 'todos') list = list.filter(e => e.tipo   === filterTipo)
    if (filterStatus !== 'todos') list = list.filter(e => e.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.desc.toLowerCase().includes(q) || (e.caso ?? '').toLowerCase().includes(q))
    }
    return list
  }, [entries, filterTipo, filterStatus, search])

  const receitas  = entries.filter(e => e.tipo === 'receita' && e.status === 'pago').reduce((s, e) => s + e.valor, 0)
  const despesas  = entries.filter(e => e.tipo === 'despesa' && e.status === 'pago').reduce((s, e) => s + e.valor, 0)
  const pendentes = entries.filter(e => e.status === 'pendente').reduce((s, e) => s + e.valor, 0)
  const saldo     = receitas - despesas

  const nReceitas  = entries.filter(e => e.tipo === 'receita' && e.status === 'pago').length
  const nDespesas  = entries.filter(e => e.tipo === 'despesa' && e.status === 'pago').length
  const nPendentes = entries.filter(e => e.status === 'pendente').length

  return (
    <PageShell
      title="Financeiro"
      subtitle={`${currentMonthLabel()} · Todos os lançamentos`}
      action={
        <button className={styles.btnNovo} onClick={openNew}>
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
        <SummaryCard label="Receitas recebidas" value={brl(receitas)}  sub={`${nReceitas} lançamentos`}          color="var(--green)" />
        <SummaryCard label="Despesas pagas"      value={brl(despesas)}  sub={`${nDespesas} lançamentos`}          color="var(--red)" />
        <SummaryCard label="Saldo"               value={brl(saldo)}                                               color={saldo >= 0 ? 'var(--green)' : 'var(--red)'} />
        <SummaryCard label="A receber"           value={brl(pendentes)} sub={`${nPendentes} lançamentos pendentes`} color="var(--blue)" />
      </div>

      {/* Monthly chart */}
      {!loading && !error && entries.length > 0 && <MonthlyChart entries={entries} />}

      {/* Entries table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr><th>Descrição</th><th>Caso</th><th>Tipo</th><th>Status</th><th>Valor</th><th>Data</th></tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={6} className={styles.emptyRow}>Carregando…</td></tr>
              : error
              ? <tr><td colSpan={6} className={styles.emptyRow}>Erro ao carregar lançamentos.</td></tr>
              : filtered.length === 0
              ? <tr><td colSpan={6} className={styles.emptyRow}>Nenhum lançamento encontrado</td></tr>
              : filtered.map(e => (
                  <tr key={e.id} className={styles.tableRow} onClick={() => openEdit(e.id)} style={{ cursor: 'pointer' }}>
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
                      {e.data ? new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {formOpen && (
        <Modal title={editing ? 'Editar lançamento' : 'Novo lançamento'} onClose={() => setFormOpen(false)}>
          <EntryForm initial={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </Modal>
      )}
    </PageShell>
  )
}
