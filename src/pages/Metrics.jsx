import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PageShell from '@/components/ui/PageShell'
import s from './Metrics.module.css'

/* ─── Color palette ──────────────────────────────────────────────── */
const PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444',
  '#ec4899','#14b8a6','#f97316','#6366f1','#84cc16',
  '#06b6d4','#a855f7','#e11d48','#65a30d','#0ea5e9',
]

/* ─── SVG donut helpers ──────────────────────────────────────────── */
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function arcPath(cx, cy, R, r, a0, a1, hasGap) {
  const GAP = hasGap ? 1.4 : 0
  const start = a0 + GAP / 2
  const end   = Math.min(a1 - GAP / 2, a0 + 359.9)
  if (end <= start) return ''
  const lg   = (end - start) > 180 ? 1 : 0
  const [x1, y1] = polar(cx, cy, R, start)
  const [x2, y2] = polar(cx, cy, R, end)
  const [x3, y3] = polar(cx, cy, r, end)
  const [x4, y4] = polar(cx, cy, r, start)
  return `M${x1},${y1} A${R},${R} 0 ${lg} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${lg} 0 ${x4},${y4} Z`
}

/* ─── Group helper ───────────────────────────────────────────────── */
function groupBy(rows, key, emptyLabel) {
  const map = {}
  rows.forEach(row => {
    const k = (row[key] && row[key].toString().trim()) || emptyLabel
    map[k] = (map[k] || 0) + 1
  })
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

/* ─── PieChart ───────────────────────────────────────────────────── */
const CX = 100, CY = 100, OR = 80, IR = 52

function PieChart({ title, subtitle, data, loading }) {
  const [hov, setHov] = useState(null)

  const total  = data.reduce((acc, d) => acc + d.value, 0)
  const maxVal = data.length > 0 ? data[0].value : 1
  const hasGap = data.length > 1

  let cum = 0
  const slices = data.map((d, i) => {
    const a0   = cum
    const span = (d.value / total) * 360
    cum += span
    return { ...d, a0, a1: cum, color: PALETTE[i % PALETTE.length] }
  })

  const hSlice = hov !== null ? slices[hov] : null

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div className={s.cardTitle}>{title}</div>
        {subtitle && <div className={s.cardSub}>{subtitle}</div>}
      </div>

      {loading ? (
        <div className={s.state}>Carregando…</div>
      ) : total === 0 ? (
        <div className={s.state}>Nenhum dado disponível</div>
      ) : (
        <div className={s.body}>
          {/* ── SVG donut (centered) ── */}
          <div className={s.svgWrap}>
            <svg viewBox="0 0 200 200" className={s.svg}>
              {slices.length === 1 ? (
                <>
                  <circle cx={CX} cy={CY} r={OR}
                    fill={slices[0].color}
                    opacity={hov === null || hov === 0 ? 1 : 0.4}
                    style={{ cursor: 'pointer', transition: 'opacity .15s' }}
                    onMouseEnter={() => setHov(0)} onMouseLeave={() => setHov(null)} />
                  <circle cx={CX} cy={CY} r={IR} fill="var(--card)" />
                </>
              ) : (
                slices.map((sl, i) => (
                  <path
                    key={i}
                    d={arcPath(CX, CY, OR, IR, sl.a0, sl.a1, hasGap)}
                    fill={sl.color}
                    opacity={hov === null || hov === i ? 1 : 0.35}
                    style={{
                      transition: 'opacity .15s, transform .15s',
                      transform: hov === i ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: `${CX}px ${CY}px`,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHov(i)}
                    onMouseLeave={() => setHov(null)}
                  />
                ))
              )}

              {hSlice ? (
                <>
                  <text x={CX} y={CY - 7} textAnchor="middle"
                    style={{ fill: 'var(--text)', fontSize: '16px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {hSlice.value}
                  </text>
                  <text x={CX} y={CY + 11} textAnchor="middle"
                    style={{ fill: 'var(--text-2)', fontSize: '11px' }}>
                    {((hSlice.value / total) * 100).toFixed(1)}%
                  </text>
                </>
              ) : (
                <>
                  <text x={CX} y={CY - 7} textAnchor="middle"
                    style={{ fill: 'var(--text)', fontSize: '18px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {total}
                  </text>
                  <text x={CX} y={CY + 11} textAnchor="middle"
                    style={{ fill: 'var(--text-3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    total
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* ── Horizontal bars ── */}
          <div className={s.bars}>
            {slices.map((sl, i) => {
              const pct  = (sl.value / total) * 100
              const barW = (sl.value / maxVal) * 100
              return (
                <div
                  key={i}
                  className={`${s.barRow} ${hov === i ? s.barRowHov : ''}`}
                  onMouseEnter={() => setHov(i)}
                  onMouseLeave={() => setHov(null)}
                >
                  <div className={s.barLabelWrap}>
                    <span className={s.barDot} style={{ background: sl.color }} />
                    <span className={s.barLabelText} title={sl.label}>{sl.label}</span>
                  </div>
                  <div className={s.barTrack}>
                    <div
                      className={s.barFill}
                      style={{ width: `${barW}%`, background: sl.color }}
                    />
                  </div>
                  <span className={s.barPct}>{pct.toFixed(1)}%</span>
                  <span className={s.barCount}>{sl.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function Metrics() {
  const [loading,   setLoading]   = useState(true)
  const [cases,     setCases]     = useState([])
  const [proposals, setProposals] = useState([])

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('cases').select('partner, area, court'),
        supabase.from('proposals').select('service_type'),
      ])
      setCases(c ?? [])
      setProposals(p ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const partnerData = groupBy(cases,     'partner',      'Próprios')
  const areaData    = groupBy(cases,     'area',         'Não especificada')
  const courtData   = groupBy(cases,     'court',        'Não especificado')
  const serviceData = groupBy(proposals, 'service_type', 'Não especificado')

  return (
    <PageShell
      title="Métricas"
      subtitle="Visão analítica do escritório com base nos dados cadastrados"
    >
      <div className={s.grid}>
        <PieChart
          title="Casos por Parceria"
          subtitle={`${cases.length} caso${cases.length !== 1 ? 's' : ''} no total`}
          data={partnerData}
          loading={loading}
        />
        <PieChart
          title="Áreas de Atuação"
          subtitle={`${cases.length} caso${cases.length !== 1 ? 's' : ''} no total`}
          data={areaData}
          loading={loading}
        />
        <PieChart
          title="Casos por Tribunal"
          subtitle={`${cases.length} caso${cases.length !== 1 ? 's' : ''} no total`}
          data={courtData}
          loading={loading}
        />
        <PieChart
          title="Tipos de Serviço"
          subtitle={`${proposals.length} proposta${proposals.length !== 1 ? 's' : ''} no total`}
          data={serviceData}
          loading={loading}
        />
      </div>
    </PageShell>
  )
}
