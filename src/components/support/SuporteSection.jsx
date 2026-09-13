import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { formatDate } from '@/lib/formatters'
import styles from './SuporteSection.module.css'

const STATUS_CLASS  = { aberto: styles.statusAberto, em_andamento: styles.statusAndamento, resolvido: styles.statusResolvido }

const EMPTY_FORM = { subject: '', body: '' }

/* ── Reply thread ───────────────────────────────────────────────────── */
function ReplyThread({ ticketId, lawyerName }) {
  const { t, i18n } = useTranslation()
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
    if (error) { toast.error(t('support.errorSendReply')); return }
    setReplies(r => [...r, data])
    setBody('')
  }

  if (loading) return <div className={styles.replyLoading}><div className={styles.spinner} /></div>

  return (
    <div className={styles.thread}>
      {replies.length === 0 && (
        <p className={styles.noReplies}>{t('support.noReplies')}</p>
      )}
      {replies.map(r => (
        <div key={r.id} className={`${styles.bubble} ${r.is_admin ? styles.bubbleAdmin : styles.bubbleUser}`}>
          <div className={styles.bubbleMeta}>
            <span className={styles.bubbleAuthor}>{r.is_admin ? t('support.supportTeamName') : (lawyerName ?? t('support.you'))}</span>
            <span className={styles.bubbleDate}>{formatDate(r.created_at, i18n.language, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className={styles.bubbleBody}>{r.body}</p>
        </div>
      ))}

      <div className={styles.replyForm}>
        <textarea
          className={styles.replyInput}
          placeholder={t('support.replyPlaceholder')}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={2}
        />
        <button
          className={styles.replyBtn}
          disabled={saving || !body.trim()}
          onClick={send}
        >
          {saving ? t('support.sending') : t('support.reply')}
        </button>
      </div>
    </div>
  )
}

/* ── Main section ────────────────────────────────────────────────────── */
export default function SuporteSection() {
  const { t, i18n } = useTranslation()
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
      .insert({ lawyer_id: lawyer?.id ?? session.user.id, subject: form.subject.trim(), body: form.body.trim() })
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error(t('support.errorCreateTicket')); return }
    setTickets(list => [data, ...list])
    setForm(EMPTY_FORM)
    setShowForm(false)
    setExpanded(data.id)
    toast.success(t('support.ticketOpened'))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <p className={styles.hint}>
          {t('support.hint')}
        </p>
        {!showForm && (
          <button className={styles.btnNew} onClick={() => setShowForm(true)}>
            {t('support.newTicket')}
          </button>
        )}
      </div>

      {/* New ticket form */}
      {showForm && (
        <form className={styles.newForm} onSubmit={createTicket}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>{t('support.form.subjectLabel')}</label>
            <input
              className={styles.formInput}
              placeholder={t('support.form.subjectPlaceholder')}
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              required
              maxLength={120}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>{t('support.form.detailsLabel')}</label>
            <textarea
              className={styles.formTextarea}
              placeholder={t('support.form.detailsPlaceholder')}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              required
              rows={4}
            />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.btnCancel} onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={saving}>
              {saving ? t('support.opening') : t('support.openTicket')}
            </button>
          </div>
        </form>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className={styles.loadWrap}><div className={styles.spinner} /></div>
      ) : tickets.length === 0 ? (
        <div className={styles.empty}>{t('support.emptyTickets')}</div>
      ) : (
        <div className={styles.ticketList}>
          {tickets.map(ticket => (
            <div key={ticket.id} className={`${styles.ticket} ${expanded === ticket.id ? styles.ticketOpen : ''}`}>
              <button
                className={styles.ticketHeader}
                onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
              >
                <div className={styles.ticketLeft}>
                  <span className={`${styles.statusBadge} ${STATUS_CLASS[ticket.status]}`}>
                    {t(`support.status.${ticket.status}`)}
                  </span>
                  <span className={styles.ticketSubject}>{ticket.subject}</span>
                </div>
                <div className={styles.ticketRight}>
                  <span className={styles.ticketDate}>{formatDate(ticket.created_at, i18n.language)}</span>
                  <span className={styles.chevron}>{expanded === ticket.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded === ticket.id && (
                <div className={styles.ticketBody}>
                  <div className={styles.originalBody}>
                    <span className={styles.originalLabel}>{t('support.originalMessage')}</span>
                    <p>{ticket.body}</p>
                  </div>
                  <ReplyThread ticketId={ticket.id} lawyerName={lawyer?.full_name?.split(' ')[0]} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
