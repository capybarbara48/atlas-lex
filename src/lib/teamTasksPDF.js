/* ── Team tasks report PDF generator ─────────────────────────────────
   Same approach as proposalPDF.js: opens a new tab with a print-ready
   HTML document. User clicks "Imprimir / Salvar como PDF".
   ─────────────────────────────────────────────────────────────────── */

function darken(hex, amount = 0.15) {
  const n = parseInt(hex.replace('#', ''), 16)
  const ch = c => Math.max(0, c - Math.round(255 * amount)).toString(16).padStart(2, '0')
  return '#' + ch(n >> 16) + ch((n >> 8) & 0xff) + ch(n & 0xff)
}

function lighten(hex, opacity = 0.10) {
  const n = parseInt(hex.replace('#', ''), 16)
  const mix = c => Math.round(((n >> c) & 0xff) * opacity + 255 * (1 - opacity))
  return `rgb(${mix(16)},${mix(8)},${mix(0)})`
}

function rgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff}`
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

function initials(name) {
  return (name ?? '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso.split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PRI_LABELS = { urgente: 'Urgente', alta: 'Alta', media: 'Média', baixa: 'Baixa' }
const PRI_COLORS = { urgente: '#dc2626', alta: '#dc2626', media: '#d97706', baixa: '#3b82f6' }
const ST_LABELS  = { pendente: 'Pendente', em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada' }

function isOverdue(t, todayISO) {
  if (!t.due_date) return false
  if (t.status === 'concluida' || t.status === 'cancelada') return false
  return t.due_date.split('T')[0] < todayISO
}

export function generateTeamTasksReportPDF({ lawyer, monthDate, responsaveis, tasks }) {
  const accent      = lawyer?.theme_accent      ?? '#043b61'
  const accentDark  = lawyer?.theme_accent_dark ?? darken(accent)
  const accentLight = lighten(accent, 0.10)
  const accentBorder = lighten(accent, 0.22)
  const accentRGB   = rgb(accent)

  const firmName = lawyer?.firm_name  ?? 'Atlas Adv'
  const oabLabel = lawyer?.oab_number ? `OAB ${lawyer.oab_number}` : 'Advocacia'

  const gradLight = (() => {
    const n = parseInt(accent.replace('#', ''), 16)
    const ch = c => Math.min(255, c + 35)
    return `rgb(${ch((n>>16)&0xff)},${ch((n>>8)&0xff)},${ch(n&0xff)})`
  })()

  const year  = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthLabel  = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
  const todayISO = new Date().toISOString().split('T')[0]
  const genDateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const inMonth = t => t.due_date && t.due_date.startsWith(monthPrefix)
  const monthTasks = (tasks ?? []).filter(inMonth)

  const totalTasks    = monthTasks.length
  const totalConcluida = monthTasks.filter(t => t.status === 'concluida').length
  const totalAtrasada  = monthTasks.filter(t => isOverdue(t, todayISO)).length

  function memberSection(name) {
    const memberTasks = monthTasks
      .filter(t => t.assigned_to === name)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

    const total    = memberTasks.length
    const done     = memberTasks.filter(t => t.status === 'concluida').length
    const ativas   = memberTasks.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length
    const atrasada = memberTasks.filter(t => isOverdue(t, todayISO)).length
    const canceladas = memberTasks.filter(t => t.status === 'cancelada').length

    const rows = memberTasks.map(t => {
      const overdue = isOverdue(t, todayISO)
      const priColor = PRI_COLORS[t.priority] ?? accent
      let conclusaoCell
      if (t.status === 'concluida') {
        conclusaoCell = `<span class="pill pill-done">${fmtDateTime(t.completed_at)}</span>`
      } else if (overdue) {
        conclusaoCell = `<span class="pill pill-overdue">Atrasada</span>`
      } else if (t.status === 'cancelada') {
        conclusaoCell = `<span class="pill pill-cancel">Cancelada</span>`
      } else {
        conclusaoCell = `<span class="pill pill-pending">${ST_LABELS[t.status] ?? t.status}</span>`
      }
      return `<tr>
        <td class="task-cell">
          <div class="task-cell-title">${esc(t.title)}</div>
          ${t.cases?.title ? `<div class="task-cell-sub">${esc(t.cases.title)}</div>` : ''}
        </td>
        <td><span class="pri-dot" style="background:${priColor}"></span>${PRI_LABELS[t.priority] ?? t.priority}</td>
        <td>${fmtDate(t.due_date)}</td>
        <td>${conclusaoCell}</td>
      </tr>`
    }).join('')

    return `
    <div class="member-section">
      <div class="member-head">
        <div class="member-avatar">${esc(initials(name))}</div>
        <div class="member-name">${esc(name)}</div>
        <div class="member-stats">
          <span class="mstat">${total} <em>total</em></span>
          <span class="mstat mstat-green">${done} <em>concluídas</em></span>
          <span class="mstat">${ativas} <em>ativas</em></span>
          ${atrasada > 0 ? `<span class="mstat mstat-red">${atrasada} <em>atrasadas</em></span>` : ''}
          ${canceladas > 0 ? `<span class="mstat">${canceladas} <em>canceladas</em></span>` : ''}
        </div>
      </div>
      ${total === 0
        ? `<div class="member-empty">Nenhuma tarefa com vencimento em ${monthLabel} para este membro.</div>`
        : `<table>
            <thead><tr><th>Tarefa</th><th>Prioridade</th><th>Vencimento</th><th>Conclusão / Situação</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`
      }
    </div>`
  }

  const sections = (responsaveis ?? []).map(memberSection).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Relatório de Tarefas — ${esc(monthLabelCap)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --accent:${accent};--accent-dark:${accentDark};--accent-light:${accentLight};--accent-border:${accentBorder};
  --green:#1a9e43;--green-light:#e8f5ee;--red:#dc2626;--red-light:#fde8e8;
  --text:#1a1a2e;--text-2:#5a6a7a;--text-3:#8a9bac;
  --border:#dde4eb;--bg:#f4f7fa;--card:#ffffff;
}
html{font-size:15px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:2rem}
.page{max-width:900px;margin:0 auto;background:var(--card);border-radius:20px;overflow:hidden;box-shadow:0 8px 60px rgba(${accentRGB},0.15)}

/* HEADER */
.pdf-header{background:linear-gradient(135deg,${accent} 0%,${gradLight} 100%);padding:2.5rem 3rem;position:relative;overflow:hidden}
.pdf-header::before{content:'';position:absolute;top:-40%;right:-10%;width:400px;height:400px;border-radius:50%;background:rgba(255,255,255,0.04)}
.pdf-header::after{content:'';position:absolute;bottom:-60%;left:40%;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,0.03)}
.header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;position:relative;z-index:1}
.office-brand{display:flex;align-items:center;gap:1rem}
.office-logo{width:52px;height:52px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:12px;display:flex;align-items:center;justify-content:center}
.office-logo svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.office-name-main{font-size:1.15rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#fff}
.office-name-sub{font-size:0.65rem;color:rgba(255,255,255,0.6);letter-spacing:0.12em;text-transform:uppercase;margin-top:0.15rem}
.header-doc-info{text-align:right}
.doc-label{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:rgba(255,255,255,0.5)}
.doc-date{font-size:0.78rem;color:rgba(255,255,255,0.85);font-weight:500;margin-top:0.2rem}
.header-body{position:relative;z-index:1}
.prop-badge{display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:0.3rem 0.9rem;font-size:0.62rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:0.75rem}
.prop-title{font-size:1.65rem;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.2;margin-bottom:0.4rem;text-transform:capitalize}
.prop-client-name{font-size:1.05rem;color:rgba(255,255,255,0.75);font-weight:400}
.prop-client-name strong{color:#fff;font-weight:700}

/* BODY */
.pdf-body{padding:2.5rem 3rem}
.info-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2rem}
.info-card{background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.25rem}
.info-card-label{font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:0.3rem}
.info-card-value{font-size:1.5rem;font-weight:800;color:var(--accent);letter-spacing:-0.02em}
.info-card-value.red{color:var(--red)}
.info-card-value.green{color:var(--green)}

/* Member section */
.member-section{border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:1.5rem}
.member-section:last-child{margin-bottom:0}
.member-head{display:flex;align-items:center;gap:0.85rem;padding:1rem 1.5rem;background:var(--bg);border-bottom:1px solid var(--border);flex-wrap:wrap}
.member-avatar{width:34px;height:34px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.68rem;font-weight:800;flex-shrink:0}
.member-name{font-size:0.95rem;font-weight:700;color:var(--text);margin-right:auto}
.member-stats{display:flex;gap:0.6rem;flex-wrap:wrap}
.mstat{font-size:0.72rem;font-weight:700;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:999px;padding:0.2rem 0.65rem}
.mstat em{font-style:normal;font-weight:500;color:var(--text-2);margin-left:0.25rem}
.mstat-green{color:var(--green);border-color:#b8e8c8}
.mstat-red{color:var(--red);border-color:#f3b8b8}
.member-empty{padding:1.25rem 1.5rem;font-size:0.8rem;color:var(--text-3);font-style:italic}

table{width:100%;border-collapse:collapse}
thead{background:#fff}
thead th{padding:0.6rem 1.5rem;font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);text-align:left;border-bottom:1px solid var(--border)}
tbody tr:nth-child(even){background:var(--bg)}
tbody td{padding:0.65rem 1.5rem;font-size:0.8rem;color:var(--text);border-bottom:1px solid var(--border);vertical-align:middle}
tbody tr:last-child td{border-bottom:none}
.task-cell-title{font-weight:600;color:var(--text)}
.task-cell-sub{font-size:0.68rem;color:var(--text-3);margin-top:0.15rem}
.pri-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:0.4rem}
.pill{display:inline-block;padding:0.15rem 0.55rem;border-radius:999px;font-size:0.68rem;font-weight:700;white-space:nowrap}
.pill-done{background:var(--green-light);color:var(--green)}
.pill-overdue{background:var(--red-light);color:var(--red)}
.pill-cancel{background:#eef0f3;color:var(--text-3)}
.pill-pending{background:var(--accent-light);color:var(--accent)}

/* FOOTER */
.pdf-footer{background:var(--accent);padding:1.5rem 3rem;display:flex;align-items:center;justify-content:space-between}
.pdf-footer-brand{font-size:0.75rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.7)}
.pdf-footer-note{font-size:0.68rem;color:rgba(255,255,255,0.5);text-align:right;line-height:1.5}

@media print{
  html{font-size:13px}
  body{background:#fff;padding:0}
  .page{border-radius:0;box-shadow:none;max-width:100%}
  .no-print{display:none!important}
  .member-section{break-inside:avoid}
  @page{margin:0;size:A4}
}
</style>
</head>
<body>

<div class="no-print" style="text-align:center;margin-bottom:1.5rem">
  <button onclick="window.print()" style="background:${accent};color:#fff;border:none;border-radius:10px;padding:0.75rem 2rem;font-size:0.9rem;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:0.6rem;box-shadow:0 4px 20px rgba(${accentRGB},0.3)">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Imprimir / Salvar como PDF
  </button>
</div>

<div class="page">
  <div class="pdf-header">
    <div class="header-top">
      <div class="office-brand">
        <div class="office-logo">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
            <path d="M7 21H3"/><path d="M21 21h-4"/><path d="M11 21h2"/>
            <line x1="7" y1="5" x2="17" y2="5"/><line x1="12" y1="2" x2="12" y2="21"/>
          </svg>
        </div>
        <div>
          <div class="office-name-main">${esc(firmName)}</div>
          <div class="office-name-sub">${esc(oabLabel)}</div>
        </div>
      </div>
      <div class="header-doc-info">
        <div class="doc-label">Gerado em</div>
        <div class="doc-date">${genDateStr}</div>
      </div>
    </div>
    <div class="header-body">
      <div class="prop-badge">Relatório de Equipe</div>
      <div class="prop-title">${esc(monthLabelCap)}</div>
      <div class="prop-client-name">Tarefas por membro da equipe com vencimento neste período</div>
    </div>
  </div>

  <div class="pdf-body">
    <div class="info-cards">
      <div class="info-card">
        <div class="info-card-label">Total de Tarefas</div>
        <div class="info-card-value">${totalTasks}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Concluídas</div>
        <div class="info-card-value green">${totalConcluida}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Atrasadas</div>
        <div class="info-card-value red">${totalAtrasada}</div>
      </div>
    </div>

    ${sections}
  </div>

  <div class="pdf-footer">
    <div class="pdf-footer-brand">${esc(firmName)}</div>
    <div class="pdf-footer-note">Relatório interno de produtividade da equipe<br>Gerado automaticamente pelo Atlas Adv</div>
  </div>
</div>

</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  win.focus()
  return true
}
