import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTodayTasks } from '@/hooks/useTasks'
import { useWeekDoneTasks } from '@/hooks/useTasks'
import { useCases } from '@/hooks/useCases'
import { useClients } from '@/hooks/useClients'
import { useMonthFinancials } from '@/hooks/useFinancials'
import PageShell from '@/components/ui/PageShell'
import s from './Vitrine.module.css'

/* ── 30 frases aprovadas ────────────────────────────────────────── */
const FRASES = [
  // Justiça & Direito
  'A lei está nos livros. A justiça, no coração de quem a pratica.',
  'O direito não existe para os fortes — existe para proteger os vulneráveis.',
  'A justiça lenta é uma injustiça — por isso cada prazo importa.',
  'A lei é o instrumento. A justiça é o destino.',
  'Cada vitória jurídica começa com um advogado que acreditou antes de todos.',
  'Justiça não é favor concedido — é direito conquistado com dedicação.',
  'O processo pode acabar. O impacto de uma boa defesa, nunca.',
  // Advocacia
  'Advocacia é a arte de transformar o sofrimento alheio em argumentos precisos.',
  'Advocacia não é profissão — é vocação vestida de responsabilidade.',
  'O melhor advogado não é o que fala mais alto — é o que ouve mais fundo.',
  'Cada prazo cumprido é uma promessa honrada.',
  'Um bom advogado não apenas defende — ele restaura dignidade.',
  'Excelência na advocacia é consistência nos dias sem aplausos.',
  'A maior homenagem ao direito é exercê-lo com integridade todos os dias.',
  'Sua tese mais forte começa na sua escuta mais atenta.',
  // Empatia ao cliente
  'Cada cliente carrega uma história que merece ser ouvida com inteireza.',
  'A confiança do cliente não se conquista em contratos — conquista-se em atitudes.',
  'O cliente não contrata um advogado — contrata a segurança de ser ouvido.',
  'Nenhuma causa é pequena para quem a vive intensamente.',
  'Cada cliente que confia em você está entregando um pedaço da própria vida.',
  'Advocacia de excelência é aquela que o cliente sente antes de ler a petição.',
  'Atender bem um cliente hoje é construir um legado para amanhã.',
  'A empatia não enfraquece o argumento — ela o torna irrefutável.',
  'Todo processo tem dois lados. O melhor advogado entende os dois.',
  'Ouvir com atenção é o primeiro ato jurídico de todo bom advogado.',
  // Crescimento
  'O crescimento do escritório começa no crescimento de cada causa abraçada.',
  'Crescer na advocacia é crescer em humanidade.',
  'Seu escritório cresce quando cada cliente sai maior do que entrou.',
  'O crescimento real acontece quando o sucesso do cliente vira o seu.',
  'Sua dedicação diária é o tijolo que constrói o templo da justiça.',
]

/* ── helpers ────────────────────────────────────────────────────── */
function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v ?? 0)
}

function dayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now - start) / 86400000)
}

