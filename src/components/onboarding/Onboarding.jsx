import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import styles from './Onboarding.module.css'

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
const TOTAL_STEPS = 4

export default function Onboarding() {
  const { lawyer, session, refreshLawyer } = useAuth()

  const [step, setStep]         = useState(0)
  const [direction, setDirection] = useState('forward') // for animation
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  /* Form state — pre-filled from lawyer row */
  const [fullName,  setFullName]  = useState(lawyer?.full_name  ?? '')
  const [oabNumber, setOabNumber] = useState(lawyer?.oab_number ?? '')
  const [firmName,  setFirmName]  = useState(
    lawyer?.firm_name && lawyer.firm_name !== 'Atlas Lex' ? lawyer.firm_name : ''
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
      <h2 className={styles.stepTitle}>Bem-vindo ao Atlas Lex!</h2>
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
            Logo <span className={styles.optional}>(URL de imagem pública — opcional)</span>
          </label>
          <input
            className={styles.input}
            type="url"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://seu-site.com/logo.svg"
          />
          {logoUrl && (
            <div className={styles.logoPreview}>
              <img src={logoUrl} alt="logo preview"
                onError={e => { e.target.style.display = 'none' }}
              />
            </div>
          )}
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

    /* Step 3 — Pronto */
    <div key="step3" className={styles.stepContent}>
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
          <span className={styles.summaryVal}>{logoUrl || 'Não configurado (usaremos as iniciais)'}</span>
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

      <div className={styles.wordmark}>ATLAS LEX</div>

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
              {saving ? 'Salvando…' : '🚀 Entrar no Atlas Lex'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
