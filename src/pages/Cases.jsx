import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import { useCases } from '@/hooks/useCases'
import PageShell from '@/components/ui/PageShell'
import ViewToggle from '@/components/ui/ViewToggle'
import Modal from '@/components/ui/Modal'
import CaseForm from '@/components/forms/CaseForm'
import styles from './Cases.module.css'

/* ── data mapper ────────────────────────────────────────────────────── */
function tribColor(court) {
  if (!court) return 'st-teal'
  const c = court.toUpperCase()
  if (c.startsWith('TJ'))           return 'st-blue'
  if (c.startsWith('TRT'))          return 'st-purple'
  if (c.startsWith('TRF'))          return 'st-green'
  if (c === 'STJ' || c === 'STF')   return 'st-dark'
  return 'st-teal'
}

function mapCase(c) {
  return {
    id:         c.id,
    numero:     c.case_number ?? '—',
    titulo:     c.title,
    cliente:    c.clients?.full_name ?? '—',
    status:     c.status,
    tipo:       c.area ?? '—',
    tribunal:   c.court ?? '—',
    valor:      Number(c.valor) || 0,
    aberto:     c.opened_at?.split('T')[0] ?? c.created_at?.split('T')[0],
    atualizado: c.updated_at?.split('T')[0] ?? c.created_at?.split('T')[0],
    trib_color: tribColor(c.court),
  }
}

/* ── constants ─────────────────────────────────────────────────────── */
const STATUS_COLS = [
  { key: 'ativo',     label: 'Ativo',     color: 'st-green' },
  { key: 'suspenso',  label: 'Suspenso',  color: 'st-gold' },
  { key: 'encerrado', label: 'Encerrado', color: 'st-blue' },
  { key: 'arquivado', label: 'Arquivado', color: 'st-dark' },
]

const STATUS_CSS = { ativo: 'badge-ativo', suspenso: 'badge-suspenso', encerrado: 'badge-encerrado', arquivado: 'badge-arquivado' }

function brl(v) {
  if (!v) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

/* ── sub-components ─────────────────────────────────────────────────── */
function KanbanView({ cases, onEdit }) {
  return (
    <div className={styles.kanbanWrapper}>
      <div className={styles.kanbanBoard}>
        {STATUS_COLS.map(col => {
          const items = cases.filter(c => c.status === col.key)
          return (
            <div key={col.key} className={styles.kanbanCol}>
              <div className={styles.kanbanColHeader}>
                <span className={`${styles.kanbanColTitle} ${col.color}`}>{col.label}</span>
                <span className={styles.kanbanColCount}>{items.length}</span>
              </div>
              <div className={styles.kanbanItems}>
                {items.length === 0
                  ? <div className={styles.kanbanEmpty}>Nenhum processo</div>
                  : items.map(c => (
                      <div key={c.id} className={styles.kanbanCard} onClick={() => onEdit(c.id)} style={{ cursor: 'pointer' }}>
                        <div className={styles.kanbanCardTitle}>{c.titulo}</div>
                        <div className={styles.kanbanCardClient}>{c.cliente}</div>
                        <div className={styles.kanbanCardMeta}>
                          <span className={`badge ${c.trib_color}`}>{c.tribunal}</span>
                          {c.valor > 0 && <span className={styles.kanbanCardValor}>{brl(c.valor)}</span>}
                        </div>
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

function ListView({ cases, onEdit }) {
  if (cases.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>⚖</div>
      <p>Nenhum processo encontrado</p>
    </div>
  )
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Processo</th>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Tribunal</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(c => (
            <tr key={c.id} className={styles.tableRow} onClick={() => onEdit(c.id)} style={{ cursor: 'pointer' }}>
              <td>
                <div className={styles.caseTitle}>{c.titulo}</div>
                <div className={styles.caseNumber}>{c.numero}</div>
              </td>
              <td className={styles.clientCell}>{c.cliente}</td>
              <td><span className="badge st-teal">{c.tipo}</span></td>
              <td><span className={`badge ${c.trib_color}`}>{c.tribunal}</span></td>
              <td className={styles.valorCell}>{brl(c.valor)}</td>
              <td><span className={`badge ${STATUS_CSS[c.status]}`}>{c.status}</span></td>
              <td className={styles.dateCell}>
                {c.atualizado ? new Date(c.atualizado + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function Cases() {
  const { lawyer } = useAuth()
  const prefs = loadPreferences(lawyer?.id)

  const [view, setView]               = useState(prefs.casos_view ?? 'kanban')
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [formOpen, setFormOpen]       = useState(false)
  const [editing,  setEditing]        = useState(null)

  const { data: rawCases, loading, error, refetch } = useCases()
  const cases = useMemo(() => (rawCases ?? []).map(mapCase), [rawCases])

  const rawById = useMemo(() =>
    Object.fromEntries((rawCases ?? []).map(r => [r.id, r]))
  , [rawCases])

  function openNew()    { setEditing(null); setFormOpen(true) }
  function openEdit(id) { setEditing(rawById[id] ?? null); setFormOpen(true) }
  function handleSave() { refetch(); setFormOpen(false) }

  function handleViewChange(v) {
    setView(v)
    savePreferences(lawyer?.id, { casos_view: v })
  }

  const filtered = useMemo(() => {
    let list = cases
    if (filterStatus !== 'todos') list = list.filter(c => c.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.titulo.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q) ||
        c.numero.includes(q)
      )
    }
    return list
  }, [cases, search, filterStatus])

  const counts = useMemo(() =>
    Object.fromEntries(STATUS_COLS.map(col => [col.key, cases.filter(c => c.status === col.key).length]))
  , [cases])

  return (
    <PageShell
      title="Casos"
      subtitle={loading ? 'Carregando…' : `${cases.length} processos · ${counts.ativo ?? 0} ativos`}
      viewToggle={<ViewToggle value={view} onChange={handleViewChange} />}
      action={
        <button className={styles.btnNovo} onClick={openNew}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Novo caso
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
              placeholder="Buscar por título, cliente ou número..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            {[{ v: 'todos', l: 'Todos' }, ...STATUS_COLS.map(s => ({ v: s.key, l: s.label }))].map(({ v, l }) => (
              <button
                key={v}
                className={`${styles.filterBtn} ${filterStatus === v ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus(v)}
              >
                {l}{v !== 'todos' && counts[v] != null && <span className={styles.filterCount}>{counts[v]}</span>}
              </button>
            ))}
          </div>
        </>
      }
    >
      {error
        ? <div className={styles.emptyState}><p>Erro ao carregar casos.</p></div>
        : view === 'kanban'
          ? <KanbanView cases={filtered} onEdit={openEdit} />
          : <ListView cases={filtered} onEdit={openEdit} />
      }

      {formOpen && (
        <Modal title={editing ? 'Editar processo' : 'Novo processo'} onClose={() => setFormOpen(false)} size="lg">
          <CaseForm initial={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </Modal>
      )}
    </PageShell>
  )
}
