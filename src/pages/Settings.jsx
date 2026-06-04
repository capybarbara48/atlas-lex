import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { loadPreferences, savePreferences, resetPreferences } from '@/hooks/usePreferences'
import { TRIBUNAIS_MASTER, ALL_GROUP_KEYS } from '@/lib/tribunais'
import { loadGoogleFont, loadCustomFont, applyFonts } from '@/lib/fonts'
import { useAreas } from '@/hooks/useAreas'
import PageShell from '@/components/ui/PageShell'
import SuporteSection from '@/components/support/SuporteSection'
import LogoUpload from '@/components/ui/LogoUpload'
import FontUpload from '@/components/ui/FontUpload'
import styles from './Settings.module.css'

/* Cores predefinidas para seleção rápida */
const DEFAULT_SERVICE_TYPES = [
  'Ação para Dano Moral','Ação para Dano Material','Ação para Dano Material e Dano Moral',
  'Ação de Obrigação de Fazer','Mandado de Segurança','Assessoria Jurídica',
  'Desenvolvimento de Contrato','Ação de Alimentos','Execução de Alimentos',
  'Ação Trabalhista','Inventário','Restituição do INSS','Saque do FGTS',
  'Execução de Título Extrajudicial','Ação de Divórcio','Ação Cível',
  'Cumprimento de Sentença',
]

const DEFAULT_QUOTA_LITIS = ['5%','10%','15%','20%','25%','30%','35%']


const HEADING_FONTS = [
  { family: null,                label: 'Padrão Atlas' },
  { family: 'Playfair Display',  label: 'Playfair Display' },
  { family: 'Merriweather',      label: 'Merriweather' },
  { family: 'EB Garamond',       label: 'EB Garamond' },
  { family: 'Lora',              label: 'Lora' },
  { family: 'Raleway',           label: 'Raleway' },
]
const BODY_FONTS = [
  { family: null,            label: 'Padrão (sistema)' },
  { family: 'Inter',         label: 'Inter' },
  { family: 'Poppins',       label: 'Poppins' },
  { family: 'Lato',          label: 'Lato' },
  { family: 'Source Sans 3', label: 'Source Sans 3' },
]
const MONO_FONTS = [
  { family: null,             label: 'Padrão (mono)'  },
  { family: 'IBM Plex Mono',  label: 'IBM Plex Mono'  },
  { family: 'JetBrains Mono', label: 'JetBrains Mono' },
]

const PRESET_COLORS = [
  { hex: '#043b61', name: 'Navy (padrão)' },
  { hex: '#1a1a2e', name: 'Azul-marinho escuro' },
  { hex: '#0f3460', name: 'Azul profundo' },
  { hex: '#1b4332', name: 'Verde floresta' },
  { hex: '#370617', name: 'Bordô' },
  { hex: '#212529', name: 'Grafite' },
  { hex: '#5c4033', name: 'Marrom' },
  { hex: '#4a0e8f', name: 'Roxo' },
]

function darken(hex, amount = 0.15) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount))
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount))
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

/* ── Section wrapper ────────────────────────────────────────────── */
function Section({ title, subtitle, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionSub}>{subtitle}</p>}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {hint && <span className={styles.fieldHint}>{hint}</span>}
      {children}
    </div>
  )
}

/* ── Header preview ─────────────────────────────────────────────── */
function HeaderPreview({ firmName, accent }) {
  return (
    <div className={styles.preview}>
      <div className={styles.previewLabel}>Pré-visualização do cabeçalho</div>
      <div className={styles.previewHeader} style={{ background: accent }}>
        <div className={styles.previewLeft}>
          <div className={styles.previewLogoMark} style={{ border: '1px solid rgba(255,255,255,0.3)' }}>
            {firmName?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'AL'}
          </div>
          <span className={styles.previewFirmName}>{firmName || 'Atlas Adv'}</span>
        </div>
        <div className={styles.previewClock}>14:35:00</div>
        <div className={styles.previewRight}>
          <span className={styles.previewAvatar}>ER</span>
          <span className={styles.previewUser}>Elcimar</span>
        </div>
      </div>
    </div>
  )
}

/* ── Team Members Section ────────────────────────────────────────── */
const ROLE_LABELS = { advogado: 'Advogado', estagiario: 'Estagiário' }
const ROLE_CAPS   = { advogado: 3, estagiario: 3 }

const STATUS_INFO = {
  pending_admin:  { label: 'Aguardando aprovação', cls: 'st-gold'  },
  pending_invite: { label: 'Aprovado — aguardando cadastro', cls: 'st-teal' },
  active:         { label: 'Ativo', cls: 'st-green' },
  disabled:       { label: 'Desativado', cls: 'st-gray' },
}

