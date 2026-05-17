import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import styles from './AdminTickets.module.css'

const STATUS_OPTS = [
  { value: 'aberto',        label: 'Aberto' },
  { value: 'em_andamento',  label: 'Em andamento' },
  { value: 'resolvido',     label: 'Resolvido' },
]

const STATUS_CLASS = {
  aberto:       styles.statusAberto,
  em_andamento: styles.statusAndamento,
  resolvido:    styles.statusResolvido,
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(d) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/* ── Thread panel (right side) ───────────────────────────────────────── */
function TicketPanel({ ticket, onStatusChange, onClose }) {
  const { lawyer } = useAuth()
  const toast = useToast()
  const [replies, setReplies] = useState([])
  const [loadingReplies, setLoadingReplies] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(ticket.status)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    setLoadingReplies(true)
    supabase
      .from('ticket_replies')
      .select('id, body, is_admin, created_at, author_id')
      .eq('ticket_id', ticket.id)
      .order('created_at')
      .then(({ data }) => { setReplies(data ?? []); setLoadingReplies(false) })
  }, [ticket.id])

  async function changeStatus(newStatus) {
    setUpdatingStatus(true)
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticket.id)
    setUpdatingStatus(false)
    if (error) { toast.error('Erro ao atualizar status.'); return }
    setStatus(newStatus)
    onStatusChange(ticket.id, newStatus)
  }

  async function sendReply() {
    if (!body.trim()) return
    setSending(true)
    const { data, error } = await supabase
      .from('ticket_replies')
      .insert({ ticket_id: ticket.id, author_id: lawyer.id, is_admin: true, body: body.trim() })
      .select()
      .single()
    setSending(false)
    if (error) { toast.error('Erro ao enviar resposta.'); return }
    setReplies(r => [...r, data])
    setBody('')
    if (status === 'aberto') changeStatus('em_andamento')
  }

  const userName = ticket.lawyers?.full_name ?? ticket.lawyers?.email ?? '—'

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelMeta}>
          <button className={styles.closeBtn} onClick={onClose} title="Fechar">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
            </svg>
          </button>
          <div>
            <h3 className={styles.panelTitle}>{ticket.subject}</h3>
            <p className={styles.panelUser}>{userName} · {ticket.lawyers?.firm_name ?? ''} · {fmtDate(ticket.created_at)}</p>
          </div>
        </div>
        <select
          className={`${styles.statusSelect} ${STATUS_CLASS[status]}`}
          value={status}
          disabled={updatingStatus}
          onChange={e => changeStatus(e.target.value)}
        >
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Original message */}
      <div className={styles.originalMsg}>
        <span className={styles.originalLabel}>Mensagem original</span>
        <p className={styles.originalBody}>{ticket.body}</p>
      </div>

      {/* Replies */}
      <div className={styles.threadArea}>
        {loadingReplies ? (
          <div className={styles.loadWrap}><div className={styles.spinner} /></div>
        ) : replies.length === 0 ? (
          <p className={styles.noReplies}>Nenhuma resposta ainda.</p>
        ) : (
          replies.map(r => (
            <div key={r.id} className={`${styles.bubble} ${r.is_admin ? styles.bubbleAdmin : styles.bubbleUser}`}>
              <div className={styles.bubbleMeta}>
                <span className={styles.bubbleAuthor}>{r.is_admin ? 'Suporte (admin)' : userName}</span>
                <span className={styles.bubbleDate}>{fmtDateTime(r.created_at)}</span>
              </div>
              <p className={styles.bubbleBody}>{r.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Reply box */}
      <div className={styles.replyBox}>
        <textarea
          className={styles.replyInput}
          placeholder="Escrever resposta como suporte…"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
        />
        <div className={styles.replyFooter}>
          <span className={styles.replyHint}>⌘ + Enter para enviar</span>
          <button
            className={styles.replyBtn}
            disabled={sending || !body.trim()}
            onClick={sendReply}
          >
            {sending ? 'Enviando…' : 'Responder'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function AdminTickets() {
  const toast = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('id, subject, body, status, created_at, lawyers(full_name, email, firm_name)')
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar chamados.')
    else setTickets(data ?? [])
    setLoading(false)
  }, [toast])

  useEffect(() => { load() }, [load])

  function handleStatusChange(id, newStatus) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
  }

  const filtered = filterStatus === 'all'
    ? tickets
    : tickets.filter(t => t.status === filterStatus)

  const counts = {
    all:         tickets.length,
    aberto:      tickets.filter(t => t.status === 'aberto').length,
    em_andamento:tickets.filter(t => t.status === 'em_andamento').length,
    resolvido:   tickets.filter(t => t.status === 'resolvido').length,
  }

  const selectedTicket = selected ? tickets.find(t => t.id === selected) : null

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Suporte</h1>
          <p className={styles.sub}>{tickets.length} chamado{tickets.length !== 1 ? 's' : ''} no total</p>
        </div>
      </div>

      <div className={styles.filterTabs}>
        {[
          { key: 'all', label: `Todos (${counts.all})` },
          { key: 'aberto', label: `Abertos (${counts.aberto})` },
          { key: 'em_andamento', label: `Em andamento (${counts.em_andamento})` },
          { key: 'resolvido', label: `Resolvidos (${counts.resolvido})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.filterTab} ${filterStatus === key ? styles.filterTabActive : ''}`}
            onClick={() => setFilterStatus(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`${styles.layout} ${selectedTicket ? styles.layoutSplit : ''}`}>
        {/* Ticket list */}
        <div className={styles.listWrap}>
          {loading ? (
            <div className={styles.loadWrap}><div className={styles.spinner} /></div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>Nenhum chamado encontrado.</div>
          ) : (
            filtered.map(t => {
              const user = t.lawyers?.full_name ?? t.lawyers?.email ?? '—'
              return (
                <button
                  key={t.id}
                  className={`${styles.row} ${selected === t.id ? styles.rowSelected : ''}`}
                  onClick={() => setSelected(selected === t.id ? null : t.id)}
                >
                  <div className={styles.rowTop}>
                    <span className={`${styles.statusDot} ${STATUS_CLASS[t.status]}`} />
                    <span className={styles.rowSubject}>{t.subject}</span>
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowUser}>{user}</span>
                    {t.lawyers?.firm_name && <span className={styles.rowFirm}>{t.lawyers.firm_name}</span>}
                    <span className={styles.rowDate}>{fmtDate(t.created_at)}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Panel */}
        {selectedTicket && (
          <TicketPanel
            ticket={selectedTicket}
            onStatusChange={handleStatusChange}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </>
  )
}
