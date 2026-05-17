import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { loadPreferences, savePreferences, resetPreferences } from '@/hooks/usePreferences'
import PageShell from '@/components/ui/PageShell'
import SuporteSection from '@/components/support/SuporteSection'
import LogoUpload from '@/components/ui/LogoUpload'
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

const DEFAULT_TRIBUNAIS = [
  'Vara Cível','Vara do Trabalho','Vara de Família e Sucessões',
  'Juizado Especial Cível','Juizado Especial Criminal',
  'Vara Criminal','Vara Federal','Tribunal de Justiça',
  'Tribunal Regional do Trabalho','Tribunal Regional Federal',
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

/* ── Main ───────────────────────────────────────────────────────── */
export default function Settings() {
  const { lawyer, session, refreshLawyer } = useAuth()

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
  const [serviceTypes,    setServiceTypes]    = useState(DEFAULT_SERVICE_TYPES)
  const [quotaLitis,      setQuotaLitis]      = useState(DEFAULT_QUOTA_LITIS)
  const [tribunais,       setTribunais]       = useState(DEFAULT_TRIBUNAIS)
  const [responsaveis,    setResponsaveis]    = useState([])
  const [newServiceType,  setNewServiceType]  = useState('')
  const [newQuotaLitis,   setNewQuotaLitis]   = useState('')
  const [newTribunal,     setNewTribunal]     = useState('')
  const [newResponsavel,  setNewResponsavel]  = useState('')
  const [listSaving,      setListSaving]      = useState(false)

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
    setPrefs(loadPreferences(lawyer.id))
    const prefs = lawyer.preferences ?? {}
    if (prefs.service_types?.length)       setServiceTypes(prefs.service_types)
    if (prefs.quota_litis_options?.length) setQuotaLitis(prefs.quota_litis_options)
    if (prefs.tribunais?.length)           setTribunais(prefs.tribunais)
    if (prefs.responsaveis?.length)        setResponsaveis(prefs.responsaveis)
  }, [lawyer])

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
    savePreferences(lawyer.id, { [key]: value })
  }

  function handleResetPrefs() {
    resetPreferences(lawyer?.id)
    setPrefs(loadPreferences(lawyer?.id))
    setSuccess('Preferências redefinidas para o padrão!')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleSaveLists() {
    setListSaving(true); setError(''); setSuccess('')
    const { error } = await supabase
      .from('lawyers')
      .update({ preferences: {
        service_types:       serviceTypes,
        quota_litis_options: quotaLitis,
        tribunais,
        responsaveis,
      }})
      .eq('id', session.user.id)
    setListSaving(false)
    if (error) { setError('Erro ao salvar listas: ' + error.message); return }
    await refreshLawyer()
    setSuccess('Listas atualizadas com sucesso!')
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

  function addTribunal() {
    const v = newTribunal.trim()
    if (!v || tribunais.includes(v)) return
    setTribunais(prev => [...prev, v])
    setNewTribunal('')
  }

  function addResponsavel() {
    const v = newResponsavel.trim()
    if (!v || responsaveis.includes(v)) return
    setResponsaveis(prev => [...prev, v])
    setNewResponsavel('')
  }

  return (
    <PageShell
      title="Configurações"
      subtitle="Personalize o Atlas Adv para o seu escritório"
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

        {/* ── Listas personalizáveis ── */}
        <Section
          title="Listas Personalizáveis"
          subtitle="Configure as opções disponíveis em Propostas e Honorários. Salvas na nuvem para todos os seus dispositivos."
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
              <span className={styles.listBlockTitle}>Tribunais e Varas (Processos)</span>
              <div className={styles.listItems}>
                {tribunais.map(item => (
                  <span key={item} className={styles.listTag}>
                    {item}
                    <button
                      type="button"
                      className={styles.listTagDel}
                      onClick={() => setTribunais(prev => prev.filter(i => i !== item))}
                      title="Remover"
                    >×</button>
                  </span>
                ))}
              </div>
              <div className={styles.listAddRow}>
                <input
                  className={styles.listInput}
                  value={newTribunal}
                  onChange={e => setNewTribunal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTribunal())}
                  placeholder="Ex: Vara de Execuções Penais"
                />
                <button type="button" className={styles.btnListAdd} onClick={addTribunal}>
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

          </div>
          <div className={styles.formFooter} style={{ marginTop: '1.25rem' }}>
            <button type="button" className={styles.btnSave} onClick={handleSaveLists} disabled={listSaving}>
              {listSaving ? 'Salvando…' : 'Salvar listas'}
            </button>
          </div>
        </Section>

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
