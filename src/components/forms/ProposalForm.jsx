import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toTitleCase } from '@/lib/text'
import s from './Form.module.css'

export default function ProposalForm({ initial, onSave, onClose }) {
  const { t } = useTranslation()
  const { session, lawyer } = useAuth()
  const quotaLitisList = lawyer?.preferences?.quota_litis_options ?? []

  const [feePercentCustom, setFeePercentCustom] = useState(() => {
    if (!initial?.fee_percentage) return false
    const str = String(parseFloat(initial.fee_percentage))
    return quotaLitisList.length > 0 &&
      !quotaLitisList.map(q => String(parseFloat(q))).includes(str)
  })

  const [f, setF] = useState({
    title:          initial?.title          ?? '',
    client_id:      initial?.client_id      ?? '',
    case_id:        initial?.case_id        ?? '',
    status:         initial?.status         ?? 'rascunho',
    fee_type:       initial?.fee_type       ?? 'fixo',
    fee_amount:     initial?.fee_amount     != null ? String(initial.fee_amount)     : '',
    fee_percentage: initial?.fee_percentage != null ? String(initial.fee_percentage) : '',
    valid_until:    initial?.valid_until    ? initial.valid_until.split('T')[0] : '',
  })
  const [clients, setClients] = useState([])
  const [cases,   setCases]   = useState([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    supabase.from('clients').select('id, full_name').order('full_name')
      .then(({ data }) => data && setClients(data))
    supabase.from('cases').select('id, title').in('status', ['ativo','suspenso']).order('title')
      .then(({ data }) => data && setCases(data))
  }, [])

  const set = (k, v) => setF(f => ({ ...f, [k]: v }))

  const showAmount     = ['fixo','por_hora','misto'].includes(f.fee_type)
  const showPercentage = ['percentual_exito','misto'].includes(f.fee_type)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload = {
      title:          toTitleCase(f.title),
      client_id:      f.client_id      || null,
      case_id:        f.case_id        || null,
      status:         f.status,
      fee_type:       f.fee_type,
      fee_amount:     showAmount     ? (parseFloat(f.fee_amount)     || 0) : null,
      fee_percentage: showPercentage ? (parseFloat(f.fee_percentage) || 0) : null,
      valid_until:    f.valid_until   || null,
    }
    const { error } = initial
      ? await supabase.from('proposals').update(payload).eq('id', initial.id)
      : await supabase.from('proposals').insert({ ...payload, lawyer_id: lawyer?.id ?? session.user.id })
    setSaving(false)
    if (error) { setError(error.message); return }
    onSave()
  }

  async function handleDelete() {
    if (!window.confirm(t('common.confirmDelete'))) return
    const { error } = await supabase.from('proposals').delete().eq('id', initial.id)
    if (error) { setError(error.message); return }
    onSave()
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.grid}>

        <div className={`${s.field} ${s.span2}`}>
          <label className={`${s.label} ${s.req}`}>{t('proposals.form.titleLabel')}</label>
          <input className={s.input} value={f.title} onChange={e => set('title', e.target.value)}
            required placeholder={t('proposals.form.titlePlaceholder')} />
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.form.clientLabel')}</label>
          <select className={s.select} value={f.client_id} onChange={e => set('client_id', e.target.value)}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.linkedCaseLabel')}</label>
          <select className={s.select} value={f.case_id} onChange={e => set('case_id', e.target.value)}>
            <option value="">{t('cases.noCaseOption')}</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('proposals.table.status')}</label>
          <select className={s.select} value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="rascunho">{t('proposals.status.rascunho')}</option>
            <option value="enviada">{t('proposals.status.enviada')}</option>
            <option value="aceita">{t('proposals.status.aceita')}</option>
            <option value="recusada">{t('proposals.status.recusada')}</option>
            <option value="expirada">{t('proposals.status.expirada')}</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('proposals.table.validUntil')}</label>
          <input className={s.input} type="date" value={f.valid_until}
            onChange={e => set('valid_until', e.target.value)} />
        </div>

        <div className={`${s.field} ${s.span2}`}>
          <label className={s.label}>{t('proposals.form.feeTypeLabel')}</label>
          <select className={s.select} value={f.fee_type} onChange={e => set('fee_type', e.target.value)}>
            <option value="fixo">{t('proposals.feeType.fixo')}</option>
            <option value="por_hora">{t('proposals.feeType.por_hora')}</option>
            <option value="percentual_exito">{t('proposals.feeType.percentual_exito')}</option>
            <option value="misto">{t('proposals.feeType.misto')}</option>
          </select>
        </div>

        {showAmount && (
          <div className={s.field}>
            <label className={s.label}>
              {f.fee_type === 'por_hora' ? t('proposals.form.hourlyAmountLabel') : t('proposals.form.amountLabel')}
            </label>
            <input className={s.input} type="number" min="0" step="0.01"
              value={f.fee_amount} onChange={e => set('fee_amount', e.target.value)}
              placeholder={t('common.currencyPlaceholder')} />
          </div>
        )}

        {showPercentage && (
          <div className={s.field}>
            <label className={s.label}>{t('proposals.form.percentageLabel')}</label>
            {quotaLitisList.length > 0 ? (
              <>
                <select
                  className={s.select}
                  value={feePercentCustom ? '__custom__' : (f.fee_percentage || '')}
                  onChange={e => {
                    if (e.target.value === '__custom__') { setFeePercentCustom(true); set('fee_percentage', '') }
                    else { setFeePercentCustom(false); set('fee_percentage', e.target.value) }
                  }}
                >
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {quotaLitisList.map(q => {
                    const num = String(parseFloat(q))
                    return <option key={q} value={num}>{q}</option>
                  })}
                  <option value="__custom__">{t('proposals.form.customOption')}</option>
                </select>
                {feePercentCustom && (
                  <input className={s.input} type="number" min="0" max="100" step="0.01"
                    style={{ marginTop: '0.45rem' }}
                    value={f.fee_percentage} onChange={e => set('fee_percentage', e.target.value)}
                    placeholder={t('proposals.form.percentageCustomPlaceholder')} autoFocus />
                )}
              </>
            ) : (
              <input className={s.input} type="number" min="0" max="100" step="0.01"
                value={f.fee_percentage} onChange={e => set('fee_percentage', e.target.value)}
                placeholder="20" />
            )}
          </div>
        )}

      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.footer}>
        {initial && <button type="button" className={s.btnDelete} onClick={handleDelete}>{t('common.delete')}</button>}
        <div className={s.spacer} />
        <button type="button" className={s.btnCancel} onClick={onClose}>{t('common.cancel')}</button>
        <button type="submit" className={s.btnSave} disabled={saving}>
          {saving ? t('common.saving') : initial ? t('common.saveChanges') : t('proposals.form.createButton')}
        </button>
      </div>
    </form>
  )
}
