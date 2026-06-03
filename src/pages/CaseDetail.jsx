import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useKanbanSituations } from '@/hooks/useKanbanSituations'
import { updateCaseSituation } from '@/hooks/useCases'
import { useCaseNotes } from '@/hooks/useCaseNotes'
import Modal from '@/components/ui/Modal'
import CaseForm from '@/components/forms/CaseForm'
import TaskForm from '@/components/forms/TaskForm'
import EntryForm from '@/components/forms/EntryForm'
import { Skeleton, SkeletonListItem } from '@/components/ui/Skeleton'
import styles from './CaseDetail.module.css'

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR')
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
  alta:    { label: 'Alta',    cls: 'st-red'    },
  urgente: { label: 'Urgente', cls: 'st-red'    },
  media:   { label: 'Média',   cls: 'st-orange' },
  baixa:   { label: 'Baixa',   cls: 'st-gray'   },
}
const STATUS_FIN = {
  pago:      { label: 'Pago',      cls: 'st-teal'   },
  pendente:  { label: 'Pendente',  cls: 'st-orange' },
  cancelado: { label: 'Cancelado', cls: 'st-gray'   },
}

// ── Note colours (mirrors Notes.jsx palette) ─────────────────────
const CORES = [
  { key: 'amarelo',  bg: '#fef9c3', border: '#f59e0b' },
  { key: 'azul',     bg: '#dbeafe', border: '#3b82f6' },
  { key: 'verde',    bg: '#dcfce7', border: '#22c55e' },
  { key: 'vermelho', bg: '#fee2e2', border: '#ef4444' },
  { key: 'roxo',     bg: '#ede9fe', border: '#a855f7' },
  { key: 'laranja',  bg: '#ffedd5', border: '#f97316' },
]
const COR_MAP = Object.fromEntries(CORES.map(c => [c.key, c]))

