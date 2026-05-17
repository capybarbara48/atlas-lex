import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import ClientForm from '@/components/forms/ClientForm'
import s from './ClientDetail.module.css'

/* ── helpers ────────────────────────────────────────────────────── */
function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')
}
function initials(name) {
  return (name ?? '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const CASE_STATUS_CSS    = { ativo: 'badge-ativo', encerrado: 'badge-encerrado', suspenso: 'badge-suspenso', arquivado: 'badge-arquivado' }
const CASE_STATUS_LABEL  = { ativo: 'Ativo', encerrado: 'Encerrado', suspenso: 'Suspenso', arquivado: 'Arquivado' }
const TASK_STATUS_CSS    = { pendente: 'st-gold', em_andamento: 'st-blue', concluida: 'st-green', cancelada: 'badge-arquivado' }
const TASK_STATUS_LABEL  = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' }
const TASK_PRI_CSS       = { urgente: 'badge-alta', alta: 'badge-alta', media: 'badge-media', baixa: 'badge-baixa' }
const TASK_PRI_LABEL     = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' }
const ENTRY_TYPE_CSS     = { receita: 'badge-receita', despesa: 'badge-despesa' }
const ENTRY_TYPE_LABEL   = { receita: 'Receita', despesa: 'Despesa' }
const ENTRY_STATUS_CSS   = { pago: 'badge-concluida', pendente: 'badge-pendente', cancelado: 'badge-arquivado' }
const ENTRY_STATUS_LABEL = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' }

/* ── section card ───────────────────────────────────────────────── */
function Section({ title, count, extra, children }) {
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>{title}</h2>
        <div className={s.sectionMeta}>
          {extra && <span className={s.sectionExtra}>{extra}</span>}
          {count != null && <span className={s.countBadge}>{count}</span>}
        </div>
      </div>
      {children}
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────── */
export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [client,  setClient]  = useState(null)
  const [cases,   setCases]   = useState([])
  const [tasks,   setTasks]   = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: clientData }, { data: casesData }, { data: entriesData }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('cases').select('*').eq('client_id', id).order('opened_at', { ascending: false }),
      supabase.from('financial_entries').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ])

    setClient(clientData)
    setCases(casesData ?? [])
    setEntries(entriesData ?? [])

    // tasks via case IDs
    const caseIds = (casesData ?? []).map(c => c.id)
    if (caseIds.length > 0) {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, cases(title)')
        .in('case_id', caseIds)
        .order('due_date', { ascending: true })
      setTasks(tasksData ?? [])
    } else {
      setTasks([])
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function handleEditSave() {
    setEditOpen(false)
    load()
  }

  if (loading) {
    return (
      <div className={s.loadingWrap}>
        <div className={s.spinner} />
      </div>
    )
  }

  if (!client) {
    return (
      <div className={s.loadingWrap}>
        <p style={{ color: 'var(--text-2)' }}>Cliente não encontrado.</p>
        <button className={s.backBtn} onClick={() => navigate('/painel/clientes')}>← Voltar</button>
      </div>
    )
  }

  const avatarHue = (client.id?.charCodeAt?.(0) ?? 0) * 47 % 360
  const receitas  = entries.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount), 0)
  const despesas  = entries.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount), 0)
  const saldo     = receitas - despesas

  return (
    <div className={s.page}>

      {/* ── Page header ── */}
      <div className={s.pageHeader}>
        <button className={s.backBtn} onClick={() => navigate('/painel/clientes')}>
          <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd"/></svg>
          Clientes
        </button>
        <div className={s.headerCenter}>
          <div
            className={s.headerAvatar}
            style={{ background: `hsl(${avatarHue},35%,88%)`, color: `hsl(${avatarHue},55%,32%)` }}
          >
            {initials(client.full_name)}
          </div>
          <div>
            <h1 className={s.clientName}>{client.full_name}</h1>
            <span className={`badge ${client.tipo === 'PJ' ? 'st-blue' : 'st-teal'}`}>
              {client.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
            </span>
          </div>
        </div>
        <button className={s.editBtn} onClick={() => setEditOpen(true)}>
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z"/><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z"/></svg>
          Editar
        </button>
      </div>

      {/* ── Info card ── */}
      <div className={s.infoCard}>
        {[
          { label: 'CPF / CNPJ',   value: client.cpf_cnpj ?? '—' },
          { label: 'E-mail',        value: client.email    ?? '—' },
          { label: 'Telefone',      value: client.phone    ?? '—' },
          { label: 'Cidade',        value: client.cidade   ?? '—' },
          { label: 'Estado',        value: client.estado   ?? '—' },
          { label: 'Cliente desde', value: fmtDate(client.created_at) },
        ].map(({ label, value }) => (
          <div key={label} className={s.infoField}>
            <span className={s.infoLabel}>{label}</span>
            <span className={s.infoValue}>{value}</span>
          </div>
        ))}
        {client.notes && (
          <div className={`${s.infoField} ${s.infoSpan}`}>
            <span className={s.infoLabel}>Observações</span>
            <span className={s.infoValue}>{client.notes}</span>
          </div>
        )}
      </div>

      {/* ── Casos ── */}
      <Section title="Processos" count={cases.length}>
        {cases.length === 0
          ? <p className={s.empty}>Nenhum processo vinculado.</p>
          : <div className={s.caseList}>
              {cases.map(c => (
                <div key={c.id} className={s.caseRow}>
                  <div className={s.caseMain}>
                    <span className={s.caseTitle}>{c.title}</span>
                    {c.case_number && <span className={s.caseNumber}>{c.case_number}</span>}
                  </div>
                  <div className={s.caseMeta}>
                    {c.area && <span className={s.caseArea}>{c.area}</span>}
                    {c.court && <span className={s.caseCourt}>{c.court}</span>}
                    {c.opened_at && <span className={s.caseDate}>{fmtDate(c.opened_at)}</span>}
                    <span className={`badge ${CASE_STATUS_CSS[c.status] ?? ''}`}>
                      {CASE_STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
        }
      </Section>

      {/* ── Tarefas ── */}
      <Section title="Tarefas" count={tasks.length}>
        {tasks.length === 0
          ? <p className={s.empty}>Nenhuma tarefa vinculada.</p>
          : <div className={s.taskList}>
              {tasks.map(t => (
                <div key={t.id} className={s.taskRow}>
                  <div className={s.taskMain}>
                    <span className={`${s.taskTitle} ${t.status === 'concluida' ? s.done : ''}`}>{t.title}</span>
                    {t.cases?.title && <span className={s.taskCase}>{t.cases.title}</span>}
                  </div>
                  <div className={s.taskMeta}>
                    {t.due_date && <span className={s.taskDate}>{fmtDate(t.due_date)}</span>}
                    <span className={`badge ${TASK_PRI_CSS[t.priority] ?? ''}`}>
                      {TASK_PRI_LABEL[t.priority] ?? t.priority}
                    </span>
                    <span className={`badge ${TASK_STATUS_CSS[t.status] ?? ''}`}>
                      {TASK_STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
        }
      </Section>

      {/* ── Financeiro ── */}
      <Section
        title="Financeiro"
        count={entries.length}
        extra={entries.length > 0 ? `Saldo: ${brl(saldo)}` : null}
      >
        {entries.length === 0
          ? <p className={s.empty}>Nenhum lançamento financeiro.</p>
          : <div className={s.entryList}>
              {entries.map(e => (
                <div key={e.id} className={s.entryRow}>
                  <div className={s.entryMain}>
                    <span className={s.entryDesc}>{e.description}</span>
                  </div>
                  <div className={s.entryMeta}>
                    <span className={s.entryAmount} style={{ color: e.type === 'receita' ? 'var(--green)' : 'var(--red)' }}>
                      {e.type === 'receita' ? '+' : '−'}{brl(e.amount)}
                    </span>
                    <span className={`badge ${ENTRY_TYPE_CSS[e.type] ?? ''}`}>
                      {ENTRY_TYPE_LABEL[e.type] ?? e.type}
                    </span>
                    <span className={`badge ${ENTRY_STATUS_CSS[e.status] ?? ''}`}>
                      {ENTRY_STATUS_LABEL[e.status] ?? e.status}
                    </span>
                    <span className={s.entryDate}>{fmtDate(e.paid_at ?? e.due_date ?? e.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
        }
      </Section>

      {/* ── Edit modal ── */}
      {editOpen && (
        <Modal title="Editar cliente" onClose={() => setEditOpen(false)}>
          <ClientForm
            initial={client}
            onSave={handleEditSave}
            onClose={() => setEditOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
