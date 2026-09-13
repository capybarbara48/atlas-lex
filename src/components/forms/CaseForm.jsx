import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useKanbanSituations } from '@/hooks/useKanbanSituations'
import { useAreas } from '@/hooks/useAreas'
import { getActiveGroups } from '@/lib/tribunais'
import { useCaseHearings, addHearing, deleteHearing } from '@/hooks/useHearings'
import { toTitleCase } from '@/lib/text'
import { formatCurrency, formatDate } from '@/lib/formatters'
import Modal from '@/components/ui/Modal'
import ClientForm from './ClientForm'
import s from './Form.module.css'

const DEFAULT_QUOTA_LITIS = ['5%','10%','15%','20%','25%','30%','35%']

const HEARING_TYPES = [
  'Audiência de Conciliação',
  'Audiência de Instrução e Julgamento',
  'Audiência de Custódia',
  'Audiência Inaugural',
  'Audiência de Mediação',
  'Audiência Preliminar',
  'Audiência de Oitiva de Testemunhas',
  'Audiência de Justificação',
  'Audiência de Progressão de Regime',
  'Audiência de Regulamentação de Visitas',
]

const HEARING_TYPE_KEYS = {
  'Audiência de Conciliação':                  'cases.hearingTypes.conciliacao',
  'Audiência de Instrução e Julgamento':        'cases.hearingTypes.instrucaoJulgamento',
  'Audiência de Custódia':                      'cases.hearingTypes.custodia',
  'Audiência Inaugural':                        'cases.hearingTypes.inaugural',
  'Audiência de Mediação':                      'cases.hearingTypes.mediacao',
  'Audiência Preliminar':                       'cases.hearingTypes.preliminar',
  'Audiência de Oitiva de Testemunhas':         'cases.hearingTypes.oitivaTestemunhas',
  'Audiência de Justificação':                  'cases.hearingTypes.justificacao',
  'Audiência de Progressão de Regime':          'cases.hearingTypes.progressaoRegime',
  'Audiência de Regulamentação de Visitas':     'cases.hearingTypes.regulamentacaoVisitas',
}

