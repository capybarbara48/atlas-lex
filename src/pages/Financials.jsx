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