function fmtShort(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function CaseNoteExpand({ nota, onClose, onSaved }) {
  const [titulo, setTitulo] = useState(nota.titulo ?? '')
  const [corpo,  setCorpo]  = useState(nota.corpo  ?? '')
  const [cor,    setCor]    = useState(nota.cor    ?? null)
  const [fixada, setFixada] = useState(nota.fixada ?? false)
  const [saving, setSaving] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => { bodyRef.current?.focus() }, [])

  const corStyle = cor ? COR_MAP[cor] : null

  async function save() {
    setSaving(true)
    await supabase.from('notas').update({ titulo: titulo || null, corpo: corpo || null, cor, fixada }).eq('id', nota.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className={styles.noteExpandOverlay} onClick={e => { if (e.target === e.currentTarget) save() }}>
      <div className={styles.noteExpandCard} style={corStyle ? { borderTop: `4px solid ${corStyle.border}` } : {}}>
        <div className={styles.noteExpandHead}>
          <input className={styles.noteExpandTitle} value={titulo}
            onChange={e => setTitulo(e.target.value)} placeholder="Título da nota" />
          <div className={styles.noteExpandActions}>
            <button className={`${styles.noteExpandBtn} ${fixada ? styles.noteIconActive : ''}`}
              title={fixada ? 'Desafixar' : 'Fixar'} onClick={() => setFixada(v => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"/>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
              </svg>
            </button>
            <button className={`${styles.noteExpandBtn} ${styles.noteExpandClose}`} title="Fechar" onClick={save}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.noteExpandColorBar}>
          {CORES.map(c => (
            <button key={c.key} type="button"
              className={`${styles.noteColorDot} ${cor === c.key ? styles.noteColorDotActive : ''}`}
              style={{ background: c.bg, borderColor: c.border }}
              onClick={() => setCor(cor === c.key ? null : c.key)}
            />
          ))}
          {cor && <button type="button" className={styles.noteClearColor} onClick={() => setCor(null)}>Sem cor</button>}
        </div>
        <textarea ref={bodyRef} className={styles.noteExpandBody} value={corpo}
          onChange={e => setCorpo(e.target.value)} placeholder="Escreva sua nota…" />
        <div className={styles.noteExpandFooter}>
          <span className={styles.noteCharCount}>{corpo.length} caracteres</span>
          <button className={styles.noteExpandSave} onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CaseNotesSection({ caseId, lawyerId }) {
  const { data: notasRaw, refetch } = useCaseNotes(caseId)
  const notas = notasRaw ?? []

  const [addOpen,    setAddOpen]    = useState(false)
  const [newTitulo,  setNewTitulo]  = useState('')
  const [newCorpo,   setNewCorpo]   = useState('')
  const [newCor,     setNewCor]     = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [expandNota, setExpandNota] = useState(null)

  function openAdd() { setAddOpen(v => !v); setNewTitulo(''); setNewCorpo(''); setNewCor(null) }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newTitulo.trim() && !newCorpo.trim()) return
    setSaving(true)
    await supabase.from('notas').insert({
      lawyer_id: lawyerId,
      case_id:   caseId,
      titulo:    newTitulo.trim() || null,
      corpo:     newCorpo.trim()  || null,
      cor:       newCor,
    })
    setSaving(false)
    setNewTitulo(''); setNewCorpo(''); setNewCor(null); setAddOpen(false)
    refetch()
  }

  async function handlePin(nota) {
    await supabase.from('notas').update({ fixada: !nota.fixada }).eq('id', nota.id)
    refetch()
  }

  async function handleDelete(nota) {
    if (!window.confirm('Excluir esta nota?')) return
    await supabase.from('notas').delete().eq('id', nota.id)
    refetch()
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Notas</span>
        <span className={styles.sectionCount}>{notas.length}</span>
        <button className={styles.sectionAddBtn} onClick={openAdd}>
          {addOpen ? '✕ Cancelar' : '+ Nova nota'}
        </button>
      </div>
      <div className={styles.sectionBody}>
        {addOpen && (
          <form className={styles.noteAddForm} onSubmit={handleAdd}>
            <input className={styles.noteAddTitle} value={newTitulo}
              onChange={e => setNewTitulo(e.target.value)} placeholder="Título da nota" autoFocus />
            <div className={styles.noteColorPicker}>
              {CORES.map(c => (
                <button key={c.key} type="button"
                  className={`${styles.noteColorDot} ${newCor === c.key ? styles.noteColorDotActive : ''}`}
                  style={{ background: c.bg, borderColor: c.border }}
                  onClick={() => setNewCor(newCor === c.key ? null : c.key)}
                />
              ))}
            </div>
            <textarea className={styles.noteAddBody} value={newCorpo}
              onChange={e => setNewCorpo(e.target.value)}
              placeholder="Escreva a nota… (Ctrl+Enter para salvar)" rows={3}
              onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleAdd(e) } }} />
            <div className={styles.noteAddFooter}>
              <button type="button" className={styles.noteAddCancel} onClick={() => setAddOpen(false)}>Cancelar</button>
              <button type="submit" className={styles.noteAddSave}
                disabled={saving || (!newTitulo.trim() && !newCorpo.trim())}>
                {saving ? 'Salvando…' : 'Salvar nota'}
              </button>
            </div>
          </form>
        )}
        {notas.length === 0 && !addOpen && <p className={styles.empty}>Nenhuma nota vinculada.</p>}
        {notas.length > 0 && (
          <div className={styles.noteGrid}>
            {notas.map(n => {
              const cor = n.cor ? COR_MAP[n.cor] : null
              return (
                <div key={n.id}
                  className={`${styles.noteCard} ${n.fixada ? styles.noteCardPinned : ''}`}
                  style={cor ? { background: cor.bg, borderLeftColor: cor.border } : {}}
                  onClick={() => setExpandNota(n)}
                >
                  <div className={styles.noteCardHead}>
                    <span className={styles.noteCardDate}>{fmtShort(n.updated_at)}</span>
                    <div className={styles.noteCardActions} onClick={e => e.stopPropagation()}>
                      <button className={`${styles.noteIconBtn} ${n.fixada ? styles.noteIconActive : ''}`}
                        title={n.fixada ? 'Desafixar' : 'Fixar'} onClick={() => handlePin(n)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="17" x2="12" y2="22"/>
                          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
                        </svg>
                      </button>
                      <button className={`${styles.noteIconBtn} ${styles.noteDelBtn}`} title="Excluir" onClick={() => handleDelete(n)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {n.titulo
                    ? <div className={styles.noteCardTitle}>{n.titulo}</div>
                    : <div className={`${styles.noteCardTitle} ${styles.noteCardNoTitle}`}>Sem título</div>}
                  {n.corpo && <div className={styles.noteCardBody}>{n.corpo}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {expandNota && (
        <CaseNoteExpand nota={expandNota}
          onClose={() => setExpandNota(null)}
          onSaved={() => { setExpandNota(null); refetch() }} />
      )}
    </div>
  )
}

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [caso,    setCaso]    = useState(null)
  const [tasks,   setTasks]   = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [editing,   setEditing]   = useState(false)
  const [newTask,   setNewTask]   = useState(false)
  const [newEntry,  setNewEntry]  = useState(false)

  const { situations } = useKanbanSituations()

  async function handleSituationChange(e) {
    const newSit = e.target.value || null
    await updateCaseSituation(id, newSit)
    setCaso(prev => ({ ...prev, situation: newSit }))
  }

  async function load() {
    setLoading(true)
    setError(null)

    const [caseRes, tasksRes, entriesRes] = await Promise.all([
      supabase
        .from('cases')
        .select('*, clients(id, full_name, email, phone)')
        .eq('id', id)
        .single(),
      supabase
        .from('tasks')
        .select('*')
        .eq('case_id', id)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('financial_entries')
        .select('*')
        .eq('case_id', id)
        .order('due_date', { ascending: false }),
    ])

    if (caseRes.error) { setError(caseRes.error.message); setLoading(false); return }

    setCaso(caseRes.data)
    setTasks(tasksRes.data ?? [])
    setEntries(entriesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Skeleton width="5rem" height="0.75rem" />
        <div className={styles.headerMain}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <Skeleton width="50%" height="1.1rem" />
            <Skeleton width="30%" height="0.7rem" />
          </div>
        </div>
      </div>
      <div className={styles.infoCard}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className={styles.infoRow}>
            <Skeleton width="45%" height="0.6rem" />
            <Skeleton width="70%" height="0.8rem" />
          </div>
        ))}
      </div>
      {[3, 3].map((rows, si) => (
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

  if (!caso) return null

  const st = STATUS_CASE[caso.status] ?? { label: caso.status, cls: 'st-gray' }
  const receita = entries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const despesa = entries.filter(e => e.type === 'despesa' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const saldo   = receita - despesa

  const overdueTasks = tasks.filter(t =>
    !['concluida', 'cancelada'].includes(t.status) &&
    t.due_date && t.due_date < new Date().toISOString()
  )

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/painel/casos')}>
          ← Casos
        </button>

        <div className={styles.headerMain}>
          <div className={styles.caseIcon}>⚖</div>
          <div>
            <div className={styles.caseName}>
              {caso.title}
              <span className={`badge ${st.cls}`}>{st.label}</span>
              {overdueTasks.length > 0 && (
                <span className={`badge st-red`}>{overdueTasks.length} atrasada{overdueTasks.length > 1 ? 's' : ''}</span>
              )}
            </div>
            {caso.case_number && <div className={styles.caseSub}>{caso.case_number}</div>}
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.editBtn} onClick={() => setEditing(true)}>Editar</button>
        </div>
      </div>

      {/* ── Info card ── */}
      <div className={styles.infoCard}>
        {caso.clients && (
          <InfoRow label="Cliente" value={
            <Link to={`/painel/clientes/${caso.clients.id}`} className={styles.clientLink}>
              {caso.clients.full_name}
            </Link>
          } />
        )}
        <InfoRow label="Área"       value={caso.area} />
        <InfoRow label="Tribunal"   value={caso.court} />
        <InfoRow label="Abertura"   value={fmt(caso.opened_at)} />
        <InfoRow label="Valor da causa" value={caso.valor > 0 ? brl(caso.valor) : null} />
        <InfoRow label="Situação" value={
          situations.length > 0 ? (
            <select
              className={styles.situationSelect}
              value={caso.situation ?? ''}
              onChange={handleSituationChange}
            >
              <option value="">— Não categorizado —</option>
              {situations.map(sit => {
                const col = sit.color ?? '#888'
                return <option key={sit.id} value={sit.id}>{sit.value}</option>
              })}
            </select>
          ) : null
        } />
        <InfoRow label="Encerramento"   value={fmt(caso.closed_at)} />
        {caso.description && (
          <div className={`${styles.infoRow} ${styles.infoRowFull}`}>
            <span className={styles.infoLabel}>Descrição</span>
            <span className={styles.infoValue}>{caso.description}</span>
          </div>
        )}
      </div>

      {/* ── Tarefas ── */}
      <Section title="Tarefas" count={tasks.length} onAdd={() => setNewTask(true)} addLabel="+ Tarefa">
        {tasks.length === 0
          ? <Empty text="Nenhuma tarefa vinculada" />
          : tasks.map(t => {
              const ts = STATUS_TASK[t.status] ?? { label: t.status, cls: 'st-gray' }
              const pr = PRIORITY[t.priority]  ?? { label: t.priority, cls: 'st-gray' }
              const overdue = !['concluida','cancelada'].includes(t.status) && t.due_date && t.due_date < new Date().toISOString()
              return (
                <div key={t.id} className={`${styles.listItem} ${overdue ? styles.listItemOverdue : ''}`}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{t.title}</span>
                    {t.description && <span className={styles.listSub}>{t.description}</span>}
                  </div>
                  <div className={styles.listMeta}>
                    <span className={`badge ${pr.cls}`}>{pr.label}</span>
                    <span className={`badge ${ts.cls}`}>{ts.label}</span>
                    {t.due_date && <span className={`${styles.listDate} ${overdue ? styles.dateOverdue : ''}`}>{fmt(t.due_date)}</span>}
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
        onAdd={() => setNewEntry(true)}
        addLabel="+ Lançamento"
        badge={entries.length > 0
          ? <span className={styles.saldoBadge} style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)', marginLeft: 'auto' }}>{brl(saldo)}</span>
          : null
        }
      >
        {entries.length === 0
          ? <Empty text="Nenhum lançamento vinculado" />
          : entries.map(e => {
              const es = STATUS_FIN[e.status] ?? { label: e.status, cls: 'st-gray' }
              return (
                <div key={e.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{e.description || '—'}</span>
                  </div>
                  <div className={styles.listMeta}>
                    <span className={`badge ${e.type === 'receita' ? 'st-teal' : 'st-red'}`}>
                      {e.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className={`badge ${es.cls}`}>{es.label}</span>
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

      {/* ── Notas ── */}
      <CaseNotesSection caseId={caso.id} lawyerId={caso.lawyer_id} />

      {editing && (
        <Modal title="Editar processo" onClose={() => setEditing(false)} size="lg">
          <CaseForm initial={caso} onSave={() => { setEditing(false); load() }} onClose={() => setEditing(false)} />
        </Modal>
      )}

      {newTask && (
        <Modal title="Nova tarefa" onClose={() => setNewTask(false)}>
          <TaskForm
            initial={{ case_id: caso.id }}
            onSave={() => { setNewTask(false); load() }}
            onClose={() => setNewTask(false)}
          />
        </Modal>
      )}

      {newEntry && (
        <Modal title="Novo lançamento" onClose={() => setNewEntry(false)}>
          <EntryForm
            initial={{ case_id: caso.id, client_id: caso.client_id }}
            onSave={() => { setNewEntry(false); load() }}
            onClose={() => setNewEntry(false)}
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

function Section({ title, count, badge, onAdd, addLabel, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{title}</span>
        {count !== undefined && <span className={styles.sectionCount}>{count}</span>}
        {badge}
        {onAdd && (
          <button className={styles.sectionAddBtn} onClick={onAdd}>{addLabel}</button>
        )}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function Empty({ text }) {
  return <p className={styles.empty}>{text}</p>
}
