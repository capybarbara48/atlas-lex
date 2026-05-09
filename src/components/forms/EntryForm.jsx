import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import s from './Form.module.css'

export default function EntryForm({ initial, onSave, onClose }) {
  const { session } = useAuth()
  const [f, setF] = useState({
    description: initial?.description ?? '',
    type:        initial?.type        ?? 'receita',
    amount:      initial?.amount      != null ? String(initial.amount) : '',
    status:      initial?.status      ?? 'pendente',
    case_id:     initial?.case_id     ?? '',
    category:    initial?.category    ?? '',
    due_date:    initial?.due_date    ? initial.due_date.split('T')[0] : '',
    paid_at:     initial?.paid_at     ? initial.paid_at.split('T')[0]  : '',
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
      description: f.description.trim(),
      type:        f.type,
      amount:      parseFloat(f.amount) || 0,
      status:      f.status,
      case_id:     f.case_id   || null,
      category:    f.category.trim() || null,
      due_date:    f.due_date  || null,
      paid_at:     f.status === 'pago' ? (f.paid_at || null) : null,
    }
    const { error } = initial
      ? await supabase.from('financial_entries').update(payload).eq('id', initial.id)
      : await supabase.from('financial_entries').insert({ ...payload, lawyer_id: session.user.id })
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
            required placeholder="Ex: Honorários — Processo Costa vs. Alfa" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Tipo</label>
          <select className={s.select} value={f.type} onChange={e => set('type', e.target.value)}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={`${s.label} ${s.req}`}>Valor (R$)</label>
          <input className={s.input} type="number" min="0" step="0.01"
            value={f.amount} onChange={e => set('amount', e.target.value)}
            required placeholder="0,00" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Status</label>
          <select className={s.select} value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>Caso vinculado</label>
          <select className={s.select} value={f.case_id} onChange={e => set('case_id', e.target.value)}>
            <option value="">— Sem caso —</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>Categoria</label>
          <input className={s.input} value={f.category} onChange={e => set('category', e.target.value)}
            placeholder="Ex: Honorários, Custas, Diligências…" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Vencimento</label>
          <input className={s.input} type="date" value={f.due_date}
            onChange={e => set('due_date', e.target.value)} />
        </div>

        {f.status === 'pago' && (
          <div className={s.field}>
            <label className={s.label}>Data de pagamento</label>
            <input className={s.input} type="date" value={f.paid_at}
              onChange={e => set('paid_at', e.target.value)} />
          </div>
        )}

      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.footer}>
        {initial && <button type="button" className={s.btnDelete} onClick={handleDelete}>Excluir</button>}
        <div className={s.spacer} />
        <button type="button" className={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button type="submit" className={s.btnSave} disabled={saving}>
          {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar lançamento'}
        </button>
      </div>
    </form>
  )
}
