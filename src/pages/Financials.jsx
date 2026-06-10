import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAllEntries, deleteEntry, confirmEntry, unconfirmEntry } from '@/hooks/useFinancials'
import { useQuotaLitisCases, toggleQuotaLitisReceived } from '@/hooks/useCases'
import { useAuth } from '@/context/AuthContext'
import PageShell from '@/components/ui/PageShell'
import Modal from '@/components/ui/Modal'
import EntryForm from '@/components/forms/EntryForm'
import { useToast } from '@/context/ToastContext'
import styles from './Financials.module.css'

/* ── data mapper ──────────────────────────────────────────────────────── */
function mapEntry(e) {
  return {
    id:              e.id,
    desc:            e.description ?? '—',
    tipo:            e.type,
    valor:           Number(e.amount) || 0,
    status:          e.status,
    // Use due_date for month placement so entries stay in their due month even after payment
    data:            e.due_date?.split('T')[0] ?? e.created_at?.split('T')[0] ?? null,
    paidAt:          e.paid_at ?? null,
    caso:            e.cases?.title ?? null,
    category:        e.category ?? null,
    recurring:       e.recurring ?? false,
    installmentOf:   e.installment_of    ?? null,
    installmentTotal: e.installment_total ?? null,
  }
}

/* ── helpers ──────────────────────────────────────────────────────────── */
function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function fmtBRLPlain(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso) {
  if (!iso) return ''
  const dt = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso)
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtDateTime(iso) {
  if (!iso) return ''
  try {
    const dt = new Date(iso)
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function prevM(y, m) { return m === 0 ? [y - 1, 11] : [y, m - 1] }
function nextM(y, m) { return m === 11 ? [y + 1, 0] : [y, m + 1] }

function monthLong(y, m) {
  return new Date(y, m, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

function monthShort(m) {
  return new Date(2000, m, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')
}

/* ── inline SVG icons ─────────────────────────────────────────────────── */
function IconPlus() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
      <path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/>
    </svg>
  )
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconUndo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  )
}

function IconPDF() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

/* ── StatBox ──────────────────────────────────────────────────────────── */
function StatBox({ label, value, sub, variant, wide }) {
  return (
    <div className={`${styles.statBox} ${variant ? styles[variant] : ''} ${wide ? styles.statBoxWide : ''}`}>
      <div className={styles.statNum}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

/* ── MonthlyChart ─────────────────────────────────────────────────────── */
const CHART_PERIODS = [
  { label: '3m',  months: 3  },
  { label: '6m',  months: 6  },
  { label: '12m', months: 12 },
  { label: '2a',  months: 24 },
  { label: '3a',  months: 36 },
  { label: '4a',  months: 48 },
  { label: '6a',  months: 72 },
]

function barLabel(date, periodMonths) {
  const m = date.getMonth()
  const y = date.getFullYear()

  if (periodMonths <= 12) {
    // Every month; highlight January
    return { text: monthShort(m), bold: m === 0 }
  }
  if (periodMonths <= 24) {
    // Every quarter: Jan, Apr, Jul, Oct (m % 3 === 0)
    if (m % 3 !== 0) return null
    return { text: m === 0 ? String(y).slice(2) : monthShort(m), bold: m === 0 }
  }
  if (periodMonths <= 36) {
    // Jan and Jul of each year
    if (m !== 0 && m !== 6) return null
    return { text: m === 0 ? String(y).slice(2) : monthShort(m), bold: m === 0 }
  }
  // 4a, 6a: January only — one label per year
  if (m !== 0) return null
  return { text: String(y).slice(2), bold: true }
}

function MonthlyChart({ entries, selYear, selMonth }) {
  const [period, setPeriod] = useState(12)

  const months = useMemo(() => {
    const today = new Date()
    const result = []
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      result.push({
        key,
        date: new Date(d),
        isSel: d.getFullYear() === selYear && d.getMonth() === selMonth,
      })
    }
    return result
  }, [period, selYear, selMonth])

  const data = useMemo(() => months.map(({ key }) => {
    const paid = entries.filter(e => e.data?.startsWith(key) && e.status === 'pago')
    return {
      receita: paid.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0),
      despesa: paid.filter(e => e.tipo === 'despesa').reduce((s, e) => s + e.valor, 0),
    }
  }), [entries, months])

  const maxVal = Math.max(...data.flatMap(d => [d.receita, d.despesa]), 1)

  const W = 900, H = 180
  const padL = 8, padR = 8, padT = 16, padB = 30
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const groupW = chartW / months.length
  const barW   = Math.max(2, groupW * 0.28)
  const gap    = Math.max(0.5, groupW * 0.05)

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <span className={styles.chartTitle}>Histórico de pagamentos</span>
        <div className={styles.chartControls}>
          <div className={styles.periodSelector}>
            {CHART_PERIODS.map(p => (
              <button
                key={p.months}
                className={`${styles.periodBtn} ${period === p.months ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod(p.months)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={styles.chartLegend}>
            <span className={styles.legendDot} style={{ background: 'var(--green)' }} />
            <span>Rec.</span>
            <span className={styles.legendDot} style={{ background: 'var(--red)', marginLeft: '0.6rem' }} />
            <span>Desp.</span>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg}>
        {months.map((m, i) => m.isSel && (
          <rect key={`hl-${i}`}
            x={padL + i * groupW + 2} y={padT - 8}
            width={groupW - 4} height={chartH + 10}
            fill="rgba(var(--accent-rgb),0.06)" rx={4}
          />
        ))}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f}
            x1={padL} x2={W - padR}
            y1={padT + chartH * (1 - f)} y2={padT + chartH * (1 - f)}
            stroke="rgba(128,128,128,0.08)" strokeWidth="1"
          />
        ))}
        {data.map((d, i) => {
          const cx = padL + i * groupW + groupW / 2
          const rH = Math.max((d.receita / maxVal) * chartH, d.receita > 0 ? 3 : 0)
          const dH = Math.max((d.despesa / maxVal) * chartH, d.despesa > 0 ? 3 : 0)
          const opacity = months[i].isSel ? 1 : 0.55
          return (
            <g key={i}>
              <rect x={cx - barW - gap / 2} y={padT + chartH - rH} width={barW} height={rH} rx={2}
                fill="var(--green)" opacity={opacity} />
              <rect x={cx + gap / 2} y={padT + chartH - dH} width={barW} height={dH} rx={2}
                fill="var(--red)" opacity={opacity} />
            </g>
          )
        })}
        {months.map((m, i) => {
          const lbl = barLabel(m.date, period)
          if (!lbl) return null
          return (
            <text key={i}
              x={padL + i * groupW + groupW / 2} y={H - 8}
              textAnchor="middle" fontSize="11"
              fill={m.isSel ? 'var(--accent)' : lbl.bold ? 'var(--text-2)' : 'var(--text-3)'}
              fontWeight={m.isSel ? '700' : lbl.bold ? '600' : '400'}
              fontFamily="inherit"
            >{lbl.text}</text>
          )
        })}
      </svg>
    </div>
  )
}

/* ── EntryItem ────────────────────────────────────────────────────────── */
function EntryItem({ e, confirmDeleteId, setConfirmDeleteId, onEdit, onDelete, onConfirm, onUnconfirm }) {
  const isReceita  = e.tipo === 'receita'
  const isPaid     = e.status === 'pago'
  const confirming = confirmDeleteId === e.id

  return (
    <div className={`${styles.entryItem} ${isPaid ? styles.entryPaid : styles.entryPending}`}>
      <div className={`${styles.entryDot} ${isReceita ? styles.entryDotGreen : styles.entryDotRed}`} />
      <div className={styles.entryBody}>
        <div className={styles.entryName}>
          {e.caso ?? e.category ?? e.desc}
          {e.recurring && <span className={styles.recurringBadge}>Fixa</span>}
          {e.installmentOf && (
            <span className={styles.installmentBadge}>{e.installmentOf}/{e.installmentTotal}</span>
          )}
        </div>
        <div className={styles.entryMeta}>
          {(e.caso || e.category) && <span className={styles.entryCase}>{e.desc}</span>}
          <span className={isPaid ? styles.statusPaid : styles.statusPending}>
            {isPaid ? '✓ Pago' : '⏳ Pendente'}
          </span>
          {isPaid && e.paidAt
            ? <span className={styles.entryDate}>{fmtDate(e.paidAt)}</span>
            : !isPaid && e.data && <span className={styles.entryDate}>{fmtDate(e.data)}</span>
          }
        </div>
      </div>
      <div className={styles.entryRight}>
        <div className={`${styles.entryAmount} ${isReceita ? styles.amountGreen : styles.amountRed}`}>
          {isReceita ? '+' : '−'}{brl(e.valor)}
        </div>
        {confirming ? (
          <div className={styles.confirmDeleteInline}>
            <span className={styles.confirmDeleteLabel}>Excluir?</span>
            <button className={styles.confirmYes} onClick={() => onDelete(e.id)}>Sim</button>
            <button className={styles.confirmNo} onClick={() => setConfirmDeleteId(null)}>Não</button>
          </div>
        ) : (
          <div className={styles.entryActions}>
            {!isPaid && (
              <button className={styles.confirmPaidBtn} onClick={() => onConfirm(e.id)} title="Confirmar pagamento">
                <IconCheck />
              </button>
            )}
            {isPaid && (
              <button className={`${styles.entryActionBtn} ${styles.unconfirmBtn}`} onClick={() => onUnconfirm(e.id)} title="Desfazer confirmação">
                <IconUndo />
              </button>
            )}
            <button className={styles.entryActionBtn} onClick={() => onEdit(e.id)} title="Editar">
              <IconEdit />
            </button>
            <button className={`${styles.entryActionBtn} ${styles.entryDeleteBtn}`} onClick={() => setConfirmDeleteId(e.id)} title="Excluir">
              <IconTrash />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Quota-Litis helpers ──────────────────────────────────────────────── */
function calcQL(c) {
  return (Number(c.valor) || 0) * (parseFloat(c.quota_litis_pct) || 0) / 100
}

function QLDonut({ pending, received }) {
  const total = pending + received
  const r = 52, cx = 68, cy = 68, sw = 22
  const circ = 2 * Math.PI * r
  const pPct = total > 0 ? pending  / total : 0
  const rPct = total > 0 ? received / total : 0
  const pendDash   = pPct * circ
  const recvDash   = rPct * circ
  const recvOffset = -(pPct) * circ

  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      {total === 0
        ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-color,#e2e8f0)" strokeWidth={sw} />
        : <>
            {pPct > 0 && (
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={sw}
                strokeDasharray={`${pendDash} ${circ - pendDash}`}
                transform={`rotate(-90 ${cx} ${cy})`} />
            )}
            {rPct > 0 && (
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth={sw}
                strokeDasharray={`${recvDash} ${circ - recvDash}`}
                strokeDashoffset={recvOffset}
                transform={`rotate(-90 ${cx} ${cy})`} />
            )}
          </>
      }
      <text x={cx} y={cy - 6}  textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--text)">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9"  fill="var(--text-3)" fontWeight="500">casos</text>
    </svg>
  )
}

function QuotaLitisView({ cases, loading, onToggle }) {
  if (loading) return <div className={styles.qlEmpty}><p>Carregando…</p></div>

  if (cases.length === 0) return (
    <div className={styles.qlEmpty}>
      <div className={styles.qlEmptyIcon}>%</div>
      <p>Nenhum processo ativo com quota-litis cadastrada</p>
    </div>
  )

  const pending  = cases.filter(c => !c.quota_litis_received)
  const received = cases.filter(c =>  c.quota_litis_received)
  const totalPending  = pending.reduce((s, c)  => s + calcQL(c), 0)
  const totalReceived = received.reduce((s, c) => s + calcQL(c), 0)
  const totalAll      = totalPending + totalReceived

  return (
    <div className={styles.qlWrap}>
      <div className={styles.qlTop}>
        <div className={styles.qlChartCard}>
          <div className={styles.qlChartTitle}>Quota-Litis Previstas</div>
          <div className={styles.qlChartInner}>
            <QLDonut pending={pending.length} received={received.length} />
            <div className={styles.qlLegend}>
              <div className={styles.qlLegendRow}>
                <span className={styles.qlLegendDot} style={{ background: '#f59e0b' }} />
                <span className={styles.qlLegendLabel}>A receber</span>
                <span className={styles.qlLegendCount}>{pending.length}</span>
                <span className={styles.qlLegendVal}>{brl(totalPending)}</span>
              </div>
              <div className={styles.qlLegendRow}>
                <span className={styles.qlLegendDot} style={{ background: '#22c55e' }} />
                <span className={styles.qlLegendLabel}>Recebido</span>
                <span className={styles.qlLegendCount}>{received.length}</span>
                <span className={styles.qlLegendVal}>{brl(totalReceived)}</span>
              </div>
              <div className={styles.qlLegendTotal}>
                <span>Total previsto</span>
                <strong>{brl(totalAll)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.qlTableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Processo</th>
              <th>Cliente</th>
              <th>Valor da causa</th>
              <th>%</th>
              <th>Valor esperado</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...pending, ...received].map(c => {
              const qlVal = calcQL(c)
              const recv  = c.quota_litis_received
              return (
                <tr key={c.id} className={`${styles.tableRow} ${recv ? styles.qlRowReceived : ''}`}>
                  <td>
                    <Link to={`/painel/casos/${c.id}`} className={styles.qlCaseLink}>{c.title}</Link>
                    {c.case_number && <div className={styles.qlCaseNumber}>{c.case_number}</div>}
                  </td>
                  <td className={styles.caseCell}>{c.clients?.full_name ?? '—'}</td>
                  <td className={styles.valorCell}>{brl(c.valor)}</td>
                  <td><span className="badge st-blue">{c.quota_litis_pct}</span></td>
                  <td className={`${styles.valorCell} ${recv ? styles.positive : styles.qlPending}`}>{brl(qlVal)}</td>
                  <td>
                    {recv
                      ? <span className={styles.qlReceivedBadge}>✓ Recebida</span>
                      : <span className={styles.qlPendingBadge}>A receber</span>
                    }
                  </td>
                  <td>
                    <button
                      className={recv ? styles.qlUndoBtn : styles.qlConfirmBtn}
                      onClick={() => onToggle(c.id, !recv)}
                    >
                      {recv ? 'Desfazer' : 'Confirmar recebimento'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function Financials() {
  const now = new Date()
  const { lawyer } = useAuth()
  const { addToast } = useToast()

  const [tab, setTab]             = useState('lancamentos')
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [search, setSearch]       = useState('')
  const [formOpen, setFormOpen]   = useState(false)
  const [defaultType, setDefaultType] = useState('receita')
  const [editing,  setEditing]    = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const { data: rawEntries, loading, error, refetch } = useAllEntries()
  const { data: qlCases, loading: qlLoading, refetch: qlRefetch } = useQuotaLitisCases()

  async function handleQLToggle(caseId, received) {
    await toggleQuotaLitisReceived(caseId, received)
    qlRefetch()
  }

  const entries = useMemo(() => (rawEntries ?? []).map(mapEntry), [rawEntries])
  const rawById = useMemo(() =>
    Object.fromEntries((rawEntries ?? []).map(r => [r.id, r]))
  , [rawEntries])

  function openNewReceita() { setEditing(null); setDefaultType('receita'); setFormOpen(true) }
  function openNewDespesa() { setEditing(null); setDefaultType('despesa'); setFormOpen(true) }
  function openEdit(id)     { setEditing(rawById[id] ?? null); setFormOpen(true) }
  function handleSave()     { refetch(); setFormOpen(false) }

  async function handleDelete(id) {
    const { error } = await deleteEntry(id)
    if (error) { addToast('Erro ao excluir lançamento: ' + error.message, 'error'); return }
    setConfirmDeleteId(null)
    refetch()
  }

  async function handleConfirm(id) {
    const { error } = await confirmEntry(id)
    if (error) { addToast('Erro ao confirmar pagamento: ' + error.message, 'error'); return }
    refetch()
  }

  async function handleUnconfirm(id) {
    const { error } = await unconfirmEntry(id)
    if (error) { addToast('Erro ao reverter pagamento: ' + error.message, 'error'); return }
    refetch()
  }

  function handlePrev() { const [y, m] = prevM(viewYear, viewMonth); setViewYear(y); setViewMonth(m) }
  function handleNext() { const [y, m] = nextM(viewYear, viewMonth); setViewYear(y); setViewMonth(m) }

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const mLabel   = monthLong(viewYear, viewMonth)
  const mShort   = monthShort(viewMonth)

  const monthEntries = useMemo(() => {
    // recurring despesas appear in every month; others filtered by date
    let list = entries.filter(e =>
      (e.tipo === 'despesa' && e.recurring && e.data && e.data.slice(0, 7) <= monthStr) ||
      e.data?.startsWith(monthStr)
    )
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.desc.toLowerCase().includes(q) || (e.caso ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [entries, monthStr, search])

  const receitasMes = useMemo(() => monthEntries.filter(e => e.tipo === 'receita'), [monthEntries])
  const despesasMes = useMemo(() => monthEntries.filter(e => e.tipo === 'despesa'), [monthEntries])

  const totalRecebido = receitasMes.filter(e => e.status === 'pago').reduce((s, e) => s + e.valor, 0)
  const totalDespesas = despesasMes.filter(e => e.status === 'pago').reduce((s, e) => s + e.valor, 0)
  const totalAReceber = monthEntries.filter(e => e.status === 'pendente').reduce((s, e) => s + e.valor, 0)
  const saldo         = totalRecebido - totalDespesas

  const nRecPagas  = receitasMes.filter(e => e.status === 'pago').length
  const nDespPagas = despesasMes.filter(e => e.status === 'pago').length
  const nPendentes = monthEntries.filter(e => e.status === 'pendente').length

  const qlPendingCount = (qlCases ?? []).filter(c => !c.quota_litis_received).length

  /* ── PDF generator ──────────────────────────────────────────────────── */
  function generateFinanceiroPDF() {
    const accent    = lawyer?.theme_accent ?? '#043b61'
    const firmName  = lawyer?.firm_name    ?? 'Atlas Lex'
    const oabLabel  = lawyer?.oab_number   ? `OAB ${lawyer.oab_number}` : 'Advocacia'
    const mesNome   = mLabel
    const dateStr   = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    const fB        = v => fmtBRLPlain(v)

    const pdfFmtDt  = iso => {
      if (!iso) return '—'
      try {
        const dt = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso)
        return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      } catch { return '—' }
    }

    const ativoRows = receitasMes.length === 0
      ? `<tr><td colspan="4" style="text-align:center;color:#8a9bac;font-style:italic;">Nenhuma receita registrada</td></tr>`
      : receitasMes.map(e => `
        <tr>
          <td>${e.caso ?? '—'}</td>
          <td>${e.desc}</td>
          <td style="color:#1a9e43;font-size:0.75rem;">${pdfFmtDt(e.paidAt)}</td>
          <td class="val-pos">${fB(e.valor)}</td>
        </tr>`).join('')

    const passivoRows = despesasMes.length === 0
      ? `<tr><td colspan="4" style="text-align:center;color:#8a9bac;font-style:italic;">Nenhuma despesa lançada</td></tr>`
      : despesasMes.map(e => `
        <tr>
          <td>${e.category ?? '—'}</td>
          <td>${e.desc}${e.recurring ? ' <span style="font-size:0.6rem;background:rgba(139,92,246,0.12);color:#7c3aed;border-radius:999px;padding:0.05rem 0.35rem;font-weight:700;text-transform:uppercase;">Fixa</span>' : ''}</td>
          <td style="color:${e.paidAt ? '#1a9e43' : '#8a9bac'};font-size:0.75rem;">${pdfFmtDt(e.paidAt)}</td>
          <td class="val-neg">− ${fB(e.valor)}</td>
        </tr>`).join('')

    const saldoColor = saldo >= 0 ? '#1a9e43' : '#e03c3c'
    const saldoBg    = saldo >= 0 ? '#e8f5ee' : '#fdf0f0'
    const saldoBord  = saldo >= 0 ? '#b8e8c8' : '#f5c6c6'

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Financeiro — ${mesNome}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--accent:${accent};--green:#1a9e43;--green-light:#e8f5ee;--red:#e03c3c;--red-light:#fdf0f0;--text:#1a1a2e;--text-2:#5a6a7a;--text-3:#8a9bac;--border:#dde4eb;--bg:#f4f7fa;--card:#ffffff}
  html{font-size:15px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:2rem}
  .page{max-width:820px;margin:0 auto;background:var(--card);border-radius:20px;overflow:hidden;box-shadow:0 8px 60px rgba(0,0,0,0.15)}
  .pdf-header{background:linear-gradient(135deg,${accent} 0%,${accent}cc 100%);padding:2.5rem 3rem;position:relative;overflow:hidden}
  .pdf-header::before{content:'';position:absolute;top:-40%;right:-10%;width:400px;height:400px;border-radius:50%;background:rgba(255,255,255,0.04)}
  .header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.75rem;position:relative;z-index:1}
  .office-brand{display:flex;align-items:center;gap:1rem}
  .office-logo{width:52px;height:52px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:12px;display:flex;align-items:center;justify-content:center}
  .office-logo svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
  .office-name-main{font-size:1.1rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#fff}
  .office-name-sub{font-size:0.6rem;color:rgba(255,255,255,0.55);letter-spacing:0.12em;text-transform:uppercase;margin-top:0.15rem}
  .header-doc-info{text-align:right}
  .doc-label{font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:rgba(255,255,255,0.5)}
  .doc-date{font-size:0.75rem;color:rgba(255,255,255,0.8);font-weight:500;margin-top:0.2rem}
  .header-body{position:relative;z-index:1}
  .rel-badge{display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:0.28rem 0.9rem;font-size:0.6rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.75);margin-bottom:0.6rem}
  .rel-title{font-size:1.5rem;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.2}
  .rel-sub{font-size:0.9rem;color:rgba(255,255,255,0.6);font-weight:400;margin-top:0.3rem}
  .pdf-body{padding:2.5rem 3rem}
  .summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:2rem}
  .sum-card{border-radius:12px;padding:1.1rem 1.25rem}
  .sum-card.green{background:var(--green-light);border:1.5px solid #b8e8c8}
  .sum-card.red{background:var(--red-light);border:1.5px solid #f5c6c6}
  .sum-card.saldo{background:${saldoBg};border:1.5px solid ${saldoBord}}
  .sum-label{font-size:0.58rem;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:0.35rem}
  .sum-label.green{color:var(--green)}
  .sum-label.red{color:var(--red)}
  .sum-label.saldo{color:${saldoColor}}
  .sum-value{font-size:1.35rem;font-weight:800;letter-spacing:-0.02em}
  .sum-value.green{color:var(--green)}
  .sum-value.red{color:var(--red)}
  .sum-value.saldo{color:${saldoColor}}
  .section-divider{display:flex;align-items:center;gap:1rem;margin:0 0 1.1rem}
  .section-divider-line{flex:1;height:1px;background:var(--border)}
  .section-divider-label{font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:var(--text-3);white-space:nowrap}
  .table-wrap{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:2rem}
  table{width:100%;border-collapse:collapse}
  thead{background:${accent}}
  thead th{padding:0.65rem 1rem;font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.85);text-align:left}
  thead th:last-child{text-align:right;padding-right:1.5rem}
  thead th:first-child{padding-left:1.5rem}
  tbody tr:nth-child(even){background:var(--bg)}
  tbody td{padding:0.68rem 1rem;font-size:0.83rem;color:var(--text);border-bottom:1px solid var(--border)}
  tbody tr:last-child td{border-bottom:none}
  tbody td:first-child{padding-left:1.5rem;font-weight:600;color:var(--text-2)}
  tbody td:last-child{padding-right:1.5rem;text-align:right;font-weight:700}
  .val-pos{color:var(--green)}
  .val-neg{color:var(--red)}
  .pdf-footer{background:${accent};padding:1.25rem 3rem;display:flex;align-items:center;justify-content:space-between}
  .pdf-footer-brand{font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.65)}
  .pdf-footer-note{font-size:0.65rem;color:rgba(255,255,255,0.45);text-align:right;line-height:1.5}
  @media print{html{font-size:12px}body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}@page{margin:0}}
</style>
</head>
<body>
<div class="page">
  <div class="pdf-header">
    <div class="header-top">
      <div class="office-brand">
        <div class="office-logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21H3"/><path d="M21 21h-4"/><path d="M11 21h2"/><line x1="7" y1="5" x2="17" y2="5"/><line x1="12" y1="2" x2="12" y2="21"/></svg>
        </div>
        <div>
          <div class="office-name-main">${firmName}</div>
          <div class="office-name-sub">${oabLabel}</div>
        </div>
      </div>
      <div class="header-doc-info">
        <div class="doc-label">Gerado em</div>
        <div class="doc-date">${dateStr}</div>
      </div>
    </div>
    <div class="header-body">
      <div class="rel-badge">Relatório Financeiro</div>
      <div class="rel-title">${mesNome}</div>
      <div class="rel-sub">Demonstrativo de Ativos e Passivos</div>
    </div>
  </div>
  <div class="pdf-body">
    <div class="summary-grid">
      <div class="sum-card green">
        <div class="sum-label green">Receitas</div>
        <div class="sum-value green">${fB(totalRecebido)}</div>
      </div>
      <div class="sum-card red">
        <div class="sum-label red">Despesas</div>
        <div class="sum-value red">− ${fB(totalDespesas)}</div>
      </div>
      <div class="sum-card saldo">
        <div class="sum-label saldo">Saldo</div>
        <div class="sum-value saldo">${fB(saldo)}</div>
      </div>
    </div>
    <div class="section-divider">
      <div class="section-divider-line"></div>
      <div class="section-divider-label">Ativos — Receitas Registradas</div>
      <div class="section-divider-line"></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Caso</th><th>Descrição</th><th>Confirmado em</th><th>Valor</th></tr></thead>
        <tbody>${ativoRows}</tbody>
      </table>
    </div>
    <div class="section-divider">
      <div class="section-divider-line"></div>
      <div class="section-divider-label">Passivos — Despesas do Mês</div>
      <div class="section-divider-line"></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Categoria</th><th>Descrição</th><th>Pago em</th><th>Valor</th></tr></thead>
        <tbody>${passivoRows}</tbody>
      </table>
    </div>
  </div>
  <div class="pdf-footer">
    <div class="pdf-footer-brand">${firmName} · ${oabLabel}</div>
    <div class="pdf-footer-note">Relatório gerado automaticamente · ${dateStr}</div>
  </div>
</div>
<script>window.onload = () => window.print();<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
    else alert('Permita pop-ups para gerar o PDF.')
  }

  return (
    <PageShell
      title="Financeiro"
      subtitle={tab === 'lancamentos' ? mLabel : 'Quota-Litis'}
      action={
        tab === 'lancamentos' && (
          <div className={styles.actionBtns}>
            <button className={styles.btnPDF} onClick={generateFinanceiroPDF} title="PDF do mês">
              <IconPDF />
              PDF
            </button>
            <button className={styles.btnReceita} onClick={openNewReceita}>
              <IconPlus />
              Receita
            </button>
            <button className={styles.btnDespesa} onClick={openNewDespesa}>
              <IconPlus />
              Despesa
            </button>
          </div>
        )
      }
      filters={
        <>
          {/* Tab bar */}
          <div className={styles.tabBar}>
            <button
              className={`${styles.tabBtn} ${tab === 'lancamentos' ? styles.tabBtnActive : ''}`}
              onClick={() => setTab('lancamentos')}
            >
              Lançamentos
            </button>
            <button
              className={`${styles.tabBtn} ${tab === 'quota' ? styles.tabBtnActive : ''}`}
              onClick={() => setTab('quota')}
            >
              Quota-Litis
              {qlPendingCount > 0 && (
                <span className={styles.tabCount}>{qlPendingCount}</span>
              )}
            </button>
          </div>

          {tab === 'lancamentos' && (
            <>
              {/* Month navigation */}
              <div className={styles.monthNavWrap}>
                <button className={styles.navBtn} onClick={handlePrev} aria-label="Mês anterior">&#8249;</button>
                <span className={styles.navLabel}>{mLabel}</span>
                <button className={styles.navBtn} onClick={handleNext} aria-label="Próximo mês">&#8250;</button>
              </div>

              {/* Search */}
              <div className={styles.searchWrap}>
                <svg className={styles.searchIcon} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.856a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
                </svg>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Buscar lançamento ou caso…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </>
          )}
        </>
      }
    >
      {tab === 'quota' ? (
        <QuotaLitisView cases={qlCases ?? []} loading={qlLoading} onToggle={handleQLToggle} />
      ) : (
        <>
          {/* ── Stat grid ── */}
          <div className={styles.statGrid}>
            <StatBox
              label="Recebido"
              value={brl(totalRecebido)}
              sub={`${nRecPagas} receita${nRecPagas !== 1 ? 's' : ''}`}
              variant="statGreen"
            />
            <StatBox
              label="Despesas"
              value={brl(totalDespesas)}
              sub={`${nDespPagas} despesa${nDespPagas !== 1 ? 's' : ''}`}
              variant="statRed"
            />
            <StatBox
              label="A receber"
              value={brl(totalAReceber)}
              sub={`${nPendentes} pendente${nPendentes !== 1 ? 's' : ''}`}
              variant="statBlue"
            />
            <StatBox
              label={`Saldo de ${mShort}`}
              value={brl(saldo)}
              variant={saldo >= 0 ? 'statSaldoPos' : 'statSaldoNeg'}
              wide
            />
          </div>

          {/* ── Monthly chart ── */}
          {!loading && !error && entries.length > 0 && (
            <MonthlyChart entries={entries} selYear={viewYear} selMonth={viewMonth} />
          )}

          {/* ── Receitas section ── */}
          <div className={styles.sectionHdr}>
            <span>Receitas de {mLabel}</span>
            <span className={styles.sectionCount}>{receitasMes.length}</span>
          </div>
          <div className={styles.entryList}>
            {loading ? (
              <div className={styles.emptySection}>Carregando…</div>
            ) : error ? (
              <div className={styles.emptySection}>Erro ao carregar lançamentos.</div>
            ) : receitasMes.length === 0 ? (
              <div className={styles.emptySection}>Nenhuma receita registrada em {mLabel.toLowerCase()}</div>
            ) : (
              receitasMes.map(e => (
                <EntryItem
                  key={e.id}
                  e={e}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onConfirm={handleConfirm}
                  onUnconfirm={handleUnconfirm}
                />
              ))
            )}
          </div>

          {/* ── Despesas section ── */}
          <div className={styles.sectionHdr} style={{ marginTop: '0.75rem' }}>
            <span>Despesas de {mLabel}</span>
            <span className={styles.sectionCount}>{despesasMes.length}</span>
          </div>
          <div className={styles.entryList}>
            {loading ? (
              <div className={styles.emptySection}>Carregando…</div>
            ) : despesasMes.length === 0 ? (
              <div className={styles.emptySection}>Nenhuma despesa registrada em {mLabel.toLowerCase()}</div>
            ) : (
              despesasMes.map(e => (
                <EntryItem
                  key={e.id}
                  e={e}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onConfirm={handleConfirm}
                  onUnconfirm={handleUnconfirm}
                />
              ))
            )}
          </div>
        </>
      )}

      {formOpen && (
        <Modal
          title={editing ? 'Editar lançamento' : defaultType === 'despesa' ? 'Nova despesa' : 'Nova receita'}
          onClose={() => setFormOpen(false)}
        >
          <EntryForm
            initial={editing}
            defaultType={defaultType}
            onSave={handleSave}
            onClose={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </PageShell>
  )
}
