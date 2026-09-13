import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { loadGoogleFont, applyFonts } from '@/lib/fonts'
import LogoUpload from '@/components/ui/LogoUpload'
import FontUpload from '@/components/ui/FontUpload'
import styles from './Onboarding.module.css'

/* ── Font options ─────────────────────────────────────────────────── */
/* Real font family names (Playfair Display, Inter, …) are proper nouns and
   are never translated — only the "default" entries (family: null) get a
   translation key, resolved at render time via labelKey. */
const HEADING_FONTS = [
  { family: null,                labelKey: 'onboarding.fonts.headingDefault', sample: 'Aa' },
  { family: 'Playfair Display',  label: 'Playfair Display',  sample: 'Aa' },
  { family: 'Merriweather',      label: 'Merriweather',      sample: 'Aa' },
  { family: 'EB Garamond',       label: 'EB Garamond',       sample: 'Aa' },
  { family: 'Lora',              label: 'Lora',              sample: 'Aa' },
  { family: 'Raleway',           label: 'Raleway',           sample: 'Aa' },
]

const BODY_FONTS = [
  { family: null,            labelKey: 'onboarding.fonts.bodyDefault', sample: 'Aa' },
  { family: 'Inter',         label: 'Inter',            sample: 'Aa' },
  { family: 'Poppins',       label: 'Poppins',          sample: 'Aa' },
  { family: 'Lato',          label: 'Lato',             sample: 'Aa' },
  { family: 'Source Sans 3', label: 'Source Sans 3',    sample: 'Aa' },
]

const MONO_FONTS = [
  { family: null,             labelKey: 'onboarding.fonts.monoDefault' },
  { family: 'IBM Plex Mono',  label: 'IBM Plex Mono'  },
  { family: 'JetBrains Mono', label: 'JetBrains Mono' },
]

const ALL_FONT_FAMILIES = [
  ...HEADING_FONTS, ...BODY_FONTS, ...MONO_FONTS,
].map(f => f.family).filter(Boolean)

