import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import PageShell from '@/components/ui/PageShell'
import ViewToggle from '@/components/ui/ViewToggle'
import styles from './Cases.module.css'

/* ─── MOCK DATA — substituir por useCases() do Supabase ──────────── */
const MOCK_CASES = [
  { id: 1,  numero: '0012345-78.2024.8.26.0100', titulo: 'Costa vs. Seguradora Alfa',       cliente: 'Ricardo Costa',   status: 'ativo',     tipo: 'Cível',      tribunal: 'TJSP',  valor: 45000,  aberto: '2024-03-10', atualizado: '2026-04-10', trib_color: 'st-blue' },
  { id: 2,  numero: '0098765-12.2024.5.02.0001', titulo: 'Pereira & Filhos — Trabalhista',   cliente: 'Carlos Pereira',  status: 'ativo',     tipo: 'Trabalhista',tribunal: 'TRT-2', valor: 28000,  aberto: '2024-06-01', atualizado: '2026-04-08', trib_color: 'st-purple' },
  { id: 3,  numero: '0055432-99.2025.8.26.0000', titulo: 'Família Matos — Inventário',       cliente: 'Maria Matos',     status: 'ativo',     tipo: 'Família',    tribunal: 'TJSP',  valor: 120000, aberto: '2025-01-20', atualizado: '2026-04-12', trib_color: 'st-blue' },
  { id: 4,  numero: '0071122-44.2023.8.26.0100', titulo: 'Silva — Revisão Contratual',       cliente: 'Ana Silva',       status: 'ativo',     tipo: 'Contratos',  tribunal: 'TJSP',  valor: 15000,  aberto: '2023-11-05', atualizado: '2026-03-30', trib_color: 'st-teal' },
  { id: 5,  numero: '1234567-89.2025.1.00.0000', titulo: 'Lima vs. Banco Nacional',          cliente: 'Paulo Lima',      status: 'ativo',     tipo: 'Bancário',   tribunal: 'STJ',   valor: 200000, aberto: '2025-05-14', atualizado: '2026-04-11', trib_color: 'st-dark' },
  { id: 6,  numero: '0087654-32.2024.8.26.0100', titulo: 'Rodrigues — Acidente de Trânsito', cliente: 'João Rodrigues',  status: 'ativo',     tipo: 'Cível',      tribunal: 'TJSP',  valor: 35000,  aberto: '2024-08-22', atualizado: '2026-04-09', trib_color: 'st-blue' },
  { id: 7,  numero: '0033221-55.2025.8.26.0100', titulo: 'Souza — Divórcio Consensual',      cliente: 'Fernanda Souza',  status: 'suspenso',  tipo: 'Família',    tribunal: 'TJSP',  valor: 0,      aberto: '2025-02-10', atualizado: '2026-03-01', trib_color: 'st-blue' },
  { id: 8,  numero: '0044100-77.2023.8.26.0100', titulo: 'MEI Santos — Rescisão',            cliente: 'Bruno Santos',    status: 'suspenso',  tipo: 'Trabalhista',tribunal: 'TRT-15',valor: 18000,  aberto: '2023-07-18', atualizado: '2026-02-14', trib_color: 'st-purple' },
  { id: 9,  numero: '0067890-11.2022.8.26.0100', titulo: 'Alves — Execução Fiscal',          cliente: 'Roberto Alves',   status: 'encerrado', tipo: 'Tributário', tribunal: 'TRF-3', valor: 52000,  aberto: '2022-04-05', atualizado: '2026-01-30', trib_color: 'st-green' },
  { id: 10, numero: '0011223-44.2023.8.26.0100', titulo: 'Neto vs. Locadora',                cliente: 'Marcio Neto',     status: 'encerrado', tipo: 'Cível',      tribunal: 'TJSP',  valor: 8000,   aberto: '2023-03-22', atualizado: '2025-12-10', trib_color: 'st-blue' },
  { id: 11, numero: '0022334-56.2021.8.26.0100', titulo: 'Ferreira — Pensão Alimentícia',    cliente: 'Lucia Ferreira',  status: 'arquivado', tipo: 'Família',    tribunal: 'TJSP',  valor: 0,      aberto: '2021-09-14', atualizado: '2025-06-20', trib_color: 'st-blue' },
]

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

function KanbanView({ cases }) {
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
                      <div key={c.id} className={styles.kanbanCard}>
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

function ListView({ cases }) {
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
            <tr key={c.id} className={styles.tableRow}>
              <td>
                <div className={styles.caseTitle}>{c.titulo}</div>
                <div className={styles.caseNumber}>{c.numero}</div>
              </td>
              <td className={styles.clientCell}>{c.cliente}</td>
              <td><span className={`badge st-teal`}>{c.tipo}</span></td>
              <td><span className={`badge ${c.trib_color}`}>{c.tribunal}</span></td>
              <td className={styles.valorCell}>{brl(c.valor)}</td>
              <td><span className={`badge ${STATUS_CSS[c.status]}`}>{c.status}</span></td>
              <td className={styles.dateCell}>
                {new Date(c.atualizado).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Cases() {
  const { lawyer } = useAuth()
  const prefs = loadPreferences(lawyer?.id)

  const [view, setView] = useState(prefs.casos_view ?? 'kanban')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')

  function handleViewChange(v) {
    setView(v)
    savePreferences(lawyer?.id, { casos_view: v })
  }

  const filtered = useMemo(() => {
    let list = MOCK_CASES
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
  }, [search, filterStatus])

  const counts = useMemo(() =>
    Object.fromEntries(STATUS_COLS.map(col => [col.key, MOCK_CASES.filter(c => c.status === col.key).length]))
  , [])

  return (
    <PageShell
      title="Casos"
      subtitle={`${MOCK_CASES.length} processos · ${counts.ativo} ativos`}
      viewToggle={<ViewToggle value={view} onChange={handleViewChange} />}
      action={
        <button className={styles.btnNovo}>
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
                {l}{v !== 'todos' && <span className={styles.filterCount}>{counts[v]}</span>}
              </button>
            ))}
          </div>
        </>
      }
    >
      {view === 'kanban' ? <KanbanView cases={filtered} /> : <ListView cases={filtered} />}
    </PageShell>
  )
}