/* ── Live Clock ─────────────────────────────────────────────────── */
function LiveClock({ className }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className={className}>
      {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

/* ── Atlas Lex watermark ────────────────────────────────────────── */
function AtlasLexMark() {
  return (
    <div className={s.watermark}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="M7 21H3"/><path d="M21 21h-4"/><path d="M11 21h2"/>
        <line x1="7" y1="5" x2="17" y2="5"/>
        <line x1="12" y1="2" x2="12" y2="21"/>
      </svg>
      <div className={s.watermarkText}>
        <span className={s.watermarkName}>Atlas Adv</span>
        <span className={s.watermarkSub}>Gestão Jurídica</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   VITRINE MIX — O card principal
══════════════════════════════════════════════════════════════════ */
function VitrineMix({ lawyer, todayTasks, weekDone, fullscreen, onClose }) {
  const DURATION = 25 * 60
  const [secs,    setSecs]    = useState(DURATION)
  const [running, setRunning] = useState(false)
  const [cycles,  setCycles]  = useState(0)
  const [now,     setNow]     = useState(new Date())

  const accent   = lawyer?.theme_accent ?? '#043b61'
  const firm     = lawyer?.firm_name    ?? 'Atlas Lex'
  const frase    = FRASES[dayOfYear() % FRASES.length]

  /* clock tick */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  /* pomodoro ding — Web Audio API, no file needed */
  function playDing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const times = [0, 0.22, 0.44]
      times.forEach(t => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime + t)
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + t + 0.18)
        gain.gain.setValueAtTime(0.35, ctx.currentTime + t)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime + t + 0.4)
      })
    } catch (_) {}
  }

  /* pomodoro tick */
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { playDing(); setCycles(c => c + 1); setRunning(false); return DURATION }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const mm  = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss  = String(secs % 60).padStart(2, '0')
  const pct = ((DURATION - secs) / DURATION) * 100
  const C   = 2 * Math.PI * 80
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }).replace(/^\w/, c => c.toUpperCase())
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  const pendente  = (todayTasks  ?? []).filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length
  const concluida = (weekDone    ?? []).length

  /* background dots — decorative, not data */
  const dots = Array.from({ length: 40 }, (_, i) => ({
    w: 3 + (i * 11) % 7,
    op: 0.08 + (i * 7) % 5 * 0.025,
    top: `${(i * 17 + 5) % 90}%`,
    left: `${(i * 23 + 3) % 95}%`,
  }))

  return (
    <div className={`${s.mix} ${fullscreen ? s.mixFs : ''}`} style={{ '--accent': accent }}>
      {fullscreen && <button className={s.fsClose} onClick={onClose}>×</button>}

      {/* Ambient dots */}
      <div className={s.dots} aria-hidden>
        {dots.map((d, i) => (
          <div key={i} className={s.dot}
            style={{ width: d.w, height: d.w, opacity: d.op, top: d.top, left: d.left }} />
        ))}
      </div>

      {/* ── Row 1: clock only ── */}
      <div className={s.mixTopRow}>
        <span className={s.mixClock}>{timeStr}</span>
      </div>

      {/* ── Row 2: firm name ── */}
      <div className={s.mixFirmBlock}>
        <div className={s.mixFirm}>{firm}</div>
        <div className={s.mixFirmSub}>Advocacia</div>
      </div>

      {/* ── Row 3: Pomodoro ring ── */}
      <div className={s.mixTimerWrap}>
        <svg className={s.mixRing} viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
          <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.85)"
            strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - (pct / 100) * C}
            transform="rotate(-90 90 90)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className={s.mixTimerCenter}>
          <div className={s.mixTimerTime}>{mm}:{ss}</div>
          <div className={s.mixTimerState}>
            {running ? 'foco ativo' : cycles > 0 ? `${cycles} ciclo${cycles > 1 ? 's' : ''}` : 'pomodoro'}
          </div>
        </div>
      </div>

      {/* ── Row 4: controls ── */}
      <div className={s.mixControls}>
        <button className={s.mixBtnGhost} onClick={() => { setSecs(DURATION); setRunning(false) }} title="Reiniciar">↺</button>
        <button className={s.mixBtn} onClick={() => setRunning(r => !r)}>
          {running ? '⏸ Pausar' : '▶ Iniciar foco'}
        </button>
        <div className={s.mixCycles}>{cycles > 0 && `×${cycles}`}</div>
      </div>

      {/* ── Row 5: frase do dia ── */}
      <div className={s.mixFrase}>"{frase}"</div>

      {/* ── Row 6: task counters ── */}
      <div className={s.mixTasks}>
        <div className={s.mixTaskBlock}>
          <div className={s.mixTaskNum}>{pendente}</div>
          <div className={s.mixTaskLabel}>
            <span className={s.mixTaskIcon}>📋</span>
            {pendente === 1 ? 'tarefa pendente hoje' : 'tarefas pendentes hoje'}
          </div>
        </div>
        <div className={s.mixTaskCenter}>
          <div className={s.mixTaskDivider} />
          <div className={s.mixDateMiddle}>
            <span className={s.mixDateDay}>{now.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
            <span className={s.mixDateMon}>{now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.','').toUpperCase()}</span>
            <span className={s.mixDateYear}>{now.getFullYear()}</span>
          </div>
          <div className={s.mixTaskDivider} />
        </div>
        <div className={s.mixTaskBlock}>
          <div className={s.mixTaskNum}>{concluida}</div>
          <div className={s.mixTaskLabel}>
            <span className={s.mixTaskIcon}>✓</span>
            {concluida === 1 ? 'tarefa concluída esta semana' : 'tarefas concluídas esta semana'}
          </div>
        </div>
      </div>

      {/* ── watermark ── */}
      <AtlasLexMark />
    </div>
  )
}

/* ── helpers para as outras 5 opções ───────────────────────────── */
function brl2(v) { return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 }).format(v??0) }

function Redact({ width = 80 }) {
  return <span className={s.redact} style={{ width }} />
}