function HearingsSection({ caseId, lawyerId, lawyerName }) {
  const { t, i18n } = useTranslation()
  const { data: hearings, refetch } = useCaseHearings(caseId)
  const [nh, setNh] = useState({ title: '', date: '', time: '', location: '' })
  const [titleCustom, setTitleCustom] = useState(false)
  const [adding, setAdding] = useState(false)

  const setNhF = (k, v) => setNh(n => ({ ...n, [k]: v }))

  async function handleAdd() {
    if (!nh.title.trim() || !nh.date) return
    setAdding(true)
    const hearingTitle = toTitleCase(nh.title)
    await addHearing({
      lawyer_id: lawyerId,
      case_id:   caseId,
      title:     hearingTitle,
      date:      nh.date,
      time:      nh.time || null,
      location:  nh.location.trim() || null,
    })
    // Auto-create a task for the hearing date assigned to the main lawyer
    await supabase.from('tasks').insert({
      lawyer_id:   lawyerId,
      case_id:     caseId,
      title:       hearingTitle,
      due_date:    nh.date,
      assigned_to: lawyerName || null,
      priority:    'alta',
      status:      'pendente',
      description: [
        nh.time ? `Horário: ${nh.time.slice(0, 5)}` : null,
        nh.location.trim() ? `Local: ${nh.location.trim()}` : null,
      ].filter(Boolean).join(' · ') || null,
    })
    setAdding(false)
    setNh({ title: '', date: '', time: '', location: '' })
    refetch()
  }

  async function handleDel(id) {
    await deleteHearing(id)
    refetch()
  }

  const list = hearings ?? []

  return (
    <>
      <hr className={s.sectionDivider} />
      <div className={`${s.field} ${s.span2}`}>
        <div className={s.sectionTitle}>{t('cases.form.hearingsSectionTitle')}</div>
        {list.length > 0 && (
          <div className={s.hearingList}>
            {list.map(h => (
              <div key={h.id} className={s.hearingItem}>
                <span className={s.hearingItemDate}>
                  {formatDate(h.date, i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                {h.time && <span className={s.hearingItemMeta}>{h.time.slice(0, 5)}</span>}
                <span className={s.hearingItemTitle}>{h.title}</span>
                {h.location && <span className={s.hearingItemMeta}>{h.location}</span>}
                <button type="button" className={s.hearingItemDel} onClick={() => handleDel(h.id)} title={t('common.delete')}>✕</button>
              </div>
            ))}
          </div>
        )}
        {list.length === 0 && <div className={s.hint}>{t('cases.form.noHearings')}</div>}
      </div>
      <div className={`${s.field} ${s.span2}`}>
        <div className={s.inlineCard}>
          <div className={s.inlineCardTitle}>{t('cases.form.addHearingTitle')}</div>
          <div className={s.inlineGrid}>
            <div className={`${s.field} ${s.span2}`}>
              <label className={s.label}>{t('cases.form.hearingTypeLabel')} *</label>
              <select
                className={s.select}
                value={titleCustom ? '__outro__' : (nh.title || '')}
                onChange={e => {
                  if (e.target.value === '__outro__') { setTitleCustom(true); setNhF('title', '') }
                  else { setTitleCustom(false); setNhF('title', e.target.value) }
                }}
              >
                <option value="">{t('common.selectPlaceholder')}</option>
                {HEARING_TYPES.map(ht => <option key={ht} value={ht}>{t(HEARING_TYPE_KEYS[ht])}</option>)}
                <option value="__outro__">{t('common.otherManualOption')}</option>
              </select>
              {titleCustom && (
                <input className={s.input} style={{ marginTop: '0.45rem' }}
                  value={nh.title} onChange={e => setNhF('title', e.target.value)}
                  placeholder={t('cases.form.hearingTypeOtherPlaceholder')} autoFocus />
              )}
            </div>
            <div className={s.field}>
              <label className={s.label}>{t('cases.form.hearingDateLabel')} *</label>
              <input className={s.input} type="date" value={nh.date} onChange={e => setNhF('date', e.target.value)} />
            </div>
            <div className={s.field}>
              <label className={s.label}>{t('cases.form.hearingTimeLabel')}</label>
              <input className={s.input} type="time" value={nh.time} onChange={e => setNhF('time', e.target.value)} />
            </div>
            <div className={`${s.field} ${s.span2}`}>
              <label className={s.label}>{t('cases.form.hearingLocationLabel')}</label>
              <input className={s.input} value={nh.location} onChange={e => setNhF('location', e.target.value)} placeholder={t('cases.form.hearingLocationPlaceholder')} />
            </div>
          </div>
          <div className={s.inlineActions}>
            <button type="button" className={s.btnSave} disabled={adding || !nh.title.trim() || !nh.date} onClick={handleAdd}>
              {adding ? t('cases.form.addingHearing') : t('cases.form.addHearingButton')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const FEE_TYPES = [
  'Honorários Contratuais',
  'Honorários Sucumbenciais',
  'Custas',
  'Diligência Jurídica',
]

const FEE_TYPE_KEYS = {
  'Honorários Contratuais':   'financials.categories.income.honorariosContratuais',
  'Honorários Sucumbenciais': 'financials.categories.income.honorariosSucumbenciais',
  'Custas':                   'financials.categories.income.custas',
  'Diligência Jurídica':      'financials.categories.income.diligenciaJuridica',
}

function monthLabelFee(ym, lang) {
  const [y, m] = ym.split('-').map(Number)
  return formatDate(new Date(y, m - 1, 1), lang, { month: 'short', year: 'numeric' })
    .replace('.', '')
}

export default function CaseForm({ initial, onSave, onClose }) {
  const { t, i18n } = useTranslation()
  const { session, lawyer } = useAuth()
  const { situations } = useKanbanSituations()
  const { areas } = useAreas()
  const activeGroups = getActiveGroups(lawyer?.preferences?.tribunais_active_groups)
  const now = new Date()
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [courtCustom, setCourtCustom] = useState(() => {
    const c = initial?.court ?? ''
    if (!c || activeGroups.length === 0) return false
    return !activeGroups.some(g => g.items.includes(c))
  })

  const parceiros = lawyer?.preferences?.parceiros ?? []

  const [f, setF] = useState({
    title:            initial?.title            ?? '',
    case_number:      initial?.case_number      ?? '',
    client_id:        initial?.client_id        ?? '',
    court:            initial?.court            ?? '',
    area:             initial?.area             ?? '',
    status:           initial?.status           ?? 'ativo',
    situation:        initial?.situation        ?? '',
    valor:            initial?.valor       != null ? String(initial.valor)            : '',
    description:      initial?.description      ?? '',
    quota_litis_pct:  initial?.quota_litis_pct  ?? '',
    partner:          initial?.partner          ?? '',
  })
  const [clients,       setClients]       = useState([])
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')

  /* ── Honorários / Fee section state ── */
  const [feeType,      setFeeType]      = useState('')
  const [feeTypeOther, setFeeTypeOther] = useState(false)
  const [feeNote,      setFeeNote]      = useState('')
  const [feeAmount,    setFeeAmount]    = useState('')
  const [feeMode,      setFeeMode]      = useState('avista')
  const [feeParcelas,  setFeeParcelas]  = useState(3)
  const [feeDia,       setFeeDia]       = useState(5)
  const [feeStart,     setFeeStart]     = useState(curMonth)
  const [feeDueDate,   setFeeDueDate]   = useState('')
  const [feeCreating,  setFeeCreating]  = useState(false)
  const [feeCreated,   setFeeCreated]   = useState(0)

  const feeTotal   = parseFloat(feeAmount) || 0
  const feeN       = Math.max(2, Math.min(36, parseInt(feeParcelas, 10) || 2))
  const feePerUnit = feeN > 0 ? Math.round(feeTotal / feeN * 100) / 100 : 0
  let feePreview   = ''
  if (feeMode === 'parcelado' && feePerUnit > 0 && feeStart) {
    const [sy, sm] = feeStart.split('-').map(Number)
    const endDate  = new Date(sy, sm - 1 + feeN - 1, 1)
    const endMon   = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
    feePreview = t('financials.form.installmentPreview', {
      n: feeN,
      amount: formatCurrency(feePerUnit, i18n.language),
      day: feeDia,
      start: monthLabelFee(feeStart, i18n.language),
      end: monthLabelFee(endMon, i18n.language),
    })
  }

  async function createFeeEntries(caseId) {
    if (!feeType || feeTotal <= 0) return 0
    setFeeCreating(true)
    const catVal  = feeTypeOther ? (feeNote.trim() || feeType) : feeType
    const baseDesc = feeNote.trim() || catVal

    if (feeMode === 'parcelado') {
      const groupId = crypto.randomUUID()
      const [sy, sm] = feeStart.split('-').map(Number)
      const day = Math.max(1, Math.min(28, parseInt(feeDia, 10) || 5))

      const records = Array.from({ length: feeN }, (_, i) => {
        const dueDate = new Date(sy, sm - 1 + i, day)
        const amount  = i === feeN - 1
          ? Math.round((feeTotal - feePerUnit * (feeN - 1)) * 100) / 100
          : feePerUnit
        return {
          lawyer_id:            lawyer?.id ?? session.user.id,
          case_id:              caseId,
          description:          `${baseDesc} (${i + 1}/${feeN})`,
          type:                 'receita',
          amount,
          status:               'pendente',
          category:             catVal,
          recurring:            false,
          due_date:             dueDate.toISOString().split('T')[0],
          installment_of:       i + 1,
          installment_total:    feeN,
          installment_group_id: groupId,
        }
      })

      const { error } = await supabase.from('financial_entries').insert(records)
      setFeeCreating(false)
      if (error) { setError(error.message); return 0 }
      return feeN
    } else {
      const { error } = await supabase.from('financial_entries').insert({
        lawyer_id: lawyer?.id ?? session.user.id,
        case_id:   caseId,
        description: baseDesc,
        type:        'receita',
        amount:      feeTotal,
        status:      'pendente',
        category:    catVal,
        recurring:   false,
        due_date:    feeDueDate || null,
      })
      setFeeCreating(false)
      if (error) { setError(error.message); return 0 }
      return 1
    }
  }

  async function handleCreateFeeEntries() {
    if (!initial?.id) return
    const count = await createFeeEntries(initial.id)
    if (count > 0) setFeeCreated(count)
  }

  /* ── Inline new-client form ── */
  const [newClientOpen,  setNewClientOpen]  = useState(false)
  const [clientFormOpen, setClientFormOpen] = useState(false)
  const [nc, setNc] = useState({ full_name: '', tipo: 'PF', email: '', phone: '' })
  const [ncSaving, setNcSaving] = useState(false)
  const [ncError,  setNcError]  = useState('')

  useEffect(() => {
    supabase.from('clients').select('id, full_name').order('full_name')
      .then(({ data }) => data && setClients(data))
  }, [])

  const set   = (k, v) => setF(f => ({ ...f, [k]: v }))
  const setNcF = (k, v) => setNc(n => ({ ...n, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload = {
      title:            toTitleCase(f.title),
      case_number:      f.case_number.trim() || null,
      client_id:        f.client_id   || null,
      court:            f.court.trim() || null,
      area:             f.area        || null,
      status:           f.status,
      situation:        f.situation        || null,
      valor:            parseFloat(f.valor) || 0,
      description:      f.description.trim() || null,
      quota_litis_pct:  f.quota_litis_pct  || null,
      partner:          f.partner          || null,
    }

    let caseId
    if (initial) {
      const { error } = await supabase.from('cases').update(payload).eq('id', initial.id)
      if (error) { setError(error.message); setSaving(false); return }
      caseId = initial.id
    } else {
      const { data: caseData, error } = await supabase
        .from('cases')
        .insert({ ...payload, lawyer_id: lawyer?.id ?? session.user.id })
        .select('id')
        .single()
      if (error) { setError(error.message); setSaving(false); return }
      caseId = caseData.id
    }

    // Auto-create fee entries for NEW cases only
    if (!initial && feeType && feeTotal > 0) {
      await createFeeEntries(caseId)
    }

    setSaving(false)
    onSave()
  }

  async function handleDelete() {
    if (!window.confirm(t('common.confirmDelete'))) return
    const { error } = await supabase.from('cases').delete().eq('id', initial.id)
    if (error) { setError(error.message); return }
    onSave()
  }

  async function handleFullClientSave() {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) {
      setClients(prev =>
        [...prev.filter(c => c.id !== data.id), { id: data.id, full_name: data.full_name }]
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
      )
      setF(f => ({ ...f, client_id: data.id }))
    }
    setClientFormOpen(false)
    setNewClientOpen(false)
  }

  async function handleCreateClient(e) {
    e.preventDefault()
    if (!nc.full_name.trim()) { setNcError(t('common.nameRequired')); return }
    setNcSaving(true); setNcError('')
    const { data, error } = await supabase
      .from('clients')
      .insert({ lawyer_id: lawyer?.id ?? session.user.id, full_name: toTitleCase(nc.full_name), tipo: nc.tipo, email: nc.email.trim() || null, phone: nc.phone.trim() || null })
      .select('id, full_name')
      .single()
    setNcSaving(false)
    if (error) { setNcError(error.message); return }
    setClients(prev => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setF(f => ({ ...f, client_id: data.id }))
    setNc({ full_name: '', tipo: 'PF', email: '', phone: '' })
    setNewClientOpen(false)
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.grid}>

        <div className={`${s.field} ${s.span2}`}>
          <label className={`${s.label} ${s.req}`}>{t('cases.form.titleLabel')}</label>
          <input className={s.input} value={f.title} onChange={e => set('title', e.target.value)}
            required placeholder={t('cases.form.titlePlaceholder')} />
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.form.caseNumberLabel')}</label>
          <input className={s.input} value={f.case_number} onChange={e => set('case_number', e.target.value)}
            placeholder={t('cases.form.caseNumberPlaceholder')} />
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.form.clientLabel')}</label>
          <select className={s.select} value={f.client_id} onChange={e => set('client_id', e.target.value)}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
          <button
            type="button"
            className={s.inlineLink}
            onClick={() => { setNewClientOpen(v => !v); setNcError('') }}
          >
            {newClientOpen ? t('cases.form.cancelNewClient') : t('cases.form.createNewClient')}
          </button>

          {newClientOpen && (
            <div className={s.inlineCard}>
              <div className={s.inlineCardTitle}>{t('cases.form.newClientCardTitle')}</div>
              <div className={s.inlineGrid}>
                <div className={`${s.field} ${s.span2}`}>
                  <label className={s.label}>{t('cases.form.fullNameLabel')} *</label>
                  <input className={s.input} value={nc.full_name}
                    onChange={e => setNcF('full_name', e.target.value)}
                    placeholder={t('cases.form.fullNamePlaceholder')} autoFocus />
                </div>
                <div className={s.field}>
                  <label className={s.label}>{t('cases.form.typeLabel')}</label>
                  <select className={s.select} value={nc.tipo} onChange={e => setNcF('tipo', e.target.value)}>
                    <option value="PF">{t('clients.typePF')}</option>
                    <option value="PJ">{t('clients.typePJ')}</option>
                  </select>
                </div>
                <div className={s.field}>
                  <label className={s.label}>{t('cases.form.phoneLabel')}</label>
                  <input className={s.input} value={nc.phone}
                    onChange={e => setNcF('phone', e.target.value)}
                    placeholder={t('cases.form.phonePlaceholder')} />
                </div>
                <div className={`${s.field} ${s.span2}`}>
                  <label className={s.label}>{t('cases.form.emailLabel')}</label>
                  <input className={s.input} type="email" value={nc.email}
                    onChange={e => setNcF('email', e.target.value)}
                    placeholder={t('cases.form.emailPlaceholder')} />
                </div>
              </div>
              {ncError && <div className={s.error}>{ncError}</div>}
              <div className={s.inlineActions}>
                <button type="button" className={s.btnCancel} onClick={() => setClientFormOpen(true)}>
                  {t('cases.form.fullRegistrationLink')}
                </button>
                <button type="button" className={s.btnSave} disabled={ncSaving} onClick={handleCreateClient}>
                  {ncSaving ? t('cases.form.creating') : t('cases.form.createAndSelect')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.form.courtLabel')}</label>
          {activeGroups.length > 0 ? (
            <>
              <select
                className={s.select}
                value={courtCustom ? '__outro__' : (f.court || '')}
                onChange={e => {
                  if (e.target.value === '__outro__') { setCourtCustom(true); set('court', '') }
                  else { setCourtCustom(false); set('court', e.target.value) }
                }}
              >
                <option value="">{t('common.selectPlaceholder')}</option>
                {activeGroups.map(group => (
                  <optgroup key={group.key} label={group.label}>
                    {group.items.map(item => <option key={item} value={item}>{item}</option>)}
                  </optgroup>
                ))}
                <option value="__outro__">{t('common.otherManualOption')}</option>
              </select>
              {courtCustom && (
                <input className={s.input} style={{ marginTop: '0.45rem' }}
                  value={f.court} onChange={e => set('court', e.target.value)}
                  placeholder={t('cases.form.courtCustomPlaceholder')} autoFocus />
              )}
            </>
          ) : (
            <input className={s.input} value={f.court} onChange={e => set('court', e.target.value)}
              placeholder={t('cases.form.courtPlaceholder')} />
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.form.areaLabel')}</label>
          <select className={s.select} value={f.area} onChange={e => set('area', e.target.value)}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {areas.map(a => <option key={a.id} value={a.value}>{a.value}</option>)}
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.form.situationLabel')}</label>
          <select className={s.select} value={f.situation} onChange={e => set('situation', e.target.value)}>
            <option value="">{t('cases.form.uncategorizedOption')}</option>
            {situations.map(sit => (
              <option key={sit.id} value={sit.id}>{sit.value}</option>
            ))}
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.form.caseValueLabel')}</label>
          <input className={s.input} type="number" min="0" step="0.01"
            value={f.valor} onChange={e => set('valor', e.target.value)} placeholder={t('common.currencyPlaceholder')} />
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.form.quotaLitisLabel')}</label>
          <select className={s.select} value={f.quota_litis_pct} onChange={e => set('quota_litis_pct', e.target.value)}>
            <option value="">{t('cases.form.noQuotaLitisOption')}</option>
            {(lawyer?.preferences?.quota_litis_options?.length
              ? lawyer.preferences.quota_litis_options
              : DEFAULT_QUOTA_LITIS
            ).map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          {f.quota_litis_pct && f.valor && (
            <span className={s.hint}>
              {t('cases.form.expectedValueHint', { value: formatCurrency(parseFloat(f.valor) * parseFloat(f.quota_litis_pct) / 100, i18n.language) })}
            </span>
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('cases.form.partnerLabel')}</label>
          <select className={s.select} value={f.partner} onChange={e => set('partner', e.target.value)}>
            <option value="">{t('cases.form.noPartnerOption')}</option>
            {parceiros.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* ── Honorários section ── */}
        <hr className={s.sectionDivider} />
        <div className={`${s.field} ${s.span2}`}>
          <div className={s.sectionTitle}>{t('cases.form.feeSectionTitle')}</div>
        </div>

        <div className={`${s.field} ${s.span2}`}>
          <div className={s.inlineCard}>
            <div className={s.inlineCardTitle}>
              {initial ? t('cases.form.generateLinkedEntry') : t('cases.form.configureFeesOptional')}
            </div>

            <div className={s.inlineGrid}>
              <div className={`${s.field} ${s.span2}`}>
                <label className={s.label}>{t('proposals.form.feeTypeLabel')}</label>
                <select
                  className={s.select}
                  value={feeTypeOther ? '__outro__' : (feeType || '')}
                  onChange={e => {
                    if (e.target.value === '__outro__') { setFeeTypeOther(true); setFeeType('Outro') }
                    else { setFeeTypeOther(false); setFeeNote(''); setFeeType(e.target.value) }
                  }}
                >
                  <option value="">{t('cases.form.noFeeConfigOption')}</option>
                  {FEE_TYPES.map(ft => <option key={ft} value={ft}>{t(FEE_TYPE_KEYS[ft])}</option>)}
                  <option value="__outro__">{t('common.otherManualOption')}</option>
                </select>
                {feeTypeOther && (
                  <input className={s.input} style={{ marginTop: '0.4rem' }}
                    value={feeNote} onChange={e => setFeeNote(e.target.value)}
                    placeholder={t('cases.form.feeOtherPlaceholder')} autoFocus />
                )}
              </div>

              {feeType && (
                <>
                  <div className={s.field}>
                    <label className={s.label}>{t('financials.form.amountTotalLabel')}</label>
                    <input className={s.input} type="number" min="0" step="0.01"
                      value={feeAmount} onChange={e => setFeeAmount(e.target.value)}
                      placeholder={t('common.currencyPlaceholder')} />
                  </div>

                  <div className={s.field}>
                    <label className={s.label}>{t('cases.form.paymentMethodLabel')}</label>
                    <select className={s.select} value={feeMode} onChange={e => setFeeMode(e.target.value)}>
                      <option value="avista">{t('cases.form.paymentAvista')}</option>
                      <option value="parcelado">{t('cases.form.paymentParcelado')}</option>
                    </select>
                  </div>

                  {feeMode === 'avista' && (
                    <div className={s.field}>
                      <label className={s.label}>{t('financials.form.dueDateLabel')}</label>
                      <input className={s.input} type="date"
                        value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} />
                    </div>
                  )}

                  {feeMode === 'parcelado' && (
                    <>
                      <div className={s.field}>
                        <label className={s.label}>{t('financials.form.installmentCountLabel')}</label>
                        <input className={s.input} type="number" min="2" max="36"
                          value={feeParcelas}
                          onChange={e => setFeeParcelas(Math.max(2, parseInt(e.target.value) || 2))}
                        />
                      </div>
                      <div className={s.field}>
                        <label className={s.label}>{t('financials.form.installmentDayLabel')}</label>
                        <input className={s.input} type="number" min="1" max="28"
                          value={feeDia}
                          onChange={e => setFeeDia(Math.max(1, Math.min(28, parseInt(e.target.value) || 5)))}
                        />
                      </div>
                      <div className={`${s.field} ${s.span2}`}>
                        <label className={s.label}>{t('financials.form.installmentStartLabel')}</label>
                        <input className={s.input} type="month"
                          value={feeStart} onChange={e => setFeeStart(e.target.value)} />
                      </div>
                      {feePreview && (
                        <div className={`${s.field} ${s.span2}`}>
                          <div className={s.installmentPreview}>{feePreview}</div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Auto-note for new cases */}
            {!initial && feeType && feeTotal > 0 && (
              <div className={s.hint} style={{ marginTop: '0.25rem' }}>
                {t('cases.form.feeAutoNote', { count: feeMode === 'parcelado' ? feeN : 1 })}
              </div>
            )}

            {/* Manual button for existing cases */}
            {initial && feeType && feeTotal > 0 && (
              <div className={s.inlineActions} style={{ marginTop: '0.25rem' }}>
                {feeCreated > 0
                  ? <div className={s.successMsg}>
                      {t('cases.form.feeCreatedSuccess', { count: feeCreated })}
                    </div>
                  : <button type="button" className={s.btnSecondary}
                      disabled={feeCreating} onClick={handleCreateFeeEntries}>
                      {feeCreating ? t('cases.form.creating') : t('cases.form.createFeeEntriesButton')}
                    </button>
                }
              </div>
            )}
          </div>
        </div>

        <div className={`${s.field} ${s.span2}`}>
          <label className={s.label}>{t('cases.form.notesLabel')}</label>
          <textarea className={s.textarea} value={f.description}
            onChange={e => set('description', e.target.value)}
            placeholder={t('cases.form.notesPlaceholder')} />
        </div>

        {initial?.id && (
          <HearingsSection caseId={initial.id} lawyerId={session.user.id} lawyerName={lawyer?.full_name} />
        )}

      </div>

      {error && <div className={s.error}>{error}</div>}

      {clientFormOpen && (
        <Modal title={t('cases.form.newClientModalTitle')} onClose={() => setClientFormOpen(false)} size="md">
          <ClientForm
            onClose={() => setClientFormOpen(false)}
            onSave={handleFullClientSave}
          />
        </Modal>
      )}

      <div className={s.footer}>
        {initial && <button type="button" className={s.btnDelete} onClick={handleDelete}>{t('common.delete')}</button>}
        <div className={s.spacer} />
        <button type="button" className={s.btnCancel} onClick={onClose}>{t('common.cancel')}</button>
        <button type="submit" className={s.btnSave} disabled={saving}>
          {saving ? t('common.saving') : initial ? t('common.saveChanges') : t('cases.form.createButton')}
        </button>
      </div>
    </form>
  )
}
