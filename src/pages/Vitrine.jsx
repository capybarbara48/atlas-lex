import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import PageShell from '@/components/ui/PageShell'
import s from './Vitrine.module.css'

/* ─── Pomodoro constants ─────────────────────────────────────────── */
const FOCUS_SECS = 30 * 60
const BREAK_SECS = 5  * 60
const CIRC       = 2 * Math.PI * 108   // r=108, CIRC≈678.58

/* ─── Audio (same as Espaço de Trabalho) ────────────────────────── */
function playDone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.start(t); osc.stop(t + 0.55)
    })
  } catch {}
}

function playWarning() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.22, 0.44].forEach(t => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.1, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.14)
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.14)
    })
  } catch {}
}

/* ─── Date helpers ───────────────────────────────────────────────── */
function isoDate(d = new Date()) { return d.toISOString().slice(0, 10) }

function weekMonday(d = new Date()) {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon  = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

/* ─── Particle dots (static — no rerender cost) ──────────────────── */
const DOTS = Array.from({ length: 40 }, (_, i) => ({
  w:    3 + (i * 11) % 7,
  op:   (0.08 + (i * 7) % 5 * 0.025).toFixed(3),
  top:  `${(i * 17 + 5) % 90}%`,
  left: `${(i * 23 + 3) % 95}%`,
}))

/* ═══════════════════════════════════════════════════════════════════
   VitrineCard — renders the display card (normal or fullscreen)
═══════════════════════════════════════════════════════════════════ */
function VitrineCard({ lawyer, now, stats, pomMode, pomSecs, pomCycles, onToggle, onReset, fullscreen, onClose }) {
  const accent   = lawyer?.theme_accent ?? '#043b61'
  const firmName = lawyer?.firm_name    ?? 'Atlas Adv'
  const logoUrl  = lawyer?.logo_url     || null

  /* Pomodoro ring */
  const total    = pomMode === 'break' ? BREAK_SECS : FOCUS_SECS
  const offset   = CIRC * (pomSecs / total)
  const mm       = String(Math.floor(pomSecs / 60)).padStart(2, '0')
  const ss       = String(pomSecs % 60).padStart(2, '0')
  const isRunning = pomMode === 'focus' || pomMode === 'break'
  const ringStroke = pomMode === 'break' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.92)'

  /* Date/time */
  const timeStr  = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateDay  = now.toLocaleDateString('pt-BR', { day: '2-digit' })
  const dateMon  = now.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())
  const dateWday = now.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()
  const dateYear = now.getFullYear()

  /* Pomodoro state label */
  const pomLabel = pomMode === 'focus' ? 'foco ativo'
    : pomMode === 'break' ? '☕ pausa'
    : pomCycles > 0 ? `${pomCycles} ciclo${pomCycles !== 1 ? 's' : ''}`
    : 'pomodoro'

  return (
    <div className={s.card} style={{ '--vmix-accent': accent }}>
      {fullscreen && <button className={s.fsClose} onClick={onClose}>×</button>}

      <div className={s.shell}>
        {/* ── Particles ── */}
        <div className={s.dots} aria-hidden>
          {DOTS.map((d, i) => (
            <div key={i} className={s.dot}
              style={{ width: d.w, height: d.w, opacity: d.op, top: d.top, left: d.left }} />
          ))}
        </div>
        <div className={s.orb1} aria-hidden />
        <div className={s.orb2} aria-hidden />

        {/* ── Coluna 1: Logo / Nome ── */}
        <div className={`${s.col} ${s.colLogo}`}>
          {logoUrl ? (
            <img src={logoUrl} className={s.logoImg} alt={firmName} />
          ) : (
            <div className={s.logoText}>
              <div className={s.logoName}>{firmName.toUpperCase()}</div>
              <div className={s.logoSub}>Advocacia</div>
            </div>
          )}
        </div>

        <div className={s.sep} />

        {/* ── Coluna 2: Pomodoro ── */}
        <div className={`${s.col} ${s.colTimer}`}>
          <div className={s.timerWrap}>
            <svg className={s.timerRing} viewBox="0 0 240 240">
              <circle cx="120" cy="120" r="108" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6"/>
              <circle cx="120" cy="120" r="108" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="14" strokeDasharray="4 8"/>
              <circle
                cx="120" cy="120" r="108"
                fill="none"
                stroke={ringStroke}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                transform="rotate(-90 120 120)"
                style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 7px rgba(255,255,255,.32))' }}
              />
            </svg>
            <div className={s.timerCenter}>
              <div className={s.timerTime}>{mm}:{ss}</div>
              <div className={s.timerState}>{pomLabel}</div>
            </div>
          </div>

          <div className={s.controls}>
            <button className={s.btnGhost} onClick={onReset} title="Reiniciar">↺</button>
            <button className={s.btnPrimary} onClick={onToggle}>
              {isRunning ? '⏸ Pausar' : (pomSecs < (pomMode === 'idle' ? FOCUS_SECS : total) ? '▶ Retomar' : '▶ Iniciar foco')}
            </button>
            <span className={s.cycles}>{pomCycles > 0 ? `×${pomCycles}` : ''}</span>
          </div>
        </div>

        <div className={s.sep} />

        {/* ── Coluna 3: Stats ── */}
        <div className={`${s.col} ${s.colStats}`}>
          {/* Relógio */}
          <div className={s.glass}>
            <div className={s.glassLabel}>Horário</div>
            <div className={s.clock}>{timeStr}</div>
          </div>

          {/* Data */}
          <div className={s.glass}>
            <div className={s.glassLabel}>Data</div>
            <div className={s.dateRow}>
              <span className={s.dateDay}>{dateDay}</span>
              <div className={s.dateMeta}>
                <span className={s.dateMon}>{dateMon}</span>
                <span className={s.dateWday}>{dateWday}</span>
              </div>
              <span className={s.dateYear}>{dateYear}</span>
            </div>
          </div>

          {/* Tarefas */}
          <div className={s.glass}>
            <div className={s.glassLabel}>Tarefas</div>
            <div className={s.tasksRow}>
              <div className={s.taskBlock}>
                <div className={s.taskNum}>{stats.today}</div>
                <div className={s.taskLabel}>pendentes hoje</div>
              </div>
              <div className={s.tasksDivider} />
              <div className={s.taskBlock}>
                <div className={s.taskNum}>{stats.week}</div>
                <div className={s.taskLabel}>pendentes na semana</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rodapé ── */}
      <div className={s.footer}>
        <div className={s.footerLine} />
        <span className={s.footerBrand}>Atlas Adv</span>
        <div className={s.footerLine} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════ */