/* ── Option A ───────────────────────────────────────────────────── */
function OptionA({ lawyer, todayTasks }) {
  const DURATION = 25 * 60
  const [secs, setSecs] = useState(DURATION)
  const [running, setRunning] = useState(false)
  const accent = lawyer?.theme_accent ?? '#043b61'
  const firm   = lawyer?.firm_name    ?? 'Atlas Lex'
  const pct = ((DURATION - secs) / DURATION) * 100
  const C   = 2 * Math.PI * 88
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss2 = String(secs % 60).padStart(2, '0')
  const tasksDue = (todayTasks ?? []).length

  function playDing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ;[0, 0.22, 0.44].forEach(t => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime + t)
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + t + 0.18)
        gain.gain.setValueAtTime(0.35, ctx.currentTime + t)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35)
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.4)
      })
    } catch (_) {}
  }

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSecs(s => { if (s <= 1) { playDing(); return DURATION } return s - 1 }), 1000)
    return () => clearInterval(id)
  }, [running])

  return (
    <div className={s.optCard} style={{ '--opt-accent': accent }}>
      <div className={s.aShell}>
        <div className={s.aHeader}>
          <span className={s.aFirm}>{firm}</span>
          {tasksDue > 0 && <span className={s.aBadge}>{tasksDue} prazo{tasksDue > 1 ? 's' : ''} hoje</span>}
        </div>
        <div className={s.aTimerWrap}>
          <svg className={s.aRing} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6"/>
            <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.9)"
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C - (pct/100)*C}
              transform="rotate(-90 100 100)" style={{ transition:'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className={s.aTimerCenter}>
            <div className={s.aTimer}>{mm}:{ss2}</div>
            <div className={s.aTimerLabel}>{running ? 'foco ativo' : 'pronto'}</div>
          </div>
        </div>
        <div className={s.aControls}>
          <button className={s.aBtn} onClick={() => setRunning(r => !r)}>{running ? '⏸ Pausar' : '▶ Iniciar'}</button>
          <button className={s.aBtnGhost} onClick={() => { setSecs(DURATION); setRunning(false) }}>↺</button>
        </div>
        <div className={s.aQuote}>"{FRASES[dayOfYear() % FRASES.length]}"</div>
      </div>
    </div>
  )
}

