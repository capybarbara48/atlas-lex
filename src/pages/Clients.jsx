import { useState, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import { useClients } from '@/hooks/useClients'
import PageShell from '@/components/ui/PageShell'
import ViewToggle from '@/components/ui/ViewToggle'
import Modal from '@/components/ui/Modal'
import ClientForm from '@/components/forms/ClientForm'
import styles from './Clients.module.css'

/* ── data mapper ────────────────────────────────────────────────────── */
function mapClient(c) {
  return {
    id:       c.id,
    nome:     c.full_name,
    email:    c.email ?? '—',
    telefone: c.phone ?? '—',
    cpf:      c.tipo !== 'PJ' ? c.cpf_cnpj : null,
    cnpj:     c.tipo === 'PJ' ? c.cpf_cnpj : null,
    casos:    c.cases?.[0]?.count ?? 0,
    cidade:   c.cidade ?? '—',
    estado:   c.estado ?? '—',
    tipo:     c.tipo ?? 'PF',
  }
}

/* ── helpers ────────────────────────────────────────────────────────── */
function initials(nome) {
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

/* ── sub-components ─────────────────────────────────────────────────── */
function GridView({ clients, onEdit }) {
  if (clients.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>👤</div>
      <p>Nenhum cliente encontrado</p>
    </div>
  )
  return (
    <div className={styles.grid}>
      {clients.map(c => (
        <div key={c.id} className={styles.clientCard} onClick={() => onEdit(c.id)} style={{ cursor: 'pointer' }}>
          <div className={styles.clientAvatar}
            style={{ background: `hsl(${(c.id.charCodeAt?.(0) ?? 0) * 47 % 360}, 35%, 88%)`, color: `hsl(${(c.id.charCodeAt?.(0) ?? 0) * 47 % 360}, 55%, 32%)` }}>
            {initials(c.nome)}
          </div>
          <div className={styles.clientName}>{c.nome}</div>
          <span className={`badge ${c.tipo === 'PJ' ? 'st-blue' : 'st-teal'}`}>{c.tipo}</span>
          <div className={styles.clientMeta}>
            <span>{c.email}</span>
            <span>{c.telefone}</span>
            <span>{c.cidade} — {c.estado}</span>
          </div>
          <div className={styles.clientFooter}>
            <span className={styles.clientCasos}>{c.casos} {c.casos === 1 ? 'processo' : 'processos'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListView({ clients, onEdit }) {
  if (clients.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>👤</div>
      <p>Nenhum cliente encontrado</p>
    </div>
  )
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Telefone</th>
            <th>Documento</th>
            <th>Cidade</th>
            <th>Processos</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id} className={styles.tableRow} onClick={() => onEdit(c.id)} style={{ cursor: 'pointer' }}>
              <td>
                <div className={styles.tableClientWrap}>
                  <div className={styles.tableAvatar}
                    style={{ background: `hsl(${(c.id.charCodeAt?.(0) ?? 0) * 47 % 360}, 35%, 88%)`, color: `hsl(${(c.id.charCodeAt?.(0) ?? 0) * 47 % 360}, 55%, 32%)` }}>
                    {initials(c.nome)}
                  </div>
                  <div>
                    <div className={styles.clientNameRow}>{c.nome}</div>
                    <div className={styles.clientEmail}>{c.email}</div>
                  </div>
                </div>
              </td>
              <td><span className={`badge ${c.tipo === 'PJ' ? 'st-blue' : 'st-teal'}`}>{c.tipo}</span></td>
              <td className={styles.phoneCell}>{c.telefone}</td>
              <td className={styles.docCell}>{c.cpf ?? c.cnpj ?? '—'}</td>
              <td>{c.cidade}</td>
              <td><span className={styles.casosCount}>{c.casos}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function Clients() {
  const { lawyer } = useAuth()
  const prefs = loadPreferences(lawyer?.id)

  const [view, setView]           = useState(prefs.clientes_view ?? 'lista')
  const [search, setSearch]       = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [formOpen, setFormOpen]   = useState(false)
  const [editing,  setEditing]    = useState(null)

  const { data: rawClients, loading, error, refetch } = useClients()
  const clients = useMemo(() => (rawClients ?? []).map(mapClient), [rawClients])

  const rawById = useMemo(() =>
    Object.fromEntries((rawClients ?? []).map(r => [r.id, r]))
  , [rawClients])

  function openNew()    { setEditing(null); setFormOpen(true) }
  function openEdit(id) { setEditing(rawById[id] ?? null); setFormOpen(true) }
  function handleSave() { refetch(); setFormOpen(false) }

  function handleViewChange(v) {
    const mapped = v === 'kanban' ? 'grid' : 'lista'
    setView(mapped)
    savePreferences(lawyer?.id, { clientes_view: mapped })
  }

  const filtered = useMemo(() => {
    let list = clients
    if (filterTipo !== 'todos') list = list.filter(c => c.tipo === filterTipo)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.cpf ?? c.cnpj ?? '').includes(q)
      )
    }
    return list
  }, [clients, search, filterTipo])

  return (
    <PageShell
      title="Clientes"
      subtitle={loading ? 'Carregando…' : `${clients.length} clientes cadastrados`}
      viewToggle={<ViewToggle value={view === 'grid' ? 'kanban' : 'lista'} onChange={handleViewChange} />}
      action={
        <button className={styles.btnNovo} onClick={openNew}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Novo cliente
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
              placeholder="Buscar por nome, e-mail ou documento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            {[{ v: 'todos', l: 'Todos' }, { v: 'PF', l: 'Pessoa Física' }, { v: 'PJ', l: 'Pessoa Jurídica' }].map(({ v, l }) => (
              <button
                key={v}
                className={`${styles.filterBtn} ${filterTipo === v ? styles.filterActive : ''}`}
                onClick={() => setFilterTipo(v)}
              >{l}</button>
            ))}
          </div>
        </>
      }
    >
      {error
        ? <div className={styles.emptyState}><p>Erro ao carregar clientes.</p></div>
        : view === 'grid'
          ? <GridView clients={filtered} onEdit={openEdit} />
          : <ListView clients={filtered} onEdit={openEdit} />
      }

      {formOpen && (
        <Modal title={editing ? 'Editar cliente' : 'Novo cliente'} onClose={() => setFormOpen(false)}>
          <ClientForm initial={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </Modal>
      )}
    </PageShell>
  )
}
