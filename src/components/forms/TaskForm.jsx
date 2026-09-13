import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toTitleCase } from '@/lib/text'
import s from './Form.module.css'

export default function TaskForm({ initial, onSave, onClose }) {
  const { t } = useTranslation()
  const { session, lawyer } = useAuth()
  const responsaveis = lawyer?.preferences?.responsaveis ?? []
  const [f, setF] = useState({
    title:       initial?.title       ?? '',
    case_id:     initial?.case_id     ?? '',
    priority:    initial?.priority    ?? 'media',
    status:      initial?.status      ?? 'pendente',
    due_date:    initial?.due_date    ? initial.due_date.split('T')[0] : '',
    due_time:    (() => { const tp = initial?.due_date?.split('T')[1]?.slice(0, 5); return tp && tp !== '12:00' && tp !== '00:00' ? tp : '' })(),
    description: initial?.description ?? '',
    assigned_to: initial?.assigned_to ?? '',
  })
  const [cases,  setCases]  = useState([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    supabase.from('cases').select('id, title').in('status', ['ativo','suspenso']).order('title')
      .then(({ data }) => data && setCases(data))
  }, [])

  const set = (k, v) => setF(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload = {
      title:       toTitleCase(f.title),
      case_id:     f.case_id     || null,
      priority:    f.priority,
      status:      f.status,
      due_date:    f.due_date ? f.due_date + (f.due_time ? 'T' + f.due_time + ':00' : 'T00:00:00') : null,
      description: f.description.trim() || null,
      assigned_to: f.assigned_to.trim() || null,
    }
    const { error } = initial?.id
      ? await supabase.from('tasks').update(payload).eq('id', initial.id)
      : await supabase.from('tasks').insert({ ...payload, lawyer_id: lawyer?.id ?? session.user.id })
    setSaving(false)
    if (error) { setError(error.message); return }
    onSave()
  }

  async function handleDelete() {
    if (!window.confirm(t('common.confirmDelete'))) return
    const { error } = await supabase.from('tasks').delete().eq('id', initial.id)
    if (error) { setError(error.message); return }
    onSave()
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.grid}>

        <div className={`${s.field} ${s.span2}`}>
          <label className={`${s.label} ${s.req}`}>{t('tasks.form.titleLabel')}</label>
          <input className={s.input} value={f.title} onChange={e => set('title', e.target.value)}
            required placeholder={t('tasks.form.titlePlaceholder')} />
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.linkedCaseLabel')}</label>
          <select className={s.select} value={f.case_id} onChange={e => set('case_id', e.target.value)}>
            <option value="">{t('cases.noCaseOption')}</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('tasks.form.assigneeLabel')}</label>
          {responsaveis.length > 0 ? (
            <select className={s.select} value={f.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">{t('tasks.form.unassignedOption')}</option>
              {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          ) : (
            <input className={s.input} value={f.assigned_to}
              onChange={e => set('assigned_to', e.target.value)}
              placeholder={t('tasks.form.assigneePlaceholder')} />
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('tasks.table.dueDate')}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className={s.input} type="date" style={{ flex: '2 1 0' }} value={f.due_date} onChange={e => set('due_date', e.target.value)} />
            <input className={s.input} type="time" style={{ flex: '1 1 0' }} value={f.due_time} onChange={e => set('due_time', e.target.value)} placeholder={t('tasks.form.timePlaceholder')} />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('tasks.table.priority')}</label>
          <select className={s.select} value={f.priority} onChange={e => set('priority', e.target.value)}>
            <option value="baixa">{t('status.priority.baixa')}</option>
            <option value="media">{t('status.priority.media')}</option>
            <option value="alta">{t('status.priority.alta')}</option>
            <option value="urgente">{t('status.priority.urgente')}</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('tasks.table.status')}</label>
          <select className={s.select} value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="pendente">{t('status.task.pendente')}</option>
            <option value="em_andamento">{t('status.task.em_andamento')}</option>
            <option value="concluida">{t('status.task.concluida')}</option>
            <option value="cancelada">{t('status.task.cancelada')}</option>
          </select>
        </div>

        <div className={`${s.field} ${s.span2}`}>
          <label className={s.label}>{t('tasks.form.descriptionLabel')}</label>
          <textarea className={s.textarea} value={f.description}
            onChange={e => set('description', e.target.value)}
            placeholder={t('tasks.form.descriptionPlaceholder')} />
        </div>

      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.footer}>
        {initial?.id && <button type="button" className={s.btnDelete} onClick={handleDelete}>{t('common.delete')}</button>}
        <div className={s.spacer} />
        <button type="button" className={s.btnCancel} onClick={onClose}>{t('common.cancel')}</button>
        <button type="submit" className={s.btnSave} disabled={saving}>
          {saving ? t('common.saving') : initial ? t('common.saveChanges') : t('tasks.form.createButton')}
        </button>
      </div>
    </form>
  )
}