/* ── Option B ───────────────────────────────────────────────────── */
function OptionB({ lawyer, cases, clients, weekDone, financials }) {
  const accent  = lawyer?.theme_accent ?? '#043b61'
  const firm    = lawyer?.firm_name    ?? 'Atlas Lex'
  const initials = firm.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const today   = new Date()
  const monday  = new Date(today); monday.setDate(today.getDate() - today.getDay() + 1)
  const weekLabel = monday.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) + ' – ' +
    today.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })
  const stats = [
    { num: (cases ?? []).filter(c => c.status === 'ativo').length, label: 'processos ativos' },
    { num: (clients ?? []).length,   label: 'clientes' },
    { num: (weekDone ?? []).length,  label: 'tarefas concluídas' },
    { num: brl2(financials?.receita), label: 'recebidos', sm: true },
  ]
  return (
    <div className={`${s.optCard} ${s.bCard}`} style={{ '--opt-accent': accent }}>
      <div className={s.bShell}>
        <div className={s.bTop}>
          <div className={s.bLogo}>{initials}</div>
          <div><div className={s.bFirm}>{firm}</div><div className={s.bWeek}>{weekLabel}</div></div>
          <div className={s.bStamp}>SEMANA<br/>EM NÚMEROS</div>
        </div>
        <div className={s.bDivider} />
        <div className={s.bGrid}>
          {stats.map(st => (
            <div key={st.label} className={s.bStat}>
              <div className={`${s.bNum} ${st.sm ? s.bNumSm : ''}`}>{st.num}</div>
              <div className={s.bLabel}>{st.label}</div>
            </div>
          ))}
        </div>
        <div className={s.bFooter}>
          <span>Atlas Lex · Gestão Jurídica</span>
          <span>{today.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Option C placeholder (em desenvolvimento) ──────────────────── */
function OptionCTeaser({ lawyer }) {
  const accent = lawyer?.theme_accent ?? '#043b61'
  const firm   = lawyer?.firm_name    ?? 'Atlas Lex'
  return (
    <div className={s.optCard} style={{ '--opt-accent': accent }}>
      <div className={s.teaserShell} style={{ background: accent }}>
        <div className={s.teaserIcon}>🏆</div>
        <div className={s.teaserTitle}>{firm}</div>
        <div className={s.teaserSub}>Conquistas & Metas</div>
        <div className={s.teaserMsg}>Em breve — selos desbloqueáveis,<br/>metas do escritório e notificações.</div>
      </div>
    </div>
  )
}

/* ── Option D ───────────────────────────────────────────────────── */
function OptionD({ lawyer, cases, clients, todayTasks, financials }) {
  const accent   = lawyer?.theme_accent ?? '#043b61'
  const firm     = lawyer?.firm_name    ?? 'Atlas Lex'
  const initials = firm.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const today    = new Date().toISOString().split('T')[0]
  const overdue  = (todayTasks ?? []).filter(t => t.due_date?.split('T')[0] < today).length
  const cols = [
    { l:'Ativos',    n:(cases??[]).filter(c=>c.status==='ativo').length },
    { l:'Suspensos', n:(cases??[]).filter(c=>c.status==='suspenso').length },
    { l:'Encerrados',n:(cases??[]).filter(c=>c.status==='encerrado').length },
  ]
  return (
    <div className={`${s.optCard} ${s.dCard}`} style={{ '--opt-accent': accent }}>
      <div className={s.dTopbar} style={{ background: accent }}>
        <div className={s.dTopLeft}><div className={s.dLogoMark}>{initials}</div><span className={s.dFirm}>{firm}</span></div>
        <div className={s.dOnline}><span className={s.dDot}/> ao vivo</div>
      </div>
      <div className={s.dBody}>
        <div className={s.dStats}>
          {[ {n:(cases??[]).filter(c=>c.status==='ativo').length, l:'processos ativos'},
             {n:(clients??[]).length, l:'clientes'},
             {n:overdue, l:'prazos hoje', warn:overdue>0},
             {n:(todayTasks??[]).length, l:'tarefas hoje'} ].map(({n,l,warn})=>(
            <div key={l} className={`${s.dStat} ${warn?s.dStatWarn:''}`}>
              <div className={s.dStatN}>{n}</div><div className={s.dStatL}>{l}</div>
            </div>
          ))}
        </div>
        <div className={s.dPipeline}>
          {cols.map(col=>(
            <div key={col.l} className={s.dPipeCol}>
              <div className={s.dPipeHdr}>{col.l} <span>{col.n}</span></div>
              {Array.from({length:Math.min(col.n,3)}).map((_,i)=>(
                <div key={i} className={s.dPipeItem}><Redact width={55+(i*10)}/><Redact width={38}/></div>
              ))}
              {col.n===0&&<div className={s.dPipeEmpty}>—</div>}
            </div>
          ))}
        </div>
        <div className={s.dFinRow}>
          <div className={s.dFinItem}><span className={s.dFinLabel}>Recebido</span><span className={s.dFinVal} style={{color:'var(--green)'}}>{brl2(financials?.receita)}</span></div>
          <div className={s.dFinItem}><span className={s.dFinLabel}>A receber</span><span className={s.dFinVal}>{brl2(financials?.pendente)}</span></div>
          <div className={s.dFinBar}>{(financials?.receita??0)+(financials?.pendente??0)>0&&<div className={s.dFinFill} style={{width:`${((financials?.receita??0)/((financials?.receita??0)+(financials?.pendente??0)))*100}%`,background:accent}}/>}</div>
        </div>
      </div>
    </div>
  )
}

/* ── Option E ───────────────────────────────────────────────────── */
function OptionE({ lawyer, cases, clients, weekDone }) {
  const accent  = lawyer?.theme_accent ?? '#043b61'
  const firm    = lawyer?.firm_name    ?? 'Atlas Lex'
  const month   = new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase())
  const dots    = Array.from({length:35},(_,i)=>({ size:4+((i*7+3)%5)*2.5, opacity:0.12+((i*13)%7)*0.1 }))
  return (
    <div className={`${s.optCard} ${s.eCard}`} style={{ '--opt-accent': accent }}>
      <div className={s.eShell} style={{ background: accent }}>
        <div className={s.eTopLabel}>ADVOCACIA EM MOVIMENTO</div>
        <div className={s.eDots}>{dots.map((d,i)=><div key={i} className={s.eDot} style={{width:d.size,height:d.size,opacity:d.opacity}}/>)}</div>
        <div className={s.eFirmWrap}><div className={s.eFirm}>{firm}</div><div className={s.eMonth}>{month}</div></div>
        <div className={s.eNumbers}>
          <div className={s.eNum}><span className={s.eNumVal}>{(cases??[]).filter(c=>c.status==='ativo').length}</span><span className={s.eNumLabel}>processos<br/>ativos</span></div>
          <div className={s.eSep}/>
          <div className={s.eNum}><span className={s.eNumVal}>{(weekDone??[]).length}</span><span className={s.eNumLabel}>tarefas<br/>concluídas</span></div>
          <div className={s.eSep}/>
          <div className={s.eNum}><span className={s.eNumVal}>{(clients??[]).length}</span><span className={s.eNumLabel}>clientes<br/>atendidos</span></div>
        </div>
        <div className={s.eFooter}><div className={s.eSealRing}><span className={s.eSealText}>ATLAS LEX · GESTÃO JURÍDICA</span></div></div>
      </div>
    </div>
  )
}

/* ── OPTIONS meta ───────────────────────────────────────────────── */
const ALT_OPTIONS = [
  { id:'A', emoji:'🎯', label:'Modo Foco',         tag:'Pomodoro + frase do dia' },
  { id:'B', emoji:'📊', label:'Semana em Números', tag:'Recap semanal' },
  { id:'C', emoji:'🏆', label:'Conquistas',        tag:'Selos e metas — em breve' },
  { id:'D', emoji:'🖥', label:'Dashboard Vitrine', tag:'Painel ao vivo, dados ocultos' },
  { id:'E', emoji:'📸', label:'Selo Mensal',       tag:'Poster formato stories' },
]

/* ── Page ───────────────────────────────────────────────────────── */
export default function Vitrine() {
  const { lawyer }                     = useAuth()
  const { data: todayTasks }           = useTodayTasks()
  const { data: weekDone }             = useWeekDoneTasks()
  const { data: rawCases }             = useCases()
  const { data: rawClients }           = useClients()
  const { data: financials }           = useMonthFinancials()
  const [fullscreen, setFullscreen]    = useState(null)
  const [showAlts, setShowAlts]        = useState(false)

  const shared = { lawyer, cases: rawCases, clients: rawClients, todayTasks, weekDone, financials }

  return (
    <PageShell
      title="Vitrine"
      subtitle="Card para compartilhar — seus dados reais, sem nenhum nome privado"
      action={
        <button className={s.btnExpand} onClick={() => setFullscreen('MIX')}>
          Tela cheia ↗
        </button>
      }
    >
      <div className={s.page}>

        {/* ── Featured mix ── */}
        <VitrineMix {...shared} fullscreen={false} onClose={() => setFullscreen(null)} />

        {/* ── Outras opções toggle ── */}
        <button className={s.showAltsBtn} onClick={() => setShowAlts(v => !v)}>
          {showAlts ? '▲ Ocultar outras opções' : '▼ Ver outras 5 opções'}
        </button>

        {showAlts && (
          <div className={s.altGrid}>
            {ALT_OPTIONS.map(opt => (
              <div key={opt.id} className={s.altWrapper}>
                <div className={s.altMeta}>
                  <div className={s.altTitle}>
                    <span className={s.altEmoji}>{opt.emoji}</span>
                    <div>
                      <div className={s.altName}>Opção {opt.id} — {opt.label}</div>
                      <div className={s.altTag}>{opt.tag}</div>
                    </div>
                  </div>
                  <button className={s.btnFs} onClick={() => setFullscreen(opt.id)}>↗</button>
                </div>
                {opt.id === 'A' && <OptionA {...shared} />}
                {opt.id === 'B' && <OptionB {...shared} />}
                {opt.id === 'C' && <OptionCTeaser {...shared} />}
                {opt.id === 'D' && <OptionD {...shared} />}
                {opt.id === 'E' && <OptionE {...shared} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Fullscreen ── */}
      {fullscreen && (
        <div className={s.fsOverlay} onClick={() => setFullscreen(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520 }}>
            {fullscreen === 'MIX' && <VitrineMix {...shared} fullscreen onClose={() => setFullscreen(null)} />}
            {fullscreen === 'A'   && <OptionA {...shared} />}
            {fullscreen === 'B'   && <OptionB {...shared} />}
            {fullscreen === 'C'   && <OptionCTeaser {...shared} />}
            {fullscreen === 'D'   && <OptionD {...shared} />}
            {fullscreen === 'E'   && <OptionE {...shared} />}
          </div>
        </div>
      )}
    </PageShell>
  )
}