function TeamMembersSection({ lawyerId, session, responsaveis = [] }) {
  const [members,     setMembers]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [role,        setRole]        = useState('estagiario')
  const [linkedResp,  setLinkedResp]  = useState('')

  useEffect(() => {
    if (!lawyerId) return
    supabase.from('team_members').select('*').eq('lawyer_id', lawyerId).order('invited_at')
      .then(({ data }) => { setMembers(data ?? []); setLoading(false) })
  }, [lawyerId])

  const countByRole = role => members.filter(m => m.role === role && m.status !== 'disabled').length

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    const cap = ROLE_CAPS[role]
    if (countByRole(role) >= cap) {
      setError(`Limite de ${cap} ${ROLE_LABELS[role].toLowerCase()}s atingido.`)
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from('team_members').insert({
      lawyer_id:          lawyerId,
      invited_email:      email.trim().toLowerCase(),
      full_name:          name.trim(),
      role,
      linked_responsavel: linkedResp || null,
    }).select().single()
    setSaving(false)
    if (error) { setError(error.message); return }
    setMembers(m => [...m, data])
    setName(''); setEmail(''); setLinkedResp('')
  }

  async function handleRemove(id) {
    if (!window.confirm('Remover este membro? O acesso será revogado imediatamente.')) return
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setMembers(m => m.filter(x => x.id !== id))
  }

  return (
    <div>
      {loading
        ? <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Carregando…</div>
        : members.length === 0
          ? <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Nenhum membro convidado ainda.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {members.map(m => {
                const st = STATUS_INFO[m.status] ?? STATUS_INFO.pending_admin
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.875rem', background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{m.full_name}</span>
                        <span className={`badge ${m.role === 'advogado' ? 'st-blue' : 'st-teal'}`}>{ROLE_LABELS[m.role]}</span>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                        {m.invited_email}
                        {m.linked_responsavel && <span style={{ marginLeft: '0.5rem', color: 'var(--accent)', fontWeight: 500 }}>· {m.linked_responsavel}</span>}
                      </div>
                      {m.status === 'pending_invite' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.3rem', fontWeight: 500 }}>
                          Instrua o membro a se cadastrar em <strong>atlas-lex.com</strong> com o e-mail <strong>{m.invited_email}</strong>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.75rem', padding: '0.25rem', borderRadius: 4, flexShrink: 0 }}
                      title="Remover membro"
                    >✕</button>
                  </div>
                )
              })}
            </div>
          )
      }

      <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '0.65rem', alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '0.3rem' }}>Nome completo</label>
          <input
            style={{ width: '100%', background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: 'var(--text)', fontFamily: 'inherit' }}
            value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Ana Souza" />
        </div>
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '0.3rem' }}>E-mail</label>
          <input
            type="email"
            style={{ width: '100%', background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: 'var(--text)', fontFamily: 'inherit' }}
            value={email} onChange={e => setEmail(e.target.value)} required placeholder="ana@escritorio.com" />
        </div>
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '0.3rem' }}>Responsável vinculado</label>
          <select
            style={{ width: '100%', background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer' }}
            value={linkedResp} onChange={e => setLinkedResp(e.target.value)}>
            <option value="">— Nenhum —</option>
            {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '0.3rem' }}>Função</label>
          <select
            style={{ background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: 'var(--text)', fontFamily: 'inherit', cursor: 'pointer' }}
            value={role} onChange={e => setRole(e.target.value)}>
            <option value="estagiario">Estagiário</option>
            <option value="advogado">Advogado</option>
          </select>
        </div>
        <button
          type="submit" disabled={saving || !name.trim() || !email.trim()}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', opacity: (saving || !name.trim() || !email.trim()) ? 0.5 : 1, whiteSpace: 'nowrap' }}
        >{saving ? 'Salvando…' : '+ Convidar'}</button>
      </form>

      <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-3)' }}>
        {countByRole('advogado')}/{ROLE_CAPS.advogado} advogados · {countByRole('estagiario')}/{ROLE_CAPS.estagiario} estagiários
        &nbsp;·&nbsp;Convites ficam pendentes até aprovação pelo administrador Atlas Lex.
      </div>

      {error && <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: '#dc2626' }}>{error}</div>}
    </div>
  )
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function Settings() {
  const { lawyer, session, refreshLawyer, isTeamMember } = useAuth()

  /* Profile fields */
  const [fullName,  setFullName]  = useState('')
  const [oabNumber, setOabNumber] = useState('')

  /* Branding fields */
  const [firmName,  setFirmName]  = useState('')
  const [logoUrl,   setLogoUrl]   = useState('')
  const [accent,    setAccent]    = useState('#043b61')

  /* Preferences */
  const [prefs, setPrefs] = useState({})

  /* Editable lists (saved to lawyers.preferences in Supabase) */
  const [serviceTypes,          setServiceTypes]          = useState(DEFAULT_SERVICE_TYPES)
  const [quotaLitis,            setQuotaLitis]            = useState(DEFAULT_QUOTA_LITIS)
  const [tribunaisActiveGroups, setTribunaisActiveGroups] = useState(ALL_GROUP_KEYS)
  const [responsaveis,          setResponsaveis]          = useState([])
  const [parceiros,             setParceiros]             = useState([])
  const [newServiceType,        setNewServiceType]        = useState('')
  const [newQuotaLitis,         setNewQuotaLitis]         = useState('')
  const [newResponsavel,        setNewResponsavel]        = useState('')
  const [newParceiro,           setNewParceiro]           = useState('')
  const [listSaving,            setListSaving]            = useState(false)

  /* Font state */
  const [fontHeading,  setFontHeading]  = useState(null)
  const [fontBody,     setFontBody]     = useState(null)
  const [fontMono,     setFontMono]     = useState(null)
  const [fontScope,    setFontScope]    = useState('all')
  const [customFont,   setCustomFont]   = useState(null)
  const [fontSaving,   setFontSaving]   = useState(false)

  const { areas, addArea, deleteArea } = useAreas()
  const [newArea, setNewArea] = useState('')

  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState('')
  const [error,   setError]   = useState('')

  /* Load initial values from lawyer row */
  useEffect(() => {
    if (!lawyer) return
    setFullName(lawyer.full_name  ?? '')
    setOabNumber(lawyer.oab_number ?? '')
    setFirmName(lawyer.firm_name   ?? '')
    setLogoUrl(lawyer.logo_url     ?? '')
    setAccent(lawyer.theme_accent  ?? '#043b61')
    setPrefs(loadPreferences(lawyer))
    const prefs = lawyer.preferences ?? {}
    if (prefs.service_types?.length)              setServiceTypes(prefs.service_types)
    if (prefs.quota_litis_options?.length)        setQuotaLitis(prefs.quota_litis_options)
    if (prefs.tribunais_active_groups?.length)    setTribunaisActiveGroups(prefs.tribunais_active_groups)
    if (prefs.responsaveis?.length)               setResponsaveis(prefs.responsaveis)
    if (prefs.parceiros?.length)                  setParceiros(prefs.parceiros)
    if (prefs.font_heading)    setFontHeading(prefs.font_heading)
    if (prefs.font_body)       setFontBody(prefs.font_body)
    if (prefs.font_mono)       setFontMono(prefs.font_mono)
    if (prefs.font_scope)      setFontScope(prefs.font_scope)
    if (prefs.custom_font_url) {
      loadCustomFont(prefs.custom_font_url)
      setCustomFont({ displayName: prefs.custom_font_name ?? 'Fonte Personalizada', url: prefs.custom_font_url })
    }
  }, [lawyer])

  /* Apply font preview live in Settings */
  useEffect(() => {
    applyFonts({ font_heading: fontHeading, font_body: fontBody, font_mono: fontMono, font_scope: fontScope, custom_font_url: customFont?.url })
  }, [fontHeading, fontBody, fontMono, fontScope, customFont])

  /* Apply accent preview in real time */
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--accent-dark', darken(accent))
    document.documentElement.style.setProperty('--color-accent', accent)
    document.documentElement.style.setProperty('--color-accent-dark', darken(accent))
  }, [accent])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const { error } = await supabase
      .from('lawyers')
      .update({ full_name: fullName, oab_number: oabNumber })
      .eq('id', session.user.id)
    setSaving(false)
    if (error) { setError('Erro ao salvar perfil: ' + error.message); return }
    await refreshLawyer()
    setSuccess('Perfil atualizado com sucesso!')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleSaveBranding(e) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const { error } = await supabase
      .from('lawyers')
      .update({
        firm_name:         firmName,
        logo_url:          logoUrl || null,
        theme_accent:      accent,
        theme_accent_dark: darken(accent),
      })
      .eq('id', session.user.id)
    setSaving(false)
    if (error) { setError('Erro ao salvar marca: ' + error.message); return }
    await refreshLawyer()
    setSuccess('Identidade visual atualizada!')
    setTimeout(() => setSuccess(''), 3000)
  }

  function handlePrefChange(key, value) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    savePreferences(lawyer, { [key]: value })
  }

  function handleResetPrefs() {
    resetPreferences(lawyer)
    setPrefs(loadPreferences(lawyer))
    setSuccess('Preferências redefinidas para o padrão!')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleSaveLists() {
    setListSaving(true); setError(''); setSuccess('')
    const existing = lawyer?.preferences ?? {}
    const { error } = await supabase
      .from('lawyers')
      .update({ preferences: {
        ...existing,
        service_types:          serviceTypes,
        quota_litis_options:    quotaLitis,
        tribunais_active_groups: tribunaisActiveGroups,
        responsaveis,
        parceiros,
      }})
      .eq('id', session.user.id)
    setListSaving(false)
    if (error) { setError('Erro ao salvar listas: ' + error.message); return }
    await refreshLawyer()
    setSuccess('Listas atualizadas com sucesso!')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleSaveFonts() {
    setFontSaving(true); setError(''); setSuccess('')
    const existing = lawyer?.preferences ?? {}
    const { error } = await supabase
      .from('lawyers')
      .update({ preferences: {
        ...existing,
        font_heading:     fontHeading     ?? null,
        font_body:        fontBody        ?? null,
        font_mono:        fontMono        ?? null,
        font_scope:       fontScope,
        custom_font_url:  customFont?.url     ?? null,
        custom_font_name: customFont?.displayName ?? null,
      }})
      .eq('id', session.user.id)
    setFontSaving(false)
    if (error) { setError('Erro ao salvar tipografia: ' + error.message); return }
    await refreshLawyer()
    setSuccess('Tipografia salva!')
    setTimeout(() => setSuccess(''), 3000)
  }

  function addServiceType() {
    const v = newServiceType.trim()
    if (!v || serviceTypes.includes(v)) return
    setServiceTypes(prev => [...prev, v])
    setNewServiceType('')
  }

  function addQuotaLitis() {
    const raw = newQuotaLitis.trim().replace('%', '')
    const num = parseFloat(raw)
    if (isNaN(num) || num < 0 || num > 100) {
      setError('Percentual inválido. Digite um número entre 0 e 100 (ex: 30).')
      setTimeout(() => setError(''), 3000)
      return
    }
    const v = num + '%'
    if (quotaLitis.includes(v)) return
    setQuotaLitis(prev => [...prev, v])
    setNewQuotaLitis('')
  }

  function addResponsavel() {
    const v = newResponsavel.trim()
    if (!v || responsaveis.includes(v)) return
    setResponsaveis(prev => [...prev, v])
    setNewResponsavel('')
  }

  function addParceiro() {
    const v = newParceiro.trim()
    if (!v || parceiros.includes(v)) return
    setParceiros(prev => [...prev, v])
    setNewParceiro('')
  }

  async function handleAddArea() {
    const v = newArea.trim()
    if (!v || areas.some(a => a.value.toLowerCase() === v.toLowerCase())) return
    const { error } = await addArea(v)
    if (error) { setError('Erro ao adicionar área: ' + error.message); return }
    setNewArea('')
  }

  return (
    <PageShell
      title="Configurações"
      subtitle="Personalize o Atlas Adv para a identidade visual do seu escritório em apenas 3 minutos. Configure opções, tribunais e responsáveis do seu escritório."
    >
      <div className={styles.layout}>

        {/* ── Feedback ── */}
        {success && <div className={styles.toast + ' ' + styles.toastSuccess}>{success}</div>}
        {error   && <div className={styles.toast + ' ' + styles.toastError}>{error}</div>}

        {/* ── Perfil ── */}
        <Section
          title="Perfil do Advogado"
          subtitle="Suas informações pessoais e profissionais"
        >
          <form onSubmit={handleSaveProfile} className={styles.form}>
            <div className={styles.formGrid}>
              <Field label="Nome completo">
                <input
                  className={styles.input}
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Dr. Elcimar Reis"
                />
              </Field>
              <Field label="Número OAB" hint="Ex: 123456/SP">
                <input
                  className={styles.input}
                  type="text"
                  value={oabNumber}
                  onChange={e => setOabNumber(e.target.value)}
                  placeholder="123456/SP"
                />
              </Field>
              <Field label="E-mail" hint="Gerenciado pelo Google — não editável">
                <input
                  className={styles.input}
                  type="email"
                  value={session?.user?.email ?? ''}
                  readOnly
                  style={{ opacity: 0.55, cursor: 'not-allowed' }}
                />
              </Field>
            </div>
            <div className={styles.formFooter}>
              <button type="submit" className={styles.btnSave} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar perfil'}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Identidade Visual ── */}
        <Section
          title="Identidade Visual"
          subtitle="Cada advogado tem sua própria marca — logo, nome e cor de destaque"
        >
          <HeaderPreview firmName={firmName} accent={accent} />

          <form onSubmit={handleSaveBranding} className={styles.form}>
            <div className={styles.formGrid}>
              <Field label="Nome do escritório" hint="Aparece no cabeçalho de todas as páginas">
                <input
                  className={styles.input}
                  type="text"
                  value={firmName}
                  onChange={e => setFirmName(e.target.value)}
                  placeholder="Reis Advocacia"
                />
              </Field>
              <Field label="Logotipo" hint="PNG, JPG, WebP ou SVG · máx. 2 MB">
                <LogoUpload value={logoUrl} onChange={setLogoUrl} />
              </Field>
            </div>

            <Field label="Cor de destaque" hint="Usada no cabeçalho, botões e elementos ativos">
              <div className={styles.colorPicker}>
                <div className={styles.presetColors}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      className={`${styles.colorSwatch} ${accent === c.hex ? styles.colorSwatchActive : ''}`}
                      style={{ background: c.hex }}
                      title={c.name}
                      onClick={() => setAccent(c.hex)}
                    />
                  ))}
                </div>
                <div className={styles.colorCustom}>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={accent}
                    onChange={e => setAccent(e.target.value)}
                    title="Cor personalizada"
                  />
                  <div className={styles.hexInputWrap}>
                    <span className={styles.hexDot} style={{ background: accent }} />
                    <input
                      type="text"
                      className={styles.colorHexInput}
                      value={accent}
                      maxLength={7}
                      placeholder="#043b61"
                      onChange={e => {
                        const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) setAccent(v)
                        else if (v.length <= 7) setAccent(v)
                      }}
                      onBlur={e => {
                        const v = e.target.value
                        if (!/^#[0-9a-fA-F]{6}$/.test(v)) setAccent(accent)
                      }}
                    />
                  </div>
                  <span className={styles.colorDarkPreview} style={{ background: darken(accent) }}>
                    Variante escura
                  </span>
                </div>
              </div>
            </Field>

            <div className={styles.formFooter}>
              <button type="submit" className={styles.btnSave} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar identidade visual'}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Menu de Navegação ── */}
        <Section
          title="Menu de Navegação"
          subtitle="Escolha como o menu principal aparece no sistema. Alterado imediatamente."
        >
          <div className={styles.navModeGrid}>
            {[
              {
                value: 'sidebar',
                label: 'Lateral Esquerdo',
                sub: 'Recolhe ao afastar o mouse',
                preview: (
                  <div className={styles.navPreview}>
                    <div className={styles.navPreviewSidebar}>
                      <div className={styles.navPreviewDot} /><div className={styles.navPreviewDot} /><div className={styles.navPreviewDot} />
                    </div>
                    <div className={styles.navPreviewContent}>
                      <div className={styles.navPreviewBar} /><div className={styles.navPreviewBar} style={{ width: '60%' }} />
                    </div>
                  </div>
                ),
              },
              {
                value: 'top',
                label: 'Barra Superior',
                sub: 'Estilo abas do Chrome',
                preview: (
                  <div className={styles.navPreview} style={{ flexDirection: 'column' }}>
                    <div className={styles.navPreviewTop}>
                      <div className={styles.navPreviewDot} /><div className={styles.navPreviewDot} /><div className={styles.navPreviewDot} /><div className={styles.navPreviewDot} />
                    </div>
                    <div className={styles.navPreviewContent} style={{ flex: 1 }}>
                      <div className={styles.navPreviewBar} /><div className={styles.navPreviewBar} style={{ width: '70%' }} />
                    </div>
                  </div>
                ),
              },
              {
                value: 'bottom',
                label: 'Dock Inferior',
                sub: 'Reaparece ao aproximar o mouse',
                preview: (
                  <div className={styles.navPreview} style={{ flexDirection: 'column' }}>
                    <div className={styles.navPreviewContent} style={{ flex: 1 }}>
                      <div className={styles.navPreviewBar} /><div className={styles.navPreviewBar} style={{ width: '65%' }} />
                    </div>
                    <div className={styles.navPreviewBottom}>
                      <div className={styles.navPreviewDot} /><div className={styles.navPreviewDot} /><div className={styles.navPreviewDot} /><div className={styles.navPreviewDot} />
                    </div>
                  </div>
                ),
              },
            ].map(({ value, label, sub, preview }) => {
              const active = (prefs.nav_mode ?? 'sidebar') === value
              return (
                <button
                  key={value}
                  type="button"
                  className={`${styles.navModeCard} ${active ? styles.navModeCardActive : ''}`}
                  onClick={() => handlePrefChange('nav_mode', value)}
                >
                  {preview}
                  <span className={styles.navModeLabel}>{label}</span>
                  <span className={styles.navModeSub}>{sub}</span>
                </button>
              )
            })}
          </div>
        </Section>

        {/* ── Preferências ── */}
        <Section
          title="Preferências de Exibição"
          subtitle="Personalize como o conteúdo é apresentado. Salvo localmente neste dispositivo."
        >
          <div className={styles.prefGrid}>

            {/* Density */}
            <div className={styles.prefRow}>
              <div className={styles.prefRowLabel}>
                <span className={styles.prefLabel}>Densidade das listas</span>
                <span className={styles.prefSub}>Controla o espaçamento em tabelas e listas</span>
              </div>
              <div className={styles.prefOptions}>
                {[{ v: 'compacto', l: 'Compacto' }, { v: 'normal', l: 'Normal' }, { v: 'espaçoso', l: 'Espaçoso' }].map(({ v, l }) => (
                  <button key={v} type="button"
                    className={`${styles.prefBtn} ${(prefs.density ?? 'normal') === v ? styles.prefBtnActive : ''}`}
                    onClick={() => handlePrefChange('density', v)}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Task sort */}
            <div className={styles.prefRow}>
              <div className={styles.prefRowLabel}>
                <span className={styles.prefLabel}>Ordenação padrão de tarefas</span>
                <span className={styles.prefSub}>Aplicado ao abrir a página de Tarefas</span>
              </div>
              <div className={styles.prefOptions}>
                {[{ v: 'due_date', l: 'Por vencimento' }, { v: 'priority', l: 'Por prioridade' }].map(({ v, l }) => (
                  <button key={v} type="button"
                    className={`${styles.prefBtn} ${(prefs.task_sort ?? 'due_date') === v ? styles.prefBtnActive : ''}`}
                    onClick={() => handlePrefChange('task_sort', v)}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Dashboard cards */}
            <div className={styles.prefRow}>
              <div className={styles.prefRowLabel}>
                <span className={styles.prefLabel}>Cards do Painel</span>
                <span className={styles.prefSub}>Escolha quais cards aparecem no dashboard</span>
              </div>
              <div className={styles.prefOptions} style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                {[
                  { v: 'show_casos',      l: 'Casos' },
                  { v: 'show_tarefas',    l: 'Tarefas' },
                  { v: 'show_financeiro', l: 'Financeiro' },
                  { v: 'show_atrasadas',  l: 'Atrasadas' },
                ].map(({ v, l }) => {
                  const on = prefs[v] !== false
                  return (
                    <button key={v} type="button"
                      className={`${styles.prefBtn} ${on ? styles.prefBtnActive : ''}`}
                      onClick={() => handlePrefChange(v, !on)}
                    >{on ? '✓ ' : ''}{l}</button>
                  )
                })}
              </div>
            </div>

          </div>
          <div className={styles.formFooter}>
            <button type="button" className={styles.btnReset} onClick={handleResetPrefs}>
              Redefinir preferências
            </button>
            <span className={styles.prefNote}>Preferências salvas localmente neste dispositivo</span>
          </div>
        </Section>

        {/* ── Tipografia ── */}
        <Section
          title="Tipografia"
          subtitle="Escolha as fontes do seu escritório. Alterações aplicadas em tempo real."
        >
          <div className={styles.prefGrid}>

            {/* Custom font upload */}
            <div style={{ marginBottom: '0.5rem' }}>
              <div className={styles.listBlockTitle} style={{ marginBottom: '0.5rem' }}>Sua fonte personalizada</div>
              <FontUpload
                customFont={customFont}
                onFont={f => setCustomFont(f)}
                onRemove={() => {
                  setCustomFont(null)
                  if (fontHeading === 'CustomFont') setFontHeading(null)
                  if (fontBody    === 'CustomFont') setFontBody(null)
                  if (fontMono    === 'CustomFont') setFontMono(null)
                }}
              />
            </div>

            {/* Font scope */}
            <div className={styles.prefRow}>
              <div className={styles.prefRowLabel}>
                <span className={styles.prefLabel}>Aplicar em</span>
                <span className={styles.prefSub}>Todo o sistema ou somente em documentos PDF</span>
              </div>
              <div className={styles.prefOptions}>
                {[{ v: 'all', l: 'Todo o sistema' }, { v: 'pdf_only', l: 'Só em PDF' }].map(({ v, l }) => (
                  <button key={v} type="button"
                    className={`${styles.prefBtn} ${fontScope === v ? styles.prefBtnActive : ''}`}
                    onClick={() => setFontScope(v)}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Heading font */}
            <div className={styles.prefRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span className={styles.prefLabel}>Fonte principal (títulos)</span>
              <div className={styles.prefOptions} style={{ flexWrap: 'wrap' }}>
                {[...HEADING_FONTS, ...(customFont ? [{ family: 'CustomFont', label: customFont.displayName }] : [])].map(f => (
                  <button key={f.label} type="button"
                    className={`${styles.prefBtn} ${fontHeading === f.family ? styles.prefBtnActive : ''}`}
                    style={{ fontFamily: f.family && f.family !== 'CustomFont' ? `'${f.family}', serif` : f.family === 'CustomFont' ? "'CustomFont', serif" : 'inherit' }}
                    onClick={() => setFontHeading(f.family)}
                  >{f.label}</button>
                ))}
              </div>
            </div>

            {/* Body font */}
            <div className={styles.prefRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span className={styles.prefLabel}>Fonte secundária (texto)</span>
              <div className={styles.prefOptions} style={{ flexWrap: 'wrap' }}>
                {[...BODY_FONTS, ...(customFont ? [{ family: 'CustomFont', label: customFont.displayName }] : [])].map(f => (
                  <button key={f.label} type="button"
                    className={`${styles.prefBtn} ${fontBody === f.family ? styles.prefBtnActive : ''}`}
                    style={{ fontFamily: f.family && f.family !== 'CustomFont' ? `'${f.family}', sans-serif` : f.family === 'CustomFont' ? "'CustomFont', sans-serif" : 'inherit' }}
                    onClick={() => setFontBody(f.family)}
                  >{f.label}</button>
                ))}
              </div>
            </div>

            {/* Mono font */}
            <div className={styles.prefRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span className={styles.prefLabel}>Fonte terciária (números, processos)</span>
              <div className={styles.prefOptions} style={{ flexWrap: 'wrap' }}>
                {[...MONO_FONTS, ...(customFont ? [{ family: 'CustomFont', label: customFont.displayName }] : [])].map(f => (
                  <button key={f.label} type="button"
                    className={`${styles.prefBtn} ${fontMono === f.family ? styles.prefBtnActive : ''}`}
                    style={{ fontFamily: f.family && f.family !== 'CustomFont' ? `'${f.family}', monospace` : f.family === 'CustomFont' ? "'CustomFont', monospace" : 'monospace' }}
                    onClick={() => setFontMono(f.family)}
                  >{f.label}</button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ background: 'var(--bg)', border: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem' }}>
              <div style={{ fontFamily: fontHeading && fontHeading !== 'CustomFont' ? `'${fontHeading}', serif` : fontHeading === 'CustomFont' ? "'CustomFont', serif" : 'inherit', fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                Assessoria Jurídica Especializada
              </div>
              <div style={{ fontFamily: fontBody && fontBody !== 'CustomFont' ? `'${fontBody}', sans-serif` : fontBody === 'CustomFont' ? "'CustomFont', sans-serif" : 'inherit', fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: '0.4rem' }}>
                Atendemos famílias e empresas com comprometimento, ética e excelência jurídica.
              </div>
              <div style={{ fontFamily: fontMono && fontMono !== 'CustomFont' ? `'${fontMono}', monospace` : fontMono === 'CustomFont' ? "'CustomFont', monospace" : 'monospace', fontSize: '0.7rem', color: 'var(--text-3)', borderTop: 'var(--border)', paddingTop: '0.35rem' }}>
                Proc. nº 1234.567.2024.8.00
              </div>
            </div>

          </div>

          <div className={styles.formFooter}>
            <button type="button" className={styles.btnSave} onClick={handleSaveFonts} disabled={fontSaving}>
              {fontSaving ? 'Salvando…' : 'Salvar tipografia'}
            </button>
          </div>
        </Section>

        {/* ── Listas personalizáveis ── */}
        <Section
          title="Listas Personalizáveis"
          subtitle="Configure as opções disponíveis para todo o seu escritório. Essas opções aparecem nas propostas de honorários e no cadastramento de casos e clientes."
        >
          <div className={styles.listEditor}>

            {/* Tipos de serviço */}
            <div className={styles.listBlock}>
              <span className={styles.listBlockTitle}>Tipos de serviço (Propostas)</span>
              <div className={styles.listItems}>
                {serviceTypes.map(item => (
                  <span key={item} className={styles.listTag}>
                    {item}
                    <button
                      type="button"
                      className={styles.listTagDel}
                      onClick={() => setServiceTypes(prev => prev.filter(i => i !== item))}
                      title="Remover"
                    >×</button>
                  </span>
                ))}
              </div>
              <div className={styles.listAddRow}>
                <input
                  className={styles.listInput}
                  value={newServiceType}
                  onChange={e => setNewServiceType(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addServiceType())}
                  placeholder="Novo tipo de serviço…"
                />
                <button type="button" className={styles.btnListAdd} onClick={addServiceType}>
                  Adicionar
                </button>
              </div>
            </div>

            {/* Percentuais de quota-litis */}
            <div className={styles.listBlock}>
              <span className={styles.listBlockTitle}>Percentuais de Quota-Litis</span>
              <div className={styles.listItems}>
                {quotaLitis.map(item => (
                  <span key={item} className={styles.listTag}>
                    {item}
                    <button
                      type="button"
                      className={styles.listTagDel}
                      onClick={() => setQuotaLitis(prev => prev.filter(i => i !== item))}
                      title="Remover"
                    >×</button>
                  </span>
                ))}
              </div>
              <div className={styles.listAddRow}>
                <input
                  className={styles.listInput}
                  value={newQuotaLitis}
                  onChange={e => setNewQuotaLitis(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQuotaLitis())}
                  placeholder="Ex: 40%"
                />
                <button type="button" className={styles.btnListAdd} onClick={addQuotaLitis}>
                  Adicionar
                </button>
              </div>
            </div>

            {/* Tribunais */}
            <div className={styles.listBlock}>
              <span className={styles.listBlockTitle}>Tribunais — ative os grupos que seu escritório utiliza</span>
              <div className={styles.tribunaisGroups}>
                {TRIBUNAIS_MASTER.map(group => {
                  const active = tribunaisActiveGroups.includes(group.key)
                  return (
                    <button
                      key={group.key}
                      type="button"
                      className={`${styles.tribunaisGroupCard} ${active ? styles.tribunaisGroupCardActive : ''}`}
                      onClick={() =>
                        setTribunaisActiveGroups(prev =>
                          active ? prev.filter(k => k !== group.key) : [...prev, group.key]
                        )
                      }
                    >
                      <div className={styles.tribunaisGroupTop}>
                        <span className={styles.tribunaisGroupAbbr}>{group.abbr}</span>
                        <span className={styles.tribunaisGroupCount}>{group.items.length}</span>
                      </div>
                      <span className={styles.tribunaisGroupLabel}>{group.label}</span>
                      <span className={styles.tribunaisGroupStatus}>
                        {active ? '✓ Ativo' : 'Inativo'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Áreas de Atuação */}
            <div className={styles.listBlock}>
              <span className={styles.listBlockTitle}>Áreas de Atuação (Casos)</span>
              <div className={styles.listItems}>
                {areas.length === 0
                  ? <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Nenhuma área cadastrada ainda.</span>
                  : areas.map(item => (
                    <span key={item.id} className={styles.listTag}>
                      {item.value}
                      <button
                        type="button"
                        className={styles.listTagDel}
                        onClick={() => deleteArea(item.id)}
                        title="Remover"
                      >×</button>
                    </span>
                  ))
                }
              </div>
              <div className={styles.listAddRow}>
                <input
                  className={styles.listInput}
                  value={newArea}
                  onChange={e => setNewArea(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddArea())}
                  placeholder="Ex: Direito Digital…"
                />
                <button type="button" className={styles.btnListAdd} onClick={handleAddArea}>
                  Adicionar
                </button>
              </div>
            </div>

            {/* Responsáveis */}
            <div className={styles.listBlock}>
              <span className={styles.listBlockTitle}>Responsáveis (Advogados / Estagiários)</span>
              <div className={styles.listItems}>
                {responsaveis.length === 0
                  ? <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Nenhum cadastrado ainda.</span>
                  : responsaveis.map(item => (
                    <span key={item} className={styles.listTag}>
                      {item}
                      <button
                        type="button"
                        className={styles.listTagDel}
                        onClick={() => setResponsaveis(prev => prev.filter(i => i !== item))}
                        title="Remover"
                      >×</button>
                    </span>
                  ))
                }
              </div>
              <div className={styles.listAddRow}>
                <input
                  className={styles.listInput}
                  value={newResponsavel}
                  onChange={e => setNewResponsavel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addResponsavel())}
                  placeholder="Ex: Dr. Elcimar Reis"
                />
                <button type="button" className={styles.btnListAdd} onClick={addResponsavel}>
                  Adicionar
                </button>
              </div>
            </div>

            {/* Parceiros */}
            <div className={styles.listBlock}>
              <span className={styles.listBlockTitle}>Parceiros</span>
              <div className={styles.listItems}>
                {parceiros.length === 0
                  ? <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Nenhum parceiro cadastrado ainda.</span>
                  : parceiros.map(item => (
                    <span key={item} className={styles.listTag}>
                      {item}
                      <button
                        type="button"
                        className={styles.listTagDel}
                        onClick={() => setParceiros(prev => prev.filter(i => i !== item))}
                        title="Remover"
                      >×</button>
                    </span>
                  ))
                }
              </div>
              <div className={styles.listAddRow}>
                <input
                  className={styles.listInput}
                  value={newParceiro}
                  onChange={e => setNewParceiro(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addParceiro())}
                  placeholder="Ex: Dr. João Parceiro"
                />
                <button type="button" className={styles.btnListAdd} onClick={addParceiro}>
                  Adicionar
                </button>
              </div>
            </div>

          </div>
          <div className={styles.formFooter} style={{ marginTop: '1.25rem' }}>
            <button type="button" className={styles.btnSave} onClick={handleSaveLists} disabled={listSaving}>
              {listSaving ? 'Salvando…' : 'Salvar listas'}
            </button>
          </div>
        </Section>

        {/* ── Membros da Equipe ── */}
        {!isTeamMember && (
          <Section
            title="Membros da Equipe"
            subtitle="Convide advogados e estagiários para acessar o escritório com suas próprias credenciais. Estagiários não têm acesso ao módulo Financeiro nem a Clientes."
          >
            <TeamMembersSection lawyerId={lawyer?.id} session={session} responsaveis={responsaveis} />
          </Section>
        )}

        {/* ── Conta ── */}
        <Section
          title="Conta"
          subtitle="Informações da sua conta no Atlas Adv"
        >
          <div className={styles.accountInfo}>
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Provedor de autenticação</span>
              <span className={styles.accountValue}>Google OAuth</span>
            </div>
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>ID do usuário</span>
              <code className={styles.accountCode}>{session?.user?.id}</code>
            </div>
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Último acesso</span>
              <span className={styles.accountValue}>
                {session?.user?.last_sign_in_at
                  ? new Date(session.user.last_sign_in_at).toLocaleString('pt-BR')
                  : '—'}
              </span>
            </div>
          </div>
          <div className={styles.formFooter}>
            <button
              type="button"
              className={styles.btnDanger}
              onClick={() => supabase.auth.signOut()}
            >
              Encerrar sessão
            </button>
          </div>
        </Section>

        {/* ── Suporte ── */}
        <Section
          title="Suporte"
          subtitle="Abra chamados, acompanhe respostas e obtenha ajuda da nossa equipe."
        >
          <SuporteSection />
        </Section>

        {/* ── Desenvolvimento / Teste ── */}
        <Section
          title="Desenvolvimento"
          subtitle="Ferramentas para teste — não aparecem em produção para outros usuários"
        >
          <div className={styles.devBox}>
            <div className={styles.devInfo}>
              <span className={styles.devLabel}>Simular novo usuário</span>
              <span className={styles.devDesc}>
                Redefine o flag de onboarding para <code>false</code> no banco de dados.
                Na próxima renderização, o wizard de boas-vindas será exibido novamente.
              </span>
            </div>
            <button
              type="button"
              className={styles.btnDevReset}
              onClick={async () => {
                const ok = window.confirm('Redefinir onboarding? O wizard vai aparecer agora.')
                if (!ok) return
                const { error } = await supabase
                  .from('lawyers')
                  .update({ onboarding_completed: false })
                  .eq('id', session.user.id)
                if (error) { alert('Erro: ' + error.message); return }
                await refreshLawyer()
              }}
            >
              ↺ Reiniciar onboarding
            </button>
          </div>
        </Section>

      </div>
    </PageShell>
  )
}