export default function Vitrine() {
  const { lawyer } = useAuth()

  /* ── Pomodoro ── */
  const [pomMode,   setPomMode]   = useState('idle')
  const [pomSecs,   setPomSecs]   = useState(FOCUS_SECS)
  const [pomCycles, setPomCycles] = useState(0)
  const intRef = useRef(null)

  useEffect(() => {
    if (pomMode === 'idle') { clearInterval(intRef.current); return }
    clearInterval(intRef.current)
    intRef.current = setInterval(() => {
      setPomSecs(s => {
        if (s === 10) playWarning()
        if (s === 0) {
          playDone()
          if (pomMode === 'focus') { setPomCycles(c => c + 1); setPomMode('break'); return BREAK_SECS }
          setPomMode('focus'); return FOCUS_SECS
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intRef.current)
  }, [pomMode])

  function handleToggle() {
    if (pomMode === 'idle') {
      setPomMode('focus')
    } else {
      clearInterval(intRef.current)
      setPomMode('idle')
    }
  }
  function handleReset() {
    clearInterval(intRef.current)
    setPomMode('idle')
    setPomSecs(FOCUS_SECS)
  }

  /* ── Live clock ── */
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  /* ── Task counters ── */
  const [stats, setStats] = useState({ today: '—', week: '—' })

  const loadStats = useCallback(async () => {
    if (!lawyer) return
    const today  = isoDate()
    const mon    = isoDate(weekMonday())
    const sunDay = new Date(weekMonday())
    sunDay.setDate(sunDay.getDate() + 6)
    const sun = isoDate(sunDay)

    const [{ count: t }, { count: w }] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .lte('due_date', today + 'T23:59:59')
        .not('status', 'in', '("concluida","cancelada")'),
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .gte('due_date', mon)
        .lte('due_date', sun + 'T23:59:59')
        .not('status', 'in', '("concluida","cancelada")'),
    ])
    setStats({ today: t ?? 0, week: w ?? 0 })
  }, [lawyer])

  useEffect(() => {
    loadStats()
    const id = setInterval(loadStats, 60_000)
    return () => clearInterval(id)
  }, [loadStats])

  /* ── Fullscreen ── */
  const [fullscreen, setFullscreen] = useState(false)

  const cardProps = { lawyer, now, stats, pomMode, pomSecs, pomCycles, onToggle: handleToggle, onReset: handleReset }

  return (
    <PageShell
      action={
        <button className={s.btnExpand} onClick={() => setFullscreen(true)}>
          ↗ Tela cheia
        </button>
      }
    >
      <div className={s.page}>
        <VitrineCard {...cardProps} fullscreen={false} />
      </div>

      {fullscreen && (
        <div className={s.fsOverlay} onClick={() => setFullscreen(false)}>
          <div className={s.fsCardWrap} onClick={e => e.stopPropagation()}>
            <VitrineCard {...cardProps} fullscreen onClose={() => setFullscreen(false)} />
          </div>
        </div>
      )}
    </PageShell>
  )
}
