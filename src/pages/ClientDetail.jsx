import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import Modal from '@/components/ui/Modal'
import ClientForm from '@/components/forms/ClientForm'
import CaseForm from '@/components/forms/CaseForm'
import { Skeleton, SkeletonListItem } from '@/components/ui/Skeleton'
import styles from './ClientDetail.module.css'

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const STATUS_CASE = {
  ativo:      { label: 'Ativo',      cls: 'st-teal'   },
  encerrado:  { label: 'Encerrado',  cls: 'st-gray'   },
  arquivado:  { label: 'Arquivado',  cls: 'st-gray'   },
  suspenso:   { label: 'Suspenso',   cls: 'st-orange'  },
}

const STATUS_TASK = {
  pendente:     { label: 'Pendente',     cls: 'st-orange' },
  em_andamento: { label: 'Em andamento', cls: 'st-blue'   },
  concluida:    { label: 'Concluída',    cls: 'st-teal'   },
  cancelada:    { label: 'Cancelada',    cls: 'st-gray'   },
}

const PRIORITY = {
  alta:  { label: 'Alta',  cls: 'st-red'    },
  media: { label: 'Média', cls: 'st-orange' },
  baixa: { label: 'Baixa', cls: 'st-gray'  },
}

const STATUS_FIN = {
  pago:      { label: 'Pago',      cls: 'st-teal'   },
  pendente:  { label: 'Pendente',  cls: 'st-orange' },
  cancelado: { label: 'Cancelado', cls: 'st-gray'   },
}

