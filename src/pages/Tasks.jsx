import { useState, useMemo, Fragment, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { loadPreferences, savePreferences } from '@/hooks/usePreferences'
import { useAllTasks, updateTaskStatus, updateTaskOrder, updateTaskAssignee } from '@/hooks/useTasks'
import { useUpcomingHearings } from '@/hooks/useHearings'
import { useToast } from '@/context/ToastContext'
import { usePomodoroContext, FOCUS_SECS } from '@/context/PomodoroContext'
import { supabase } from '@/lib/supabase'
import PageShell from '@/components/ui/PageShell'
import ViewToggle from '@/components/ui/ViewToggle'
import Modal from '@/components/ui/Modal'
import TaskForm from '@/components/forms/TaskForm'
import styles from './Tasks.module.css'

/* ── Calendar helpers ───────────────────────────────────────────────── */
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const PRI_DOT = { urgente: 'var(--red)', alta: 'var(--red)', media: '#f59e0b', baixa: 'var(--accent)' }
const PRI_DOT_HEX = { urgente: '#ef4444', alta: '#ef4444', media: '#f59e0b', baixa: '#4361ee' }

const RESP_COLORS = ['#4361ee','#7c3aed','#2a9d8f','#e76f51','#f4a261','#264653','#1d3557','#c77dff','#e63946','#06b6d4']

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function startOfWeek(d) {
  const sd = new Date(d)
  sd.setDate(d.getDate() - d.getDay())
  return sd
}
function addDays(d, n) {
  const nd = new Date(d)
  nd.setDate(d.getDate() + n)
  return nd
}
function respColor(name, responsaveis) {
  const idx = responsaveis.indexOf(name)
  return idx >= 0 ? RESP_COLORS[idx % RESP_COLORS.length] : '#888'
}

/* ── data mapper ────────────────────────────────────────────────────── */
function mapTask(t) {
  const timePart = t.due_date?.split('T')[1]?.slice(0, 5)
  return {
    id:          t.id,
    titulo:      t.title,
    status:      t.status,
    prioridade:  t.priority,
    vencimento:  t.due_date?.split('T')[0] ?? null,
    horario:     (timePart && timePart !== '12:00' && timePart !== '00:00') ? timePart : null,
    caso:        t.cases?.title ?? '—',
    responsavel: t.assigned_to ?? null,
  }
}

/* ── constants ─────────────────────────────────────────────────────── */
const KANBAN_COLS = [
  { key: 'pendente',     label: 'Pendente',     color: 'st-gold' },
  { key: 'em_andamento', label: 'Em Andamento', color: 'st-blue' },
  { key: 'concluida',    label: 'Concluída',    color: 'st-green' },
  { key: 'cancelada',    label: 'Cancelada',    color: 'st-dark' },
]

const PRI_CSS    = { urgente: 'badge-alta', alta: 'badge-alta', media: 'badge-media', baixa: 'badge-baixa' }
const PRI_LABELS = { urgente: 'Urgente',   alta: 'Alta',       media: 'Média',       baixa: 'Baixa' }

function fmtDate(d, opts) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', opts)
}

/* ── Despachos / Pomodoro constants ────────────────────────────────── */
const DESP_TIPOS = [
  'Conclusão para Decisão', 'Conclusão para Julgamento', 'Conclusão para Sentença',
  'Vista ao Ministério Público', 'Cumprimento de Diligência', 'Juntada de Petição', 'Outros',
]

/* ── Card icons ─────────────────────────────────────────────────────── */
const ICON_TODAY = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
    <path d="M5.5 1.5v3M10.5 1.5v3M2 7h12"/>
    <circle cx="8" cy="10.5" r="2" fill="currentColor" stroke="none"/>
  </svg>
)

const ICON_NODATE = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
    <path d="M5.5 1.5v3M10.5 1.5v3M2 7h12"/>
    <path d="M5.5 10.5h5"/>
  </svg>
)

const ICON_TMR = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
    <path d="M5.5 1.5v3M10.5 1.5v3M2 7h12"/>
    <path d="M5.5 10.5h2.5M10.5 8.5l2 2-2 2"/>
  </svg>
)

const ICON_UPCOMING = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
    <path d="M5.5 1.5v3M10.5 1.5v3M2 7h12"/>
    <circle cx="5"  cy="9.5"  r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="8"  cy="9.5"  r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="11" cy="9.5"  r="0.9" fill="currentColor" stroke="none"/>
    <circle cx="5"  cy="12.5" r="0.9" fill="currentColor" stroke="none" opacity="0.4"/>
    <circle cx="8"  cy="12.5" r="0.9" fill="currentColor" stroke="none" opacity="0.4"/>
    <circle cx="11" cy="12.5" r="0.9" fill="currentColor" stroke="none" opacity="0.4"/>
  </svg>
)

const ICON_HEARING = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 14.5h13"/>
    <rect x="2.5" y="10" width="11" height="4" rx="0.5"/>
    <path d="M4.5 10V8M8 10V8M11.5 10V8"/>
    <path d="M2.5 8h11"/>
    <path d="M8 2.5l5.5 5.5H2.5L8 2.5z"/>
  </svg>
)

function CardIcon({ icon }) {
  return <span className={styles.agendaCardIcon}>{icon}</span>
}

