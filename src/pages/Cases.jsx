import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import { useCases, useFinalisedCases, updateCaseSituation, updateDespachoAttempts, reactivateCase } from '@/hooks/useCases'
import { useKanbanSituations } from '@/hooks/useKanbanSituations'
import { useToast } from '@/context/ToastContext'
import PageShell from '@/components/ui/PageShell'
import ViewToggle from '@/components/ui/ViewToggle'
import Modal from '@/components/ui/Modal'
import CaseForm from '@/components/forms/CaseForm'
import { SkeletonTable, SkeletonKanbanCard } from '@/components/ui/Skeleton'
import { formatDate, formatCurrency } from '@/lib/formatters'
import styles from './Cases.module.css'

/* ── helpers ────────────────────────────────────────────────────────── */
function tribColor(court) {
  if (!court) return 'st-teal'
  const c = court.toUpperCase()
  if (c.startsWith('TJ'))           return 'st-blue'
  if (c.startsWith('TRT'))          return 'st-purple'
  if (c.startsWith('TRF'))          return 'st-green'
  if (c === 'STJ' || c === 'STF')   return 'st-dark'
  return 'st-teal'
}

function mapCase(c) {
  return {
    id:         c.id,
    numero:     c.case_number ?? '—',
    titulo:     c.title,
    cliente:    c.clients?.full_name ?? '—',
    clienteId:  c.clients?.id ?? c.client_id ?? null,
    status:     c.status,
    situation:          c.situation ?? null,
    situationChangedAt: c.situation_changed_at ?? null,
    despachoAttempts:   Array.isArray(c.despacho_attempts) ? [...c.despacho_attempts, null, null, null].slice(0, 3) : [null, null, null],
    tipo:               c.area ?? '—',
    tribunal:           c.court ?? '—',
    valor:              Number(c.valor) || 0,
    aberto:             c.opened_at?.split('T')[0] ?? c.created_at?.split('T')[0],
    atualizado:         c.updated_at?.split('T')[0] ?? c.created_at?.split('T')[0],
    trib_color:         tribColor(c.court),
  }
}

function brl(v, lang) {
  if (!v) return '—'
  return formatCurrency(v, lang)
}

