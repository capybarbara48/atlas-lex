import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import s from './Form.module.css'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                 'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function ClientForm({ initial, onSave, onClose }) {
  const { session } = useAuth()
  const [f, setF] = useState({
    full_name: initial?.full_name ?? '',
    tipo:      initial?.tipo      ?? 'PF',
    cpf_cnpj:  initial?.cpf_cnpj  ?? '',
    email:     initial?.email     ?? '',
    phone:     initial?.phone     ?? '',
    cidade:    initial?.cidade    ?? '',
    estado:    initial?.estado    ?? '',
    notes:     initial?.notes     ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k, v) => setF(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload = {
      full_name: f.full_name.trim(),
      tipo:      f.tipo,
      cpf_cnpj:  f.cpf_cnpj.trim()  || null,
      email:     f.email.trim()      || null,
      phone:     f.phone.trim()      || null,
      cidade:    f.cidade.trim()     || null,
      estado:    f.estado            || null,
      notes:     f.notes.trim()      || null,
    }
    const { error } = initial
      ? await supabase.from('clients').update(payload).eq('id', initial.id)
      : await supabase.from('clients').insert({ ...payload, lawyer_id: session.user.id })
    setSaving(false)
    if (error) { setError(error.message); return }
    onSave()
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este cliente? Esta ação não pode ser desfeita.')) return
    const { error } = await supabase.from('clients').delete().eq('id', initial.id)
    if (error) { setError(error.message); return }
    onSave()
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      <div className={s.grid}>

        <div className={`${s.field} ${s.span2}`}>
          <label className={`${s.label} ${s.req}`}>Nome completo</label>
          <input className={s.input} value={f.full_name} onChange={e => set('full_name', e.target.value)}
            required placeholder="Ex: Ana Silva" />
        </div>

        <div className={s.field}>
          <label className={`${s.label} ${s.req}`}>Tipo</label>
          <select className={s.select} value={f.tipo} onChange={e => set('tipo', e.target.value)}>
            <option value="PF">Pessoa Física</option>
            <option value="PJ">Pessoa Jurídica</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>{f.tipo === 'PJ' ? 'CNPJ' : 'CPF'}</label>
          <input className={s.input} value={f.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)}
            placeholder={f.tipo === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'} />
        </div>

        <div className={s.field}>
          <label className={s.label}>E-mail</label>
          <input className={s.input} type="email" value={f.email} onChange={e => set('email', e.target.value)}
            placeholder="cliente@email.com" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Telefone</label>
          <input className={s.input} value={f.phone} onChange={e => set('phone', e.target.value)}
            placeholder="(11) 99999-0000" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Cidade</label>
          <input className={s.input} value={f.cidade} onChange={e => set('cidade', e.target.value)}
            placeholder="São Paulo" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Estado</label>
          <select className={s.select} value={f.estado} onChange={e => set('estado', e.target.value)}>
            <option value="">— UF —</option>
            {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        <div className={`${s.field} ${s.span2}`}>
          <label className={s.label}>Observações</label>
          <textarea className={s.textarea} value={f.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Informações adicionais sobre o cliente…" />
        </div>

      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.footer}>
        {initial && <button type="button" className={s.btnDelete} onClick={handleDelete}>Excluir</button>}
        <div className={s.spacer} />
        <button type="button" className={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button type="submit" className={s.btnSave} disabled={saving}>
          {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar cliente'}
        </button>
      </div>
    </form>
  )
}