/* ── PDF generation ─────────────────────────────────────────────────── */
function generateClientPDF(client, cases, tasks, entries, lawyer) {
  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  function fmtDate(iso) {
    if (!iso) return '—'
    try { return new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }) }
    catch { return iso }
  }

  const fmtBRL = n => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(Number(n) || 0)

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4361ee'
  const officeName = lawyer?.firm_name || lawyer?.full_name || 'Advocacia'
  const oabLine = lawyer?.oab_number ? ` · OAB ${lawyer.oab_number}` : ''
  const dateStr = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })

  const doneTasks   = tasks.filter(t => t.status === 'concluida')
  const paidEntries = entries.filter(e => e.status === 'pago')

  const divider = label => `
    <div style="display:flex;align-items:center;gap:1rem;margin:1.75rem 0 1.25rem;">
      <div style="flex:1;height:1px;background:#dde4eb;"></div>
      <div style="font-size:0.58rem;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#8a9bac;white-space:nowrap;">${esc(label)}</div>
      <div style="flex:1;height:1px;background:#dde4eb;"></div>
    </div>`

  const thead = (...cols) => `<thead style="background:${accent};""><tr>${cols.map(c =>
    `<th style="padding:0.65rem 1rem;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.85);text-align:left;">${esc(c)}</th>`
  ).join('')}</tr></thead>`

  const badge = (color, label) =>
    `<span style="background:${color};color:#fff;border-radius:999px;padding:0.15rem 0.6rem;font-size:0.58rem;font-weight:700;white-space:nowrap;">${esc(label)}</span>`

  const caseStatusMap = { ativo:['#0ea5e9','Ativo'], encerrado:['#94a3b8','Encerrado'], arquivado:['#94a3b8','Arquivado'], suspenso:['#f59e0b','Suspenso'] }
  const priMap        = { urgente:['#ef4444','Urgente'], alta:['#ef4444','Alta'], media:['#f59e0b','Média'], baixa:['#94a3b8','Baixa'] }

  // Dados do cliente
  const infoFields = [
    { l:'Tipo',       v: client.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física' },
    client.cpf_cnpj && { l:'CPF/CNPJ', v: client.cpf_cnpj },
    client.phone    && { l:'Telefone', v: client.phone },
    client.email    && { l:'E-mail',   v: client.email },
    (client.cidade || client.estado) && { l:'Cidade', v: [client.cidade, client.estado].filter(Boolean).join(' / ') },
    { l:'Cadastrado em', v: fmtDate(client.created_at) },
  ].filter(Boolean)

  const infoRows = infoFields.map((f, i) => `
    <tr style="${i%2===0?'background:#f4f7fa;':''}">
      <td style="padding:0.65rem 1.25rem;font-size:0.75rem;font-weight:600;color:#5a6a7a;width:160px;border-right:1px solid #dde4eb;">${esc(f.l)}</td>
      <td style="padding:0.65rem 1.25rem;font-size:0.82rem;color:#1a1a2e;">${esc(f.v)}</td>
    </tr>`).join('')

  // Casos
  let casesHtml = ''
  if (cases.length > 0) {
    const rows = cases.map((c, i) => {
      const [sc, sl] = caseStatusMap[c.status] ?? ['#94a3b8', c.status]
      return `<tr style="${i%2===0?'background:#f4f7fa;':''}">
        <td style="padding:0.6rem 1rem;font-size:0.82rem;font-weight:500;color:#1a1a2e;">${esc(c.title)}</td>
        <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;">${esc(c.case_number || '—')}</td>
        <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;">${esc(c.area || '—')}</td>
        <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;">${esc(c.court || '—')}</td>
        <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;text-align:right;">${c.valor > 0 ? esc(fmtBRL(c.valor)) : '—'}</td>
        <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;white-space:nowrap;">${esc(fmtDate(c.opened_at))}</td>
        <td style="padding:0.6rem 1rem;">${badge(sc, sl)}</td>
      </tr>`
    }).join('')
    casesHtml = `
      ${divider('Casos')}
      <div style="border:1px solid #dde4eb;border-radius:14px;overflow:hidden;margin-bottom:2rem;">
        <table style="width:100%;border-collapse:collapse;">${thead('Processo','Nº','Área','Tribunal','Valor','Abertura','Status')}<tbody>${rows}</tbody></table>
      </div>`
  }

  // Tarefas concluídas
  let tasksHtml = ''
  if (doneTasks.length > 0) {
    const rows = doneTasks.map((t, i) => {
      const [pc, pl] = priMap[t.priority] ?? ['#94a3b8', t.priority]
      return `<tr style="${i%2===0?'background:#f4f7fa;':''}">
        <td style="padding:0.6rem 1rem;font-size:0.82rem;font-weight:500;color:#1a1a2e;">${esc(t.title)}</td>
        <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;">${esc(t.cases?.title || '—')}</td>
        <td style="padding:0.6rem 1rem;">${badge(pc, pl)}</td>
        <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;white-space:nowrap;">${esc(fmtDate(t.completed_at || t.due_date))}</td>
      </tr>`
    }).join('')
    tasksHtml = `
      ${divider('Histórico de Tarefas Realizadas')}
      <div style="border:1px solid #dde4eb;border-radius:14px;overflow:hidden;margin-bottom:2rem;">
        <table style="width:100%;border-collapse:collapse;">${thead('Tarefa','Caso','Prioridade','Concluída em')}<tbody>${rows}</tbody></table>
      </div>`
  }

  // Pagamentos efetuados
  let entriesHtml = ''
  if (paidEntries.length > 0) {
    const totRec = paidEntries.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount), 0)
    const totDesp = paidEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount), 0)
    const saldo = totRec - totDesp
    const rows = paidEntries.map((e, i) => `<tr style="${i%2===0?'background:#f4f7fa;':''}">
      <td style="padding:0.6rem 1rem;font-size:0.82rem;font-weight:500;color:#1a1a2e;">${esc(e.description || '—')}</td>
      <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;">${esc(e.cases?.title || '—')}</td>
      <td style="padding:0.6rem 1rem;">${badge(e.type === 'receita' ? '#22c55e' : '#ef4444', e.type === 'receita' ? 'Receita' : 'Despesa')}</td>
      <td style="padding:0.6rem 1rem;font-size:0.8rem;font-weight:700;text-align:right;color:${e.type === 'receita' ? '#1a9e43' : '#e03c3c'};">${e.type === 'receita' ? '+' : '−'}${esc(fmtBRL(e.amount))}</td>
      <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;white-space:nowrap;">${esc(fmtDate(e.due_date))}</td>
    </tr>`).join('')
    entriesHtml = `
      ${divider('Pagamentos Efetuados')}
      <div style="border:1px solid #dde4eb;border-radius:14px;overflow:hidden;margin-bottom:1.5rem;">
        <table style="width:100%;border-collapse:collapse;">${thead('Descrição','Caso','Tipo','Valor','Data')}<tbody>${rows}</tbody></table>
      </div>
      <div style="display:flex;gap:0;background:#f4f7fa;border:1px solid #dde4eb;border-radius:12px;overflow:hidden;margin-bottom:2rem;">
        ${[['Receitas','#1a9e43',fmtBRL(totRec)],['Despesas','#e03c3c',fmtBRL(totDesp)],['Saldo',saldo>=0?'#1a9e43':'#e03c3c',fmtBRL(saldo)]].map((item, i) => `
          ${i > 0 ? '<div style="width:1px;background:#dde4eb;"></div>' : ''}
          <div style="flex:1;text-align:center;padding:1rem;">
            <div style="font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8a9bac;margin-bottom:0.35rem;">${esc(item[0])}</div>
            <div style="font-size:1rem;font-weight:700;color:${item[1]};">${esc(item[2])}</div>
          </div>`).join('')}
      </div>`
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ficha do Cliente — ${esc(client.full_name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 15px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f0f2f5; color: #1a1a2e; min-height: 100vh; padding: 2rem; }
  .page { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 60px rgba(0,0,0,0.12); }
  .pdf-header { background: ${accent}; padding: 2.5rem 3rem; position: relative; overflow: hidden; }
  .pdf-header::before { content: ''; position: absolute; top: -30%; right: -5%; width: 380px; height: 380px; border-radius: 50%; background: rgba(255,255,255,0.05); pointer-events: none; }
  .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; position: relative; z-index: 1; }
  .office-brand { display: flex; align-items: center; gap: 0.875rem; }
  .office-logo { width: 46px; height: 46px; background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.3); border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .office-logo svg { width: 23px; height: 23px; stroke: #fff; fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .office-name-main { font-size: 1rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #fff; }
  .office-name-sub { font-size: 0.58rem; color: rgba(255,255,255,0.55); letter-spacing: 0.12em; text-transform: uppercase; margin-top: 0.15rem; }
  .header-doc-info { text-align: right; }
  .doc-label { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(255,255,255,0.45); }
  .doc-date { font-size: 0.78rem; color: rgba(255,255,255,0.8); font-weight: 500; margin-top: 0.2rem; }
  .header-body { position: relative; z-index: 1; }
  .prop-badge { display: inline-block; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); border-radius: 999px; padding: 0.28rem 0.85rem; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.75); margin-bottom: 0.7rem; }
  .prop-title { font-size: 1.65rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 0.3rem; }
  .prop-sub { font-size: 0.82rem; color: rgba(255,255,255,0.65); }
  .pdf-body { padding: 2rem 3rem 2.5rem; }
  .pdf-footer { background: ${accent}; padding: 1.25rem 3rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .pdf-footer-brand { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.65); }
  .pdf-footer-note { font-size: 0.62rem; color: rgba(255,255,255,0.45); text-align: right; line-height: 1.5; }
  @media print {
    html { font-size: 13px; }
    body { background: #fff; padding: 0; }
    .page { border-radius: 0; box-shadow: none; max-width: 100%; }
    .no-print { display: none !important; }
    @page { margin: 0; size: A4; }
  }
</style>
</head>
<body>
<div class="no-print" style="text-align:center;margin-bottom:1.5rem;">
  <button onclick="window.print()" style="background:${accent};color:#fff;border:none;border-radius:10px;padding:0.7rem 2rem;font-size:0.88rem;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:0.6rem;box-shadow:0 4px 20px rgba(0,0,0,0.18);">
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Imprimir / Salvar como PDF
  </button>
</div>
<div class="page">
  <div class="pdf-header">
    <div class="header-top">
      <div class="office-brand">
        <div class="office-logo">
          <svg viewBox="0 0 24 24"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21H3"/><path d="M21 21h-4"/><path d="M11 21h2"/><line x1="7" y1="5" x2="17" y2="5"/><line x1="12" y1="2" x2="12" y2="21"/></svg>
        </div>
        <div>
          <div class="office-name-main">${esc(officeName)}</div>
          <div class="office-name-sub">Advocacia${oabLine}</div>
        </div>
      </div>
      <div class="header-doc-info">
        <div class="doc-label">Data de Emissão</div>
        <div class="doc-date">${dateStr}</div>
      </div>
    </div>
    <div class="header-body">
      <div class="prop-badge">Ficha do Cliente</div>
      <div class="prop-title">${esc(client.full_name)}</div>
      <div class="prop-sub">${[client.email, client.phone].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ')}</div>
    </div>
  </div>

  <div class="pdf-body">
    ${divider('Dados do Cliente')}
    <div style="border:1px solid #dde4eb;border-radius:14px;overflow:hidden;margin-bottom:2rem;">
      <table style="width:100%;border-collapse:collapse;"><tbody>${infoRows}</tbody></table>
    </div>
    ${casesHtml}
    ${tasksHtml}
    ${entriesHtml}
  </div>

  <div class="pdf-footer">
    <div class="pdf-footer-brand">${esc(officeName)}</div>
    <div class="pdf-footer-note">Gerado em ${dateStr}<br>Uso interno · Confidencial</div>
  </div>
</div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) { alert('Permita pop-ups nesta página para gerar o PDF.'); return }
  win.document.write(html)
  win.document.close()
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lawyer } = useAuth()

  const [client,  setClient]  = useState(null)
  const [cases,   setCases]   = useState([])
  const [tasks,   setTasks]   = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [editing,    setEditing]    = useState(false)
  const [newCase,    setNewCase]    = useState(false)

  async function load() {
    setLoading(true)
    setError(null)

    const [clientRes, casesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('cases')
        .select('id, title, case_number, status, area, court, valor, opened_at, updated_at')
        .eq('client_id', id)
        .order('updated_at', { ascending: false }),
    ])

    if (clientRes.error) { setError(clientRes.error.message); setLoading(false); return }

    setClient(clientRes.data)
    const caseList = casesRes.data ?? []
    setCases(caseList)

    const caseIds = caseList.map(c => c.id)

    if (caseIds.length > 0) {
      const [tasksRes, entriesRes] = await Promise.all([
        supabase.from('tasks')
          .select('id, title, status, priority, due_date, completed_at, cases(title)')
          .in('case_id', caseIds)
          .order('due_date', { ascending: true, nullsFirst: false }),
        supabase.from('financial_entries')
          .select('id, description, type, amount, status, due_date, cases(title)')
          .in('case_id', caseIds)
          .order('due_date', { ascending: false }),
      ])
      setTasks(tasksRes.data ?? [])
      setEntries(entriesRes.data ?? [])
    } else {
      setTasks([])
      setEntries([])
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function handleSave() {
    setEditing(false)
    load()
  }

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Skeleton width="5rem" height="0.75rem" />
        <div className={styles.headerMain}>
          <Skeleton width="48px" height="48px" radius="12px" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <Skeleton width="45%" height="1rem" />
            <Skeleton width="28%" height="0.7rem" />
          </div>
        </div>
      </div>
      <div className={styles.infoCard}>
        {[1,2,3,4,5].map(i => (
          <div key={i} className={styles.infoRow}>
            <Skeleton width="50%" height="0.6rem" />
            <Skeleton width="75%" height="0.8rem" />
          </div>
        ))}
      </div>
      {[4, 3, 3].map((rows, si) => (
        <div key={si} className={styles.section}>
          <div className={styles.sectionHeader}>
            <Skeleton width="5rem" height="0.75rem" />
            <Skeleton width="1.5rem" height="1.2rem" radius="999px" />
          </div>
          <div className={styles.sectionBody}>
            {Array.from({ length: rows }, (_, i) => <SkeletonListItem key={i} />)}
          </div>
        </div>
      ))}
    </div>
  )

  if (error) return (
    <div className={styles.loadWrap}>
      <p style={{ color: 'var(--text-2)' }}>Erro ao carregar: {error}</p>
    </div>
  )

  if (!client) return null

  const receita = entries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const despesa = entries.filter(e => e.type === 'despesa' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const saldo   = receita - despesa

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/painel/clientes')}>
          ← Clientes
        </button>

        <div className={styles.headerMain}>
          <div className={styles.avatar}>{initials(client.full_name)}</div>
          <div>
            <div className={styles.clientName}>
              {client.full_name}
              <span className={`badge ${client.tipo === 'PJ' ? 'st-blue' : 'st-teal'}`}>
                {client.tipo ?? 'PF'}
              </span>
            </div>
            {client.email && <div className={styles.clientSub}>{client.email}</div>}
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.pdfBtn} onClick={() => generateClientPDF(client, cases, tasks, entries, lawyer)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <polyline points="4 6 4 1.5 12 1.5 12 6"/>
              <path d="M4 11.5H2.5a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 14 6v4a1.5 1.5 0 0 1-1.5 1.5H11"/>
              <rect x="4" y="9" width="8" height="5.5" rx="0.5"/>
            </svg>
            PDF
          </button>
          <button className={styles.newCaseBtn} onClick={() => setNewCase(true)}>
            + Novo caso
          </button>
          <button className={styles.editBtn} onClick={() => setEditing(true)}>
            Editar
          </button>
        </div>
      </div>

      {/* ── Info card ── */}
      <div className={styles.infoCard}>
        <InfoRow label="CPF/CNPJ"   value={client.cpf_cnpj} />
        <InfoRow label="Telefone"   value={client.phone} />
        <InfoRow label="E-mail"     value={client.email} />
        <InfoRow label="Cidade"     value={
          client.cidade && client.estado
            ? `${client.cidade} / ${client.estado}`
            : client.cidade ?? client.estado
        } />
        <InfoRow label="Cadastrado" value={fmt(client.created_at)} />
      </div>

      {/* ── Casos ── */}
      <Section title="Casos" count={cases.length}>
        {cases.length === 0
          ? <Empty text="Nenhum processo vinculado" />
          : cases.map(c => {
              const st = STATUS_CASE[c.status] ?? { label: c.status, cls: 'st-gray' }
              return (
                <Link key={c.id} to={`/painel/casos/${c.id}`} className={styles.listItem} style={{ textDecoration: 'none' }}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{c.title}</span>
                    {c.case_number && <span className={styles.listSub}>{c.case_number}</span>}
                  </div>
                  <div className={styles.listMeta}>
                    {c.area   && <span className={styles.listTag}>{c.area}</span>}
                    {c.court  && <span className={styles.listTag}>{c.court}</span>}
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {c.valor > 0 && <span className={styles.listAmt}>{brl(c.valor)}</span>}
                    <span className={styles.listDate}>{fmt(c.opened_at)}</span>
                  </div>
                </Link>
              )
            })
        }
      </Section>

      {/* ── Tarefas ── */}
      <Section title="Tarefas" count={tasks.length}>
        {tasks.length === 0
          ? <Empty text="Nenhuma tarefa vinculada" />
          : tasks.map(t => {
              const st = STATUS_TASK[t.status]  ?? { label: t.status,   cls: 'st-gray' }
              const pr = PRIORITY[t.priority]   ?? { label: t.priority,  cls: 'st-gray' }
              return (
                <div key={t.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{t.title}</span>
                    {t.cases?.title && <span className={styles.listSub}>{t.cases.title}</span>}
                  </div>
                  <div className={styles.listMeta}>
                    <span className={`badge ${pr.cls}`}>{pr.label}</span>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {t.due_date && <span className={styles.listDate}>{fmt(t.due_date)}</span>}
                  </div>
                </div>
              )
            })
        }
      </Section>

      {/* ── Financeiro ── */}
      <Section
        title="Financeiro"
        count={entries.length}
        badge={entries.length > 0
          ? <span className={styles.saldoBadge} style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {brl(saldo)}
            </span>
          : null
        }
      >
        {entries.length === 0
          ? <Empty text="Nenhum lançamento vinculado" />
          : entries.map(e => {
              const st = STATUS_FIN[e.status] ?? { label: e.status, cls: 'st-gray' }
              return (
                <div key={e.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{e.description || '—'}</span>
                    {e.cases?.title && <span className={styles.listSub}>{e.cases.title}</span>}
                  </div>
                  <div className={styles.listMeta}>
                    <span className={`badge ${e.type === 'receita' ? 'st-teal' : 'st-red'}`}>
                      {e.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {e.due_date && <span className={styles.listDate}>{fmt(e.due_date)}</span>}
                    <span className={styles.listAmt} style={{ color: e.type === 'receita' ? 'var(--green)' : 'var(--red)' }}>
                      {e.type === 'receita' ? '+' : '−'}{brl(e.amount)}
                    </span>
                  </div>
                </div>
              )
            })
        }
      </Section>

      {editing && (
        <Modal title="Editar cliente" onClose={() => setEditing(false)}>
          <ClientForm initial={client} onSave={handleSave} onClose={() => setEditing(false)} />
        </Modal>
      )}

      {newCase && (
        <Modal title="Novo caso" onClose={() => setNewCase(false)}>
          <CaseForm
            initial={{ client_id: client.id }}
            onSave={() => { setNewCase(false); load() }}
            onClose={() => setNewCase(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  )
}

function Section({ title, count, badge, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{title}</span>
        {count !== undefined && <span className={styles.sectionCount}>{count}</span>}
        {badge}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function Empty({ text }) {
  return <p className={styles.empty}>{text}</p>
}
