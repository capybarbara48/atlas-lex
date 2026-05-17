import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import styles from './SuporteSection.module.css'

const STATUS_LABELS = { aberto: 'Aberto', em_andamento: 'Em andamento', resolvido: 'Resolvido' }
const STATUS_CLASS  = { aberto: styles.statusAberto, em_andamento: styles.statusAndamento, resolvido: styles.statusResolvido }

const EMPTY_FORM = { subject: '', body: '' }

function fmtDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* ── Reply thread ───────────────────────────────────────────────────── */
function ReplyThread({ ticketId, lawyerName }) {
  const { lawyer } = useAuth()
  const toast = useToast()
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('ticket_replies')
      .select('id, body, is_admin, created_at, author_id')
      .eq('ticket_id', ticketId)
      .order('created_at')
      .then(({ data }) => { setReplies(data ?? []); setLoading(false) })
  }, [ticketId])

  async function send() {
    if (!body.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('ticket_replies')
      .insert({ ticket_id: ticketId, author_id: lawyer.id, is_admin: false, body: body.trim() })
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Erro ao enviar resposta.'); return }
    setReplies(r => [...r, data])
    setBody('')
  }

  if (loading) return <div className={styles.replyLoading}><div className={styles.spinner} /></div>

  return (
    <div className={styles.thread}>
      {replies.length === 0 && (
        <p className={styles.noReplies}>Nenhuma resposta ainda. Responderemos em breve.</p>
      )}
      {replies.map(r => (
        <div key={r.id} className={`${styles.bubble} ${r.is_admin ? styles.bubbleAdmin : styles.bubbleUser}`}>
          <div className={styles.bubbleMeta}>
            <span className={styles.bubbleAuthor}>{r.is_admin ? 'Suporte Atlas Lex' : (lawyerName ?? 'Você')}</span>
            <span className={styles.bubbleDate}>{fmtDate(r.created_at)}</span>
          </div>
          <p className={styles.bubbleBody}>{r.body}</p>
        </div>
      ))}

      <div className={styles.replyForm}>
        <textarea
          className={styles.replyInput}
          placeholder="Adicionar uma resposta…"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={2}
        />
        <button
          className={styles.replyBtn}
          disabled={saving || !body.trim()}
          onClick={send}
        >
          {saving ? 'Enviando…' : 'Responder'}
        </button>
      </div>
    </div>
  )
}

/* ── Main section ────────────────────────────────────────────────────── */
export default function SuporteSection() {
  const { lawyer, session } = useAuth()
  const toast = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tickets')
      .select('id, subject, body, status, created_at')
      .eq('lawyer_id', session?.user?.id)
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
    setLoading(false)
  }, [session?.user?.id])

  useEffect(() => { load() }, [load])

  async function createTicket(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.body.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('tickets')
      .insert({ lawyer_id: session.user.id, subject: form.subject.trim(), body: form.body.trim() })
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Erro ao criar chamado.'); return }
    setTickets(t => [data, ...t])
    setForm(EMPTY_FORM)
    setShowForm(false)
    setExpanded(data.id)
    toast.success('Chamado aberto.')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <p className={styles.hint}>
          Abra um chamado para dúvidas, problemas técnicos ou sugestões de suporte.
          Nossa equipe responde em até 48 h úteis.
        </p>
        {!showForm && (
          <button className={styles.btnNew} onClick={() => setShowForm(true)}>
            + Novo chamado
          </button>
        )}
      </div>

      {/* New ticket form */}
      {showForm && (
        <form className={styles.newForm} onSubmit={createTicket}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Assunto</label>
            <input
              className={styles.formInput}
              placeholder="Descreva o problema brevemente…"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              required
              maxLength={120}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Detalhes</label>
            <textarea
              className={styles.formTextarea}
              placeholder="Descreva com mais detalhes o que está acontecendo…"
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              required
              rows={4}
            />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.btnCancel} onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={saving}>
              {saving ? 'Abrindo…' : 'Abrir chamado'}
            </button>
          </div>
        </form>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className={styles.loadWrap}><div className={styles.spinner} /></div>
      ) : tickets.length === 0 ? (
        <div className={styles.empty}>Nenhum chamado aberto ainda.</div>
      ) : (
        <div className={styles.ticketList}>
          {tickets.map(t => (
            <div key={t.id} className={`${styles.ticket} ${expanded === t.id ? styles.ticketOpen : ''}`}>
              <button
                className={styles.ticketHeader}
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <div className={styles.ticketLeft}>
                  <span className={`${styles.statusBadge} ${STATUS_CLASS[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                  <span className={styles.ticketSubject}>{t.subject}</span>
                </div>
                <div className={styles.ticketRight}>
                  <span className={styles.ticketDate}>{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                  <span className={styles.chevron}>{expanded === t.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded === t.id && (
                <div className={styles.ticketBody}>
                  <div className={styles.originalBody}>
                    <span className={styles.originalLabel}>Mensagem original</span>
                    <p>{t.body}</p>
                  </div>
                  <ReplyThread ticketId={t.id} lawyerName={lawyer?.full_name?.split(' ')[0]} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
