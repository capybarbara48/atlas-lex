import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import ClientForm from '@/components/forms/ClientForm'
import CaseForm from '@/components/forms/CaseForm'
import { Skeleton, SkeletonListItem } from '@/components/ui/Skeleton'
import styles from './ClientDetail.module.css'

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const STATUS_CASE = {
  ativo:      { label: 'Ativo',      cls: 'st-teal'   },
  encerrado:  { label: 'Encerrado',  cls: 'st-gray'   },
  arquivado:  { label: 'Arquivado',  cls: 'st-gray'   },
  suspenso:   { label: 'Suspenso',   cls: 'st-orange'  },
}

const STATUS_TASK = {
  pendente:     { label: 'Pendente',     cls: 'st-orange' },
  em_andamento: { label: 'Em andamento', cls: 'st-blue'   },
  concluida:    { label: 'Concluída',    cls: 'st-teal'   },
  cancelada:    { label: 'Cancelada',    cls: 'st-gray'   },
}

const PRIORITY = {
  alta:  { label: 'Alta',  cls: 'st-red'    },
  media: { label: 'Média', cls: 'st-orange' },
  baixa: { label: 'Baixa', cls: 'st-gray'  },
}

const STATUS_FIN = {
  pago:      { label: 'Pago',      cls: 'st-teal'   },
  pendente:  { label: 'Pendente',  cls: 'st-orange' },
  cancelado: { label: 'Cancelado', cls: 'st-gray'   },
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [client,  setClient]  = useState(null)
  const [cases,   setCases]   = useState([])
  const [tasks,   setTasks]   = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [editing,    setEditing]    = useState(false)
  const [newCase,    setNewCase]    = useState(false)

  async function load() {
    setLoading(true)
    setError(null)

    const [clientRes, casesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('cases')
        .select('id, title, case_number, status, area, court, valor, opened_at, updated_at')
        .eq('client_id', id)
        .order('updated_at', { ascending: false }),
    ])

    if (clientRes.error) { setError(clientRes.error.message); setLoading(false); return }

    setClient(clientRes.data)
    const caseList = casesRes.data ?? []
    setCases(caseList)

    const caseIds = caseList.map(c => c.id)

    if (caseIds.length > 0) {
      const [tasksRes, entriesRes] = await Promise.all([
        supabase.from('tasks')
          .select('id, title, status, priority, due_date, cases(title)')
          .in('case_id', caseIds)
          .order('due_date', { ascending: true, nullsFirst: false }),
        supabase.from('financial_entries')
          .select('id, description, type, amount, status, due_date, cases(title)')
          .in('case_id', caseIds)
          .order('due_date', { ascending: false }),
      ])
      setTasks(tasksRes.data ?? [])
      setEntries(entriesRes.data ?? [])
    } else {
      setTasks([])
      setEntries([])
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function handleSave() {
    setEditing(false)
    load()
  }

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Skeleton width="5rem" height="0.75rem" />
        <div className={styles.headerMain}>
          <Skeleton width="48px" height="48px" radius="12px" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <Skeleton width="45%" height="1rem" />
            <Skeleton width="28%" height="0.7rem" />
          </div>
        </div>
      </div>
      <div className={styles.infoCard}>
        {[1,2,3,4,5].map(i => (
          <div key={i} className={styles.infoRow}>
            <Skeleton width="50%" height="0.6rem" />
            <Skeleton width="75%" height="0.8rem" />
          </div>
        ))}
      </div>
      {[4, 3, 3].map((rows, si) => (
        <div key={si} className={styles.section}>
          <div className={styles.sectionHeader}>
            <Skeleton width="5rem" height="0.75rem" />
            <Skeleton width="1.5rem" height="1.2rem" radius="999px" />
          </div>
          <div className={styles.sectionBody}>
            {Array.from({ length: rows }, (_, i) => <SkeletonListItem key={i} />)}
          </div>
        </div>
      ))}
    </div>
  )

  if (error) return (
    <div className={styles.loadWrap}>
      <p style={{ color: 'var(--text-2)' }}>Erro ao carregar: {error}</p>
    </div>
  )

  if (!client) return null

  const receita = entries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const despesa = entries.filter(e => e.type === 'despesa' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const saldo   = receita - despesa

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/painel/clientes')}>
          ← Clientes
        </button>

        <div className={styles.headerMain}>
          <div className={styles.avatar}>{initials(client.full_name)}</div>
          <div>
            <div className={styles.clientName}>
              {client.full_name}
              <span className={`badge ${client.tipo === 'PJ' ? 'st-blue' : 'st-teal'}`}>
                {client.tipo ?? 'PF'}
              </span>
            </div>
            {client.email && <div className={styles.clientSub}>{client.email}</div>}
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.newCaseBtn} onClick={() => setNewCase(true)}>
            + Novo caso
          </button>
          <button className={styles.editBtn} onClick={() => setEditing(true)}>
            Editar
          </button>
        </div>
      </div>

      {/* ── Info card ── */}
      <div className={styles.infoCard}>
        <InfoRow label="CPF/CNPJ"   value={client.cpf_cnpj} />
        <InfoRow label="Telefone"   value={client.phone} />
        <InfoRow label="E-mail"     value={client.email} />
        <InfoRow label="Cidade"     value={
          client.cidade && client.estado
            ? `${client.cidade} / ${client.estado}`
            : client.cidade ?? client.estado
        } />
        <InfoRow label="Cadastrado" value={fmt(client.created_at)} />
      </div>

      {/* ── Casos ── */}
      <Section title="Casos" count={cases.length}>
        {cases.length === 0
          ? <Empty text="Nenhum processo vinculado" />
          : cases.map(c => {
              const st = STATUS_CASE[c.status] ?? { label: c.status, cls: 'st-gray' }
              return (
                <Link key={c.id} to={`/painel/casos/${c.id}`} className={styles.listItem} style={{ textDecoration: 'none' }}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{c.title}</span>
                    {c.case_number && <span className={styles.listSub}>{c.case_number}</span>}
                  </div>
                  <div className={styles.listMeta}>
                    {c.area   && <span className={styles.listTag}>{c.area}</span>}
                    {c.court  && <span className={styles.listTag}>{c.court}</span>}
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {c.valor > 0 && <span className={styles.listAmt}>{brl(c.valor)}</span>}
                    <span className={styles.listDate}>{fmt(c.opened_at)}</span>
                  </div>
                </Link>
              )
            })
        }
      </Section>

      {/* ── Tarefas ── */}
      <Section title="Tarefas" count={tasks.length}>
        {tasks.length === 0
          ? <Empty text="Nenhuma tarefa vinculada" />
          : tasks.map(t => {
              const st = STATUS_TASK[t.status]  ?? { label: t.status,   cls: 'st-gray' }
              const pr = PRIORITY[t.priority]   ?? { label: t.priority,  cls: 'st-gray' }
              return (
                <div key={t.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{t.title}</span>
                    {t.cases?.title && <span className={styles.listSub}>{t.cases.title}</span>}
                  </div>
                  <div className={styles.listMeta}>
                    <span className={`badge ${pr.cls}`}>{pr.label}</span>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {t.due_date && <span className={styles.listDate}>{fmt(t.due_date)}</span>}
                  </div>
                </div>
              )
            })
        }
      </Section>

      {/* ── Financeiro ── */}
      <Section
        title="Financeiro"
        count={entries.length}
        badge={entries.length > 0
          ? <span className={styles.saldoBadge} style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {brl(saldo)}
            </span>
          : null
        }
      >
        {entries.length === 0
          ? <Empty text="Nenhum lançamento vinculado" />
          : entries.map(e => {
              const st = STATUS_FIN[e.status] ?? { label: e.status, cls: 'st-gray' }
              return (
                <div key={e.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{e.description || '—'}</span>
                    {e.cases?.title && <span className={styles.listSub}>{e.cases.title}</span>}
                  </div>
                  <div className={styles.listMeta}>
                    <span className={`badge ${e.type === 'receita' ? 'st-teal' : 'st-red'}`}>
                      {e.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {e.due_date && <span className={styles.listDate}>{fmt(e.due_date)}</span>}
                    <span className={styles.listAmt} style={{ color: e.type === 'receita' ? 'var(--green)' : 'var(--red)' }}>
                      {e.type === 'receita' ? '+' : '−'}{brl(e.amount)}
                    </span>
                  </div>
                </div>
              )
            })
        }
      </Section>

      {editing && (
        <Modal title="Editar cliente" onClose={() => setEditing(false)}>
          <ClientForm initial={client} onSave={handleSave} onClose={() => setEditing(false)} />
        </Modal>
      )}

      {newCase && (
        <Modal title="Novo caso" onClose={() => setNewCase(false)}>
          <CaseForm
            initial={{ client_id: client.id }}
            onSave={() => { setNewCase(false); load() }}
            onClose={() => setNewCase(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  )
}

function Section({ title, count, badge, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{title}</span>
        {count !== undefined && <span className={styles.sectionCount}>{count}</span>}
        {badge}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function Empty({ text }) {
  return <p className={styles.empty}>{text}</p>
}
