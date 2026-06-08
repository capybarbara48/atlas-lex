import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useKanbanSituations } from '@/hooks/useKanbanSituations'
import { updateCaseSituation, finalizeCase, deleteCase, toggleQuotaLitisReceived } from '@/hooks/useCases'
import { updateTaskAssignee } from '@/hooks/useTasks'
import { useCaseNotes } from '@/hooks/useCaseNotes'
import { PROCESS_PHASES } from '@/lib/processPhases'
import Modal from '@/components/ui/Modal'
import CaseForm from '@/components/forms/CaseForm'
import TaskForm from '@/components/forms/TaskForm'
import EntryForm from '@/components/forms/EntryForm'
import { Skeleton, SkeletonListItem } from '@/components/ui/Skeleton'
import styles from './CaseDetail.module.css'

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR')
}

const STATUS_TASK = {
  pendente:     { label: 'Pendente',     cls: 'st-orange' },
  em_andamento: { label: 'Em andamento', cls: 'st-blue'   },
  concluida:    { label: 'Concluída',    cls: 'st-teal'   },
  cancelada:    { label: 'Cancelada',    cls: 'st-gray'   },
}
const PRIORITY = {
  alta:    { label: 'Alta',    cls: 'st-red'    },
  urgente: { label: 'Urgente', cls: 'st-red'    },
  media:   { label: 'Média',   cls: 'st-orange' },
  baixa:   { label: 'Baixa',   cls: 'st-gray'   },
}
const STATUS_FIN = {
  pago:      { label: 'Pago',      cls: 'st-teal'   },
  pendente:  { label: 'Pendente',  cls: 'st-orange' },
  cancelado: { label: 'Cancelado', cls: 'st-gray'   },
}