/* ── Preset brand colors ─────────────────────────────────────────── */
const PRESETS = [
  { hex: '#043b61', nameKey: 'onboarding.presets.navyClassic' },
  { hex: '#1a1a2e', nameKey: 'onboarding.presets.midnightBlue' },
  { hex: '#0f3460', nameKey: 'onboarding.presets.deepBlue' },
  { hex: '#1b4332', nameKey: 'onboarding.presets.forestGreen' },
  { hex: '#370617', nameKey: 'onboarding.presets.burgundy' },
  { hex: '#212529', nameKey: 'onboarding.presets.graphite' },
  { hex: '#5c4033', nameKey: 'onboarding.presets.executiveBrown' },
  { hex: '#4a0e8f', nameKey: 'onboarding.presets.royalPurple' },
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
  const { t } = useTranslation()
  return (
    <div className={styles.headerPreview} style={{ background: accent }}>
      <div className={styles.hpLeft}>
        <div className={styles.hpLogoMark}>
          {(firmName || 'AL').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <span className={styles.hpFirmName}>{firmName || t('onboarding.headerPreview.defaultFirmName')}</span>
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
  const { t } = useTranslation()
  const { lawyer, session, refreshLawyer } = useAuth()

  const [step, setStep]         = useState(0)
  const [direction, setDirection] = useState('forward') // for animation
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  /* Font state */
  const [fontHeading,  setFontHeading]  = useState(null)
  const [fontBody,     setFontBody]     = useState(null)
  const [fontMono,     setFontMono]     = useState(null)
  const [fontScope,    setFontScope]    = useState('all')
  const [customFont,   setCustomFont]   = useState(null) // { displayName, url }

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
    applyFonts({ font_heading: fontHeading, font_body: fontBody, font_mono: fontMono, font_scope: fontScope, custom_font_url: customFont?.url })
  }, [fontHeading, fontBody, fontMono, fontScope, customFont])

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
          font_heading:       fontHeading          ?? null,
          font_body:          fontBody             ?? null,
          font_mono:          fontMono             ?? null,
          font_scope:         fontScope,
          custom_font_url:    customFont?.url      ?? null,
          custom_font_name:   customFont?.displayName ?? null,
        },
      }, { onConflict: 'id' })

    setSaving(false)
    if (error) {
      setError(t('onboarding.step4.saveError', { message: error.message }))
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
      <h2 className={styles.stepTitle}>{t('onboarding.step0.title')}</h2>
      <p className={styles.stepDesc}>
        {t('onboarding.step0.descPre')} <strong>{t('onboarding.step0.descBold')}</strong>
        {t('onboarding.step0.descPost')}
      </p>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label}>{t('onboarding.step0.fullNameLabel')}</label>
          <input
            className={styles.input}
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder={t('onboarding.step0.fullNamePlaceholder')}
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('onboarding.step0.oabLabel')} <span className={styles.optional}>({t('common.optional')})</span></label>
          <input
            className={styles.input}
            type="text"
            value={oabNumber}
            onChange={e => setOabNumber(e.target.value)}
            placeholder={t('onboarding.step0.oabPlaceholder')}
          />
        </div>
        <div className={styles.emailRow}>
          <span className={styles.emailIcon}>✓</span>
          <span className={styles.emailText}>
            {t('onboarding.step0.verifiedAccount')} <strong>{session?.user?.email}</strong>
          </span>
        </div>
      </div>
    </div>,

    /* Step 1 — Escritório */
    <div key="step1" className={styles.stepContent}>
      <div className={styles.stepIcon}>🏛</div>
      <h2 className={styles.stepTitle}>{t('onboarding.step1.title')}</h2>
      <p className={styles.stepDesc}>
        {t('onboarding.step1.desc')}
      </p>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label}>{t('onboarding.step1.firmNameLabel')}</label>
          <input
            className={`${styles.input} ${styles.inputLarge}`}
            type="text"
            value={firmName}
            onChange={e => setFirmName(e.target.value)}
            placeholder={t('onboarding.step1.firmNamePlaceholder')}
            autoFocus
          />
          {firmName && (
            <div className={styles.nameFamilyBlack}>{firmName.toUpperCase()}</div>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>
            {t('onboarding.step1.logoLabel')} <span className={styles.optional}>({t('common.optional')})</span>
          </label>
          <LogoUpload value={logoUrl} onChange={setLogoUrl} />
        </div>
      </div>
    </div>,

    /* Step 2 — Cor */
    <div key="step2" className={styles.stepContent}>
      <div className={styles.stepIcon} style={{ background: accent + '20', color: accent }}>🎨</div>
      <h2 className={styles.stepTitle}>{t('onboarding.step2.title')}</h2>
      <p className={styles.stepDesc}>
        {t('onboarding.step2.desc')}
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
              title={t(c.nameKey)}
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
            title={t('onboarding.step2.customColorTitle')}
          />
          <span className={styles.colorHex}>{accent}</span>
          <span className={styles.colorCustomLabel}>{t('onboarding.step2.customColorLabel')}</span>
        </div>
      </div>
    </div>,

    /* Step 3 — Fontes */
    <div key="step3" className={styles.stepContent}>
      <div className={styles.stepIcon}>🔤</div>
      <h2 className={styles.stepTitle}>{t('onboarding.step3.title')}</h2>
      <p className={styles.stepDesc}>
        {t('onboarding.step3.desc')}
      </p>

      {/* Scope toggle */}
      <div className={styles.fontScopeRow}>
        <span className={styles.fontScopeLabel}>{t('onboarding.step3.scopeLabel')}</span>
        <div className={styles.fontScopeBtns}>
          {[
            { v: 'all',      l: t('onboarding.step3.scopeAll') },
            { v: 'pdf_only', l: t('onboarding.step3.scopePdfOnly') },
          ].map(({ v, l }) => (
            <button key={v} type="button"
              className={`${styles.fontScopeBtn} ${fontScope === v ? styles.fontScopeBtnActive : ''}`}
              onClick={() => setFontScope(v)}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Custom font upload — appears first so the option shows up in grids below */}
      <div className={styles.fontSection}>
        <span className={styles.fontSectionLabel}>{t('onboarding.step3.customFontLabel')}</span>
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

      {/* Heading font */}
      <div className={styles.fontSection}>
        <span className={styles.fontSectionLabel}>{t('onboarding.step3.headingFontLabel')}</span>
        <div className={styles.fontGrid}>
          {HEADING_FONTS.map(f => (
            <button key={f.label ?? f.labelKey} type="button"
              className={`${styles.fontOption} ${fontHeading === f.family ? styles.fontOptionActive : ''}`}
              style={{ fontFamily: f.family ? `'${f.family}', serif` : 'inherit' }}
              onClick={() => setFontHeading(f.family)}
            >
              <span className={styles.fontSample}>Aa</span>
              <span className={styles.fontOptionLabel}>{f.label ?? t(f.labelKey)}</span>
            </button>
          ))}
          {customFont && (
            <button key="custom-h" type="button"
              className={`${styles.fontOption} ${fontHeading === 'CustomFont' ? styles.fontOptionActive : ''}`}
              style={{ fontFamily: "'CustomFont', serif" }}
              onClick={() => setFontHeading('CustomFont')}
            >
              <span className={styles.fontSample}>Aa</span>
              <span className={styles.fontOptionLabel}>{customFont.displayName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Body font */}
      <div className={styles.fontSection}>
        <span className={styles.fontSectionLabel}>{t('onboarding.step3.bodyFontLabel')}</span>
        <div className={styles.fontGrid}>
          {BODY_FONTS.map(f => (
            <button key={f.label ?? f.labelKey} type="button"
              className={`${styles.fontOption} ${fontBody === f.family ? styles.fontOptionActive : ''}`}
              style={{ fontFamily: f.family ? `'${f.family}', sans-serif` : 'inherit' }}
              onClick={() => setFontBody(f.family)}
            >
              <span className={styles.fontSample}>Aa</span>
              <span className={styles.fontOptionLabel}>{f.label ?? t(f.labelKey)}</span>
            </button>
          ))}
          {customFont && (
            <button key="custom-b" type="button"
              className={`${styles.fontOption} ${fontBody === 'CustomFont' ? styles.fontOptionActive : ''}`}
              style={{ fontFamily: "'CustomFont', sans-serif" }}
              onClick={() => setFontBody('CustomFont')}
            >
              <span className={styles.fontSample}>Aa</span>
              <span className={styles.fontOptionLabel}>{customFont.displayName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mono font */}
      <div className={styles.fontSection}>
        <span className={styles.fontSectionLabel}>{t('onboarding.step3.monoFontLabel')}</span>
        <div className={styles.fontGrid}>
          {MONO_FONTS.map(f => (
            <button key={f.label ?? f.labelKey} type="button"
              className={`${styles.fontOption} ${fontMono === f.family ? styles.fontOptionActive : ''}`}
              style={{ fontFamily: f.family ? `'${f.family}', monospace` : 'monospace' }}
              onClick={() => setFontMono(f.family)}
            >
              <span className={styles.fontSample}>01</span>
              <span className={styles.fontOptionLabel}>{f.label ?? t(f.labelKey)}</span>
            </button>
          ))}
          {customFont && (
            <button key="custom-m" type="button"
              className={`${styles.fontOption} ${fontMono === 'CustomFont' ? styles.fontOptionActive : ''}`}
              style={{ fontFamily: "'CustomFont', monospace" }}
              onClick={() => setFontMono('CustomFont')}
            >
              <span className={styles.fontSample}>01</span>
              <span className={styles.fontOptionLabel}>{customFont.displayName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className={styles.fontPreview}>
        <div className={styles.fontPreviewHeading}
          style={{ fontFamily: fontHeading ? `'${fontHeading}', serif` : 'inherit' }}>
          {t('onboarding.step3.previewHeading')}
        </div>
        <div className={styles.fontPreviewBody}
          style={{ fontFamily: fontBody ? `'${fontBody}', sans-serif` : 'inherit' }}>
          {t('onboarding.step3.previewBody')}
        </div>
        <div className={styles.fontPreviewMono}
          style={{ fontFamily: fontMono ? `'${fontMono}', monospace` : 'monospace' }}>
          {t('onboarding.step3.previewMono')}
        </div>
      </div>
    </div>,

    /* Step 4 — Pronto */
    <div key="step4" className={styles.stepContent}>
      <div className={styles.checkmark}>✓</div>
      <h2 className={styles.stepTitle}>
        {t('onboarding.step4.title', { name: fullName.split(' ')[0] || t('onboarding.step4.defaultName') })}
      </h2>
      <p className={styles.stepDesc}>
        {t('onboarding.step4.desc')}
      </p>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>{t('onboarding.step4.lawyer')}</span>
          <span className={styles.summaryVal}>{fullName}{oabNumber ? ` · OAB ${oabNumber}` : ''}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>{t('onboarding.step4.firm')}</span>
          <span className={styles.summaryVal}>{firmName}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>{t('onboarding.step4.brandColor')}</span>
          <span className={styles.summaryVal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={styles.colorDot} style={{ background: accent }} />
            {accent}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>{t('onboarding.step4.logo')}</span>
          <span className={styles.summaryVal}>{logoUrl ? t('onboarding.step4.logoConfigured') : t('onboarding.step4.logoNotConfigured')}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>{t('onboarding.step4.fonts')}</span>
          <span className={styles.summaryVal}>
            {fontHeading || t('onboarding.step4.fontsDefault')} · {fontBody || t('onboarding.step4.fontsDefault')} · {fontMono || t('onboarding.step4.monoDefault')}
            {fontScope === 'pdf_only' && <span style={{ color: 'var(--text-3)', fontSize: '0.75em' }}> {t('onboarding.step4.pdfOnlySuffix')}</span>}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryKey}>{t('onboarding.step4.account')}</span>
          <span className={styles.summaryVal}>{session?.user?.email}</span>
        </div>
      </div>

      <p className={styles.editNote}>
        {t('onboarding.step4.editNotePre')} <strong>{t('onboarding.step4.editNoteBold')}</strong>.
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
          {t('onboarding.stepLabel', { current: step + 1, total: TOTAL_STEPS })}
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
              {t('onboarding.nav.back')}
            </button>
          )}
          {step === TOTAL_STEPS - 1 && (
            <button className={styles.btnBack} onClick={goBack}>
              {t('onboarding.nav.back')}
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
              {step === 0 ? t('onboarding.nav.start') : t('onboarding.nav.next')}
            </button>
          )}

          {step === TOTAL_STEPS - 1 && (
            <button
              className={styles.btnFinish}
              style={{ background: accent }}
              onClick={handleFinish}
              disabled={saving}
            >
              {saving ? t('onboarding.nav.finishing') : t('onboarding.nav.finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