/* ── Pomodoro (thin horizontal) ─────────────────────────────────────── */
function PomodoroThin() {
  const { mode, secs, cycles, startFocus, resumeTimer, pauseTimer, resetTimer } = usePomodoroContext()

  const mins      = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss        = String(secs % 60).padStart(2, '0')
  const running   = mode === 'focus' || mode === 'break'
  const paused    = mode === 'idle' && secs < FOCUS_SECS
  const accentCol = mode === 'break' ? 'var(--green)' : 'var(--accent)'

  return (
    <div className={`${styles.agendaCard} ${styles.agendaCardFull} ${styles.pomThin}`}>
      <div className={styles.pomThinInner}>
        <div className={styles.pomThinLeft}>
          <span className={styles.pomThinLabel}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" width="14" height="14">
              <circle cx="8" cy="8" r="6.5"/>
              <path d="M8 5v3.5l2.5 1.5"/>
            </svg>
            Pomodoro
          </span>
          <span className={`badge ${mode === 'focus' ? 'badge-alta' : mode === 'break' ? 'st-green' : 'st-gray'}`} style={{ fontSize: '0.6rem' }}>
            {mode === 'focus' ? 'Foco' : mode === 'break' ? 'Pausa' : 'Parado'}
          </span>
          {cycles > 0 && (
            <span className="badge st-teal" style={{ fontSize: '0.6rem' }}>{cycles} ciclo{cycles > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className={styles.pomThinTimer}>
          <span className={styles.pomThinTime} style={{ color: accentCol }}>{mins}:{ss}</span>
          <span className={styles.pomThinHint}>{mode === 'break' ? '☕ pausa' : '30 min foco · 5 min pausa'}</span>
        </div>
        <div className={styles.pomThinActions}>
          {!running && (
            <button className={styles.pomThinBtnPrimary} onClick={paused ? resumeTimer : startFocus}>
              <svg viewBox="0 0 14 14" fill="currentColor" width="10" height="10"><path d="M3 2v10l9-5z"/></svg>
              {paused ? 'Retomar' : 'Iniciar'}
            </button>
          )}
          {running && (
            <button className={styles.pomThinBtnSecondary} onClick={pauseTimer}>
              <svg viewBox="0 0 14 14" fill="currentColor" width="10" height="10">
                <rect x="2.5" y="2" width="3" height="10"/>
                <rect x="8.5" y="2" width="3" height="10"/>
              </svg>
              Pausar
            </button>
          )}
          {secs !== FOCUS_SECS && (
            <button className={styles.pomThinBtnGhost} onClick={resetTimer} title="Reiniciar">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="11" height="11">
                <path d="M12 7A5 5 0 1 1 7 2M7 0v4h4"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Mode toggle pill ────────────────────────────────────────────────── */
function ModeToggle({ mode, onToggle, mini }) {
  const isPresencial = mode === 'presencial'
  return (
    <button
      className={mini ? styles.modeToggleMini : styles.modeToggle}
      style={{ background: isPresencial ? '#22a84a' : '#7c3aed' }}
      onClick={e => { e.stopPropagation(); onToggle() }}
      title="Clique para alternar modo do dia"
    >
      {isPresencial ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={mini ? 7 : 9} height={mini ? 7 : 9}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={mini ? 7 : 9} height={mini ? 7 : 9}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      )}
      {isPresencial ? 'Presencial' : 'Virtual'}
    </button>
  )
}

/* ── Despachos card ──────────────────────────────────────────────────── */
function DespachosCard({ lawyerId, responsaveis, isIntern, internName }) {
  const [cases,   setCases]   = useState([])
  const [queue,   setQueue]   = useState([])
  const [history, setHistory] = useState([])
  const [selCase, setSelCase] = useState('')
  const [selResp, setSelResp] = useState('')
  const [tab,     setTab]     = useState('fila')

  useEffect(() => {
    supabase.from('cases').select('id, title, case_number, court')
      .in('status', ['ativo', 'suspenso']).order('title')
      .then(({ data }) => setCases(data ?? []))
  }, [])

  const caseMap = useMemo(() => {
    const m = {}
    cases.forEach(c => { m[c.id] = c })
    return m
  }, [cases])

  useEffect(() => {
    if (!lawyerId) return
    let qQ = supabase.from('workspace_despachos')
      .select('*').eq('status', 'pendente').order('created_at')
    if (isIntern && internName) qQ = qQ.eq('responsavel', internName)
    qQ.then(({ data }) => setQueue(data ?? []))

    let hQ = supabase.from('workspace_despachos')
      .select('*').eq('status', 'concluido')
      .order('done_at', { ascending: false }).limit(30)
    if (isIntern && internName) hQ = hQ.eq('responsavel', internName)
    hQ.then(({ data }) => setHistory(data ?? []))
  }, [lawyerId, isIntern, internName])

  async function addToQueue() {
    const c = cases.find(c => c.id === selCase)
    if (!c || !lawyerId) return
    const { data } = await supabase.from('workspace_despachos')
      .insert({ lawyer_id: lawyerId, case_id: c.id, case_title: c.title, local: 'Secretaria', tipo: DESP_TIPOS[0], notas: '', status: 'pendente', responsavel: selResp || null })
      .select('*').single()
    if (data) setQueue(prev => [...prev, data])
    setSelCase('')
  }

  async function update(id, field, val) {
    setQueue(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d))
    await supabase.from('workspace_despachos').update({ [field]: val }).eq('id', id)
  }

  async function markDone(id) {
    const doneAt = new Date().toISOString()
    const { data } = await supabase.from('workspace_despachos')
      .update({ status: 'concluido', done_at: doneAt }).eq('id', id).select('*').single()
    setQueue(prev => prev.filter(d => d.id !== id))
    if (data) setHistory(prev => [data, ...prev])
  }

  async function removeQ(id) {
    setQueue(prev => prev.filter(d => d.id !== id))
    await supabase.from('workspace_despachos').delete().eq('id', id)
  }

  function fmtD(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const ICON_DESP = (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M1.5 14.5h13"/><rect x="2.5" y="10" width="11" height="4" rx="0.5"/>
      <path d="M4.5 10V8M8 10V8M11.5 10V8"/>
      <path d="M2.5 8h11"/><path d="M8 2.5l5.5 5.5H2.5L8 2.5z"/>
    </svg>
  )

  return (
    <div className={`${styles.agendaCard} ${styles.agendaCardFull}`}>
      <div className={styles.agendaCardHeader}>
        <span className={styles.agendaCardIcon}>{ICON_DESP}</span>
        <span className={styles.agendaCardTitle}>Despachos</span>
        {queue.length > 0 && <span className="badge badge-alta">{queue.length}</span>}
      </div>
      <div className={styles.dspInner}>
        <div className={styles.dspTabs}>
          <button className={`${styles.dspTab} ${tab === 'fila' ? styles.dspTabActive : ''}`} onClick={() => setTab('fila')}>
            Fila {queue.length > 0 ? `(${queue.length})` : ''}
          </button>
          <button className={`${styles.dspTab} ${tab === 'hist' ? styles.dspTabActive : ''}`} onClick={() => setTab('hist')}>
            Histórico {history.length > 0 ? `(${history.length})` : ''}
          </button>
        </div>
        {tab === 'fila' && (
          <>
            <div className={styles.dspAddRow}>
              <select className={styles.dspSelect} value={selCase} onChange={e => setSelCase(e.target.value)}>
                <option value="">Selecionar processo…</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.case_number ? `${c.title} · ${c.case_number}` : c.title}</option>)}
              </select>
              {responsaveis.length > 0 && !isIntern && (
                <select className={styles.dspRespSel} value={selResp} onChange={e => setSelResp(e.target.value)}>
                  <option value="">Responsável…</option>
                  {responsaveis.map(r => <option key={r} value={r}>{r.split(' ')[0]}</option>)}
                </select>
              )}
              <button className={styles.dspAddBtn} onClick={addToQueue} disabled={!selCase}>+</button>
            </div>
            {queue.length === 0
              ? <div className={styles.dimMsg}>Fila vazia.</div>
              : (
                <div className={styles.dspQueue}>
                  {queue.map(d => (
                    <div key={d.id} className={styles.dspItem}>
                      <div className={styles.dspItemHead}>
                        <div className={styles.dspCaseInfo}>
                          <span className={styles.dspCaseTitle}>{d.case_title}</span>
                          {(() => { const ci = caseMap[d.case_id]; return (ci?.case_number || ci?.court) ? (
                            <span className={styles.dspCaseMeta}>
                              {ci.case_number && <span>{ci.case_number}</span>}
                              {ci.court       && <span className={styles.dspCaseTrib}>{ci.court}</span>}
                            </span>
                          ) : null })()}
                        </div>
                        {responsaveis.length > 0 ? (
                          <select
                            className={styles.dspRespBadge}
                            value={d.responsavel || ''}
                            onChange={e => update(d.id, 'responsavel', e.target.value || null)}
                          >
                            <option value="">Sem resp.</option>
                            {responsaveis.map(r => <option key={r} value={r}>{r.split(' ')[0]}</option>)}
                          </select>
                        ) : d.responsavel ? (
                          <span className="badge st-teal" style={{ fontSize: '0.6rem' }}>{d.responsavel.split(' ')[0]}</span>
                        ) : null}
                        <button className={styles.dspXBtn} onClick={() => removeQ(d.id)}>×</button>
                      </div>
                      <div className={styles.dspLocalRow}>
                        {['Secretaria', 'Gabinete'].map(loc => (
                          <label key={loc} className={styles.dspRadioLabel}>
                            <input type="radio" name={`local-${d.id}`} checked={d.local === loc} onChange={() => update(d.id, 'local', loc)} />
                            {loc}
                          </label>
                        ))}
                      </div>
                      <select className={styles.dspTipoSel} value={d.tipo} onChange={e => update(d.id, 'tipo', e.target.value)}>
                        {DESP_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <textarea className={styles.dspNotes} value={d.notas} onChange={e => update(d.id, 'notas', e.target.value)} placeholder="Observações…" rows={2} />
                      <button className={styles.dspDoneBtn} onClick={() => markDone(d.id)}>✓ Despacho Realizado</button>
                    </div>
                  ))}
                </div>
              )
            }
          </>
        )}
        {tab === 'hist' && (
          <div className={styles.dspHistList}>
            {history.length === 0
              ? <div className={styles.dimMsg}>Nenhum despacho realizado.</div>
              : history.map(d => (
                <div key={d.id} className={styles.dspHistItem}>
                  <div className={styles.dspHistTop}>
                    <div className={styles.dspCaseInfo}>
                      <span className={styles.dspHistCase}>{d.case_title}</span>
                      {(() => { const ci = caseMap[d.case_id]; return (ci?.case_number || ci?.court) ? (
                        <span className={styles.dspCaseMeta}>
                          {ci.case_number && <span>{ci.case_number}</span>}
                          {ci.court       && <span className={styles.dspCaseTrib}>{ci.court}</span>}
                        </span>
                      ) : null })()}
                    </div>
                    <span className={styles.dspHistDate}>{fmtD(d.done_at)}</span>
                  </div>
                  <div className={styles.dspHistMeta}>
                    <span className="badge st-teal" style={{ fontSize: '0.6rem' }}>{d.local}</span>
                    {d.responsavel && <span className="badge st-blue" style={{ fontSize: '0.6rem' }}>{d.responsavel.split(' ')[0]}</span>}
                    <span className={styles.dspHistTipo}>{d.tipo}</span>
                  </div>
                  {d.notas && <p className={styles.dspHistNotes}>{d.notas}</p>}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

function HearingEventItem({ h, todayISO }) {
  const isToday = h.date === todayISO
  const d = new Date(h.date + 'T12:00:00')
  const monthShort = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
  return (
    <div className={styles.eventItem}>
      <div className={styles.evDateCol}>
        <span className={styles.evWeekday}>{WEEKDAYS_SHORT[d.getDay()]}</span>
        <span className={styles.evDay}>{d.getDate()}</span>
        <span className={styles.evMonth}>{monthShort}</span>
      </div>
      <div className={styles.evSep} />
      <div className={styles.evBody}>
        <div className={styles.evTitle}>{h.title}</div>
        <div className={styles.evMeta}>
          {isToday && <span className={`${styles.evTag} ${styles.evTagHoje}`}>Hoje</span>}
          {h.cases?.title && <span>{h.cases.title}</span>}
          {h.location && <span>{h.location}</span>}
        </div>
      </div>
      {h.time && <span className={styles.evHora}>{h.time.slice(0, 5)}</span>}
    </div>
  )
}

/* ── Agenda: shared sub-components ─────────────────────────────────── */
function RespPills({ responsaveis, value, onChange }) {
  if (responsaveis.length === 0) return null
  return (
    <div className={styles.respPills}>
      <button
        className={`${styles.respPill} ${value === 'todos' ? styles.respPillActiveTodos : ''}`}
        onClick={() => onChange('todos')}
      >Todos</button>
      {responsaveis.map((r, i) => {
        const col = RESP_COLORS[i % RESP_COLORS.length]
        const active = value === r
        return (
          <button
            key={r}
            className={`${styles.respPill} ${active ? styles.respPillActive : ''}`}
            style={active ? { background: col, color: '#fff', borderColor: col } : {}}
            onClick={() => onChange(r)}
          >
            <span className={styles.respPillDot} style={{ background: col }} />
            {r}
          </button>
        )
      })}
    </div>
  )
}

function AgendaTaskRow({ t, todayISO, responsaveis, onClick, onCheck, onOrderChange, onDragStart, onDragEnd, isDragging, onCycleAssignee }) {
  const overdue = t.due_date && t.due_date.split('T')[0] < todayISO && !['concluida','cancelada'].includes(t.status)
  const done    = t.status === 'concluida'
  const rawTime = t.due_date?.split('T')[1]?.slice(0, 5)
  const horario = (rawTime && rawTime !== '12:00' && rawTime !== '00:00') ? rawTime : null
  return (
    <div
      className={`${styles.agendaTaskRow} ${overdue ? styles.agendaTaskOverdue : ''} ${done ? styles.agendaTaskDone : ''} ${isDragging ? styles.agendaTaskDragging : ''}`}
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart?.(t.id) }}
      onDragEnd={e => { e.stopPropagation(); onDragEnd?.() }}
    >
      <input
        type="number"
        min="1"
        max="99"
        className={styles.agendaOrderInput}
        defaultValue={t.sort_order ?? ''}
        placeholder="–"
        title="Ordem (1 = primeira)"
        onClick={e => e.stopPropagation()}
        onBlur={e => onOrderChange(t.id, e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.target.blur() } }}
      />
      <button
        className={`${styles.agendaCheckBtn} ${done ? styles.agendaCheckBtnDone : ''}`}
        onClick={e => { e.stopPropagation(); onCheck(t.id) }}
        title={done ? 'Desmarcar' : 'Marcar como concluída'}
      />
      <span className={styles.agendaTaskDot} style={{ background: PRI_DOT_HEX[t.priority] ?? '#888' }} />
      <span className={styles.agendaTaskTitle} onClick={() => onClick(t.id)}>{t.title}</span>
      {horario && <span className={styles.taskTime}>{horario}</span>}
      {t.assigned_to && (
        <span
          className={styles.agendaTaskResp}
          style={{
            background: respColor(t.assigned_to, responsaveis) + '22',
            color: respColor(t.assigned_to, responsaveis),
            cursor: responsaveis.length > 0 ? 'pointer' : 'default',
          }}
          title={responsaveis.length > 0 ? 'Clique para mudar responsável' : t.assigned_to}
          onClick={e => { e.stopPropagation(); onCycleAssignee?.(t.id, t.assigned_to) }}
        >
          {t.assigned_to.split(' ')[0]}
        </span>
      )}
    </div>
  )
}

/* ── Agenda view ────────────────────────────────────────────────────── */
function AgendaView({ rawTasks, responsaveis, filterResp, session, lawyerId, isIntern, internName, onEdit, onNewWithDate, refetch, onCycleAssignee, showDayMode }) {
  const today    = new Date()
  const todayISO = toISO(today)
  const tomorrowISO = toISO(addDays(today, 1))

  const [dayOffset,  setDayOffset]  = useState(0)
  const [weekOffset, setWeekOffset] = useState(2)
  const [quickTitle, setQuickTitle] = useState('')
  const [addingQuick, setAddingQuick] = useState(false)
  const [draggingId, setDraggingId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [dayModes, setDayModes] = useState({})

  useEffect(() => {
    if (!lawyerId) return
    const from = toISO(addDays(today, -7))
    const to   = toISO(addDays(today, 35))
    supabase.from('workspace_day_modes')
      .select('date, mode').gte('date', from).lte('date', to)
      .then(({ data }) => {
        const map = {}
        data?.forEach(r => { map[r.date] = r.mode })
        setDayModes(map)
      })
  }, [lawyerId])

  async function toggleMode(dateISO) {
    const next = (dayModes[dateISO] ?? 'virtual') === 'virtual' ? 'presencial' : 'virtual'
    setDayModes(prev => ({ ...prev, [dateISO]: next }))
    await supabase.from('workspace_day_modes')
      .upsert({ lawyer_id: lawyerId, date: dateISO, mode: next }, { onConflict: 'lawyer_id,date' })
  }

  const { data: rawHearings } = useUpcomingHearings()

  const selectedISO = toISO(addDays(today, dayOffset))

  function handleDragStart(taskId) { setDraggingId(taskId) }
  function handleDragEnd()          { setDraggingId(null); setDropTarget(null) }

  function handleDragOver(key, e) {
    e.preventDefault()
    if (dropTarget !== key) setDropTarget(key)
  }
  function handleDragLeave(e) {
    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) setDropTarget(null)
  }

  async function handleDropOnZone(dueDate) {
    if (!draggingId) return
    setDropTarget(null)
    await supabase.from('tasks').update({ due_date: dueDate }).eq('id', draggingId)
    setDraggingId(null)
    refetch()
  }

  async function handleCheck(taskId) {
    await updateTaskStatus(taskId, 'concluida')
    refetch()
  }

  async function handleOrderChange(taskId, value) {
    await updateTaskOrder(taskId, value)
    refetch()
  }

  function byResp(tasks, filter) {
    if (filter === 'todos') return tasks
    return tasks.filter(t => t.assigned_to === filter)
  }

  function byOrder(tasks) {
    return [...tasks].sort((a, b) => {
      if (a.sort_order == null && b.sort_order == null) return 0
      if (a.sort_order == null) return 1
      if (b.sort_order == null) return -1
      return a.sort_order - b.sort_order
    })
  }

  const active = rawTasks.filter(t => !['concluida','cancelada'].includes(t.status))

  const todayTasks    = byOrder(byResp(active.filter(t => t.due_date?.split('T')[0] === selectedISO), filterResp))
  const noDateTasks   = byOrder(byResp(active.filter(t => !t.due_date), filterResp))
  const tomorrowTasks = byOrder(byResp(active.filter(t => t.due_date?.split('T')[0] === tomorrowISO), filterResp))

  const weekDays = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => {
      const d   = addDays(today, weekOffset + i)
      const iso = toISO(d)
      return {
        d, iso,
        isToday: iso === todayISO,
        tasks: byOrder(rawTasks.filter(t =>
          t.due_date?.split('T')[0] === iso &&
          (filterResp === 'todos' || t.assigned_to === filterResp)
        )),
      }
    })
  , [rawTasks, filterResp, todayISO, weekOffset])

  function dayTitle() {
    if (dayOffset === 0) return 'Hoje'
    if (dayOffset === 1) return 'Amanhã'
    if (dayOffset === -1) return 'Ontem'
    return new Date(selectedISO + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  async function handleQuickAdd(e) {
    e.preventDefault()
    const title = quickTitle.trim()
    if (!title) return
    setAddingQuick(true)
    await supabase.from('tasks').insert({
      lawyer_id:   session.user.id,
      title,
      priority:    'media',
      status:      'pendente',
      due_date:    null,
      assigned_to: filterResp !== 'todos' ? filterResp : null,
    })
    setAddingQuick(false)
    setQuickTitle('')
    refetch()
  }

  return (
    <div className={styles.agendaGrid}>
      <PomodoroThin />

      {/* ── Card 1: Tarefas do Dia ── */}
      <div className={styles.agendaCard}>
        <div className={styles.agendaCardHeader}>
          <CardIcon icon={ICON_TODAY} />
          <div className={styles.agendaNavRow}>
            <button className={styles.agendaNavBtn} onClick={() => setDayOffset(d => d - 1)}>‹</button>
            <button className={styles.agendaNavBtnToday} onClick={() => setDayOffset(0)}>Hoje</button>
            <button className={styles.agendaNavBtn} onClick={() => setDayOffset(d => d + 1)}>›</button>
          </div>
          <span className={styles.agendaCardTitle}>
            Tarefas e Compromissos — <em>{dayTitle()}</em>
          </span>
          <button
            className={styles.agendaAddBtn}
            onClick={() => onNewWithDate(selectedISO, filterResp !== 'todos' ? filterResp : null)}
            title="Nova tarefa"
          >+</button>
          {showDayMode !== false && <ModeToggle mode={dayModes[selectedISO] ?? 'virtual'} onToggle={() => toggleMode(selectedISO)} />}
        </div>
        <div
          className={`${styles.agendaCardBody} ${dropTarget === 'today' ? styles.agendaCardBodyDrop : ''}`}
          onDragOver={e => handleDragOver('today', e)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDropOnZone(selectedISO + 'T12:00:00')}
        >
          {todayTasks.length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma tarefa neste dia</div>
            : todayTasks.map(t => (
                <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} onCheck={handleCheck} onOrderChange={handleOrderChange} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isDragging={draggingId === t.id} onCycleAssignee={onCycleAssignee} />
              ))
          }
        </div>
      </div>

      {/* ── Card 2: Tarefas Sem Prazo ── */}
      <div className={styles.agendaCard}>
        <div className={styles.agendaCardHeader}>
          <CardIcon icon={ICON_NODATE} />
          <span className={styles.agendaCardTitle}>Tarefas Sem Prazo</span>
        </div>
        <form className={styles.agendaQuickAdd} onSubmit={handleQuickAdd}>
          <input
            className={styles.agendaQuickInput}
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder="Nova tarefa sem prazo…"
            disabled={addingQuick}
          />
          <button type="submit" className={styles.agendaQuickBtn} disabled={addingQuick || !quickTitle.trim()}>
            + Adicionar
          </button>
        </form>
        <div
          className={`${styles.agendaCardBody} ${dropTarget === 'nodate' ? styles.agendaCardBodyDrop : ''}`}
          onDragOver={e => handleDragOver('nodate', e)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDropOnZone(null)}
        >
          {noDateTasks.length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma tarefa sem prazo</div>
            : noDateTasks.map(t => (
                <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} onCheck={handleCheck} onOrderChange={handleOrderChange} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isDragging={draggingId === t.id} onCycleAssignee={onCycleAssignee} />
              ))
          }
        </div>
      </div>

      {/* ── Card 3: Amanhã ── */}
      <div className={`${styles.agendaCard} ${styles.agendaCardFull}`}>
        <div className={styles.agendaCardHeader}>
          <CardIcon icon={ICON_TMR} />
          <span className={styles.agendaCardTitle}>Amanhã</span>
          <span className={styles.agendaCardSub}>
            {new Date(tomorrowISO + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          {showDayMode !== false && <ModeToggle mode={dayModes[tomorrowISO] ?? 'virtual'} onToggle={() => toggleMode(tomorrowISO)} />}
          <button
            className={styles.agendaAddBtn}
            onClick={() => onNewWithDate(tomorrowISO, filterResp !== 'todos' ? filterResp : null)}
            title="Nova tarefa para amanhã"
          >+</button>
        </div>
        <div
          className={`${styles.agendaCardBody} ${dropTarget === 'tmr' ? styles.agendaCardBodyDrop : ''}`}
          onDragOver={e => handleDragOver('tmr', e)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDropOnZone(tomorrowISO + 'T12:00:00')}
        >
          {tomorrowTasks.length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma tarefa para amanhã</div>
            : tomorrowTasks.map(t => (
                <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} onCheck={handleCheck} onOrderChange={handleOrderChange} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isDragging={draggingId === t.id} onCycleAssignee={onCycleAssignee} />
              ))
          }
        </div>
      </div>

      {/* ── Card 4: Próximos 21 Dias ── */}
      <div className={`${styles.agendaCard} ${styles.agendaCardFull}`}>
        <div className={styles.agendaCardHeader}>
          <CardIcon icon={ICON_UPCOMING} />
          <span className={styles.agendaCardTitle}>Visão Mensal</span>
          <div className={styles.weekOffsetToggle}>
            <button
              className={`${styles.weekOffsetBtn} ${weekOffset === 0 ? styles.weekOffsetBtnActive : ''}`}
              onClick={() => setWeekOffset(0)}
              title="Iniciar a partir de hoje"
            >
              <svg viewBox="0 0 16 14" fill="none" width="14" height="13">
                <rect x="1" y="2" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 1v2.5M11 1v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M1 6h14" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="5" cy="9.5" r="2" fill="currentColor"/>
              </svg>
            </button>
            <button
              className={`${styles.weekOffsetBtn} ${weekOffset === 2 ? styles.weekOffsetBtnActive : ''}`}
              onClick={() => setWeekOffset(2)}
              title="Iniciar depois de amanhã"
            >
              <svg viewBox="0 0 16 14" fill="none" width="14" height="13">
                <rect x="1" y="2" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 1v2.5M11 1v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M1 6h14" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="4" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
                <circle cx="8" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
                <circle cx="12" cy="9.5" r="2" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <button
            className={styles.agendaAddBtn}
            onClick={() => onNewWithDate(null, filterResp !== 'todos' ? filterResp : null)}
            title="Nova tarefa"
          >+</button>
        </div>
        <div className={styles.weekGrid}>
          {[0, 7, 14, 21].map(rowStart => {
            const rowDays = weekDays.slice(rowStart, rowStart + 7)
            const f = rowDays[0]?.d, l = rowDays[6]?.d
            const label = f && l
              ? f.getMonth() === l.getMonth()
                ? `${f.getDate()}–${l.getDate()} ${MONTHS_PT[l.getMonth()].slice(0,3)}`
                : `${f.getDate()} ${MONTHS_PT[f.getMonth()].slice(0,3)} – ${l.getDate()} ${MONTHS_PT[l.getMonth()].slice(0,3)}`
              : ''
            return (
              <Fragment key={rowStart}>
                <div className={styles.weekRowDivider}>
                  <span className={styles.weekRowLabel}>{label}</span>
                </div>
                {rowDays.map(({ d, iso, isToday, tasks }) => (
                  <div
                    key={iso}
                    className={`${styles.weekCell} ${isToday ? styles.weekCellToday : ''} ${dropTarget === iso ? styles.weekCellDrop : ''}`}
                    onDragOver={e => handleDragOver(iso, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDropOnZone(iso + 'T12:00:00')}
                  >
                    <div className={styles.weekCellHeader}>
                      <span className={styles.weekDayWkd}>{WEEKDAYS_SHORT[d.getDay()]}</span>
                      <span className={`${styles.weekDayNum} ${isToday ? styles.weekDayNumToday : ''}`}>{d.getDate()}</span>
                      {showDayMode !== false && <ModeToggle mode={dayModes[iso] ?? 'virtual'} onToggle={() => toggleMode(iso)} mini />}
                    </div>
                    <div className={styles.weekCellTasks}>
                      {tasks.map(t => (
                        <AgendaTaskRow key={t.id} t={t} todayISO={todayISO} responsaveis={responsaveis} onClick={onEdit} onCheck={handleCheck} onOrderChange={handleOrderChange} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isDragging={draggingId === t.id} onCycleAssignee={onCycleAssignee} />
                      ))}
                    </div>
                  </div>
                ))}
              </Fragment>
            )
          })}
        </div>
      </div>

      <DespachosCard lawyerId={lawyerId} responsaveis={responsaveis} isIntern={isIntern} internName={internName} />

      {/* ── Card 5: Audiências ── */}
      <div className={`${styles.agendaCard} ${styles.agendaCardFull}`}>
        <div className={styles.agendaCardHeader}>
          <CardIcon icon={ICON_HEARING} />
          <span className={styles.agendaCardTitle}>Audiências</span>
          <span className={styles.agendaCardSub}>
            {(rawHearings ?? []).length > 0 ? `${(rawHearings ?? []).length} próxima(s)` : 'Nenhuma agendada'}
          </span>
        </div>
        <div className={styles.agendaCardBody}>
          {(rawHearings ?? []).length === 0
            ? <div className={styles.agendaEmpty}>Nenhuma audiência agendada — cadastre em Casos &rsaquo; editar caso</div>
            : <div className={styles.eventList}>
                {(rawHearings ?? []).map(h => (
                  <HearingEventItem key={h.id} h={h} todayISO={todayISO} />
                ))}
              </div>
          }
        </div>
      </div>

    </div>
  )
}

/* ── KanbanView ─────────────────────────────────────────────────────── */
function KanbanView({ tasks, onEdit }) {
  const today = new Date().toISOString().split('T')[0]
  return (
    <div className={styles.kanbanWrapper}>
      <div className={styles.kanbanBoard}>
        {KANBAN_COLS.map(col => {
          const items = tasks.filter(t => t.status === col.key)
          return (
            <div key={col.key} className={styles.kanbanCol}>
              <div className={styles.kanbanColHeader}>
                <span className={`${styles.kanbanColTitle} ${col.color}`}>{col.label}</span>
                <span className={styles.kanbanColCount}>{items.length}</span>
              </div>
              <div className={styles.kanbanItems}>
                {items.length === 0
                  ? <div className={styles.kanbanEmpty}>Vazio</div>
                  : items.map(t => {
                      const vencida = t.status !== 'concluida' && t.vencimento && t.vencimento < today
                      return (
                        <div key={t.id} className={`${styles.kanbanCard} ${vencida ? styles.overdue : ''}`}
                          onClick={() => onEdit(t.id)} style={{ cursor: 'pointer' }}>
                          <div className={styles.kanbanCardTitle}>{t.titulo}</div>
                          <div className={styles.kanbanCardMeta}>
                            <span className={`badge ${PRI_CSS[t.prioridade]}`}>{PRI_LABELS[t.prioridade]}</span>
                            {t.vencimento && (
                              <span className={`${styles.kanbanDate} ${vencida ? styles.overdueDate : ''}`}>
                                {fmtDate(t.vencimento, { day: '2-digit', month: '2-digit' })}
                                {t.horario && <span className={styles.taskTime}>{t.horario}</span>}
                              </span>
                            )}
                          </div>
                          {t.caso !== '—' && <div className={styles.kanbanCase}>{t.caso}</div>}
                        </div>
                      )
                    })
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── ListView ───────────────────────────────────────────────────────── */
function ListView({ tasks, onEdit }) {
  const today = new Date().toISOString().split('T')[0]
  if (tasks.length === 0) return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>✓</div>
      <p>Nenhuma tarefa encontrada</p>
    </div>
  )
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr><th>Tarefa</th><th>Caso</th><th>Prioridade</th><th>Status</th><th>Vencimento</th></tr>
        </thead>
        <tbody>
          {tasks.map(t => {
            const vencida = t.status !== 'concluida' && t.vencimento && t.vencimento < today
            return (
              <tr key={t.id} className={`${styles.tableRow} ${vencida ? styles.overdueRow : ''}`}
                onClick={() => onEdit(t.id)} style={{ cursor: 'pointer' }}>
                <td className={styles.taskTitleCell}>{t.titulo}</td>
                <td className={styles.caseCell}>{t.caso}</td>
                <td><span className={`badge ${PRI_CSS[t.prioridade]}`}>{PRI_LABELS[t.prioridade]}</span></td>
                <td><span className={`badge badge-${t.status === 'em_andamento' ? 'pendente' : t.status}`}>
                  {KANBAN_COLS.find(c => c.key === t.status)?.label ?? t.status}
                </span></td>
                <td className={`${styles.dateCell} ${vencida ? styles.overdueDate : ''}`}>
                  {fmtDate(t.vencimento, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  {t.horario && <span className={styles.taskTime}>{t.horario}</span>}
                  {vencida && <span className={styles.vencidaTag}>Vencida</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Calendar view ──────────────────────────────────────────────────── */
function CalendarView({ tasks, onEdit }) {
  const [calMode, setCalMode] = useState('mes')
  const [anchor,  setAnchor]  = useState(() => new Date())

  const todayISO = new Date().toISOString().split('T')[0]

  const tasksByDate = useMemo(() => {
    const map = {}
    for (const t of tasks) {
      if (t.vencimento) {
        if (!map[t.vencimento]) map[t.vencimento] = []
        map[t.vencimento].push(t)
      }
    }
    return map
  }, [tasks])

  function navigate(dir) {
    const d = new Date(anchor)
    if (calMode === 'mes')    d.setMonth(d.getMonth() + dir)
    else if (calMode === 'semana') d.setDate(d.getDate() + dir * 7)
    else                      d.setDate(d.getDate() + dir)
    setAnchor(d)
  }

  let periodLabel
  if (calMode === 'mes') {
    periodLabel = `${MONTHS_PT[anchor.getMonth()]} ${anchor.getFullYear()}`
  } else if (calMode === 'semana') {
    const sun = startOfWeek(anchor)
    const sat = addDays(sun, 6)
    periodLabel = `${sun.getDate()} ${MONTHS_PT[sun.getMonth()].slice(0,3)} – ${sat.getDate()} ${MONTHS_PT[sat.getMonth()].slice(0,3)} ${sat.getFullYear()}`
  } else {
    periodLabel = anchor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function renderMonth() {
    const year  = anchor.getFullYear()
    const month = anchor.getMonth()
    const firstDay  = new Date(year, month, 1)
    const startDay  = new Date(firstDay)
    startDay.setDate(1 - firstDay.getDay())

    const cells = []
    for (let i = 0; i < 42; i++) {
      const d   = addDays(startDay, i)
      const iso = toISO(d)
      cells.push({ d, iso, isCurrentMonth: d.getMonth() === month, isToday: iso === todayISO, dayTasks: tasksByDate[iso] ?? [] })
    }
    const last7   = cells.slice(35)
    const trimmed = last7.every(c => !c.isCurrentMonth) ? cells.slice(0, 35) : cells

    return (
      <div className={styles.calGrid}>
        <div className={styles.calGridHeader}>
          {WEEKDAYS_SHORT.map(w => <div key={w} className={styles.calWeekday}>{w}</div>)}
        </div>
        <div className={styles.calMonthBody}>
          {trimmed.map(({ d, iso, isCurrentMonth, isToday, dayTasks }) => (
            <div
              key={iso}
              className={`${styles.calCell} ${!isCurrentMonth ? styles.calCellOther : ''} ${isToday ? styles.calCellToday : ''}`}
              onClick={() => { setAnchor(d); setCalMode('dia') }}
            >
              <span className={styles.calCellNum}>{d.getDate()}</span>
              <div className={styles.calCellTasks}>
                {dayTasks.slice(0, 3).map(t => (
                  <div
                    key={t.id}
                    className={styles.calChip}
                    style={{ borderLeftColor: PRI_DOT[t.prioridade] ?? 'var(--accent)' }}
                    onClick={e => { e.stopPropagation(); onEdit(t.id) }}
                  >
                    {t.titulo}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className={styles.calChipMore}>+{dayTasks.length - 3} mais</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderWeek() {
    const sun  = startOfWeek(anchor)
    const days = Array.from({ length: 7 }, (_, i) => addDays(sun, i))
    return (
      <div className={styles.calWeek}>
        {days.map(d => {
          const iso      = toISO(d)
          const isToday  = iso === todayISO
          const dayTasks = tasksByDate[iso] ?? []
          return (
            <div key={iso} className={`${styles.calWeekCol} ${isToday ? styles.calWeekColToday : ''}`}>
              <div className={styles.calWeekColHeader} onClick={() => { setAnchor(d); setCalMode('dia') }}>
                <span className={styles.calWeekWkd}>{WEEKDAYS_SHORT[d.getDay()]}</span>
                <span className={`${styles.calWeekNum} ${isToday ? styles.calWeekNumToday : ''}`}>{d.getDate()}</span>
              </div>
              <div className={styles.calWeekItems}>
                {dayTasks.map(t => (
                  <div
                    key={t.id}
                    className={`${styles.calWeekTask} ${t.status === 'concluida' ? styles.calTaskDone : ''}`}
                    style={{ borderLeftColor: PRI_DOT[t.prioridade] ?? 'var(--accent)' }}
                    onClick={() => onEdit(t.id)}
                  >
                    <span className={styles.calWeekTaskTitle}>{t.titulo}</span>
                    {t.caso !== '—' && <span className={styles.calWeekTaskCase}>{t.caso}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderDay() {
    const iso      = toISO(anchor)
    const dayTasks = tasksByDate[iso] ?? []
    return (
      <div className={styles.calDay}>
        {dayTasks.length === 0
          ? <div className={styles.calDayEmpty}>Nenhuma tarefa neste dia.</div>
          : dayTasks.map(t => (
            <div
              key={t.id}
              className={`${styles.calDayTask} ${t.status === 'concluida' ? styles.calTaskDone : ''}`}
              style={{ borderLeftColor: PRI_DOT[t.prioridade] ?? 'var(--accent)' }}
              onClick={() => onEdit(t.id)}
            >
              <div className={styles.calDayTaskMain}>
                <span className={styles.calDayTaskTitle}>{t.titulo}</span>
                {t.caso !== '—' && <span className={styles.calDayTaskCase}>{t.caso}</span>}
              </div>
              <div className={styles.calDayTaskMeta}>
                <span className={`badge ${PRI_CSS[t.prioridade]}`}>{PRI_LABELS[t.prioridade]}</span>
                <span className={`badge badge-${t.status === 'em_andamento' ? 'pendente' : t.status}`}>
                  {KANBAN_COLS.find(c => c.key === t.status)?.label ?? t.status}
                </span>
              </div>
            </div>
          ))
        }
      </div>
    )
  }

  return (
    <div className={styles.calendarWrap}>
      <div className={styles.calToolbar}>
        <div className={styles.calNav}>
          <button className={styles.calNavBtn} onClick={() => navigate(-1)}>‹</button>
          <button className={styles.calTodayBtn} onClick={() => setAnchor(new Date())}>Hoje</button>
          <button className={styles.calNavBtn} onClick={() => navigate(1)}>›</button>
        </div>
        <span className={styles.calPeriod}>{periodLabel}</span>
        <div className={styles.calModeToggle}>
          {[['mes','Mês'],['semana','Semana'],['dia','Dia']].map(([m, l]) => (
            <button
              key={m}
              className={`${styles.calModeBtn} ${calMode === m ? styles.calModeBtnActive : ''}`}
              onClick={() => setCalMode(m)}
            >{l}</button>
          ))}
        </div>
      </div>
      {calMode === 'mes'    && renderMonth()}
      {calMode === 'semana' && renderWeek()}
      {calMode === 'dia'    && renderDay()}
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */
export default function Tasks() {
  const { lawyer, session, teamRole, memberLinkedResp, memberName } = useAuth()
  const toast = useToast()
  const prefs = loadPreferences(lawyer)
  const responsaveis = lawyer?.preferences?.responsaveis ?? []

  const isIntern   = teamRole === 'estagiario'
  const internName = memberLinkedResp || memberName || ''

  const [view, setView]           = useState(prefs.tarefas_view ?? 'agenda')
  const [search, setSearch]       = useState('')
  const [filterPri, setFilterPri] = useState('todos')
  const [filterResp, setFilterResp] = useState('todos')

  // Interns always see only their own tasks — override any filter value
  const effectiveFilterResp = isIntern ? internName : filterResp
  const [formOpen, setFormOpen]   = useState(false)
  const [editing,  setEditing]    = useState(null)

  const { data: rawTasks, loading, error, refetch } = useAllTasks()
  const tasks = useMemo(() => (rawTasks ?? []).map(mapTask), [rawTasks])

  const rawById = useMemo(() =>
    Object.fromEntries((rawTasks ?? []).map(r => [r.id, r]))
  , [rawTasks])

  function openNew()    { setEditing(null); setFormOpen(true) }
  function openEdit(id) { setEditing(rawById[id] ?? null); setFormOpen(true) }
  function handleSave() {
    refetch()
    setFormOpen(false)
    toast.success(editing ? 'Tarefa atualizada.' : 'Tarefa criada.')
  }

  function handleViewChange(v) {
    setView(v)
    savePreferences(lawyer, { tarefas_view: v })
  }

  async function handleCycleAssignee(taskId, currentAssignee) {
    if (responsaveis.length === 0) return
    const idx = responsaveis.indexOf(currentAssignee)
    const next = responsaveis[(idx + 1) % responsaveis.length]
    await updateTaskAssignee(taskId, next)
    refetch()
  }

  function openNewWithDate(dateISO, assignedTo) {
    setEditing({
      due_date:    dateISO ? dateISO + 'T12:00:00' : null,
      assigned_to: isIntern ? internName : (assignedTo ?? ''),
    })
    setFormOpen(true)
  }

  const filtered = useMemo(() => {
    let list = tasks
    if (isIntern) list = list.filter(t => t.responsavel === internName)
    if (filterPri !== 'todos') list = list.filter(t => t.prioridade === filterPri)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.titulo.toLowerCase().includes(q) || t.caso.toLowerCase().includes(q))
    }
    return list
  }, [tasks, search, filterPri, isIntern, internName])

  const pendentes = tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length

  return (
    <PageShell
      title="Espaço de Trabalho"
      subtitle={loading ? 'Carregando…' : `${tasks.length} tarefas · ${pendentes} pendentes`}
      viewToggle={<ViewToggle value={view} onChange={handleViewChange} showCalendar showAgenda />}
      action={
        <button className={styles.btnNovo} onClick={openNew}>
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 8 1Z"/></svg>
          Nova tarefa
        </button>
      }
      filters={
        view === 'agenda'
          ? (!isIntern && responsaveis.length > 0
              ? <RespPills responsaveis={responsaveis} value={filterResp} onChange={setFilterResp} />
              : null)
          : (
            <>
              <div className={styles.searchWrap}>
                <svg className={styles.searchIcon} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.856a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
                </svg>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Buscar tarefa ou caso..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className={styles.filterGroup}>
                {[{ v: 'todos', l: 'Todas' }, { v: 'urgente', l: 'Urgente' }, { v: 'alta', l: 'Alta' }, { v: 'media', l: 'Média' }, { v: 'baixa', l: 'Baixa' }].map(({ v, l }) => (
                  <button
                    key={v}
                    className={`${styles.filterBtn} ${filterPri === v ? styles.filterActive : ''}`}
                    onClick={() => setFilterPri(v)}
                  >{l}</button>
                ))}
              </div>
            </>
          )
      }
    >
      {error
        ? <div className={styles.emptyState}><p>Erro ao carregar tarefas.</p></div>
        : view === 'agenda'
          ? <AgendaView
              rawTasks={rawTasks ?? []}
              responsaveis={responsaveis}
              filterResp={effectiveFilterResp}
              session={session}
              lawyerId={lawyer?.id}
              isIntern={isIntern}
              internName={internName}
              onEdit={openEdit}
              onNewWithDate={openNewWithDate}
              refetch={refetch}
              onCycleAssignee={handleCycleAssignee}
              showDayMode={prefs.show_day_mode !== false}
            />
          : view === 'kanban'
            ? <KanbanView tasks={filtered} onEdit={openEdit} />
            : view === 'calendario'
              ? <CalendarView tasks={filtered} onEdit={openEdit} />
              : <ListView tasks={filtered} onEdit={openEdit} />
      }

      {formOpen && (
        <Modal title={editing?.id ? 'Editar tarefa' : 'Nova tarefa'} onClose={() => setFormOpen(false)}>
          <TaskForm initial={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />
        </Modal>
      )}
    </PageShell>
  )
}
