import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import s from './Form.module.css'

const AREAS = ['Cível','Trabalhista','Família','Criminal','Tributário','Bancário',
               'Societário','Imobiliário','Ambiental','Administrativo','Previdenciário',
               'Consumidor','Outro']

export default function CaseForm({ initial, onSave, onClose }) {
  const { session } = useAuth()
  const [f, setF] = useState({
    title:            initial?.title            ?? '',
    case_number:      initial?.case_number      ?? '',
    client_id:        initial?.client_id        ?? '',
    court:            initial?.court            ?? '',
    area:             initial?.area             ?? '',
    status:           initial?.status           ?? 'ativo',
    valor:            initial?.valor       != null ? String(initial.valor)            : '',
    opened_at:        initial?.opened_at        ?? '',
    description:      initial?.description      ?? '',
    final_fees:       initial?.final_fees  != null ? String(initial.final_fees)       : '',
    sucumbencia_fees: initial?.sucumbencia_fees != null ? String(initial.sucumbencia_fees) : '',
  })
  const [clients,       setClients]       = useState([])
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')

  /* ── Inline new-client form ── */
  const [newClientOpen, setNewClientOpen] = useState(false)
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
      title:            f.title.trim(),
      case_number:      f.case_number.trim() || null,
      client_id:        f.client_id   || null,
      court:            f.court.trim() || null,
      area:             f.area        || null,
      status:           f.status,
      valor:            parseFloat(f.valor) || 0,
      opened_at:        f.opened_at   || null,
      description:      f.description.trim() || null,
      final_fees:       f.status === 'encerrado' ? (parseFloat(f.final_fees)       || null) : null,
      sucumbencia_fees: f.status === 'encerrado' ? (parseFloat(f.sucumbencia_fees) || null) : null,
    }
    const { error } = initial
      ? await supabase.from('cases').update(payload).eq('id', initial.id)
      : await supabase.from('cases').insert({ ...payload, lawyer_id: session.user.id })
    setSaving(false)
    if (error) { setError(error.message); return }
    onSave()
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este processo? Esta ação não pode ser desfeita.')) return
    const { error } = await supabase.from('cases').delete().eq('id', initial.id)
    if (error) { setError(error.message); return }
    onSave()
  }

  async function handleCreateClient(e) {
    e.preventDefault()
    if (!nc.full_name.trim()) { setNcError('Nome é obrigatório.'); return }
    setNcSaving(true); setNcError('')
    const { data, error } = await supabase
      .from('clients')
      .insert({ lawyer_id: session.user.id, full_name: nc.full_name.trim(), tipo: nc.tipo, email: nc.email.trim() || null, phone: nc.phone.trim() || null })
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
          <label className={`${s.label} ${s.req}`}>Título do processo</label>
          <input className={s.input} value={f.title} onChange={e => set('title', e.target.value)}
            required placeholder="Ex: Costa vs. Seguradora Alfa" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Número do processo</label>
          <input className={s.input} value={f.case_number} onChange={e => set('case_number', e.target.value)}
            placeholder="0012345-78.2024.8.26.0100" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Cliente</label>
          <select className={s.select} value={f.client_id} onChange={e => set('client_id', e.target.value)}>
            <option value="">— Selecionar —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
          <button
            type="button"
            className={s.inlineLink}
            onClick={() => { setNewClientOpen(v => !v); setNcError('') }}
          >
            {newClientOpen ? '✕ Cancelar novo cliente' : '+ Criar novo cliente'}
          </button>

          {newClientOpen && (
            <div className={s.inlineCard}>
              <div className={s.inlineCardTitle}>Novo cliente</div>
              <div className={s.inlineGrid}>
                <div className={`${s.field} ${s.span2}`}>
                  <label className={s.label}>Nome completo *</label>
                  <input className={s.input} value={nc.full_name}
                    onChange={e => setNcF('full_name', e.target.value)}
                    placeholder="Ex: Maria Silva" autoFocus />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Tipo</label>
                  <select className={s.select} value={nc.tipo} onChange={e => setNcF('tipo', e.target.value)}>
                    <option value="PF">Pessoa Física</option>
                    <option value="PJ">Pessoa Jurídica</option>
                  </select>
                </div>
                <div className={s.field}>
                  <label className={s.label}>Telefone</label>
                  <input className={s.input} value={nc.phone}
                    onChange={e => setNcF('phone', e.target.value)}
                    placeholder="(11) 99999-0000" />
                </div>
                <div className={`${s.field} ${s.span2}`}>
                  <label className={s.label}>E-mail</label>
                  <input className={s.input} type="email" value={nc.email}
                    onChange={e => setNcF('email', e.target.value)}
                    placeholder="cliente@email.com" />
                </div>
              </div>
              {ncError && <div className={s.error}>{ncError}</div>}
              <div className={s.inlineActions}>
                <button type="button" className={s.btnSave} disabled={ncSaving} onClick={handleCreateClient}>
                  {ncSaving ? 'Criando…' : 'Criar e selecionar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>Tribunal / Vara</label>
          <input className={s.input} value={f.court} onChange={e => set('court', e.target.value)}
            placeholder="TJSP, TRT-2, STJ…" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Área</label>
          <select className={s.select} value={f.area} onChange={e => set('area', e.target.value)}>
            <option value="">— Selecionar —</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>Status</label>
          <select className={s.select} value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="ativo">Ativo</option>
            <option value="suspenso">Suspenso</option>
            <option value="encerrado">Encerrado</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>Valor da causa (R$)</label>
          <input className={s.input} type="number" min="0" step="0.01"
            value={f.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Data de abertura</label>
          <input className={s.input} type="date" value={f.opened_at} onChange={e => set('opened_at', e.target.value)} />
        </div>

        <div className={`${s.field} ${s.span2}`}>
          <label className={s.label}>Observações</label>
          <textarea className={s.textarea} value={f.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Detalhes adicionais sobre o processo…" />
        </div>

        {f.status === 'encerrado' && <>
          <div className={s.field}>
            <label className={s.label}>Honorários finais recebidos (R$)</label>
            <input className={s.input} type="number" min="0" step="0.01"
              value={f.final_fees} onChange={e => set('final_fees', e.target.value)}
              placeholder="0,00" />
          </div>

          <div className={s.field}>
            <label className={s.label}>Honorários sucumbenciais (R$)</label>
            <input className={s.input} type="number" min="0" step="0.01"
              value={f.sucumbencia_fees} onChange={e => set('sucumbencia_fees', e.target.value)}
              placeholder="0,00" />
          </div>
        </>}

      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.footer}>
        {initial && <button type="button" className={s.btnDelete} onClick={handleDelete}>Excluir</button>}
        <div className={s.spacer} />
        <button type="button" className={s.btnCancel} onClick={onClose}>Cancelar</button>
        <button type="submit" className={s.btnSave} disabled={saving}>
          {saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Criar processo'}
        </button>
      </div>
    </form>
  )
}
