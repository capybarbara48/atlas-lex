import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import s from './Workspace.module.css'

/* ─── Constants ────────────────────────────────────────────────────── */
const WEEK_DAYS   = ['seg', 'ter', 'qua', 'qui', 'sex']
const WEEK_SHORT  = { seg: 'SEG', ter: 'TER', qua: 'QUA', qui: 'QUI', sex: 'SEX' }
const DESP_TIPOS  = [
  'Conclusão para Decisão',
  'Conclusão para Julgamento',
  'Conclusão para Sentença',
  'Vista ao Ministério Público',
  'Cumprimento de Diligência',
  'Juntada de Petição',
  'Outros',
]
const FOCUS_SECS  = 30 * 60
const BREAK_SECS  = 5  * 60
const CIRC        = 2 * Math.PI * 54

/* ─── Date helpers ──────────────────────────────────────────────────── */
function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10)
}
function weekMonday(d = new Date()) {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon  = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}
function weekDates(monday) {
  return WEEK_DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}
function fmtShort(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/* ─── Web Audio ─────────────────────────────────────────────────────── */
function playDone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.start(t)
      osc.stop(t + 0.55)
    })
  } catch {}
}

function playWarning() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.22, 0.44].forEach(t => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.1, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.14)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.14)
    })
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Pomodoro                                                            */
/* ═══════════════════════════════════════════════════════════════════ */
function PomodoroCard() {
  const [mode,   setMode]   = useState('idle')
  const [secs,   setSecs]   = useState(FOCUS_SECS)
  const [cycles, setCycles] = useState(0)
  const intRef = useRef(null)

  useEffect(() => {
    if (mode === 'idle') { clearInterval(intRef.current); return }
    clearInterval(intRef.current)
    intRef.current = setInterval(() => {
      setSecs(s => {
        if (s === 10) playWarning()
        if (s === 0) {
          playDone()
          if (mode === 'focus') { setCycles(c => c + 1); setMode('break'); return BREAK_SECS }
          setMode('focus')
          return FOCUS_SECS
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intRef.current)
  }, [mode])

  function startFocus()  { setSecs(FOCUS_SECS); setMode('focus') }
  function pauseTimer()  { clearInterval(intRef.current); setMode('idle') }
  function resetTimer()  { clearInterval(intRef.current); setMode('idle'); setSecs(FOCUS_SECS) }

  const total    = mode === 'break' ? BREAK_SECS : FOCUS_SECS
  const progress = 1 - secs / total
  const offset   = CIRC * (1 - progress)
  const mins     = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss       = String(secs % 60).padStart(2, '0')
  const running  = mode === 'focus' || mode === 'break'
  const accentCol = mode === 'break' ? 'var(--green)' : 'var(--accent)'

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <span className={s.cardTitle}>Pomodoro</span>
        {cycles > 0 && (
          <span className="badge st-teal">{cycles} ciclo{cycles > 1 ? 's' : ''}</span>
        )}
        <span className={`badge ${mode === 'focus' ? 'badge-alta' : mode === 'break' ? 'st-green' : 'st-gray'}`}>
          {mode === 'focus' ? 'Foco' : mode === 'break' ? 'Pausa' : 'Parado'}
        </span>
      </div>

      <div className={s.pomWrap}>
        <svg className={s.pomRing} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="7"/>
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={accentCol}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transform:'rotate(-90deg)', transformOrigin:'60px 60px', transition:'stroke-dashoffset 0.9s linear' }}
          />
          <text x="60" y="55" textAnchor="middle" className={s.pomTime} fill="var(--text)">{mins}:{ss}</text>
          <text x="60" y="71" textAnchor="middle" className={s.pomSub} fill="var(--text-3)">
            {mode === 'break' ? '☕ pausa' : mode === 'focus' ? '🎯 foco' : 'pronto'}
          </text>
        </svg>

        <div className={s.pomActions}>
          {!running && (
            <button className={`${s.pomBtn} ${s.pomBtnPrimary}`} onClick={startFocus}>
              <svg viewBox="0 0 14 14" fill="currentColor" width="12" height="12"><path d="M3 2v10l9-5z"/></svg>
              {mode === 'idle' && secs < FOCUS_SECS ? 'Retomar' : 'Iniciar'}
            </button>
          )}
          {running && (
            <button className={`${s.pomBtn} ${s.pomBtnSecondary}`} onClick={pauseTimer}>
              <svg viewBox="0 0 14 14" fill="currentColor" width="12" height="12"><rect x="2.5" y="2" width="3" height="10"/><rect x="8.5" y="2" width="3" height="10"/></svg>
              Pausar
            </button>
          )}
          {secs !== FOCUS_SECS && (
            <button className={`${s.pomBtn} ${s.pomBtnGhost}`} onClick={resetTimer} title="Reiniciar">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="12" height="12">
                <path d="M12 7A5 5 0 1 1 7 2M7 0v4h4"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className={s.pomHint}>30 min foco · 5 min pausa</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Hoje em Foco                                                        */
/* ═══════════════════════════════════════════════════════════════════ */
function TodayFocusCard() {
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const today = isoDate()
    const { data } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, due_date')
      .lte('due_date', today + 'T23:59:59')
      .not('status', 'in', '("concluida","cancelada")')
      .order('due_date', { ascending: true })
      .limit(12)
    setTasks(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markDone(id) {
    await supabase.from('tasks').update({ status: 'concluida' }).eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const today = isoDate()

  return (
    <div className={`${s.card} ${s.cardTall}`}>
      <div className={s.cardHead}>
        <span className={s.cardTitle}>Hoje em Foco</span>
        <span className="badge st-blue">{tasks.length} pendente{tasks.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className={s.dimMsg}>Carregando…</div>
      ) : tasks.length === 0 ? (
        <div className={s.dimMsg}>
          <span style={{ fontSize:'2rem' }}>✓</span>
          <span>Dia limpo! Nada pendente.</span>
        </div>
      ) : (
        <div className={s.focusList}>
          {tasks.map(t => {
            const overdue = t.due_date?.slice(0,10) < today
            return (
              <div key={t.id} className={s.focusItem}>
                <button className={s.checkCircle} onClick={() => markDone(t.id)} title="Concluir">
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <circle cx="9" cy="9" r="7.5"/>
                    <path d="M6 9l2 2 4-4"/>
                  </svg>
                </button>
                <div className={s.focusContent}>
                  <span className={s.focusTitle}>{t.title}</span>
                  <div className={s.focusMeta}>
                    {overdue && <span className="badge badge-alta" style={{fontSize:'0.6rem'}}>Atrasada</span>}
                    {t.assigned_to && <span className="badge st-teal" style={{fontSize:'0.6rem'}}>{t.assigned_to.split(' ')[0]}</span>}
                    <span className={s.focusDate}>{fmtShort(t.due_date)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Weekly Grid                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
function WeeklyGrid({ lawyerId }) {
  const [monday,   setMonday]   = useState(weekMonday)
  const [allTasks, setAllTasks] = useState({})
  const [modes,    setModes]    = useState({})
  const [inputs,   setInputs]   = useState({})

  const dates = useMemo(() => weekDates(monday), [monday])
  const today = isoDate()

  useEffect(() => {
    if (!lawyerId) return
    const from = isoDate(dates[0])
    const to   = isoDate(dates[4])

    supabase.from('workspace_day_tasks')
      .select('id, date, text, done, sort_order')
      .gte('date', from).lte('date', to)
      .order('sort_order')
      .then(({ data }) => {
        const grouped = {}
        ;(data ?? []).forEach(t => {
          const k = t.date
          if (!grouped[k]) grouped[k] = []
          grouped[k].push(t)
        })
        setAllTasks(grouped)
      })

    supabase.from('workspace_day_modes')
      .select('date, mode')
      .gte('date', from).lte('date', to)
      .then(({ data }) => {
        const m = {}
        ;(data ?? []).forEach(r => { m[r.date] = r.mode })
        setModes(m)
      })
  }, [lawyerId, monday])

  async function addTask(date) {
    const key  = isoDate(date)
    const text = (inputs[key] ?? '').trim()
    if (!text || !lawyerId) return
    const sortOrder = (allTasks[key] ?? []).length
    const { data } = await supabase.from('workspace_day_tasks')
      .insert({ lawyer_id: lawyerId, date: key, text, done: false, sort_order: sortOrder })
      .select('id, date, text, done, sort_order')
      .single()
    if (data) {
      setAllTasks(p => ({ ...p, [key]: [...(p[key] ?? []), data] }))
      setInputs(p => ({ ...p, [key]: '' }))
    }
  }

  async function toggleTask(key, id) {
    const task = (allTasks[key] ?? []).find(t => t.id === id)
    if (!task) return
    const newDone = !task.done
    setAllTasks(p => ({ ...p, [key]: (p[key] ?? []).map(t => t.id === id ? { ...t, done: newDone } : t) }))
    await supabase.from('workspace_day_tasks').update({ done: newDone }).eq('id', id)
  }

  async function removeTask(key, id) {
    setAllTasks(p => ({ ...p, [key]: (p[key] ?? []).filter(t => t.id !== id) }))
    await supabase.from('workspace_day_tasks').delete().eq('id', id)
  }

  async function toggleMode(key) {
    const current = modes[key] ?? 'presencial'
    const newMode = current === 'virtual' ? 'presencial' : 'virtual'
    setModes(p => ({ ...p, [key]: newMode }))
    await supabase.from('workspace_day_modes').upsert(
      { lawyer_id: lawyerId, date: key, mode: newMode },
      { onConflict: 'lawyer_id,date' }
    )
  }

  function prevWeek() { const m = new Date(monday); m.setDate(m.getDate() - 7); setMonday(m) }
  function nextWeek() { const m = new Date(monday); m.setDate(m.getDate() + 7); setMonday(m) }

  const weekLabel = `${fmtShort(dates[0])} – ${fmtShort(dates[4])}`

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <span className={s.cardTitle}>Grade Semanal</span>
        <div className={s.weekNav}>
          <button className={s.wkBtn} onClick={prevWeek}>‹</button>
          <span className={s.wkLabel}>{weekLabel}</span>
          <button className={s.wkBtn} onClick={nextWeek}>›</button>
        </div>
      </div>

      <div className={s.weekGrid}>
        {dates.map((date, i) => {
          const key      = isoDate(date)
          const dayTasks = allTasks[key] ?? []
          const mode     = modes[key] ?? 'presencial'
          const isToday  = key === today

          return (
            <div key={key} className={`${s.dayCol} ${isToday ? s.dayToday : ''}`}>
              <div className={s.dayHead}>
                <div className={s.dayHeadLeft}>
                  <span className={s.dayName}>{WEEK_SHORT[WEEK_DAYS[i]]}</span>
                  <span className={s.dayNum}>{date.getDate()}</span>
                </div>
              </div>
              <div className={s.dayModeRow}>
                <button
                  className={s.modeToggle}
                  style={{ background: mode === 'presencial' ? '#22a84a' : '#7c3aed' }}
                  onClick={() => toggleMode(key)}
                  title="Clique para alternar"
                >
                  {mode === 'presencial' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="9" height="9">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="9" height="9">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  )}
                  {mode === 'presencial' ? 'Presencial' : 'Virtual'}
                </button>
              </div>

              <div className={s.dayTasks}>
                {dayTasks.map(t => (
                  <div key={t.id} className={`${s.dayTask} ${t.done ? s.dayTaskDone : ''}`}>
                    <button className={s.dayCheck} onClick={() => toggleTask(key, t.id)}>
                      {t.done
                        ? <svg viewBox="0 0 12 12" width="10" height="10"><circle cx="6" cy="6" r="5" fill="var(--accent)"/><path d="M3.5 6l2 2 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                        : <svg viewBox="0 0 12 12" fill="none" stroke="var(--border)" strokeWidth="1.5" width="10" height="10"><circle cx="6" cy="6" r="5"/></svg>
                      }
                    </button>
                    <span className={s.dayTaskText}>{t.text}</span>
                    <button className={s.dayDel} onClick={() => removeTask(key, t.id)}>×</button>
                  </div>
                ))}
              </div>

              <input
                className={s.dayInput}
                value={inputs[key] ?? ''}
                onChange={e => setInputs(p => ({ ...p, [key]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addTask(date)}
                placeholder="+ adicionar"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Despachos                                                           */
/* ═══════════════════════════════════════════════════════════════════ */
function DespachosCard({ lawyerId }) {
  const [cases,   setCases]   = useState([])
  const [queue,   setQueue]   = useState([])
  const [history, setHistory] = useState([])
  const [selCase, setSelCase] = useState('')
  const [tab,     setTab]     = useState('fila')

  useEffect(() => {
    supabase.from('cases').select('id, title')
      .in('status', ['ativo', 'suspenso'])
      .order('title')
      .then(({ data }) => setCases(data ?? []))
  }, [])

  useEffect(() => {
    if (!lawyerId) return
    supabase.from('workspace_despachos')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at')
      .then(({ data }) => setQueue(data ?? []))

    supabase.from('workspace_despachos')
      .select('*')
      .eq('status', 'concluido')
      .order('done_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setHistory(data ?? []))
  }, [lawyerId])

  async function addToQueue() {
    const c = cases.find(c => c.id === selCase)
    if (!c || !lawyerId) return
    const { data } = await supabase.from('workspace_despachos')
      .insert({
        lawyer_id: lawyerId, case_id: c.id, case_title: c.title,
        local: 'Secretaria', tipo: DESP_TIPOS[0], notas: '', status: 'pendente',
      })
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
      .update({ status: 'concluido', done_at: doneAt })
      .eq('id', id)
      .select('*').single()
    setQueue(prev => prev.filter(d => d.id !== id))
    if (data) setHistory(prev => [data, ...prev])
  }

  async function removeQ(id) {
    setQueue(prev => prev.filter(d => d.id !== id))
    await supabase.from('workspace_despachos').delete().eq('id', id)
  }

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <span className={s.cardTitle}>Despachos</span>
        {queue.length > 0 && <span className="badge badge-alta">{queue.length}</span>}
      </div>

      <div className={s.dspTabs}>
        <button className={`${s.dspTab} ${tab === 'fila' ? s.dspTabActive : ''}`} onClick={() => setTab('fila')}>
          Fila {queue.length > 0 ? `(${queue.length})` : ''}
        </button>
        <button className={`${s.dspTab} ${tab === 'hist' ? s.dspTabActive : ''}`} onClick={() => setTab('hist')}>
          Histórico {history.length > 0 ? `(${history.length})` : ''}
        </button>
      </div>

      {tab === 'fila' && (
        <>
          <div className={s.dspAddRow}>
            <select className={s.dspSelect} value={selCase} onChange={e => setSelCase(e.target.value)}>
              <option value="">Selecionar processo…</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button className={s.dspAddBtn} onClick={addToQueue} disabled={!selCase}>+</button>
          </div>

          {queue.length === 0
            ? <div className={s.dimMsg}>Fila vazia.</div>
            : (
              <div className={s.dspQueue}>
                {queue.map(d => (
                  <div key={d.id} className={s.dspItem}>
                    <div className={s.dspItemHead}>
                      <span className={s.dspCaseTitle}>{d.case_title}</span>
                      <button className={s.dspXBtn} onClick={() => removeQ(d.id)}>×</button>
                    </div>
                    <div className={s.dspLocalRow}>
                      {['Secretaria', 'Gabinete'].map(loc => (
                        <label key={loc} className={s.dspRadioLabel}>
                          <input type="radio" name={`local-${d.id}`} checked={d.local === loc} onChange={() => update(d.id, 'local', loc)}/>
                          {loc}
                        </label>
                      ))}
                    </div>
                    <select className={s.dspTipoSel} value={d.tipo} onChange={e => update(d.id, 'tipo', e.target.value)}>
                      {DESP_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <textarea
                      className={s.dspNotes}
                      value={d.notas}
                      onChange={e => update(d.id, 'notas', e.target.value)}
                      placeholder="Observações…"
                      rows={2}
                    />
                    <button className={s.dspDoneBtn} onClick={() => markDone(d.id)}>
                      ✓ Despacho Realizado
                    </button>
                  </div>
                ))}
              </div>
            )
          }
        </>
      )}

      {tab === 'hist' && (
        <div className={s.dspHistList}>
          {history.length === 0
            ? <div className={s.dimMsg}>Nenhum despacho realizado.</div>
            : history.map(d => (
              <div key={d.id} className={s.dspHistItem}>
                <div className={s.dspHistTop}>
                  <span className={s.dspHistCase}>{d.case_title}</span>
                  <span className={s.dspHistDate}>{fmtShort(d.done_at)}</span>
                </div>
                <div className={s.dspHistMeta}>
                  <span className="badge st-teal" style={{fontSize:'0.6rem'}}>{d.local}</span>
                  <span className={s.dspHistTipo}>{d.tipo}</span>
                </div>
                {d.notas && <p className={s.dspHistNotes}>{d.notas}</p>}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Stats Row                                                           */
/* ═══════════════════════════════════════════════════════════════════ */
function StatsRow({ lawyerId }) {
  const [s2, setS] = useState({ pending: '—', done: '—', despWeek: '—' })

  useEffect(() => {
    if (!lawyerId) return
    const today = isoDate()
    const monISO = weekMonday().toISOString()

    Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .lte('due_date', today + 'T23:59:59')
        .not('status', 'in', '("concluida","cancelada")'),
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .gte('updated_at', today + 'T00:00:00')
        .eq('status', 'concluida'),
      supabase.from('workspace_despachos').select('id', { count: 'exact', head: true })
        .eq('status', 'concluido')
        .gte('done_at', monISO),
    ]).then(([{ count: pending }, { count: done }, { count: despWeek }]) => {
      setS({ pending: pending ?? 0, done: done ?? 0, despWeek: despWeek ?? 0 })
    })
  }, [lawyerId])

  return (
    <div className={s.statsRow}>
      <div className={s.stat}>
        <span className={s.statNum} style={{ color: s2.pending > 0 ? 'var(--red,#ef4444)' : undefined }}>{s2.pending}</span>
        <span className={s.statLabel}>Pendentes hoje</span>
      </div>
      <div className={s.stat}>
        <span className={s.statNum} style={{ color: 'var(--green)' }}>{s2.done}</span>
        <span className={s.statLabel}>Concluídas hoje</span>
      </div>
      <div className={s.stat}>
        <span className={s.statNum} style={{ color: 'var(--accent)' }}>{s2.despWeek}</span>
        <span className={s.statLabel}>Despachos na semana</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Histórico — navegação mês a mês, retenção 24 meses                 */
/* ═══════════════════════════════════════════════════════════════════ */
function HistoryCard({ lawyerId }) {
  const { lawyer }           = useAuth()
  const responsaveis         = lawyer?.preferences?.responsaveis ?? []

  const [month,        setMonth]        = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [tasks,        setTasks]        = useState([])
  const [desps,        setDesps]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [personFilter, setPersonFilter] = useState(null)

  useEffect(() => {
    if (!lawyerId) return
    setLoading(true)
    const from = isoDate(month)
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    const to   = isoDate(next)

    Promise.all([
      supabase.from('tasks').select('id, title, updated_at, assigned_to')
        .eq('status', 'concluida')
        .gte('updated_at', from).lt('updated_at', to)
        .order('updated_at', { ascending: false })
        .limit(200),
      supabase.from('workspace_despachos').select('id, case_title, tipo, notas, done_at')
        .eq('status', 'concluido')
        .gte('done_at', from).lt('done_at', to)
        .order('done_at', { ascending: false })
        .limit(200),
    ]).then(([{ data: taskData }, { data: despData }]) => {
      setTasks(taskData ?? [])
      setDesps(despData ?? [])
      setLoading(false)
    })
  }, [lawyerId, month])

  const combined = useMemo(() => {
    const t = tasks.map(t => ({ key: 't' + t.id,  type: 'task',     title: t.title,      sub: t.assigned_to, date: t.updated_at }))
    const d = desps.map(d => ({ key: 'd' + d.id,  type: 'despacho', title: d.case_title, sub: d.tipo,        date: d.done_at }))
    const all = [...t, ...d].sort((a, b) => new Date(b.date) - new Date(a.date))
    if (!personFilter) return all
    return all.filter(item => item.sub === personFilter)
  }, [tasks, desps, personFilter])

  const monthLabel = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  function prevMonth() { setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)) }
  function nextMonth() { setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)) }

  const cutoffMonth = new Date()
  cutoffMonth.setMonth(cutoffMonth.getMonth() - 23)
  cutoffMonth.setDate(1)
  cutoffMonth.setHours(0, 0, 0, 0)
  const atLimit = month <= cutoffMonth

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <span className={s.cardTitle}>Histórico de Atividade</span>
        <div className={s.weekNav}>
          <button className={s.wkBtn} onClick={prevMonth} disabled={atLimit} style={{ opacity: atLimit ? 0.3 : 1 }}>‹</button>
          <span className={s.wkLabel} style={{ textTransform: 'capitalize' }}>{monthLabel}</span>
          <button className={s.wkBtn} onClick={nextMonth}>›</button>
        </div>
        {combined.length > 0 && <span className="badge st-gray">{combined.length}</span>}
      </div>

      {responsaveis.length > 0 && (
        <div className={s.histFilter}>
          <button
            className={`${s.histFilterBtn} ${!personFilter ? s.histFilterActive : ''}`}
            onClick={() => setPersonFilter(null)}
          >
            Todos
          </button>
          {responsaveis.map(p => (
            <button
              key={p}
              className={`${s.histFilterBtn} ${personFilter === p ? s.histFilterActive : ''}`}
              onClick={() => setPersonFilter(prev => prev === p ? null : p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={s.dimMsg}>Carregando…</div>
      ) : combined.length === 0 ? (
        <div className={s.dimMsg}>Nenhuma atividade registrada neste mês.</div>
      ) : (
        <div className={s.histList}>
          {combined.map(item => (
            <div key={item.key} className={s.histItem}>
              <div className={s.histDot} style={{ background: item.type === 'task' ? 'var(--accent)' : 'var(--green)' }}/>
              <div className={s.histBody}>
                <span className={s.histTitle}>{item.title}</span>
                {item.sub && <span className={s.histSub}>{item.sub}</span>}
              </div>
              <div className={s.histRight}>
                <span className={`badge ${item.type === 'task' ? 'st-blue' : 'st-teal'}`} style={{ fontSize:'0.6rem' }}>
                  {item.type === 'task' ? 'Tarefa' : 'Despacho'}
                </span>
                <span className={s.histDate}>{fmtShort(item.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* Page                                                                */
/* ═══════════════════════════════════════════════════════════════════ */
export default function Workspace() {
  const { lawyer, session, memberName } = useAuth()
  const lawyerId  = lawyer?.id ?? session?.user?.id
  const firstName = (memberName ?? lawyer?.full_name)?.split(' ')[0]
    ?? session?.user?.email?.split('@')[0]
    ?? 'você'

  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  const h        = now.getHours()
  const greeting = h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite'
  const dateStr  = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className={s.page}>
      <div className={s.greetBar}>
        <div className={s.greetLeft}>
          <h1 className={s.greetTitle}>{greeting}, {firstName}!</h1>
          <p className={s.greetSub}>{dateStr}</p>
        </div>
        <StatsRow lawyerId={lawyerId} />
      </div>

      <div className={s.topRow}>
        <PomodoroCard />
        <TodayFocusCard />
      </div>

      <div className={s.midRow}>
        <WeeklyGrid lawyerId={lawyerId} />
        <DespachosCard lawyerId={lawyerId} />
      </div>

      <HistoryCard lawyerId={lawyerId} />
    </div>
  )
}
