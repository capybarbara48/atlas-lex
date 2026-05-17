import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import styles from './FeedbackButton.module.css'

const TIPOS = [
  { value: 'sugestão', label: 'Sugestão', color: 'var(--accent)' },
  { value: 'bug', label: 'Bug', color: '#e03c3c' },
  { value: 'elogio', label: 'Elogio', color: '#22a84a' },
]

const EMPTY = { tipo: 'sugestão', titulo: '', mensagem: '' }

export default function FeedbackButton() {
  const { lawyer } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  function close() {
    setOpen(false)
    setForm(EMPTY)
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.mensagem.trim()) return
    setSaving(true)
    const { error } = await supabase.from('feedback').insert({
      lawyer_id: lawyer.id,
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      mensagem: form.mensagem.trim(),
    })
    setSaving(false)
    if (error) {
      toast.error('Erro ao enviar feedback.')
    } else {
      toast.success('Feedback enviado. Obrigado!')
      close()
    }
  }

  return (
    <>
      <button
        className={styles.fab}
        onClick={() => setOpen(true)}
        title="Enviar feedback"
        aria-label="Enviar feedback"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
          <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/>
        </svg>
        <span className={styles.fabLabel}>Feedback</span>
      </button>

      {open && createPortal(
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && close()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Enviar feedback</h2>
              <button className={styles.closeBtn} onClick={close} aria-label="Fechar">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
                </svg>
              </button>
            </div>

            <form className={styles.form} onSubmit={submit}>
              <div className={styles.tipoPicker}>
                {TIPOS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    className={`${styles.tipoBtn} ${form.tipo === t.value ? styles.tipoBtnActive : ''}`}
                    style={form.tipo === t.value ? { '--t-color': t.color } : undefined}
                    onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Título</label>
                <input
                  className={styles.input}
                  placeholder="Resumo em uma linha…"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  required
                  maxLength={120}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Mensagem</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Descreva com detalhes…"
                  value={form.mensagem}
                  onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  required
                  rows={4}
                />
              </div>

              <div className={styles.footer}>
                <button type="button" className={styles.btnCancel} onClick={close}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnSend}
                  disabled={saving || !form.titulo.trim() || !form.mensagem.trim()}
                >
                  {saving ? 'Enviando…' : 'Enviar feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
