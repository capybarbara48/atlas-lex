import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useKanbanSituations } from '@/hooks/useKanbanSituations'
import { useAreas } from '@/hooks/useAreas'
import { getActiveGroups } from '@/lib/tribunais'
import { useCaseHearings, addHearing, deleteHearing } from '@/hooks/useHearings'
import Modal from '@/components/ui/Modal'
import ClientForm from './ClientForm'
import s from './Form.module.css'

const DEFAULT_QUOTA_LITIS = ['5%','10%','15%','20%','25%','30%','35%']

function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)
}

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

function HearingsSection({ caseId, lawyerId }) {
  const { data: hearings, refetch } = useCaseHearings(caseId)
  const [nh, setNh] = useState({ title: '', date: '', time: '', location: '' })
  const [titleCustom, setTitleCustom] = useState(false)
  const [adding, setAdding] = useState(false)

  const setNhF = (k, v) => setNh(n => ({ ...n, [k]: v }))

  async function handleAdd() {
    if (!nh.title.trim() || !nh.date) return
    setAdding(true)
    await addHearing({
      lawyer_id: lawyerId,
      case_id:   caseId,
      title:     nh.title.trim(),
      date:      nh.date,
      time:      nh.time || null,
      location:  nh.location.trim() || null,
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
        <div className={s.sectionTitle}>Audiências</div>
        {list.length > 0 && (
          <div className={s.hearingList}>
            {list.map(h => (
              <div key={h.id} className={s.hearingItem}>
                <span className={s.hearingItemDate}>
                  {new Date(h.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                {h.time && <span className={s.hearingItemMeta}>{h.time.slice(0, 5)}</span>}
                <span className={s.hearingItemTitle}>{h.title}</span>
                {h.location && <span className={s.hearingItemMeta}>{h.location}</span>}
                <button type="button" className={s.hearingItemDel} onClick={() => handleDel(h.id)} title="Excluir">✕</button>
              </div>
            ))}
          </div>
        )}
        {list.length === 0 && <div className={s.hint}>Nenhuma audiência cadastrada.</div>}
      </div>
      <div className={`${s.field} ${s.span2}`}>
        <div className={s.inlineCard}>
          <div className={s.inlineCardTitle}>Adicionar audiência</div>
          <div className={s.inlineGrid}>
            <div className={`${s.field} ${s.span2}`}>
              <label className={s.label}>Tipo de audiência *</label>
              <select
                className={s.select}
                value={titleCustom ? '__outro__' : (nh.title || '')}
                onChange={e => {
                  if (e.target.value === '__outro__') { setTitleCustom(true); setNhF('title', '') }
                  else { setTitleCustom(false); setNhF('title', e.target.value) }
                }}
              >
                <option value="">— Selecionar —</option>
                {HEARING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__outro__">Outro (digitar manualmente)…</option>
              </select>
              {titleCustom && (
                <input className={s.input} style={{ marginTop: '0.45rem' }}
                  value={nh.title} onChange={e => setNhF('title', e.target.value)}
                  placeholder="Descreva o tipo de audiência…" autoFocus />
              )}
            </div>
            <div className={s.field}>
              <label className={s.label}>Data *</label>
              <input className={s.input} type="date" value={nh.date} onChange={e => setNhF('date', e.target.value)} />
            </div>
            <div className={s.field}>
              <label className={s.label}>Horário</label>
              <input className={s.input} type="time" value={nh.time} onChange={e => setNhF('time', e.target.value)} />
            </div>
            <div className={`${s.field} ${s.span2}`}>
              <label className={s.label}>Local</label>
              <input className={s.input} value={nh.location} onChange={e => setNhF('location', e.target.value)} placeholder="Ex: Vara Cível, Fórum Central" />
            </div>
          </div>
          <div className={s.inlineActions}>
            <button type="button" className={s.btnSave} disabled={adding || !nh.title.trim() || !nh.date} onClick={handleAdd}>
              {adding ? 'Adicionando…' : '+ Adicionar'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function CaseForm({ initial, onSave, onClose }) {
  const { session, lawyer } = useAuth()
  const { situations } = useKanbanSituations()
  const { areas } = useAreas()
  const activeGroups = getActiveGroups(lawyer?.preferences?.tribunais_active_groups)

  const [courtCustom, setCourtCustom] = useState(() => {
    const c = initial?.court ?? ''
    if (!c || activeGroups.length === 0) return false
    return !activeGroups.some(g => g.items.includes(c))
  })

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
  })
  const [clients,       setClients]       = useState([])
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')

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
      title:            f.title.trim(),
      case_number:      f.case_number.trim() || null,
      client_id:        f.client_id   || null,
      court:            f.court.trim() || null,
      area:             f.area        || null,
      status:           f.status,
      situation:        f.situation        || null,
      valor:            parseFloat(f.valor) || 0,
      description:      f.description.trim() || null,
      quota_litis_pct:  f.quota_litis_pct  || null,
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
                <button type="button" className={s.btnCancel} onClick={() => setClientFormOpen(true)}>
                  Cadastro completo →
                </button>
                <button type="button" className={s.btnSave} disabled={ncSaving} onClick={handleCreateClient}>
                  {ncSaving ? 'Criando…' : 'Criar e selecionar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>Tribunal</label>
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
                <option value="">— Selecionar —</option>
                {activeGroups.map(group => (
                  <optgroup key={group.key} label={group.label}>
                    {group.items.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                ))}
                <option value="__outro__">Outro (digitar manualmente)…</option>
              </select>
              {courtCustom && (
                <input className={s.input} style={{ marginTop: '0.45rem' }}
                  value={f.court} onChange={e => set('court', e.target.value)}
                  placeholder="Ex: TJSP, TRT-2, Vara Cível…" autoFocus />
              )}
            </>
          ) : (
            <input className={s.input} value={f.court} onChange={e => set('court', e.target.value)}
              placeholder="Ex: TJSP, TRT-2, STJ…" />
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>Área</label>
          <select className={s.select} value={f.area} onChange={e => set('area', e.target.value)}>
            <option value="">— Selecionar —</option>
            {areas.map(a => <option key={a.id} value={a.value}>{a.value}</option>)}
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>Situação no Kanban</label>
          <select className={s.select} value={f.situation} onChange={e => set('situation', e.target.value)}>
            <option value="">— Não categorizado —</option>
            {situations.map(sit => (
              <option key={sit.id} value={sit.id}>{sit.value}</option>
            ))}
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>Valor da causa (R$)</label>
          <input className={s.input} type="number" min="0" step="0.01"
            value={f.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Quota-Litis</label>
          <select className={s.select} value={f.quota_litis_pct} onChange={e => set('quota_litis_pct', e.target.value)}>
            <option value="">— Sem quota-litis —</option>
            {(lawyer?.preferences?.quota_litis_options?.length
              ? lawyer.preferences.quota_litis_options
              : DEFAULT_QUOTA_LITIS
            ).map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          {f.quota_litis_pct && f.valor && (
            <span className={s.hint}>
              Valor esperado: {fmtBRL(parseFloat(f.valor) * parseFloat(f.quota_litis_pct) / 100)}
            </span>
          )}
        </div>

        <div className={`${s.field} ${s.span2}`}>
          <label className={s.label}>Observações</label>
          <textarea className={s.textarea} value={f.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Detalhes adicionais sobre o processo…" />
        </div>

        {initial?.id && (
          <HearingsSection caseId={initial.id} lawyerId={session.user.id} />
        )}

      </div>

      {error && <div className={s.error}>{error}</div>}

      {clientFormOpen && (
        <Modal title="Novo Cliente" onClose={() => setClientFormOpen(false)} size="md">
          <ClientForm
            onClose={() => setClientFormOpen(false)}
            onSave={handleFullClientSave}
          />
        </Modal>
      )}

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
