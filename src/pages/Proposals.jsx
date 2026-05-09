import { useState, useMemo } from 'react'
import { useProposals } from '@/hooks/useProposals'
import PageShell from '@/components/ui/PageShell'
import styles from './Proposals.module.css'

/* ── data mapper ────────────────────────────────────────────────────── */
const STATUS_MAP  = { aceita: 'aprovado', recusada: 'recusado', expirada: 'recusado', rascunho: 'pendente', enviada: 'pendente' }

function mapProposal(p) {
  return {
    id:             p.id,
    titulo:         p.title,
    cliente:        p.clients?.full_name ?? '—',
    status:         STATUS_MAP[p.status] ?? 'pendente',
    tipo_honorario: p.fee_type ?? 'fixo',
    valor:          Number(p.fee_amount) || Number(p.fee_percentage) || 0,
    criado:         p.created_at?.split('T')[0],
    validade:       p.valid_until ?? null,
  }
}

/* ── constants ─────────────────────────────────────────────────────── */
const STATUS_LABELS = { pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado' }
const STATUS_CSS    = { pendente: 'badge-pendente', aprovado: 'badge-aprovado', recusado: 'badge-recusado' }
const TIPO_LABELS   = { fixo: 'Fixo', por_hora: 'Por Hora', percentual_exito: 'Êxito', misto: 'Misto' }

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

/* ── sub-components ─────────────────────────────────────────────────── */
function PipelineView({ proposals }) {
  const cols = [
    { key: 'pendente',  label: 'Em Avaliação', color: 'st-gold' },
    { key: 'aprovado',  label: 'Aprovadas',    color: 'st-green' },
    { key: 'recusado',  label: 'Recusadas',    color: 'st-red' },
  ]
  return (
    <div className={styles.pipelineWrapper}>
      <div className={styles.pipeline}>
        {cols.map(col => {
          const items = proposals.filter(p => p.status === col.key)
          const total = items.reduce((s, p) => s + p.valor, 0)
          return (
            <div key={col.key} className={styles.pipelineCol}>
              <div className={styles.pipelineColHeader}>
                <span className={`${styles.pipelineColTitle} ${col.color}`}>{col.label}</span>
                <span className={styles.pipelineColCount}>{items.length}</span>
              </div>
              {total > 0 && <div className={styles.pipelineTotal}>{brl(total)}</div>}
              <div className={styles.pipelineItems}>
                {items.length === 0
                  ? <div className={styles.pipelineEmpty}>Nenhuma proposta</div>
                  : items.map(p => (
                      <div key={p.id} className={styles.pipelineCard}>
                        <div className={styles.pipelineCardTitle}>{p.titulo}</div>
                        <div className={styles.pipelineCardClient}>{p.cliente}</div>
                        <div className={styles.pipelineCardMeta}>
                          <span className="badge st-teal">{TIPO_LABELS[p.tipo_honorario] ?? p.tipo_honorario}</span>
                          <span className={styles.pipelineCardVal}>{brl(p.valor)}</span>
                        </div>
                        {p.validade && (
                          <div className={styles.pipelineCardValidade}>
                            Válida até {new Date(p.validade + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        )}
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

function ListView({ proposals }) {
  if (proposals.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📄</div>
      <p>Nenhuma proposta encontrada</p>
    </div>
  )
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr><th>Proposta</th><th>Cliente</th><th>Honorário</th><th>Valor</th><th>Status</th><th>Criada</th><th>Validade</th></tr>
        </thead>
        <tbody>
          {proposals.map(p => (
            <tr key={p.id} className={styles.tableRow}>
              <td className={styles.propTitle}>{p.titulo}</td>
              <td>{p.cliente}</td>
              <td><span className="badge st-teal">{TIPO_LABELS[p.tipo_honorario] ?? p.tipo_honorario}</span></td>
              <td className={styles.valorCell}>{brl(p.valor)}</td>
              <td><span className={`badge ${STATUS_CSS[p.status]}`}>{STATUS_LABELS[p.status]}</span></td>
              <td className={styles.dateCell}>{p.criado ? new Date(p.criado).toLocaleDateString('pt-BR') : '—'}</td>
              <td className={styles.dateCell}>{p.validade ? new Date(p.validade + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function Proposals() {
  const [view, setView]               = useState('pipeline')
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')

  const { data: rawProposals, loading, error } = useProposals()
  const proposals = useMemo(() => (rawProposals ?? []).map(mapProposal), [rawProposals])

  const filtered = useMemo(() => {
    let list = proposals
    if (filterStatus !== 'todos') list = list.filter(p => p.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.titulo.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q)
      )
    }
    return list
  }, [proposals, search, filterStatus])

  const aprovado = proposals.filter(p => p.status === 'aprovado').reduce((s, p) => s + p.valor, 0)
  const pendente = proposals.filter(p => p.status === 'pendente').reduce((s, p) => s + p.valor, 0)

  return (
    <PageShell
      title="Propostas"
      subtitle={loading ? 'Carregando…' : `${proposals.length} propostas · ${brl(aprovado)} aprovado · ${brl(pendente)} em avaliação`}
      viewToggle={
        <div className={styles.viewSwitch}>
          <button className={`${styles.viewBtn} ${view === 'pipeline' ? styles.viewActive : ''}`} onClick={() => setView('pipeline')}>Pipeline</button>
          <button className={`${styles.viewBtn} ${view === 'lista'    ? styles.viewActive : ''}`} onClick={() => setView('lista')}>Lista</button>
        </div>
      }
      action={
        <button className={styles.btnNovo}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Nova proposta
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
              placeholder="Buscar proposta ou cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            {[{ v: 'todos', l: 'Todas' }, { v: 'pendente', l: 'Pendente' }, { v: 'aprovado', l: 'Aprovado' }, { v: 'recusado', l: 'Recusado' }].map(({ v, l }) => (
              <button
                key={v}
                className={`${styles.filterBtn} ${filterStatus === v ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus(v)}
              >{l}</button>
            ))}
          </div>
        </>
      }
    >
      {error
        ? <div className={styles.emptyState}><p>Erro ao carregar propostas.</p></div>
        : view === 'pipeline' ? <PipelineView proposals={filtered} /> : <ListView proposals={filtered} />
      }
    </PageShell>
  )
}
