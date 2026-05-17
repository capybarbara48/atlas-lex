import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { loadGoogleFont, applyFonts } from '@/lib/fonts'
import LogoUpload from '@/components/ui/LogoUpload'
import styles from './Onboarding.module.css'

/* ── Font options ─────────────────────────────────────────────────── */
const HEADING_FONTS = [
  { family: null,                label: 'Padrão Atlas',      sample: 'Aa' },
  { family: 'Playfair Display',  label: 'Playfair Display',  sample: 'Aa' },
  { family: 'Merriweather',      label: 'Merriweather',      sample: 'Aa' },
  { family: 'EB Garamond',       label: 'EB Garamond',       sample: 'Aa' },
  { family: 'Lora',              label: 'Lora',              sample: 'Aa' },
  { family: 'Raleway',           label: 'Raleway',           sample: 'Aa' },
]

const BODY_FONTS = [
  { family: null,            label: 'Padrão (sistema)', sample: 'Aa' },
  { family: 'Inter',         label: 'Inter',            sample: 'Aa' },
  { family: 'Poppins',       label: 'Poppins',          sample: 'Aa' },
  { family: 'Lato',          label: 'Lato',             sample: 'Aa' },
  { family: 'Source Sans 3', label: 'Source Sans 3',    sample: 'Aa' },
]

const MONO_FONTS = [
  { family: null,             label: 'Padrão (mono)'  },
  { family: 'IBM Plex Mono',  label: 'IBM Plex Mono'  },
  { family: 'JetBrains Mono', label: 'JetBrains Mono' },
]

const ALL_FONT_FAMILIES = [
  ...HEADING_FONTS, ...BODY_FONTS, ...MONO_FONTS,
].map(f => f.family).filter(Boolean)

/* ── Preset brand colors ─────────────────────────────────────────── */
const PRESETS = [
  { hex: '#043b61', name: 'Navy Clássico' },
  { hex: '#1a1a2e', name: 'Azul Noturno' },
  { hex: '#0f3460', name: 'Azul Profundo' },
  { hex: '#1b4332', name: 'Verde Floresta' },
  { hex: '#370617', name: 'Bordô' },
  { hex: '#212529', name: 'Grafite' },
  { hex: '#5c4033', name: 'Marrom Executivo' },
  { hex: '#4a0e8f', name: 'Roxo Real' },
]

function darken(hex, amount = 0.18) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - Math.round(255 * amount))
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount))
  const b = Math.max(0, (n & 0xff) - Math.round(255 * amount))
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

/* ── Step dots ───────────────────────────────────────────────────── */
function StepDots({ current, total }) {
  return (
    <div className={styles.dots}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`${styles.dot} ${i === current ? styles.dotActive : ''} ${i < current ? styles.dotDone : ''}`}
        />
      ))}
    </div>
  )
}

