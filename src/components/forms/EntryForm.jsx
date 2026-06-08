import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import s from './Form.module.css'

const REC_CATEGORIES_FIXED = [
  'Honorários Contratuais',
  'Honorários Sucumbenciais',
  'Custas',
  'Diligência Jurídica',
]

const DESP_CATEGORIES = [
  'Aluguel',
  'Internet / Telefone',
  'Software / Assinaturas',
  'OAB / Taxas',
  'Pessoal / Salários',
  'Contabilidade',
  'Material de Escritório',
  'Marketing',
  'Transporte',
  'Outros',
]

function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '')
}

export default function EntryForm({ initial, defaultType = 'receita', onSave, onClose }) {
  const { session, lawyer } = useAuth()
  const now = new Date()
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const isRecOther = initial?.type === 'receita' && initial?.category &&
    !REC_CATEGORIES_FIXED.includes(initial.category)

  const [f, setF] = useState({
    description: initial?.description ?? '',
    type:        initial?.type        ?? defaultType,
    amount:      initial?.amount      != null ? String(initial.amount) : '',
    status:      initial?.status      ?? 'pendente',
    case_id:     initial?.case_id     ?? '',
    category:    isRecOther ? '' : (initial?.category ?? ''),
    recurring:   initial?.recurring   ?? false,
    due_date:    initial?.due_date    ? initial.due_date.split('T')[0] : '',
    paid_at:     initial?.paid_at     ? initial.paid_at.split('T')[0]  : '',
  })

  const [categoryOther, setCategoryOther] = useState(isRecOther)
  const [categoryOtherText, setCategoryOtherText] = useState(isRecOther ? (initial?.category ?? '') : '')

  // Installment plan (new receita only, not recurring)
  const [parcelado, setParcelado]           = useState(false)
  const [installCount, setInstallCount]     = useState(3)
  const [installDay, setInstallDay]         = useState(5)
  const [installStart, setInstallStart]     = useState(curMonth)

  const [cases,  setCases]  = useState([])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    supabase.from('cases').select('id, title').in('status', ['ativo','suspenso']).order('title')
      .then(({ data }) => data && setCases(data))
  }, [])

  const set = (k, v) => setF(f => ({ ...f, [k]: v }))

  const isReceita  = f.type === 'receita'
  const isDespesa  = f.type === 'despesa'
  const isRecurr   = f.recurring
  const isNew      = !initial?.id
  const showParcela = isReceita && !isRecurr && isNew

  const totalAmt   = parseFloat(f.amount) || 0
  const nParcelas  = Math.max(2, Math.min(36, parseInt(installCount, 10) || 2))
  const perParcela = nParcelas > 0 ? Math.round(totalAmt / nParcelas * 100) / 100 : 0

  let previewText = ''
  if (parcelado && perParcela > 0 && installStart) {
    const [sy, sm] = installStart.split('-').map(Number)
    const endDate  = new Date(sy, sm - 1 + nParcelas - 1, 1)
    const endMon   = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
    previewText = `${nParcelas} × ${fmtBRL(perParcela)} · dia ${installDay} · ${monthLabel(installStart)} → ${monthLabel(endMon)}`
  }

  function getCategory() {
    if (isReceita) return categoryOther ? (categoryOtherText.trim() || null) : (f.category || null)
    return f.category || null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')

    const catVal = getCategory()

    // ── Installment plan: create N records ──────────────────────────────
    if (isNew && isReceita && !isRecurr && parcelado && nParcelas >= 2 && totalAmt > 0) {
      const groupId = crypto.randomUUID()
      const [sy, sm] = installStart.split('-').map(Number)
      const day = Math.max(1, Math.min(28, parseInt(installDay, 10) || 5))

      const records = Array.from({ length: nParcelas }, (_, i) => {
        const dueDate = new Date(sy, sm - 1 + i, day)
        const amount  = i === nParcelas - 1
          ? Math.round((totalAmt - perParcela * (nParcelas - 1)) * 100) / 100
          : perParcela
        return {
          lawyer_id:            lawyer?.id ?? session.user.id,
          description:          `${f.description.trim()} (${i + 1}/${nParcelas})`,
          type:                 'receita',
          amount,
          status:               'pendente',
          case_id:              f.case_id || null,
          category:             catVal,
          recurring:            false,
          due_date:             dueDate.toISOString().split('T')[0],
          paid_at:              null,
          installment_of:       i + 1,
          installment_total:    nParcelas,
          installment_group_id: groupId,
        }
      })

      const { error } = await supabase.from('financial_entries').insert(records)
      setSaving(false)
      if (error) { setError(error.message); return }
      onSave()
      return
    }

    // ── Single entry ─────────────────────────────────────────────────────
    const payload = {
      description: f.description.trim(),
      type:        f.type,
      amount:      parseFloat(f.amount) || 0,
      status:      f.status,
      case_id:     f.case_id  || null,
      category:    catVal,
      recurring:   isRecurr,
      due_date:    isRecurr ? null : (f.due_date || null),
      paid_at:     f.status === 'pago' ? (f.paid_at || null) : null,
    }

    const { error } = initial?.id
      ? await supabase.from('financial_entries').update(payload).eq('id', initial.id)
      : await supabase.from('financial_entries').insert({ ...payload, lawyer_id: lawyer?.id ?? session.user.id })

    setSaving(false)
    if (error) { setError(error.message); return }
    onSave()
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este lançamento? Esta ação não pode ser desfeita.')) return
    const { error } = await supabase.from('financial_entries').delete().eq('id', initial.id)
    if (error) { setError(error.message); return }
    onSave()
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.grid}>

        <div className={`${s.field} ${s.span2}`}>
          <label className={`${s.label} ${s.req}`}>Descrição</label>
          <input className={s.input} value={f.description} onChange={e => set('description', e.target.value)}
            required placeholder={isReceita ? 'Ex: Honorários — Maria vs. João' : 'Ex: Aluguel do escritório'} />
        </div>

        <div className={s.field}>
          <label className={s.label}>Tipo</label>
          <select className={s.select} value={f.type} onChange={e => {
            set('type', e.target.value)
            setParcelado(false)
            setCategoryOther(false)
            setCategoryOtherText('')
            set('category', '')
          }}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={`${s.label} ${s.req}`}>
            Valor{parcelado ? ' total' : ''} (R$)
          </label>
          <input className={s.input} type="number" min="0" step="0.01"
            value={f.amount} onChange={e => set('amount', e.target.value)}
            required placeholder="0,00" />
        </div>

        {/* Category */}
        <div className={s.field}>
          <label className={s.label}>Categoria</label>
          {isReceita ? (
            <>
              <select
                className={s.select}
                value={categoryOther ? '__outro__' : (f.category || '')}
                onChange={e => {
                  if (e.target.value === '__outro__') {
                    setCategoryOther(true)
                    set('category', '')
                  } else {
                    setCategoryOther(false)
                    setCategoryOtherText('')
                    set('category', e.target.value)
                  }
                }}
              >
                <option value="">— Selecione —</option>
                {REC_CATEGORIES_FIXED.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__outro__">Outro (digitar manualmente)…</option>
              </select>
              {categoryOther && (
                <input className={s.input} style={{ marginTop: '0.4rem' }}
                  value={categoryOtherText}
                  onChange={e => setCategoryOtherText(e.target.value)}
                  placeholder="Descreva a categoria…"
                  autoFocus
                />
              )}
            </>
          ) : (
            <select className={s.select} value={f.category} onChange={e => set('category', e.target.value)}>
              <option value="">— Selecione —</option>
              {DESP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>Caso vinculado</label>
          <select className={s.select} value={f.case_id} onChange={e => set('case_id', e.target.value)}>
            <option value="">— Sem caso —</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        {/* Recurring */}
        <div className={`${s.field} ${s.span2}`}>
          <label className={s.checkLabel}>
            <input type="checkbox" checked={f.recurring} onChange={e => {
              set('recurring', e.target.checked)
              if (e.target.checked) setParcelado(false)
            }} />
            {isReceita ? 'Receita recorrente (valor fixo mensal)' : 'Despesa fixa (recorrente mensal)'}
          </label>
        </div>

        {/* Installment plan: new receitas only, not recurring */}
        {showParcela && (
          <div className={`${s.field} ${s.span2}`}>
            <label className={s.checkLabel}>
              <input type="checkbox" checked={parcelado} onChange={e => setParcelado(e.target.checked)} />
              Parcelar em X vezes
            </label>

            {parcelado && (
              <div className={s.installmentPanel}>
                <div className={s.inlineGrid}>
                  <div className={s.field}>
                    <label className={s.label}>Nº de parcelas</label>
                    <input className={s.input} type="number" min="2" max="36"
                      value={installCount}
                      onChange={e => setInstallCount(Math.max(2, parseInt(e.target.value) || 2))}
                    />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Dia do vencimento</label>
                    <input className={s.input} type="number" min="1" max="28"
                      value={installDay}
                      onChange={e => setInstallDay(Math.max(1, Math.min(28, parseInt(e.target.value) || 5)))}
                    />
                  </div>
                  <div className={`${s.field} ${s.span2}`}>
                    <label className={s.label}>Primeiro mês</label>
                    <input className={s.input} type="month"
                      value={installStart}
                      onChange={e => setInstallStart(e.target.value)}
                    />
                  </div>
                </div>
                {previewText && (
                  <div className={s.installmentPreview}>{previewText}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status: hidden for installment batches */}
        {!parcelado && (
          <div className={s.field}>
            <label className={s.label}>Status</label>
            <select className={s.select} value={f.status} onChange={e => set('status', e.target.value)}>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        )}

        {/* Due date: hidden when recurring or installment batch */}
        {!isRecurr && !parcelado && (
          <div className={s.field}>
            <label className={s.label}>Vencimento</label>
            <input className={s.input} type="date" value={f.due_date}
              onChange={e => set('due_date', e.target.value)} />
          </div>
        )}

        {!parcelado && f.status === 'pago' && (
          <div className={s.field}>
            <label className={s.label}>Data de pagamento</label>
            <input className={s.input} type="date" value={f.paid_at}
              onChange={e => set('paid_at', e.target.value)} />
          </div>
        )}

      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.footer}>
        {initial?.id && <button type="button" className={s.btnDelete} onClick={handleDelete}>Excluir</button>}
        <div className={s.spacer} />
        <button type="button" className={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button type="submit" className={s.btnSave} disabled={saving}>
          {saving
            ? 'Salvando…'
            : parcelado
              ? `Criar ${nParcelas} parcelas`
              : initial
                ? 'Salvar alterações'
                : 'Criar lançamento'}
        </button>
      </div>
    </form>
  )
}
