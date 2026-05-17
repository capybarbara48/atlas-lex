import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import { useClients } from '@/hooks/useClients'
import { useToast } from '@/context/ToastContext'
import PageShell from '@/components/ui/PageShell'
import ViewToggle from '@/components/ui/ViewToggle'
import Modal from '@/components/ui/Modal'
import ClientForm from '@/components/forms/ClientForm'
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'
import styles from './Clients.module.css'

const EditIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
    <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z"/>
    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z"/>
  </svg>
)

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
function GridView({ clients, onNavigate, onEdit }) {
  if (clients.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>👤</div>
      <p>Nenhum cliente encontrado</p>
    </div>
  )
  return (
    <div className={styles.grid}>
      {clients.map(c => (
        <div key={c.id} className={styles.clientCard} onClick={() => onNavigate(c.id)} style={{ cursor: 'pointer' }}>
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
            <button
              className={styles.editIconBtn}
              title="Editar"
              onClick={e => { e.stopPropagation(); onEdit(c.id) }}
            >
              <EditIcon />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListView({ clients, onNavigate, onEdit }) {
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id} className={styles.tableRow} onClick={() => onNavigate(c.id)} style={{ cursor: 'pointer' }}>
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
              <td onClick={e => e.stopPropagation()}>
                <button className={styles.editIconBtn} title="Editar" onClick={() => onEdit(c.id)}>
                  <EditIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={styles.clientCard} style={{ gap: '0.55rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Skeleton width="52px" height="52px" radius="50%" />
          <Skeleton width="60%" height="0.85rem" />
          <Skeleton width="2.5rem" height="1.2rem" radius="999px" />
          <Skeleton width="80%" height="0.65rem" />
          <Skeleton width="65%" height="0.65rem" />
        </div>
      ))}
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function Clients() {
  const { lawyer } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
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

  function openNew()       { setEditing(null); setFormOpen(true) }
  function openEdit(id)    { setEditing(rawById[id] ?? null); setFormOpen(true) }
  function handleNavigate(id) { navigate('/painel/clientes/' + id) }
  function handleSave() {
    refetch()
    setFormOpen(false)
    toast.success(editing ? 'Cliente atualizado.' : 'Cliente criado.')
  }

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
        : loading
          ? view === 'grid'
            ? <SkeletonGrid />
            : <div className={styles.tableCard}><SkeletonTable rows={7} cols={7} /></div>
          : view === 'grid'
            ? <GridView clients={filtered} onNavigate={handleNavigate} onEdit={openEdit} />
            : <ListView clients={filtered} onNavigate={handleNavigate} onEdit={openEdit} />
      }

      {formOpen && (
        <Modal title={editing ? 'Editar cliente' : 'Novo cliente'} onClose={() => setFormOpen(false)}>
          <ClientForm initial={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </Modal>
      )}
    </PageShell>
  )
}