/* ── Mini header preview (Step 3) ───────────────────────────────── */
function HeaderPreview({ firmName, accent, initials }) {
  return (
    <div className={styles.headerPreview} style={{ background: accent }}>
      <div className={styles.hpLeft}>
        <div className={styles.hpLogoMark}>
          {(firmName || 'AL').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <span className={styles.hpFirmName}>{firmName || 'Seu Escritório'}</span>
      </div>
      <div className={styles.hpClock}>14:35:00</div>
      <div className={styles.hpRight}>
        <div className={styles.hpAvatar}>{initials}</div>
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────── */
const TOTAL_STEPS = 5
const FONT_STEP   = 3

export default function Onboarding() {
  const { lawyer, session, refreshLawyer } = useAuth()

  const [step, setStep]         = useState(0)
  const [direction, setDirection] = useState('forward') // for animation
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  /* Font state */
  const [fontHeading, setFontHeading] = useState(null)
  const [fontBody,    setFontBody]    = useState(null)
  const [fontMono,    setFontMono]    = useState(null)
  const [fontScope,   setFontScope]   = useState('all')

  /* Form state — pre-filled from lawyer row */
  const [fullName,  setFullName]  = useState(lawyer?.full_name  ?? '')
  const [oabNumber, setOabNumber] = useState(lawyer?.oab_number ?? '')
  const [firmName,  setFirmName]  = useState(
    lawyer?.firm_name && lawyer.firm_name !== 'Atlas Adv' ? lawyer.firm_name : ''
  )
  const [logoUrl,   setLogoUrl]   = useState(lawyer?.logo_url   ?? '')
  const [accent,    setAccent]    = useState(lawyer?.theme_accent ?? '#043b61')

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  /* Live preview: apply accent to CSS vars as user picks colors */
  useEffect(() => {
    document.documentElement.style.setProperty('--accent',            accent)
    document.documentElement.style.setProperty('--accent-dark',       darken(accent))
    document.documentElement.style.setProperty('--color-accent',      accent)
    document.documentElement.style.setProperty('--color-accent-dark', darken(accent))
  }, [accent])

  /* Preload all fonts when reaching the font step */
  useEffect(() => {
    if (step === FONT_STEP) ALL_FONT_FAMILIES.forEach(loadGoogleFont)
  }, [step])

  /* Apply font choices live (only when scope = all) */
  useEffect(() => {
    applyFonts({ font_heading: fontHeading, font_body: fontBody, font_mono: fontMono, font_scope: fontScope })
  }, [fontHeading, fontBody, fontMono, fontScope])

  function goNext() {
    setDirection('forward')
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
  }

  function goBack() {
    setDirection('back')
    setStep(s => Math.max(s - 1, 0))
  }

  function canAdvance() {
    if (step === 0) return fullName.trim().length > 0
    if (step === 1) return firmName.trim().length > 0
    return true
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('lawyers')
      .upsert({
        id:                   session.user.id,
        full_name:            fullName.trim(),
        oab_number:           oabNumber.trim() || null,
        firm_name:            firmName.trim(),
        logo_url:             logoUrl.trim() || null,
        theme_accent:         accent,
        theme_accent_dark:    darken(accent),
        onboarding_completed: true,
        preferences: {
          font_heading: fontHeading ?? null,
          font_body:    fontBody    ?? null,
          font_mono:    fontMono    ?? null,
          font_scope:   fontScope,
        },
      }, { onConflict: 'id' })

    setSaving(false)
    if (error) {
      setError('Erro ao salvar: ' + error.message)
      return
    }
    await refreshLawyer()
    // App.jsx will re-render with onboarding_completed = true → normal app
  }

  /* ── Step content ── */
  const steps = [

    /* Step 0 — Boas-vindas */
    <div key="step0" className={styles.stepContent}>
      <div className={styles.stepIcon}>⚖</div>
      <h2 className={styles.stepTitle}>Bem-vindo ao Atlas Adv!</h2>
      <p className={styles.stepDesc}>
        Vamos configurar seu espaço em <strong>3 passos rápidos</strong>.
        Cada advogado tem o seu próprio ambiente — com sua marca, sua cor e seus dados.
      </p>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label}>Seu nome completo</label>
          <input
            className={styles.input}
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Dr. Elcimar Reis"
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Número da OAB <span className={styles.optional}>(opcional)</span></label>
          <input
            className={styles.input}
            type="text"
            value={oabNumber}
            onChange={e => setOabNumber(e.target.value)}
            placeholder="123456/SP"
          />
        </div>
        <div className={styles.emailRow}>
          <span className={styles.emailIcon}>✓</span>
          <span className={styles.emailText}>
            Conta Google verificada: <strong>{session?.user?.email}</strong>
          </span>
        </div>
      </div>
    </div>,

    /* Step 1 — Escritório */
    <div key="step1" className={styles.stepContent}>
      <div className={styles.stepIcon}>🏛</div>
      <h2 className={styles.stepTitle}>Seu Escritório</h2>
      <p className={styles.stepDesc}>
        Este nome aparecerá no cabeçalho de todas as páginas e será visível
        apenas para você.
      </p>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label}>Nome do escritório</label>
          <input
            className={`${styles.input} ${styles.inputLarge}`}
            type="text"
            value={firmName}
            onChange={e => setFirmName(e.target.value)}
            placeholder="Reis Advocacia"
            autoFocus
          />
          {firmName && (
            <div className={styles.nameFamilyBlack}>{firmName.toUpperCase()}</div>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>
            Logo <span className={styles.optional}>(opcional)</span>
          </label>
          <LogoUpload value={logoUrl} onChange={setLogoUrl} />
        </div>
      </div>
    </div>,

    /* Step 2 — Cor */
    <div key="step2" className={styles.stepContent}>
      <div className={styles.stepIcon} style={{ background: accent + '20', color: accent }}>🎨</div>
      <h2 className={styles.stepTitle}>Identidade Visual</h2>
      <p className={styles.stepDesc}>
        Escolha a cor que representa seu escritório. Ela aparece no cabeçalho,
        botões e elementos de destaque.
      </p>

      <HeaderPreview firmName={firmName} accent={accent} initials={initials} />

      <div className={styles.colorSection}>
        <div className={styles.presets}>
          {PRESETS.map(c => (
            <button
              key={c.hex}
              type="button"
              className={`${styles.swatch} ${accent === c.hex ? styles.swatchActive : ''}`}
              style={{ background: c.hex }}
              title={c.name}
              onClick={() => setAccent(c.hex)}
            />
          ))}
        </div>
        <div className={styles.customColor}>
          <input
            type="color"
            className={styles.colorInput}
            value={accent}
            onChange={e => setAccent(e.target.value)}
            title="Cor personalizada"
          />
          <span className={styles.colorHex}>{accent}</span>
          <span className={styles.colorCustomLabel}>ou escolha uma cor personalizada</span>
        </div>
      </div>
    </div>,

    /* Step 3 — Fontes */
    <div key="step3" className={styles.stepContent}>
      <div className={styles.stepIcon}>🔤</div>
      <h2 className={styles.stepTitle}>Tipografia</h2>
      <p className={styles.stepDesc}>
        Escolha as fontes que representam seu escritório. Você pode alterá-las a qualquer momento em Configurações.
      </p>

      {/* Scope toggle */}
      <div className={styles.fontScopeRow}>
        <span className={styles.fontScopeLabel}>Aplicar em:</span>
        <div className={styles.fontScopeBtns}>
          {[
            { v: 'all',      l: 'Todo o sistema' },
            { v: 'pdf_only', l: 'Só em PDF / documentos' },
          ].map(({ v, l }) => (
            <button key={v} type="button"
              className={`${styles.fontScopeBtn} ${fontScope === v ? styles.fontScopeBtnActive : ''}`}
              onClick={() => setFontScope(v)}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Heading font */}
      <div className={styles.fontSection}>
        <span className={styles.fontSectionLabel}>Fonte principal (títulos)</span>
        <div className={styles.fontGrid}>
          {HEADING_FONTS.map(f => (
            <button key={f.label} type="button"
              className={`${styles.fontOption} ${fontHeading === f.family ? styles.fontOptionActive : ''}`}
              style={{ fontFamily: f.family ? `'${f.family}', serif` : 'inherit' }}
              onClick={() => setFontHeading(f.family)}
            >
              <span className={styles.fontSample}>Aa</span>
              <span className={styles.fontOptionLabel}>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body font */}
      <div className={styles.fontSection}>
        <span className={styles.fontSectionLabel}>Fonte secundária (texto)</span>
        <div className={styles.fontGrid}>
          {BODY_FONTS.map(f => (
            <button key={f.label} type="button"
              className={`${styles.fontOption} ${fontBody === f.family ? styles.fontOptionActive : ''}`}
              style={{ fontFamily: f.family ? `'${f.family}', sans-serif` : 'inherit' }}
              onClick={() => setFontBody(f.family)}
            >
              <span className={styles.fontSample}>Aa</span>
              <span className={styles.fontOptionLabel}>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mono font */}
      <div className={styles.fontSection}>
        <span className={styles.fontSectionLabel}>Fonte terciária (números, processos)</span>
        <div className={styles.fontGrid}>
          {MONO_FONTS.map(f => (
            <button key={f.label} type="button"
              className={`${styles.fontOption} ${fontMono === f.family ? styles.fontOptionActive : ''}`}
              style={{ fontFamily: f.family ? `'${f.family}', monospace` : 'monospace' }}
              onClick={() => setFontMono(f.family)}
            >
              <span className={styles.fontSample}>01</span>
              <span className={styles.fontOptionLabel}>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className={styles.fontPreview}>
        <div className={styles.fontPreviewHeading}
          style={{ fontFamily: fontHeading ? `'${fontHeading}', serif` : 'inherit' }}>
          Assessoria Jurídica Especializada
        </div>
        <div className={styles.fontPreviewBody}
          style={{ fontFamily: fontBody ? `'${fontBody}', sans-serif` : 'inherit' }}>
          Atendemos famílias e empresas com comprometimento, ética e excelência. Cada caso é tratado com dedicação e rigor técnico.
        </div>
        <div className={styles.fontPreviewMono}
          style={{ fontFamily: fontMono ? `'${fontMono}', monospace` : 'monospace' }}>
          Proc. nº 1234.567.2024.8.00
        </div>
      </div>
    </div>,

    /* Step 4 — Pronto */
    <div key="step4" className={styles.stepContent}>
      <div className={styles.checkmark}>✓</div>
      <h2 className={styles.stepTitle}>Tudo pronto, {fullName.split(' ')[0] || 'Advogado'}!</h2>
      <p className={styles.stepDesc}>
        Seu ambiente está configurado. Aqui está um resumo:
      </p>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>Advogado</span>
          <span className={styles.summaryVal}>{fullName}{oabNumber ? ` · OAB ${oabNumber}` : ''}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>Escritório</span>
          <span className={styles.summaryVal}>{firmName}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>Cor da marca</span>
          <span className={styles.summaryVal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={styles.colorDot} style={{ background: accent }} />
            {accent}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>Logo</span>
          <span className={styles.summaryVal}>{logoUrl ? 'Configurado ✓' : 'Não configurado (usaremos as iniciais)'}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>Fontes</span>
          <span className={styles.summaryVal}>
            {fontHeading || 'Padrão'} · {fontBody || 'Padrão'} · {fontMono || 'Mono padrão'}
            {fontScope === 'pdf_only' && <span style={{ color: 'var(--text-3)', fontSize: '0.75em' }}> (só PDF)</span>}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>Conta</span>
          <span className={styles.summaryVal}>{session?.user?.email}</span>
        </div>
      </div>

      <p className={styles.editNote}>
        Você pode alterar qualquer configuração a qualquer momento em <strong>Configurações</strong>.
      </p>

      {error && <div className={styles.errorMsg}>{error}</div>}
    </div>,
  ]

  return (
    <div className={styles.overlay}>
      {/* Ambient glow (same as body::before in global.css) */}
      <div className={styles.glow} />

      <div className={styles.wordmark}>ATLAS ADV</div>

      <div className={styles.card}>
        {/* Top accent line */}
        <div className={styles.cardAccent} style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

        {/* Step dots */}
        <StepDots current={step} total={TOTAL_STEPS} />

        {/* Step label */}
        <div className={styles.stepLabel}>
          Passo {step + 1} de {TOTAL_STEPS}
        </div>

        {/* Content */}
        <div className={`${styles.contentWrap} ${direction === 'forward' ? styles.slideIn : styles.slideInBack}`}
          key={step}>
          {steps[step]}
        </div>

        {/* Navigation */}
        <div className={styles.nav}>
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <button className={styles.btnBack} onClick={goBack}>
              ← Voltar
            </button>
          )}
          {step === TOTAL_STEPS - 1 && (
            <button className={styles.btnBack} onClick={goBack}>
              ← Voltar
            </button>
          )}

          <div className={styles.navSpacer} />

          {step < TOTAL_STEPS - 1 && (
            <button
              className={styles.btnNext}
              style={{ background: accent }}
              onClick={goNext}
              disabled={!canAdvance()}
            >
              {step === 0 ? 'Começar →' : 'Próximo →'}
            </button>
          )}

          {step === TOTAL_STEPS - 1 && (
            <button
              className={styles.btnFinish}
              style={{ background: accent }}
              onClick={handleFinish}
              disabled={saving}
            >
              {saving ? 'Salvando…' : '🚀 Entrar no Atlas Adv'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
