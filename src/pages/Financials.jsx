import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAllEntries, deleteEntry } from '@/hooks/useFinancials'
import { useQuotaLitisCases, toggleQuotaLitisReceived } from '@/hooks/useCases'
import PageShell from '@/components/ui/PageShell'
import Modal from '@/components/ui/Modal'
import EntryForm from '@/components/forms/EntryForm'
import styles from './Financials.module.css'

/* ── data mapper ──────────────────────────────────────────────────────── */
function mapEntry(e) {
  return {
    id:     e.id,
    desc:   e.description ?? '—',
    tipo:   e.type,
    valor:  Number(e.amount) || 0,
    status: e.status,
    data:   e.paid_at?.split('T')[0] ?? e.due_date?.split('T')[0] ?? e.created_at?.split('T')[0] ?? null,
    caso:   e.cases?.title ?? null,
  }
}

/* ── helpers ──────────────────────────────────────────────────────────── */
function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function fmtDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
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
function MonthlyChart({ entries, selYear, selMonth }) {
  const months = useMemo(() => {
    const today = new Date()
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      result.push({
        key,
        label: monthShort(d.getMonth()),
        isSel: d.getFullYear() === selYear && d.getMonth() === selMonth,
      })
    }
    return result
  }, [selYear, selMonth])

  const data = useMemo(() => months.map(({ key }) => {
    const paid = entries.filter(e => e.data?.startsWith(key) && e.status === 'pago')
    return {
      receita: paid.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0),
      despesa: paid.filter(e => e.tipo === 'despesa').reduce((s, e) => s + e.valor, 0),
    }
  }), [entries, months])

  const maxVal = Math.max(...data.flatMap(d => [d.receita, d.despesa]), 1)

  const W = 600, H = 180
  const padL = 8, padR = 8, padT = 16, padB = 30
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const groupW = chartW / months.length
  const barW = groupW * 0.28
  const gap = groupW * 0.05

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <span className={styles.chartTitle}>Últimos 6 meses (pagamentos)</span>
        <div className={styles.chartLegend}>
          <span className={styles.legendDot} style={{ background: 'var(--green)' }} />
          <span>Receitas</span>
          <span className={styles.legendDot} style={{ background: 'var(--red)', marginLeft: '0.75rem' }} />
          <span>Despesas</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg} preserveAspectRatio="none">
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
          const rH = Math.max((d.receita / maxVal) * chartH, d.receita > 0 ? 4 : 0)
          const dH = Math.max((d.despesa / maxVal) * chartH, d.despesa > 0 ? 4 : 0)
          const opacity = months[i].isSel ? 1 : 0.55
          return (
            <g key={i}>
              <rect x={cx - barW - gap / 2} y={padT + chartH - rH} width={barW} height={rH} rx={3}
                fill="var(--green)" opacity={opacity} />
              <rect x={cx + gap / 2} y={padT + chartH - dH} width={barW} height={dH} rx={3}
                fill="var(--red)" opacity={opacity} />
            </g>
          )
        })}
        {months.map((m, i) => (
          <text key={i}
            x={padL + i * groupW + groupW / 2} y={H - 8}
            textAnchor="middle" fontSize="11"
            fill={m.isSel ? 'var(--accent)' : 'var(--text-3)'}
            fontWeight={m.isSel ? '700' : '400'}
            fontFamily="inherit"
          >{m.label}</text>
        ))}
      </svg>
    </div>
  )
}

/* ── EntryItem ────────────────────────────────────────────────────────── */
function EntryItem({ e, confirmDeleteId, setConfirmDeleteId, onEdit, onDelete }) {
  const isReceita  = e.tipo === 'receita'
  const isPaid     = e.status === 'pago'
  const confirming = confirmDeleteId === e.id

  return (
    <div className={`${styles.entryItem} ${isPaid ? styles.entryPaid : styles.entryPending}`}>
      <div className={`${styles.entryDot} ${isReceita ? styles.entryDotGreen : styles.entryDotRed}`} />
      <div className={styles.entryBody}>
        <div className={styles.entryName}>{e.desc}</div>
        <div className={styles.entryMeta}>
          {e.caso && <span className={styles.entryCase}>{e.caso}</span>}
          <span className={isPaid ? styles.statusPaid : styles.statusPending}>
            {isPaid ? '✓ Pago' : '⏳ Pendente'}
          </span>
          {e.data && <span className={styles.entryDate}>{fmtDate(e.data)}</span>}
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

  const [tab, setTab]             = useState('lancamentos')
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [search, setSearch]       = useState('')
  const [formOpen, setFormOpen]   = useState(false)
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

  function openNew()    { setEditing(null);              setFormOpen(true) }
  function openEdit(id) { setEditing(rawById[id] ?? null); setFormOpen(true) }
  function handleSave() { refetch(); setFormOpen(false) }

  async function handleDelete(id) {
    await deleteEntry(id)
    setConfirmDeleteId(null)
    refetch()
  }

  function handlePrev() { const [y, m] = prevM(viewYear, viewMonth); setViewYear(y); setViewMonth(m) }
  function handleNext() { const [y, m] = nextM(viewYear, viewMonth); setViewYear(y); setViewMonth(m) }

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const mLabel   = monthLong(viewYear, viewMonth)
  const mShort   = monthShort(viewMonth)

  const monthEntries = useMemo(() => {
    let list = entries.filter(e => e.data?.startsWith(monthStr))
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

  return (
    <PageShell
      title="Financeiro"
      subtitle={tab === 'lancamentos' ? mLabel : 'Quota-Litis'}
      action={
        tab === 'lancamentos' && (
          <button className={styles.btnNovo} onClick={openNew}>
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
              <path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/>
            </svg>
            Novo lançamento
          </button>
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
                />
              ))
            )}
          </div>
        </>
      )}

      {formOpen && (
        <Modal title={editing ? 'Editar lançamento' : 'Novo lançamento'} onClose={() => setFormOpen(false)}>
          <EntryForm initial={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </Modal>
      )}
    </PageShell>
  )
}