function daysSince(d) {
  if (!d) return null
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

function statusDaysStyle(n) {
  if (n === null) return null
  if (n < 30)  return { color: 'var(--text-3)',  bg: 'rgba(0,0,0,0.06)' }
  if (n < 60)  return { color: '#ea580c',         bg: 'rgba(234,88,12,0.1)' }
  return             { color: '#dc2626',           bg: 'rgba(220,38,38,0.1)' }
}

/* ── EditColumnsModal ───────────────────────────────────────────────── */
function EditColumnsModal({ situations, onAdd, onUpdate, onDelete, onReorder, onClose }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [newName, setNewName]   = useState('')
  const [newColor, setNewColor] = useState('#4361ee')
  const [editing, setEditing]   = useState(null)
  const [localList, setLocalList] = useState([...situations])

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    if (localList.some(s => s.value.toLowerCase() === name.toLowerCase())) {
      toast.error(t('cases.editColumns.duplicateError'))
      return
    }
    const { data, error } = await onAdd(name, newColor)
    if (error) { toast.error(t('cases.editColumns.addError')); return }
    if (data) {
      setLocalList(prev => [...prev, data])
      setNewName('')
      setNewColor('#4361ee')
    }
  }

  async function handleSaveEdit() {
    const name = editing?.value.trim()
    if (!name) return
    const { error } = await onUpdate(editing.id, { value: name, color: editing.color })
    if (error) { toast.error(t('cases.editColumns.saveError')); return }
    setLocalList(prev => prev.map(s => s.id === editing.id ? { ...s, value: name, color: editing.color } : s))
    setEditing(null)
  }

  async function handleDelete(id) {
    if (localList.length <= 1) { toast.error(t('cases.editColumns.minColumnsError')); return }
    const { error } = await onDelete(id)
    if (error) { toast.error(t('cases.editColumns.deleteError')); return }
    setLocalList(prev => prev.filter(s => s.id !== id))
  }

  function move(idx, dir) {
    const next = [...localList]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setLocalList(next)
    onReorder(next)
  }

  return (
    <div className={styles.editColsBody}>
      <p className={styles.editColsHint}>
        {t('cases.editColumns.hint')}
      </p>

      <div className={styles.editColsList}>
        {localList.map((sit, idx) => (
          <div key={sit.id} className={styles.editColRow}>
            <span className={styles.editColDot} style={{ background: sit.color ?? '#888' }} />

            {editing?.id === sit.id ? (
              <>
                <input
                  className={styles.editColInput}
                  value={editing.value}
                  onChange={e => setEditing(p => ({ ...p, value: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                  autoFocus
                />
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={editing.color ?? '#4361ee'}
                  onChange={e => setEditing(p => ({ ...p, color: e.target.value }))}
                  title={t('cases.editColumns.chooseColor')}
                />
                <button className={styles.editColBtnSave}   onClick={handleSaveEdit}>✓</button>
                <button className={styles.editColBtnCancel} onClick={() => setEditing(null)}>✕</button>
              </>
            ) : (
              <>
                <span className={styles.editColName}>{sit.value}</span>
                <div className={styles.editColActions}>
                  <button className={styles.editColBtn} onClick={() => move(idx, -1)} disabled={idx === 0} title={t('cases.editColumns.moveUp')}>↑</button>
                  <button className={styles.editColBtn} onClick={() => move(idx, 1)} disabled={idx === localList.length - 1} title={t('cases.editColumns.moveDown')}>↓</button>
                  <button className={styles.editColBtn} onClick={() => setEditing({ id: sit.id, value: sit.value, color: sit.color ?? '#4361ee' })} title={t('common.edit')}>✎</button>
                  <button className={`${styles.editColBtn} ${styles.editColBtnDel}`} onClick={() => handleDelete(sit.id)} title={t('common.delete')}>✕</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className={styles.editColAdd}>
        <span className={styles.editColDot} style={{ background: newColor }} />
        <input
          className={styles.editColInput}
          placeholder={t('cases.editColumns.newColumnPlaceholder')}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <input
          type="color"
          className={styles.colorPicker}
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          title={t('cases.editColumns.chooseColor')}
        />
        <button className={styles.editColBtnAdd} onClick={handleAdd}>{t('cases.editColumns.addButton')}</button>
      </div>

      <div className={styles.editColsFooter}>
        <button className={styles.btnSalvar} onClick={onClose}>{t('common.save')}</button>
      </div>
    </div>
  )
}

/* ── Despacho attempt boxes ─────────────────────────────────────────── */
function DespachoBoxes({ attempts, onToggle }) {
  const { t, i18n } = useTranslation()
  function fmt(ts) {
    if (!ts) return ''
    return formatDate(ts, i18n.language, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
  return (
    <div className={styles.despachoRow} onClick={e => e.stopPropagation()}>
      <span className={styles.despachoLabel}>{t('cases.despacho.label')}</span>
      {attempts.map((ts, i) => (
        <div key={i} className={styles.despachoWrap}>
          <button
            className={`${styles.despachoBox} ${ts ? styles.despachoBoxChecked : ''}`}
            onClick={e => { e.stopPropagation(); onToggle(i) }}
            title={ts ? t('cases.despacho.tooltipFilled', { n: i + 1, date: fmt(ts) }) : t('cases.despacho.tooltipEmpty', { n: i + 1 })}
          >
            {ts && (
              <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="8" height="8">
                <polyline points="1.5 6 4.5 9 10.5 3"/>
              </svg>
            )}
          </button>
          <span className={styles.despachoNum}>{i + 1}°</span>
        </div>
      ))}
    </div>
  )
}

/* ── KanbanView ─────────────────────────────────────────────────────── */
function KanbanView({ cases, situations, sitLoading, onMoveSituation, onEditColumns, onDespachoToggle }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [draggingId, setDraggingId] = useState(null)
  const [dragOver,   setDragOver]   = useState(null)

  const bySituation = useMemo(() => {
    const map = {}
    situations.forEach(s => { map[s.id] = [] })
    map['__none__'] = []
    cases.forEach(c => {
      if (c.situation && map[c.situation] !== undefined) {
        map[c.situation].push(c)
      } else {
        map['__none__'].push(c)
      }
    })
    return map
  }, [cases, situations])

  const hasNone = (bySituation['__none__'] ?? []).length > 0
  const cols = [
    ...situations,
    ...(hasNone ? [{ id: '__none__', value: t('cases.kanban.uncategorized'), color: '#94a3b8' }] : []),
  ]

  function handleDragStart(e, id) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOver(e, sitId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(sitId)
  }
  function handleDrop(e, sitId) {
    e.preventDefault()
    if (draggingId) onMoveSituation(draggingId, sitId === '__none__' ? null : sitId)
    setDraggingId(null)
    setDragOver(null)
  }
  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null)
  }
  function handleDragEnd() {
    setDraggingId(null)
    setDragOver(null)
  }

  return (
    <div className={styles.kanbanWrapper}>
      <div className={styles.kanbanToolbar}>
        <button className={styles.btnEditCols} onClick={onEditColumns}>
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l.975.98a1.75 1.75 0 0 1 0 2.474L9.168 10.17a1.75 1.75 0 0 1-.619.41l-2.972 1.09a.75.75 0 0 1-.966-.966l1.09-2.972a1.75 1.75 0 0 1 .41-.619l5.902-5.676Z"/>
          </svg>
          {t('cases.kanban.editColumnsButton')}
        </button>
      </div>

      <div className={styles.kanbanBoard}>
        {sitLoading
          ? [1,2,3,4].map(i => (
              <div key={i} className={styles.kanbanCol}>
                <div className={styles.kanbanColHeader}>
                  <span className={styles.kanbanColTitle} style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>—</span>
                </div>
                <div className={styles.kanbanItems}>
                  {[1, 2, 3].map(j => <SkeletonKanbanCard key={j} />)}
                </div>
              </div>
            ))
          : cols.map(sit => {
              const items = bySituation[sit.id] ?? []
              const isOver = dragOver === sit.id
              const col = sit.color ?? '#888'
              return (
                <div
                  key={sit.id}
                  className={`${styles.kanbanCol} ${isOver ? styles.kanbanColOver : ''}`}
                  onDragOver={e => handleDragOver(e, sit.id)}
                  onDrop={e => handleDrop(e, sit.id)}
                  onDragLeave={handleDragLeave}
                >
                  <div className={styles.kanbanColHeader}>
                    <span
                      className={styles.kanbanColTitle}
                      style={{ background: col + '28', color: col }}
                    >
                      {sit.value}
                    </span>
                    <span className={styles.kanbanColCount}>{items.length}</span>
                  </div>
                  <div className={styles.kanbanItems}>
                    {items.length === 0
                      ? <div className={styles.kanbanEmpty}>—</div>
                      : items.map(c => (
                          <div
                            key={c.id}
                            className={`${styles.kanbanCard} ${draggingId === c.id ? styles.kanbanCardDragging : ''}`}
                            draggable
                            onDragStart={e => handleDragStart(e, c.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => navigate('/painel/casos/' + c.id)}
                          >
                            <div className={styles.kanbanCardTitle}>{c.titulo}</div>
                            {c.clienteId
                              ? <Link to={`/painel/clientes/${c.clienteId}`} className={styles.kanbanCardClient} onClick={e => e.stopPropagation()}>{c.cliente}</Link>
                              : <div className={styles.kanbanCardClient}>{c.cliente}</div>}
                            <div className={styles.kanbanCardMeta}>
                              <span className="badge" style={{ background: col + '22', color: col, border: `1px solid ${col}44` }}>{c.tribunal}</span>
                              {c.valor > 0 && <span className={styles.kanbanCardValor}>{brl(c.valor, i18n.language)}</span>}
                              {(() => {
                                const days = daysSince(c.situationChangedAt)
                                const ds = statusDaysStyle(days)
                                if (!ds) return null
                                return (
                                  <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 4, background: ds.bg, color: ds.color, whiteSpace: 'nowrap' }}>
                                    {days}d
                                  </span>
                                )
                              })()}
                            </div>
                            {/despachar/i.test(sit.value) && (
                              <DespachoBoxes
                                attempts={c.despachoAttempts}
                                onToggle={idx => onDespachoToggle?.(c.id, c.despachoAttempts, idx)}
                              />
                            )}
                          </div>
                        ))
                    }
                  </div>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}

/* ── SkeletonKanban ─────────────────────────────────────────────────── */
function SkeletonKanban() {
  return (
    <div className={styles.kanbanWrapper}>
      <div className={styles.kanbanBoard}>
        {[1,2,3,4].map(i => (
          <div key={i} className={styles.kanbanCol}>
            <div className={styles.kanbanColHeader}>
              <span className={styles.kanbanColTitle} style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>—</span>
            </div>
            <div className={styles.kanbanItems}>
              {[1, 2, 3].map(j => <SkeletonKanbanCard key={j} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── ListView ───────────────────────────────────────────────────────── */
function SituationSelect({ caseId, currentSituation, situations, onMove }) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const sit = situations.find(s => s.id === currentSituation)

  async function handleChange(e) {
    e.stopPropagation()
    const val = e.target.value
    setSaving(true)
    await onMove(caseId, val === '' ? null : val)
    setSaving(false)
  }

  return (
    <select
      className={styles.sitSelect}
      style={{ borderLeftColor: sit?.color ?? '#94a3b8' }}
      value={currentSituation ?? ''}
      onChange={handleChange}
      onClick={e => e.stopPropagation()}
      disabled={saving}
      title={t('cases.kanban.changeSituation')}
    >
      <option value="">{t('cases.kanban.noSituation')}</option>
      {situations.map(s => (
        <option key={s.id} value={s.id}>{s.value}</option>
      ))}
    </select>
  )
}

function ListView({ cases, situations, onMoveSituation, onEdit }) {
  const { t, i18n } = useTranslation()
  const sorted = [...cases].sort((a, b) => a.titulo.localeCompare(b.titulo, i18n.language === 'en' ? 'en-US' : 'pt-BR', { sensitivity: 'base' }))
  if (sorted.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>⚖</div>
      <p>{t('cases.emptyList')}</p>
    </div>
  )
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('cases.table.case')}</th>
            <th>{t('cases.table.client')}</th>
            <th>{t('cases.table.situation')}</th>
            <th>{t('cases.table.type')}</th>
            <th>{t('cases.table.court')}</th>
            <th>{t('cases.table.value')}</th>
            <th>{t('cases.table.updated')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(c => (
            <tr key={c.id} className={styles.tableRow} onClick={() => onEdit(c.id)} style={{ cursor: 'pointer' }}>
              <td>
                <div className={styles.caseTitle}>{c.titulo}</div>
                <div className={styles.caseNumber}>{c.numero}</div>
              </td>
              <td className={styles.clientCell} onClick={e => e.stopPropagation()}>
                {c.clienteId
                  ? <Link to={`/painel/clientes/${c.clienteId}`} className={styles.clientLink}>{c.cliente}</Link>
                  : c.cliente}
              </td>
              <td onClick={e => e.stopPropagation()}>
                <SituationSelect
                  caseId={c.id}
                  currentSituation={c.situation}
                  situations={situations}
                  onMove={onMoveSituation}
                />
              </td>
              <td><span className="badge st-teal">{c.tipo}</span></td>
              <td><span className={`badge ${c.trib_color}`}>{c.tribunal}</span></td>
              <td className={styles.valorCell}>{brl(c.valor, i18n.language)}</td>
              <td className={styles.dateCell}>
                {c.atualizado ? formatDate(c.atualizado, i18n.language, { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── DonutChart ─────────────────────────────────────────────────────── */
function DonutChart({ procedente, improcedente, outro }) {
  const { t } = useTranslation()
  const total = procedente + improcedente + outro
  const r = 58
  const cx = 80, cy = 80
  const strokeW = 24
  const circumference = 2 * Math.PI * r

  const segments = [
    { value: procedente,   color: '#22c55e', label: t('cases.outcome.procedente'),   pct: total > 0 ? procedente / total : 0 },
    { value: improcedente, color: '#ef4444', label: t('cases.outcome.improcedente'), pct: total > 0 ? improcedente / total : 0 },
    { value: outro,        color: '#94a3b8', label: t('cases.outcome.outro'),        pct: total > 0 ? outro / total : 0 },
  ]

  let accumulated = 0
  const arcs = segments.map(s => {
    const dash   = s.pct * circumference
    const offset = -(accumulated / (total || 1)) * circumference
    accumulated += s.value
    return { ...s, dash, offset }
  })

  return (
    <div className={styles.chartWrap}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {total === 0
          ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-color,#e2e8f0)" strokeWidth={strokeW} />
          : arcs.map((a, i) => a.value > 0 && (
              <circle key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={strokeW}
                strokeDasharray={`${a.dash} ${circumference - a.dash}`}
                strokeDashoffset={a.offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            ))
        }
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text,#1a1a2e)">{total}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="10" fill="var(--text-3,#94a3b8)" fontWeight="500">{t('cases.kanban.casesUnit')}</text>
      </svg>
      <div className={styles.chartLegend}>
        {segments.map(s => (
          <div key={s.label} className={styles.legendRow}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendCount}>{s.value}</span>
            <span className={styles.legendPct}>
              {total > 0 ? Math.round(s.pct * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── FinalizadosView ─────────────────────────────────────────────────── */
function outcomeMeta(t, outcome) {
  const map = {
    procedente:   { label: t('cases.outcome.procedente'),   cls: 'st-teal' },
    improcedente: { label: t('cases.outcome.improcedente'), cls: 'st-red'  },
    outro:        { label: t('cases.outcome.outro'),        cls: 'st-gray' },
  }
  return map[outcome] ?? { label: outcome ?? '—', cls: 'st-gray' }
}

function FinalizadosView({ cases, loading, onReactivate }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const procedente   = cases.filter(c => c.outcome === 'procedente').length
  const improcedente = cases.filter(c => c.outcome === 'improcedente').length
  const outro        = cases.filter(c => c.outcome === 'outro' || !c.outcome).length

  if (loading) return <div className={styles.emptyState}><p>{t('cases.loading')}</p></div>

  return (
    <div className={styles.finalizadosWrap}>
      {cases.length === 0
        ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚖</div>
            <p>{t('cases.finalized.empty')}</p>
          </div>
        ) : (
          <>
            <div className={styles.finalizadosTop}>
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>{t('cases.finalized.chartTitle')}</div>
                <DonutChart procedente={procedente} improcedente={improcedente} outro={outro} />
              </div>
            </div>

            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('cases.table.case')}</th>
                    <th>{t('cases.table.client')}</th>
                    <th>{t('cases.detail.area')}</th>
                    <th>{t('cases.table.result')}</th>
                    <th>{t('cases.table.reason')}</th>
                    <th>{t('cases.table.finalizedAt')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => {
                    const om = outcomeMeta(t, c.outcome)
                    const finDate = c.finalizado_at
                      ? formatDate(c.finalizado_at, i18n.language, { day: '2-digit', month: '2-digit', year: '2-digit' })
                      : '—'
                    return (
                      <tr key={c.id} className={styles.tableRow} style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/painel/casos/' + c.id)}>
                        <td>
                          <div className={styles.caseTitle}>{c.title}</div>
                          <div className={styles.caseNumber}>{c.case_number ?? '—'}</div>
                        </td>
                        <td className={styles.clientCell} onClick={e => e.stopPropagation()}>
                          {c.clients?.id
                            ? <Link to={`/painel/clientes/${c.clients.id}`} className={styles.clientLink}>{c.clients.full_name}</Link>
                            : (c.clients?.full_name ?? '—')}
                        </td>
                        <td>{c.area ? <span className="badge st-teal">{c.area}</span> : '—'}</td>
                        <td><span className={`badge ${om.cls}`}>{om.label}</span></td>
                        <td className={styles.reasonCell}>{c.outcome_reason || '—'}</td>
                        <td className={styles.dateCell}>{finDate}</td>
                        <td className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                          <button
                            className={styles.reactivateBtn}
                            onClick={() => onReactivate(c.id, c.title)}
                            title={t('cases.reactivate.title')}
                          >
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.89"/>
                              <path d="M13.5 2.5v3.5H10"/>
                            </svg>
                            {t('cases.reactivate.button')}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      }
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function Cases() {
  const { t, i18n } = useTranslation()
  const { lawyer } = useAuth()
  const toast      = useToast()
  const navigate   = useNavigate()
  const prefs      = loadPreferences(lawyer)

  const [tab, setTab]                 = useState('ativos')
  const [view, setView]               = useState(prefs.casos_view ?? 'kanban')
  const [search, setSearch]           = useState('')
  const [formOpen, setFormOpen]       = useState(false)
  const [editing,  setEditing]        = useState(null)
  const [editColsOpen, setEditColsOpen] = useState(false)

  const { data: rawCases, loading, error, refetch } = useCases()
  const { data: rawFinalizados, loading: finLoading, refetch: refetchFinalizados } = useFinalisedCases()
  const { situations, loading: sitLoading, addSituation, updateSituation, deleteSituation, reorderSituations } = useKanbanSituations()

  // exclude finalized from the active tab
  const cases = useMemo(
    () => (rawCases ?? []).filter(c => c.status !== 'finalizado').map(mapCase),
    [rawCases]
  )
  const finalizados = rawFinalizados ?? []

  function openDetail(id) { navigate('/painel/casos/' + id) }
  function handleSave() {
    refetch()
    setFormOpen(false)
    toast.success(editing ? t('cases.toastUpdated') : t('cases.toastCreated'))
  }
  function handleViewChange(v) {
    setView(v)
    savePreferences(lawyer, { casos_view: v })
  }

  async function handleMoveSituation(caseId, situationId) {
    const { error: err } = await updateCaseSituation(caseId, situationId)
    if (err) toast.error(t('cases.moveError'))
    else refetch()
  }

  async function handleDespachoToggle(caseId, currentAttempts, idx) {
    const arr = [...(Array.isArray(currentAttempts) ? currentAttempts : [null, null, null])]
    arr[idx] = arr[idx] ? null : new Date().toISOString()
    const payload = arr.every(x => !x) ? null : arr
    await updateDespachoAttempts(caseId, payload)
    refetch()
  }

  async function handleReactivate(caseId, caseTitle) {
    if (!window.confirm(t('cases.reactivate.confirm', { title: caseTitle }))) return
    const { error } = await reactivateCase(caseId)
    if (error) { toast.error(t('cases.reactivate.error')); return }
    refetch()
    refetchFinalizados()
    toast.success(t('cases.reactivate.success'))
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return cases
    const q = search.toLowerCase()
    return cases.filter(c =>
      c.titulo.toLowerCase().includes(q) ||
      c.cliente.toLowerCase().includes(q) ||
      c.numero.includes(q)
    )
  }, [cases, search])

  return (
    <PageShell
      title={t('cases.pageTitle')}
      subtitle={loading ? t('cases.loading') : `${t('cases.activeCountLabel', { count: cases.length })} · ${t('cases.finalizedCountLabel', { count: finalizados.length })}`}
      viewToggle={tab === 'ativos' ? <ViewToggle value={view} onChange={handleViewChange} /> : null}
      fullWidth={tab === 'ativos' && view === 'kanban'}
      action={
        tab === 'ativos' ? (
          <button className={styles.btnNovo} onClick={() => { setEditing(null); setFormOpen(true) }}>
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
            {t('cases.newCase')}
          </button>
        ) : null
      }
      filters={
        <>
          <div className={styles.tabBar}>
            <button
              className={`${styles.tabBtn} ${tab === 'ativos' ? styles.tabBtnActive : ''}`}
              onClick={() => setTab('ativos')}
            >
              {t('cases.tabs.active')}
              <span className={styles.tabCount}>{cases.length}</span>
            </button>
            <button
              className={`${styles.tabBtn} ${tab === 'finalizados' ? styles.tabBtnActive : ''}`}
              onClick={() => setTab('finalizados')}
            >
              {t('cases.tabs.finalized')}
              <span className={styles.tabCount}>{finalizados.length}</span>
            </button>
          </div>

          {tab === 'ativos' && (
            <>
              <div className={styles.searchWrap}>
                <svg className={styles.searchIcon} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.856a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
                </svg>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder={t('cases.searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </>
          )}
        </>
      }
    >
      {tab === 'finalizados'
        ? <FinalizadosView cases={finalizados} loading={finLoading} onReactivate={handleReactivate} />
        : error
          ? <div className={styles.emptyState}><p>{t('cases.errorLoading')}</p></div>
          : loading
            ? view === 'kanban'
              ? <SkeletonKanban />
              : <div className={styles.tableCard}><SkeletonTable rows={6} cols={7} /></div>
            : view === 'kanban'
              ? <KanbanView
                  cases={filtered}
                  situations={situations}
                  sitLoading={sitLoading}
                  onMoveSituation={handleMoveSituation}
                  onEditColumns={() => setEditColsOpen(true)}
                  onDespachoToggle={handleDespachoToggle}
                />
              : <ListView cases={filtered} situations={situations} onMoveSituation={handleMoveSituation} onEdit={openDetail} />
      }

      {formOpen && (
        <Modal title={editing ? t('cases.editCase') : t('cases.newCaseModal')} onClose={() => setFormOpen(false)} size="lg">
          <CaseForm initial={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </Modal>
      )}

      {editColsOpen && (
        <Modal title={t('cases.editColumns.modalTitle')} onClose={() => setEditColsOpen(false)}>
          <EditColumnsModal
            situations={situations}
            onAdd={addSituation}
            onUpdate={updateSituation}
            onDelete={deleteSituation}
            onReorder={reorderSituations}
            onClose={() => setEditColsOpen(false)}
          />
        </Modal>
      )}
    </PageShell>
  )
}