/* ── PDF generation ─────────────────────────────────────────────────── */
function generateCasePDF(caso, tasks, entries, lawyer, phase) {
  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  function fmtDate(iso) {
    if (!iso) return '—'
    try { return new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }) }
    catch { return iso }
  }

  const fmtBRL = n => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(Number(n) || 0)
  const accent     = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4361ee'
  const officeName = lawyer?.firm_name || lawyer?.full_name || 'Advocacia'
  const oabLine    = lawyer?.oab_number ? ` · OAB ${lawyer.oab_number}` : ''
  const dateStr    = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })

  const priMap      = { urgente:['#ef4444','Urgente'], alta:['#ef4444','Alta'], media:['#f59e0b','Média'], baixa:['#94a3b8','Baixa'] }
  const taskStMap   = { pendente:['#f59e0b','Pendente'], em_andamento:['#3b82f6','Em andamento'], concluida:['#22c55e','Concluída'], cancelada:['#94a3b8','Cancelada'] }
  const entryStMap  = { pago:['#22c55e','Pago'], pendente:['#f59e0b','Pendente'], cancelado:['#94a3b8','Cancelado'] }

  const divider = label => `
    <div style="display:flex;align-items:center;gap:1rem;margin:1.75rem 0 1.25rem;">
      <div style="flex:1;height:1px;background:#dde4eb;"></div>
      <div style="font-size:0.58rem;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#8a9bac;white-space:nowrap;">${esc(label)}</div>
      <div style="flex:1;height:1px;background:#dde4eb;"></div>
    </div>`

  const thead = (...cols) => `<thead style="background:${accent};"><tr>${cols.map(c =>
    `<th style="padding:0.65rem 1rem;font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.85);text-align:left;">${esc(c)}</th>`
  ).join('')}</tr></thead>`

  const badge = (color, label) =>
    `<span style="background:${color};color:#fff;border-radius:999px;padding:0.15rem 0.6rem;font-size:0.58rem;font-weight:700;white-space:nowrap;">${esc(label)}</span>`

  // Dados do cliente
  const cli = caso.clients
  const clientFields = cli ? [
    { l: 'Tipo',       v: cli.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física' },
    cli.cpf_cnpj && { l: 'CPF/CNPJ', v: cli.cpf_cnpj },
    cli.phone    && { l: 'Telefone', v: cli.phone },
    cli.email    && { l: 'E-mail',   v: cli.email },
    (cli.cidade || cli.estado) && { l: 'Cidade', v: [cli.cidade, cli.estado].filter(Boolean).join(' / ') },
  ].filter(Boolean) : []

  const clientRows = clientFields.map((f, i) => `
    <tr style="${i%2===0?'background:#f4f7fa;':''}">
      <td style="padding:0.65rem 1.25rem;font-size:0.75rem;font-weight:600;color:#5a6a7a;width:160px;border-right:1px solid #dde4eb;">${esc(f.l)}</td>
      <td style="padding:0.65rem 1.25rem;font-size:0.82rem;color:#1a1a2e;">${esc(f.v)}</td>
    </tr>`).join('')

  const clientHtml = cli ? `
    ${divider('Dados do Cliente')}
    <div style="background:#f4f7fa;border:1px solid #dde4eb;border-radius:14px;overflow:hidden;margin-bottom:0.75rem;">
      <div style="padding:1rem 1.25rem;border-bottom:1px solid #dde4eb;display:flex;align-items:center;gap:0.75rem;">
        <div style="width:36px;height:36px;background:${accent};border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style="font-size:1rem;font-weight:700;color:#1a1a2e;">${esc(cli.full_name)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;"><tbody>${clientRows}</tbody></table>
    </div>` : ''

  // Dados do processo
  const caseFields = [
    caso.area               && { l: 'Área',           v: caso.area },
    caso.court              && { l: 'Tribunal',       v: caso.court },
    caso.valor > 0          && { l: 'Valor da causa', v: fmtBRL(caso.valor) },
    caso.description        && { l: 'Observações',    v: caso.description },
  ].filter(Boolean)

  const infoRows = caseFields.map((f, i) => `
    <tr style="${i%2===0?'background:#f4f7fa;':''}">
      <td style="padding:0.65rem 1.25rem;font-size:0.75rem;font-weight:600;color:#5a6a7a;width:160px;border-right:1px solid #dde4eb;">${esc(f.l)}</td>
      <td style="padding:0.65rem 1.25rem;font-size:0.82rem;color:#1a1a2e;">${esc(f.v)}</td>
    </tr>`).join('')

  // Situação atual do processo (fase selecionada pelo advogado)
  const statusHtml = phase ? `
    ${divider('Situação Atual do Processo')}
    <div style="background:#f4f7fa;border:1px solid #dde4eb;border-radius:14px;padding:1.75rem 2rem;margin-bottom:2rem;">
      <div style="display:flex;align-items:center;gap:0.875rem;margin-bottom:1.1rem;">
        <div style="background:${accent};color:#fff;border-radius:7px;padding:0.28rem 0.7rem;font-size:0.62rem;font-weight:800;letter-spacing:0.06em;white-space:nowrap;flex-shrink:0;">${esc(phase.id)}</div>
        <div style="font-size:0.95rem;font-weight:700;color:#1a1a2e;line-height:1.3;">${esc(phase.titulo)}</div>
      </div>
      <div style="font-size:0.875rem;color:#3a4a5a;line-height:1.8;border-left:3px solid ${accent};padding-left:1.25rem;">${esc(phase.explicacao)}</div>
      <div style="margin-top:1rem;font-size:0.6rem;color:#8a9bac;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">${esc(phase.grupo)} · ${phase.tipo === 'aguardando' ? 'Situação de Espera' : 'Fase Processual'}</div>
    </div>` : ''

  // Tarefas
  let tasksHtml = ''
  if (tasks.length > 0) {
    const rows = tasks.map((t, i) => {
      const [pc, pl] = priMap[t.priority]  ?? ['#94a3b8', t.priority]
      const [sc, sl] = taskStMap[t.status] ?? ['#94a3b8', t.status]
      return `<tr style="${i%2===0?'background:#f4f7fa;':''}">
        <td style="padding:0.6rem 1rem;font-size:0.82rem;font-weight:500;color:#1a1a2e;">${esc(t.title)}</td>
        <td style="padding:0.6rem 1rem;">${badge(pc, pl)}</td>
        <td style="padding:0.6rem 1rem;">${badge(sc, sl)}</td>
        <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;white-space:nowrap;">${esc(fmtDate(t.due_date))}</td>
      </tr>`
    }).join('')
    tasksHtml = `
      ${divider('Tarefas')}
      <div style="border:1px solid #dde4eb;border-radius:14px;overflow:hidden;margin-bottom:2rem;">
        <table style="width:100%;border-collapse:collapse;">${thead('Tarefa','Prioridade','Status','Prazo')}<tbody>${rows}</tbody></table>
      </div>`
  }

  // Financeiro
  let entriesHtml = ''
  if (entries.length > 0) {
    const totRec  = entries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
    const totDesp = entries.filter(e => e.type === 'despesa' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
    const saldo   = totRec - totDesp
    const rows = entries.map((e, i) => {
      const [sc, sl] = entryStMap[e.status] ?? ['#94a3b8', e.status]
      return `<tr style="${i%2===0?'background:#f4f7fa;':''}">
        <td style="padding:0.6rem 1rem;font-size:0.82rem;font-weight:500;color:#1a1a2e;">${esc(e.description || '—')}</td>
        <td style="padding:0.6rem 1rem;">${badge(e.type === 'receita' ? '#22c55e' : '#ef4444', e.type === 'receita' ? 'Receita' : 'Despesa')}</td>
        <td style="padding:0.6rem 1rem;">${badge(sc, sl)}</td>
        <td style="padding:0.6rem 1rem;font-size:0.8rem;font-weight:700;text-align:right;color:${e.type === 'receita' ? '#1a9e43' : '#e03c3c'};">${e.type === 'receita' ? '+' : '−'}${esc(fmtBRL(e.amount))}</td>
        <td style="padding:0.6rem 1rem;font-size:0.72rem;color:#5a6a7a;white-space:nowrap;">${esc(fmtDate(e.due_date))}</td>
      </tr>`
    }).join('')
    entriesHtml = `
      ${divider('Financeiro')}
      <div style="border:1px solid #dde4eb;border-radius:14px;overflow:hidden;margin-bottom:1.5rem;">
        <table style="width:100%;border-collapse:collapse;">${thead('Descrição','Tipo','Status','Valor','Data')}<tbody>${rows}</tbody></table>
      </div>
      <div style="display:flex;background:#f4f7fa;border:1px solid #dde4eb;border-radius:12px;overflow:hidden;margin-bottom:2rem;">
        ${[['Receitas','#1a9e43',fmtBRL(totRec)],['Despesas','#e03c3c',fmtBRL(totDesp)],['Saldo',saldo>=0?'#1a9e43':'#e03c3c',fmtBRL(saldo)]].map((item, idx) => `
          ${idx > 0 ? '<div style="width:1px;background:#dde4eb;"></div>' : ''}
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
<title>Ficha do Processo — ${esc(caso.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{font-size:15px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:#f0f2f5;color:#1a1a2e;min-height:100vh;padding:2rem;}
  .page{max-width:900px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 60px rgba(0,0,0,0.12);}
  .pdf-header{background:${accent};padding:2.5rem 3rem;position:relative;overflow:hidden;}
  .pdf-header::before{content:'';position:absolute;top:-30%;right:-5%;width:380px;height:380px;border-radius:50%;background:rgba(255,255,255,0.05);pointer-events:none;}
  .header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;position:relative;z-index:1;}
  .office-brand{display:flex;align-items:center;gap:0.875rem;}
  .office-logo{width:46px;height:46px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .office-logo svg{width:23px;height:23px;stroke:#fff;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}
  .office-name-main{font-size:1rem;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#fff;}
  .office-name-sub{font-size:0.58rem;color:rgba(255,255,255,0.55);letter-spacing:0.12em;text-transform:uppercase;margin-top:0.15rem;}
  .header-doc-info{text-align:right;}
  .doc-label{font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:rgba(255,255,255,0.45);}
  .doc-date{font-size:0.78rem;color:rgba(255,255,255,0.8);font-weight:500;margin-top:0.2rem;}
  .header-body{position:relative;z-index:1;}
  .prop-badge{display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:0.28rem 0.85rem;font-size:0.6rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.75);margin-bottom:0.7rem;}
  .prop-title{font-size:1.65rem;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.2;margin-bottom:0.3rem;}
  .prop-sub{font-size:0.82rem;color:rgba(255,255,255,0.65);}
  .pdf-body{padding:2rem 3rem 2.5rem;}
  .pdf-footer{background:${accent};padding:1.25rem 3rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;}
  .pdf-footer-brand{font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.65);}
  .pdf-footer-note{font-size:0.62rem;color:rgba(255,255,255,0.45);text-align:right;line-height:1.5;}
  @media print{html{font-size:13px;}body{background:#fff;padding:0;}.page{border-radius:0;box-shadow:none;max-width:100%;}.no-print{display:none!important;}@page{margin:0;size:A4;}}
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
      <div class="prop-badge">Ficha do Processo</div>
      <div class="prop-title">${esc(caso.title)}</div>
      ${caso.case_number ? `<div class="prop-sub">${esc(caso.case_number)}</div>` : ''}
    </div>
  </div>
  <div class="pdf-body">
    ${clientHtml}
    ${caseFields.length > 0 ? `
    ${divider('Dados do Processo')}
    <div style="border:1px solid #dde4eb;border-radius:14px;overflow:hidden;margin-bottom:2rem;">
      <table style="width:100%;border-collapse:collapse;"><tbody>${infoRows}</tbody></table>
    </div>` : ''}
    ${statusHtml}
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

// ── Note colours (mirrors Notes.jsx palette) ─────────────────────
const CORES = [
  { key: 'amarelo',  bg: '#fef9c3', border: '#f59e0b' },
  { key: 'azul',     bg: '#dbeafe', border: '#3b82f6' },
  { key: 'verde',    bg: '#dcfce7', border: '#22c55e' },
  { key: 'vermelho', bg: '#fee2e2', border: '#ef4444' },
  { key: 'roxo',     bg: '#ede9fe', border: '#a855f7' },
  { key: 'laranja',  bg: '#ffedd5', border: '#f97316' },
]
const COR_MAP = Object.fromEntries(CORES.map(c => [c.key, c]))

function fmtShort(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function CaseNoteExpand({ nota, onClose, onSaved }) {
  const [titulo, setTitulo] = useState(nota.titulo ?? '')
  const [corpo,  setCorpo]  = useState(nota.corpo  ?? '')
  const [cor,    setCor]    = useState(nota.cor    ?? null)
  const [fixada, setFixada] = useState(nota.fixada ?? false)
  const [saving, setSaving] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => { bodyRef.current?.focus() }, [])

  const corStyle = cor ? COR_MAP[cor] : null

  async function save() {
    setSaving(true)
    await supabase.from('notas').update({ titulo: titulo || null, corpo: corpo || null, cor, fixada }).eq('id', nota.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className={styles.noteExpandOverlay} onClick={e => { if (e.target === e.currentTarget) save() }}>
      <div className={styles.noteExpandCard} style={corStyle ? { borderTop: `4px solid ${corStyle.border}` } : {}}>
        <div className={styles.noteExpandHead}>
          <input className={styles.noteExpandTitle} value={titulo}
            onChange={e => setTitulo(e.target.value)} placeholder="Título da nota" />
          <div className={styles.noteExpandActions}>
            <button className={`${styles.noteExpandBtn} ${fixada ? styles.noteIconActive : ''}`}
              title={fixada ? 'Desafixar' : 'Fixar'} onClick={() => setFixada(v => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"/>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
              </svg>
            </button>
            <button className={`${styles.noteExpandBtn} ${styles.noteExpandClose}`} title="Fechar" onClick={save}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.noteExpandColorBar}>
          {CORES.map(c => (
            <button key={c.key} type="button"
              className={`${styles.noteColorDot} ${cor === c.key ? styles.noteColorDotActive : ''}`}
              style={{ background: c.bg, borderColor: c.border }}
              onClick={() => setCor(cor === c.key ? null : c.key)}
            />
          ))}
          {cor && <button type="button" className={styles.noteClearColor} onClick={() => setCor(null)}>Sem cor</button>}
        </div>
        <textarea ref={bodyRef} className={styles.noteExpandBody} value={corpo}
          onChange={e => setCorpo(e.target.value)} placeholder="Escreva sua nota…" />
        <div className={styles.noteExpandFooter}>
          <span className={styles.noteCharCount}>{corpo.length} caracteres</span>
          <button className={styles.noteExpandSave} onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CaseDespachoSection({ caseId }) {
  const [desps,   setDesps]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('workspace_despachos')
      .select('id, tipo, local, notas, responsavel, done_at')
      .eq('case_id', caseId)
      .eq('status', 'concluido')
      .order('done_at', { ascending: false })
      .then(({ data }) => { setDesps(data ?? []); setLoading(false) })
  }, [caseId])

  function fmtDt(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Section title="Despachos Realizados" count={loading ? undefined : desps.length}>
      {loading
        ? <SkeletonListItem />
        : desps.length === 0
          ? <Empty text="Nenhum despacho registrado neste processo" />
          : desps.map(d => (
              <div key={d.id} className={styles.listItem}>
                <div className={styles.listMain}>
                  <span className={styles.listTitle}>{d.tipo || 'Despacho'}</span>
                  {d.notas && <span className={styles.listSub}>{d.notas}</span>}
                </div>
                <div className={styles.listMeta}>
                  <span className="badge st-teal" style={{ fontSize: '0.6rem' }}>{d.local}</span>
                  {d.responsavel && (
                    <span className="badge st-blue" style={{ fontSize: '0.6rem' }}>{d.responsavel.split(' ')[0]}</span>
                  )}
                  <span className={styles.listDate}>{fmtDt(d.done_at)}</span>
                </div>
              </div>
            ))
      }
    </Section>
  )
}

function CaseNotesSection({ caseId, lawyerId }) {
  const { data: notasRaw, refetch } = useCaseNotes(caseId)
  const notas = notasRaw ?? []

  const [addOpen,    setAddOpen]    = useState(false)
  const [newTitulo,  setNewTitulo]  = useState('')
  const [newCorpo,   setNewCorpo]   = useState('')
  const [newCor,     setNewCor]     = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [expandNota, setExpandNota] = useState(null)

  function openAdd() { setAddOpen(v => !v); setNewTitulo(''); setNewCorpo(''); setNewCor(null) }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newTitulo.trim() && !newCorpo.trim()) return
    setSaving(true)
    await supabase.from('notas').insert({
      lawyer_id: lawyerId,
      case_id:   caseId,
      titulo:    newTitulo.trim() || null,
      corpo:     newCorpo.trim()  || null,
      cor:       newCor,
    })
    setSaving(false)
    setNewTitulo(''); setNewCorpo(''); setNewCor(null); setAddOpen(false)
    refetch()
  }

  async function handlePin(nota) {
    await supabase.from('notas').update({ fixada: !nota.fixada }).eq('id', nota.id)
    refetch()
  }

  async function handleDelete(nota) {
    if (!window.confirm('Excluir esta nota?')) return
    await supabase.from('notas').delete().eq('id', nota.id)
    refetch()
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Notas</span>
        <span className={styles.sectionCount}>{notas.length}</span>
        <button className={styles.sectionAddBtn} onClick={openAdd}>
          {addOpen ? '✕ Cancelar' : '+ Nova nota'}
        </button>
      </div>
      <div className={styles.sectionBody}>
        {addOpen && (
          <form className={styles.noteAddForm} onSubmit={handleAdd}>
            <input className={styles.noteAddTitle} value={newTitulo}
              onChange={e => setNewTitulo(e.target.value)} placeholder="Título da nota" autoFocus />
            <div className={styles.noteColorPicker}>
              {CORES.map(c => (
                <button key={c.key} type="button"
                  className={`${styles.noteColorDot} ${newCor === c.key ? styles.noteColorDotActive : ''}`}
                  style={{ background: c.bg, borderColor: c.border }}
                  onClick={() => setNewCor(newCor === c.key ? null : c.key)}
                />
              ))}
            </div>
            <textarea className={styles.noteAddBody} value={newCorpo}
              onChange={e => setNewCorpo(e.target.value)}
              placeholder="Escreva a nota… (Ctrl+Enter para salvar)" rows={3}
              onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleAdd(e) } }} />
            <div className={styles.noteAddFooter}>
              <button type="button" className={styles.noteAddCancel} onClick={() => setAddOpen(false)}>Cancelar</button>
              <button type="submit" className={styles.noteAddSave}
                disabled={saving || (!newTitulo.trim() && !newCorpo.trim())}>
                {saving ? 'Salvando…' : 'Salvar nota'}
              </button>
            </div>
          </form>
        )}
        {notas.length === 0 && !addOpen && <p className={styles.empty}>Nenhuma nota vinculada.</p>}
        {notas.length > 0 && (
          <div className={styles.noteGrid}>
            {notas.map(n => {
              const cor = n.cor ? COR_MAP[n.cor] : null
              return (
                <div key={n.id}
                  className={`${styles.noteCard} ${n.fixada ? styles.noteCardPinned : ''}`}
                  style={cor ? { background: cor.bg, borderLeftColor: cor.border } : {}}
                  onClick={() => setExpandNota(n)}
                >
                  <div className={styles.noteCardHead}>
                    <span className={styles.noteCardDate}>{fmtShort(n.updated_at)}</span>
                    <div className={styles.noteCardActions} onClick={e => e.stopPropagation()}>
                      <button className={`${styles.noteIconBtn} ${n.fixada ? styles.noteIconActive : ''}`}
                        title={n.fixada ? 'Desafixar' : 'Fixar'} onClick={() => handlePin(n)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="17" x2="12" y2="22"/>
                          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
                        </svg>
                      </button>
                      <button className={`${styles.noteIconBtn} ${styles.noteDelBtn}`} title="Excluir" onClick={() => handleDelete(n)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {n.titulo
                    ? <div className={styles.noteCardTitle}>{n.titulo}</div>
                    : <div className={`${styles.noteCardTitle} ${styles.noteCardNoTitle}`}>Sem título</div>}
                  {n.corpo && <div className={styles.noteCardBody}>{n.corpo}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {expandNota && (
        <CaseNoteExpand nota={expandNota}
          onClose={() => setExpandNota(null)}
          onSaved={() => { setExpandNota(null); refetch() }} />
      )}
    </div>
  )
}

const OUTCOMES = [
  { key: 'procedente',   label: 'Procedente',   icon: '✓', color: '#22c55e', bg: '#dcfce7', border: '#86efac' },
  { key: 'improcedente', label: 'Improcedente', icon: '✕', color: '#ef4444', bg: '#fee2e2', border: '#fca5a5' },
  { key: 'outro',        label: 'Outro motivo', icon: '●', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
]

function FinalizarModal({ onClose, onConfirm }) {
  const [outcome, setOutcome] = useState(null)
  const [reason,  setReason]  = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleConfirm() {
    if (!outcome) return
    if (outcome === 'outro' && !reason.trim()) return
    setSaving(true)
    await onConfirm(outcome, reason)
    setSaving(false)
  }

  return (
    <div className={styles.finalizeBody}>
      <p className={styles.finalizeQuestion}>Qual foi o resultado deste processo?</p>
      <div className={styles.outcomeCards}>
        {OUTCOMES.map(o => (
          <button
            key={o.key}
            type="button"
            className={`${styles.outcomeCard} ${outcome === o.key ? styles.outcomeCardSelected : ''}`}
            style={outcome === o.key ? { borderColor: o.color, background: o.bg } : {}}
            onClick={() => setOutcome(o.key)}
          >
            <span className={styles.outcomeIcon} style={{ color: o.color }}>{o.icon}</span>
            <span className={styles.outcomeLabel}>{o.label}</span>
            {outcome === o.key && (
              <span className={styles.outcomeCheck} style={{ background: o.color }}>✓</span>
            )}
          </button>
        ))}
      </div>
      {outcome === 'outro' && (
        <textarea
          className={styles.outcomeReason}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Descreva o motivo do encerramento…"
          rows={3}
          autoFocus
        />
      )}
      <div className={styles.finalizeFooter}>
        <button className={styles.finalizeCancelBtn} onClick={onClose}>Cancelar</button>
        <button
          className={styles.finalizeConfirmBtn}
          onClick={handleConfirm}
          disabled={saving || !outcome || (outcome === 'outro' && !reason.trim())}
        >
          {saving ? 'Finalizando…' : 'Finalizar Processo'}
        </button>
      </div>
    </div>
  )
}

function PhaseSelectorSection({ selectedPhase, onSelect }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return PROCESS_PHASES
    return PROCESS_PHASES.filter(p =>
      p.titulo.toLowerCase().includes(q) ||
      p.grupo.toLowerCase().includes(q) ||
      p.explicacao.toLowerCase().includes(q)
    )
  }, [search])

  const groups = useMemo(() => {
    const g = {}
    for (const p of filtered) {
      if (!g[p.grupo]) g[p.grupo] = []
      g[p.grupo].push(p)
    }
    return g
  }, [filtered])

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Fase para o PDF</span>
        {selectedPhase
          ? <span className={styles.phaseSelectedPill}>
              <span className={styles.phaseSelectedId}>{selectedPhase.id}</span>
              {selectedPhase.titulo}
            </span>
          : <span className={styles.phaseNoneLabel}>Nenhuma fase selecionada</span>
        }
        {selectedPhase && (
          <button className={styles.phaseClearBtn} onClick={() => onSelect(null)}>
            Sem fase
          </button>
        )}
      </div>
      <div className={styles.phaseSelectorBody}>
        <input
          className={styles.phaseSearch}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filtrar fases ou situações…"
        />
        <div className={styles.phaseList}>
          <div
            className={`${styles.phaseItem} ${!selectedPhase ? styles.phaseItemSelected : ''}`}
            onClick={() => onSelect(null)}
          >
            <span className={`${styles.phaseItemId} ${styles.phaseItemIdNone}`}>—</span>
            <div className={styles.phaseItemBody}>
              <div className={styles.phaseItemTitle}>Gerar sem fase</div>
              <div className={styles.phaseItemType}>O PDF será gerado sem indicar a situação atual</div>
            </div>
          </div>
          {Object.keys(groups).length === 0 && search && (
            <div className={styles.phaseEmpty}>Nenhuma fase encontrada.</div>
          )}
          {Object.entries(groups).map(([grupo, items]) => (
            <div key={grupo}>
              <div className={styles.phaseGroupLabel}>{grupo}</div>
              {items.map(p => (
                <div
                  key={p.id}
                  className={`${styles.phaseItem} ${selectedPhase?.id === p.id ? styles.phaseItemSelected : ''}`}
                  onClick={() => onSelect(p)}
                >
                  <span className={styles.phaseItemId}>{p.id}</span>
                  <div className={styles.phaseItemBody}>
                    <div className={styles.phaseItemTitle}>{p.titulo}</div>
                    <div className={styles.phaseItemType}>
                      {p.tipo === 'aguardando' ? 'Situação de Espera' : 'Fase Processual'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lawyer } = useAuth()

  const [caso,    setCaso]    = useState(null)
  const [tasks,   setTasks]   = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [editing,       setEditing]       = useState(false)
  const [newTask,       setNewTask]       = useState(false)
  const [newEntry,      setNewEntry]      = useState(false)
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [finalizarOpen, setFinalizarOpen] = useState(false)

  const { situations } = useKanbanSituations()

  async function handleSituationChange(e) {
    const newSit = e.target.value || null
    const now = new Date().toISOString()
    await updateCaseSituation(id, newSit)
    setCaso(prev => ({ ...prev, situation: newSit, situation_changed_at: now }))
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este processo permanentemente? Todas as tarefas, lançamentos e notas vinculados serão removidos. Esta ação não pode ser desfeita.')) return
    const { error } = await deleteCase(id)
    if (error) { alert('Erro ao excluir: ' + error.message); return }
    navigate('/painel/casos')
  }

  async function handleFinalize(outcome, reason) {
    const { error } = await finalizeCase(id, outcome, reason)
    if (error) { alert('Erro ao finalizar: ' + error.message); return }
    setFinalizarOpen(false)
    navigate('/painel/casos')
  }

  async function load() {
    setLoading(true)
    setError(null)

    const [caseRes, tasksRes, entriesRes] = await Promise.all([
      supabase
        .from('cases')
        .select('*, clients(id, full_name, email, phone, cpf_cnpj, cidade, estado, tipo)')
        .eq('id', id)
        .single(),
      supabase
        .from('tasks')
        .select('*')
        .eq('case_id', id)
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('financial_entries')
        .select('*')
        .eq('case_id', id)
        .order('due_date', { ascending: false }),
    ])

    if (caseRes.error) { setError(caseRes.error.message); setLoading(false); return }

    setCaso(caseRes.data)
    setTasks(tasksRes.data ?? [])
    setEntries(entriesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleCycleAssignee(taskId, currentAssignee) {
    const responsaveis = lawyer?.preferences?.responsaveis ?? []
    if (responsaveis.length === 0) return
    const idx = responsaveis.indexOf(currentAssignee)
    const next = responsaveis[(idx + 1) % responsaveis.length]
    await updateTaskAssignee(taskId, next)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: next } : t))
  }

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Skeleton width="5rem" height="0.75rem" />
        <div className={styles.headerMain}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <Skeleton width="50%" height="1.1rem" />
            <Skeleton width="30%" height="0.7rem" />
          </div>
        </div>
      </div>
      <div className={styles.infoCard}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className={styles.infoRow}>
            <Skeleton width="45%" height="0.6rem" />
            <Skeleton width="70%" height="0.8rem" />
          </div>
        ))}
      </div>
      {[3, 3].map((rows, si) => (
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

  if (!caso) return null

  const receita = entries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const despesa = entries.filter(e => e.type === 'despesa' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const saldo   = receita - despesa

  const overdueTasks = tasks.filter(t =>
    !['concluida', 'cancelada'].includes(t.status) &&
    t.due_date && t.due_date < new Date().toISOString()
  )

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/painel/casos')}>
          ← Casos
        </button>

        <div className={styles.headerMain}>
          <div className={styles.caseIcon}>⚖</div>
          <div>
            <div className={styles.caseName}>
              {caso.title}
              {overdueTasks.length > 0 && (
                <span className={`badge st-red`}>{overdueTasks.length} atrasada{overdueTasks.length > 1 ? 's' : ''}</span>
              )}
            </div>
            {caso.case_number && <div className={styles.caseSub}>{caso.case_number}</div>}
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.pdfBtn} onClick={() => generateCasePDF(caso, tasks, entries, lawyer, selectedPhase)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <polyline points="4 6 4 1.5 12 1.5 12 6"/>
              <path d="M4 11.5H2.5a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 14 6v4a1.5 1.5 0 0 1-1.5 1.5H11"/>
              <rect x="4" y="9" width="8" height="5.5" rx="0.5"/>
            </svg>
            PDF
          </button>
          {caso.status !== 'finalizado' && (
            <button className={styles.finalizeBtn} onClick={() => setFinalizarOpen(true)}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <path d="M13.5 4.5 6 12 2.5 8.5"/>
              </svg>
              Finalizar
            </button>
          )}
          <button className={styles.deleteBtn} onClick={handleDelete} title="Excluir processo">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <path d="M2 4h12M5 4V2.5h6V4M6.5 7v5M9.5 7v5M3 4l.75 9.5a1 1 0 0 0 1 .975h6.5a1 1 0 0 0 1-.975L13 4"/>
            </svg>
          </button>
          <button className={styles.editBtn} onClick={() => setEditing(true)}>Editar</button>
        </div>
      </div>

      {/* ── Info card ── */}
      <div className={styles.infoCard}>
        {caso.clients && (
          <InfoRow label="Cliente" value={
            <Link to={`/painel/clientes/${caso.clients.id}`} className={styles.clientLink}>
              {caso.clients.full_name}
            </Link>
          } />
        )}
        <InfoRow label="Área"       value={caso.area} />
        <InfoRow label="Tribunal"   value={caso.court} />
        <InfoRow label="Valor da causa" value={caso.valor > 0 ? brl(caso.valor) : null} />
        {caso.quota_litis_pct && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Quota-Litis</span>
            <span className={styles.infoValue} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span className="badge st-blue">{caso.quota_litis_pct}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                → {brl(Number(caso.valor) * parseFloat(caso.quota_litis_pct) / 100)}
              </span>
              <button
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  ...(caso.quota_litis_received
                    ? { background: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.35)' }
                    : { background: 'rgba(245,158,11,0.08)', color: '#b45309', border: '1px solid rgba(245,158,11,0.35)' }
                  )
                }}
                onClick={async () => {
                  await toggleQuotaLitisReceived(caso.id, !caso.quota_litis_received)
                  setCaso(prev => ({ ...prev, quota_litis_received: !prev.quota_litis_received }))
                }}
              >
                {caso.quota_litis_received ? '✓ Recebida — desfazer' : 'Confirmar recebimento'}
              </button>
            </span>
          </div>
        )}
        <InfoRow label="Situação" value={
          situations.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                className={styles.situationSelect}
                value={caso.situation ?? ''}
                onChange={handleSituationChange}
              >
                <option value="">— Não categorizado —</option>
                {situations.map(sit => (
                  <option key={sit.id} value={sit.id}>{sit.value}</option>
                ))}
              </select>
              {(() => {
                if (!caso.situation_changed_at) return null
                const days = Math.floor((Date.now() - new Date(caso.situation_changed_at).getTime()) / 86400000)
                const style = days < 30
                  ? { color: 'var(--text-3)', bg: 'rgba(0,0,0,0.06)' }
                  : days < 60
                    ? { color: '#ea580c', bg: 'rgba(234,88,12,0.1)' }
                    : { color: '#dc2626', bg: 'rgba(220,38,38,0.1)' }
                return (
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 6, background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
                    ⏳ {days}d neste status
                  </span>
                )
              })()}
            </div>
          ) : null
        } />
        {caso.description && (
          <div className={`${styles.infoRow} ${styles.infoRowFull}`}>
            <span className={styles.infoLabel}>Descrição</span>
            <span className={styles.infoValue}>{caso.description}</span>
          </div>
        )}
      </div>

      {/* ── Fase para o PDF ── */}
      <PhaseSelectorSection selectedPhase={selectedPhase} onSelect={setSelectedPhase} />

      {/* ── Tarefas ── */}
      <Section title="Tarefas" count={tasks.length} onAdd={() => setNewTask(true)} addLabel="+ Tarefa">
        {tasks.length === 0
          ? <Empty text="Nenhuma tarefa vinculada" />
          : <div className={tasks.length > 10 ? styles.taskScrollWrap : undefined}>
              {tasks.map(t => {
                const ts = STATUS_TASK[t.status] ?? { label: t.status, cls: 'st-gray' }
                const pr = PRIORITY[t.priority]  ?? { label: t.priority, cls: 'st-gray' }
                const overdue = !['concluida','cancelada'].includes(t.status) && t.due_date && t.due_date < new Date().toISOString()
                const responsaveis = lawyer?.preferences?.responsaveis ?? []
                return (
                  <div key={t.id} className={`${styles.listItem} ${overdue ? styles.listItemOverdue : ''}`}>
                    <div className={styles.listMain}>
                      <span className={styles.listTitle}>{t.title}</span>
                      {t.description && <span className={styles.listSub}>{t.description}</span>}
                    </div>
                    <div className={styles.listMeta}>
                      {t.assigned_to && (
                        <span
                          className="badge st-teal"
                          style={{ cursor: responsaveis.length > 0 ? 'pointer' : 'default' }}
                          title={responsaveis.length > 0 ? 'Clique para mudar responsável' : t.assigned_to}
                          onClick={() => handleCycleAssignee(t.id, t.assigned_to)}
                        >{t.assigned_to.split(' ')[0]}</span>
                      )}
                      <span className={`badge ${pr.cls}`}>{pr.label}</span>
                      <span className={`badge ${ts.cls}`}>{ts.label}</span>
                      {t.due_date && <span className={`${styles.listDate} ${overdue ? styles.dateOverdue : ''}`}>{fmt(t.due_date)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </Section>

      {/* ── Financeiro ── */}
      <Section
        title="Financeiro"
        count={entries.length}
        onAdd={() => setNewEntry(true)}
        addLabel="+ Lançamento"
        badge={entries.length > 0
          ? <span className={styles.saldoBadge} style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)', marginLeft: 'auto' }}>{brl(saldo)}</span>
          : null
        }
      >
        {entries.length === 0
          ? <Empty text="Nenhum lançamento vinculado" />
          : entries.map(e => {
              const es = STATUS_FIN[e.status] ?? { label: e.status, cls: 'st-gray' }
              return (
                <div key={e.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <span className={styles.listTitle}>{e.description || '—'}</span>
                  </div>
                  <div className={styles.listMeta}>
                    <span className={`badge ${e.type === 'receita' ? 'st-teal' : 'st-red'}`}>
                      {e.type === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className={`badge ${es.cls}`}>{es.label}</span>
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

      {/* ── Notas ── */}
      <CaseNotesSection caseId={caso.id} lawyerId={caso.lawyer_id} />

      {/* ── Despachos realizados ── */}
      <CaseDespachoSection caseId={caso.id} />

      {finalizarOpen && (
        <Modal title="Finalizar Processo" onClose={() => setFinalizarOpen(false)}>
          <FinalizarModal
            onClose={() => setFinalizarOpen(false)}
            onConfirm={handleFinalize}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Editar processo" onClose={() => setEditing(false)} size="lg">
          <CaseForm initial={caso} onSave={() => { setEditing(false); load() }} onClose={() => setEditing(false)} />
        </Modal>
      )}

      {newTask && (
        <Modal title="Nova tarefa" onClose={() => setNewTask(false)}>
          <TaskForm
            initial={{ case_id: caso.id }}
            onSave={() => { setNewTask(false); load() }}
            onClose={() => setNewTask(false)}
          />
        </Modal>
      )}

      {newEntry && (
        <Modal title="Novo lançamento" onClose={() => setNewEntry(false)}>
          <EntryForm
            initial={{ case_id: caso.id, client_id: caso.client_id }}
            onSave={() => { setNewEntry(false); load() }}
            onClose={() => setNewEntry(false)}
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

function Section({ title, count, badge, onAdd, addLabel, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{title}</span>
        {count !== undefined && <span className={styles.sectionCount}>{count}</span>}
        {badge}
        {onAdd && (
          <button className={styles.sectionAddBtn} onClick={onAdd}>{addLabel}</button>
        )}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function Empty({ text }) {
  return <p className={styles.empty}>{text}</p>
}
