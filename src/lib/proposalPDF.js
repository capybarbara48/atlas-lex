/* ── Proposal PDF generator ──────────────────────────────────────────
   Opens a new browser tab with a print-ready HTML proposal document.
   User clicks "Imprimir / Salvar como PDF" → browser print dialog.
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

function fmtBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const CARD_FEES = { 2:2.99, 3:3.99, 4:4.99, 5:5.99, 6:6.99, 7:7.99, 8:8.99, 9:9.99, 10:10.99, 11:11.99, 12:12.99 }

export function generateProposalPDF(proposal, lawyer) {
  const accent      = lawyer?.theme_accent      ?? '#043b61'
  const accentDark  = lawyer?.theme_accent_dark ?? darken(accent)
  const accentLight = lighten(accent, 0.10)
  const accentBorder = lighten(accent, 0.22)
  const accentRGB   = rgb(accent)

  const firmName = lawyer?.firm_name    ?? 'Atlas Lex'
  const oabLabel = lawyer?.oab_number   ? `OAB ${lawyer.oab_number}` : 'Advocacia'

  const clientName = proposal.clients?.full_name ?? '—'
  const title      = proposal.title ?? '—'
  const feeAmount  = Number(proposal.fee_amount)     || 0
  const feePct     = Number(proposal.fee_percentage) || 0
  const hasAmount  = feeAmount > 0
  const hasPct     = feePct    > 0

  const pixValue = feeAmount * 0.9

  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const validityStr = proposal.valid_until
    ? `Válida até ${new Date(proposal.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : 'Proposta válida por 30 dias'

  const gradLight = (() => {
    const n = parseInt(accent.replace('#', ''), 16)
    const ch = c => Math.min(255, c + 35)
    return `rgb(${ch((n>>16)&0xff)},${ch((n>>8)&0xff)},${ch(n&0xff)})`
  })()

  let installRows = ''
  if (hasAmount) {
    for (let i = 2; i <= 12; i++) {
      const fee     = CARD_FEES[i] ?? 0
      const parcVal = (feeAmount * (1 + fee / 100)) / i
      const total   = parcVal * i
      const feeStr  = fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%'
      installRows += `<tr><td>${i}x no cartão</td><td>${feeStr}</td><td>${fmtBRL(parcVal)}</td><td>${fmtBRL(total)}</td></tr>`
    }
  }

  const feePctStr = feePct % 1 === 0 ? String(feePct) : feePct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Proposta — ${clientName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --accent:${accent};--accent-dark:${accentDark};--accent-light:${accentLight};--accent-border:${accentBorder};
  --green:#1a9e43;--green-light:#e8f5ee;
  --text:#1a1a2e;--text-2:#5a6a7a;--text-3:#8a9bac;
  --border:#dde4eb;--bg:#f4f7fa;--card:#ffffff;
}
html{font-size:15px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:2rem}
.page{max-width:820px;margin:0 auto;background:var(--card);border-radius:20px;overflow:hidden;box-shadow:0 8px 60px rgba(${accentRGB},0.15)}

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
.prop-title{font-size:1.65rem;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.2;margin-bottom:0.4rem}
.prop-client-name{font-size:1.05rem;color:rgba(255,255,255,0.75);font-weight:400}
.prop-client-name strong{color:#fff;font-weight:700}

/* BODY */
.pdf-body{padding:2.5rem 3rem}
.info-cards{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem}
.info-card{background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;display:flex;align-items:flex-start;gap:1rem}
.info-card-icon{width:40px;height:40px;border-radius:10px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.info-card-icon svg{width:20px;height:20px;stroke:var(--accent);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.info-card-label{font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-3);margin-bottom:0.3rem}
.info-card-value{font-size:0.95rem;font-weight:700;color:var(--text);line-height:1.3}
.info-card-value.big{font-size:1.55rem;color:var(--accent);letter-spacing:-0.02em}

.section-divider{display:flex;align-items:center;gap:1rem;margin:1.75rem 0 1.25rem}
.section-divider-line{flex:1;height:1px;background:var(--border)}
.section-divider-label{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:var(--text-3);white-space:nowrap}

.pix-box{background:var(--green-light);border:1.5px solid #b8e8c8;border-radius:14px;padding:1.25rem 1.5rem;display:flex;align-items:center;gap:1.25rem;margin-bottom:2rem}
.pix-icon{width:48px;height:48px;background:var(--green);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pix-icon svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.pix-info{flex:1}
.pix-label{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:var(--green);margin-bottom:0.25rem}
.pix-desc{font-size:0.85rem;color:#2d6a47;line-height:1.4}
.pix-value-col{text-align:right;flex-shrink:0}
.pix-value-label{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--green)}
.pix-value-num{font-size:1.4rem;font-weight:800;color:var(--green);letter-spacing:-0.02em}

.participacao-box{background:var(--accent-light);border:1.5px solid var(--accent-border);border-radius:14px;padding:1.25rem 1.5rem;display:flex;align-items:center;gap:1.25rem;margin-bottom:2rem}
.participacao-icon{width:48px;height:48px;background:var(--accent);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.participacao-icon svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.participacao-info{flex:1}
.participacao-label{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:var(--accent);margin-bottom:0.25rem}
.participacao-desc{font-size:0.85rem;color:var(--text-2);line-height:1.4}
.participacao-value-col{text-align:right;flex-shrink:0}
.participacao-value-label{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--accent)}
.participacao-value-num{font-size:1.4rem;font-weight:800;color:var(--accent);letter-spacing:-0.02em}

.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:2rem}
.table-head-row{display:flex;align-items:center;gap:0.75rem;padding:1rem 1.5rem 0.75rem;border-bottom:1px solid var(--border)}
.table-head-icon{width:32px;height:32px;border-radius:8px;background:var(--accent-light);display:flex;align-items:center;justify-content:center}
.table-head-icon svg{width:16px;height:16px;stroke:var(--accent);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.table-head-title{font-size:0.8rem;font-weight:700;color:var(--text)}
.table-head-sub{font-size:0.65rem;color:var(--text-3);margin-top:0.1rem}
table{width:100%;border-collapse:collapse}
thead{background:var(--accent)}
thead th{padding:0.7rem 1rem;font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.85);text-align:center}
thead th:first-child{text-align:left;padding-left:1.5rem}
thead th:last-child{padding-right:1.5rem}
tbody tr:nth-child(even){background:var(--bg)}
tbody td{padding:0.72rem 1rem;font-size:0.85rem;color:var(--text);border-bottom:1px solid var(--border);text-align:center}
tbody tr:last-child td{border-bottom:none}
tbody td:first-child{padding-left:1.5rem;font-weight:600;color:var(--accent);text-align:left}
tbody td:last-child{padding-right:1.5rem}

/* FOOTER */
.pdf-footer{background:var(--accent);padding:1.5rem 3rem;display:flex;align-items:center;justify-content:space-between}
.pdf-footer-brand{font-size:0.75rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.7)}
.pdf-footer-note{font-size:0.68rem;color:rgba(255,255,255,0.5);text-align:right;line-height:1.5}

@media print{
  html{font-size:13px}
  body{background:#fff;padding:0}
  .page{border-radius:0;box-shadow:none;max-width:100%}
  .no-print{display:none!important}
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
          <div class="office-name-main">${firmName}</div>
          <div class="office-name-sub">${oabLabel}</div>
        </div>
      </div>
      <div class="header-doc-info">
        <div class="doc-label">Data da Proposta</div>
        <div class="doc-date">${dateStr}</div>
      </div>
    </div>
    <div class="header-body">
      <div class="prop-badge">Proposta de Honorários</div>
      <div class="prop-title">Contrato de<br>Prestação de Serviços</div>
      <div class="prop-client-name">Preparada para: <strong>${clientName}</strong></div>
    </div>
  </div>

  <div class="pdf-body">
    <div class="info-cards">
      <div class="info-card">
        <div class="info-card-icon">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <div class="info-card-label">Cliente</div>
          <div class="info-card-value">${clientName}</div>
        </div>
      </div>
      <div class="info-card">
        <div class="info-card-icon">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div>
          <div class="info-card-label">Serviço</div>
          <div class="info-card-value">${title}</div>
        </div>
      </div>
    </div>

    ${hasAmount ? `
    <div class="info-cards" style="grid-template-columns:1fr">
      <div class="info-card" style="background:var(--accent-light);border-color:var(--accent-border)">
        <div class="info-card-icon" style="background:#fff">
          <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <div class="info-card-label">Valor Total dos Honorários</div>
          <div class="info-card-value big">${fmtBRL(feeAmount)}</div>
        </div>
      </div>
    </div>

    <div class="section-divider">
      <div class="section-divider-line"></div>
      <div class="section-divider-label">Condições de Pagamento</div>
      <div class="section-divider-line"></div>
    </div>

    <div class="pix-box">
      <div class="pix-icon">
        <svg viewBox="0 0 24 24"><path d="M5.64 5.64 2 12l3.64 6.36M18.36 5.64 22 12l-3.64 6.36"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
      </div>
      <div class="pix-info">
        <div class="pix-label">Desconto à vista — Pix</div>
        <div class="pix-desc">Pagamento à vista via <strong>Pix</strong> com <strong>10% de desconto</strong> sobre o valor total dos honorários.</div>
      </div>
      <div class="pix-value-col">
        <div class="pix-value-label">Valor com desconto</div>
        <div class="pix-value-num">${fmtBRL(pixValue)}</div>
      </div>
    </div>

    <div class="section-divider">
      <div class="section-divider-line"></div>
      <div class="section-divider-label">Parcelamento via Cartão de Crédito</div>
      <div class="section-divider-line"></div>
    </div>

    <div class="table-wrap">
      <div class="table-head-row">
        <div class="table-head-icon">
          <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        </div>
        <div>
          <div class="table-head-title">Tabela de Parcelamento</div>
          <div class="table-head-sub">Parcelamento exclusivamente via cartão de crédito · Sujeito à taxa da operadora</div>
        </div>
      </div>
      <table>
        <thead><tr><th>Parcelas</th><th>Taxa do Cartão</th><th>Valor da Parcela</th><th>Total a Pagar</th></tr></thead>
        <tbody>${installRows}</tbody>
      </table>
    </div>` : ''}

    ${hasPct ? `
    <div class="section-divider">
      <div class="section-divider-line"></div>
      <div class="section-divider-label">Participação Final de Êxito</div>
      <div class="section-divider-line"></div>
    </div>
    <div class="participacao-box">
      <div class="participacao-icon">
        <svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
      </div>
      <div class="participacao-info">
        <div class="participacao-label">Participação Final — ${feePctStr}%</div>
        <div class="participacao-desc">O percentual indicado incide sobre os <strong>ganhos obtidos ao final do procedimento</strong>, somente no caso de <strong>êxito</strong>, pagos no momento em que o cliente receber o valor.</div>
      </div>
      <div class="participacao-value-col">
        <div class="participacao-value-label">Percentual de êxito</div>
        <div class="participacao-value-num">${feePctStr}%</div>
      </div>
    </div>` : ''}
  </div>

  <div class="pdf-footer">
    <div class="pdf-footer-brand">${firmName}</div>
    <div class="pdf-footer-note">${validityStr}<br>Honorários sujeitos a contrato</div>
  </div>
</div>

</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) {
    alert('Permita pop-ups para gerar o PDF.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
}
