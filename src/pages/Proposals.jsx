import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useProposals, saveProposal, updateProposalStatus, updateProposal, deleteProposal } from '@/hooks/useProposals'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import PageShell from '@/components/ui/PageShell'
import styles from './Proposals.module.css'

/* ── helpers ──────────────────────────────────────────────────────────── */

function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

function parseBRL(str) {
  if (!str) return 0
  const cleaned = String(str).replace(/[R$\s.]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

function formatCurrencyInput(value) {
  const num = parseBRL(value)
  if (!num) return ''
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function shortDate(iso) {
  if (!iso) return '—'
  return new Date(iso.includes('T') ? iso : iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function daysSince(iso) {
  if (!iso) return 0
  const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00')
  return Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24))
}

const MONTHS_6 = 180
const MONTHS_5 = 150

const PIPELINE_COLS = [
  { key: 'enviada',  label: 'Enviadas',  color: '#d97706', bg: '#fef3c7' },
  { key: 'aceita',   label: 'Aceitas',   color: '#16a34a', bg: '#dcfce7' },
  { key: 'recusada', label: 'Recusadas', color: '#dc2626', bg: '#fee2e2' },
  { key: 'rascunho', label: 'Rascunhos', color: '#6b7280', bg: '#f3f4f6' },
]

const STATUS_BADGE = {
  enviada:  { cls: 'badge st-gold',  label: 'Enviada'  },
  aceita:   { cls: 'badge st-green', label: 'Aceita'   },
  recusada: { cls: 'badge st-red',   label: 'Recusada' },
  rascunho: { cls: 'badge st-gray',  label: 'Rascunho' },
  expirada: { cls: 'badge st-red',   label: 'Expirada' },
}

/* ── PDF generator ────────────────────────────────────────────────────── */

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

function rgbStr(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff}`
}

function pdfBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function generatePDF({ clientName, serviceType, valor, participacaoPct, notes, propFees, lawyer }) {
  const accent      = lawyer?.theme_accent ?? '#043b61'
  const accentDark  = darken(accent)
  const accentLight = lighten(accent, 0.10)
  const accentBorder = lighten(accent, 0.22)
  const accentRGB   = rgbStr(accent)
  const firmName    = lawyer?.firm_name ?? lawyer?.full_name ?? 'Atlas Adv'
  const oabLabel    = lawyer?.oab_number ? `OAB ${lawyer.oab_number}` : 'Advocacia'

  const pixValue = valor * 0.9
  const dateStr  = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const gradLight = (() => {
    const n = parseInt(accent.replace('#', ''), 16)
    const ch = c => Math.min(255, c + 35)
    return `rgb(${ch((n>>16)&0xff)},${ch((n>>8)&0xff)},${ch(n&0xff)})`
  })()

  const fees = propFees ?? {}
  let installRows = ''
  for (let i = 2; i <= 12; i++) {
    const fee = fees[i] ?? fees[String(i)] ?? 0
    const parcVal = (valor * (1 + fee / 100)) / i
    const total   = parcVal * i
    const feeStr  = Number(fee).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%'
    installRows += `<tr><td>${i}x no cartão</td><td>${feeStr}</td><td>${pdfBRL(parcVal)}</td><td>${pdfBRL(total)}</td></tr>`
  }

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
.notes-box{background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:2rem}
.notes-label{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:var(--text-3);margin-bottom:0.6rem}
.notes-text{font-size:0.88rem;color:var(--text-2);line-height:1.6;white-space:pre-wrap}
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
          <div class="info-card-value">${serviceType || '—'}</div>
        </div>
      </div>
    </div>

    ${valor > 0 ? `
    <div class="info-cards" style="grid-template-columns:1fr">
      <div class="info-card" style="background:var(--accent-light);border-color:var(--accent-border)">
        <div class="info-card-icon" style="background:#fff">
          <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <div class="info-card-label">Valor Total dos Honorários</div>
          <div class="info-card-value big">${pdfBRL(valor)}</div>
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
        <div class="pix-value-num">${pdfBRL(pixValue)}</div>
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

    ${participacaoPct ? `
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
        <div class="participacao-label">Participação Final — ${participacaoPct}</div>
        <div class="participacao-desc">O percentual indicado incide sobre os <strong>ganhos obtidos ao final do procedimento</strong>, somente no caso de <strong>êxito</strong>, pagos no momento em que o cliente receber o valor.</div>
      </div>
      <div class="participacao-value-col">
        <div class="participacao-value-label">Percentual de êxito</div>
        <div class="participacao-value-num">${participacaoPct}</div>
      </div>
    </div>` : ''}

    ${notes ? `
    <div class="section-divider">
      <div class="section-divider-line"></div>
      <div class="section-divider-label">Observações</div>
      <div class="section-divider-line"></div>
    </div>
    <div class="notes-box">
      <div class="notes-label">Observações</div>
      <div class="notes-text">${notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>` : ''}
  </div>

  <div class="pdf-footer">
    <div class="pdf-footer-brand">${firmName}</div>
    <div class="pdf-footer-note">Proposta válida por 30 dias · Esta proposta não constitui vínculo contratual</div>
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

/* ── icons ────────────────────────────────────────────────────────────── */

function PdfIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
      <path fillRule="evenodd" d="M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm2 9a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 6 13Zm.75-3.25a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── StatusSelect (inline in history cards) ─────────────────────────── */

function StatusSelect({ proposalId, current, onChanged }) {
  const [busy, setBusy] = useState(false)

  async function handleChange(e) {
    const next = e.target.value
    setBusy(true)
    await updateProposalStatus(proposalId, next)
    onChanged()
    setBusy(false)
  }

  return (
    <select
      className={styles.statusSelect}
      value={current}
      onChange={handleChange}
      disabled={busy}
      onClick={e => e.stopPropagation()}
    >
      <option value="enviada">Enviada</option>
      <option value="aceita">Aceita</option>
      <option value="recusada">Recusada</option>
      <option value="rascunho">Rascunho</option>
      <option value="expirada">Expirada</option>
    </select>
  )
}

/* ── EditModal ──────────────────────────────────────────────────────── */

function EditModal({ proposal, serviceTypes, quotaOptions, onSave, onClose, toast }) {
  const isLinked = !proposal.client_name_override && !!proposal.clients?.full_name
  const initName = proposal.client_name_override || proposal.clients?.full_name || ''

  const [clientName, setClientName]       = useState(initName)
  const [serviceType, setServiceType]     = useState(proposal.service_type || '')
  const [valorStr, setValorStr]           = useState(
    proposal.fee_amount
      ? Number(proposal.fee_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : ''
  )
  const [participacaoPct, setParticipacaoPct] = useState(proposal.participacao_pct || '')
  const [notes, setNotes]                 = useState(proposal.body || '')
  const [status, setStatus]               = useState(proposal.status || 'enviada')
  const [saving, setSaving]               = useState(false)

  async function handleSave() {
    if (!clientName.trim()) { toast.error('Informe o nome do cliente.'); return }
    setSaving(true)
    const newVal = parseBRL(valorStr)
    const { error } = await updateProposal(proposal.id, {
      client_name_override: clientName.trim(),
      service_type: serviceType || null,
      fee_amount: newVal || null,
      fee_type: newVal ? 'fixo' : (proposal.fee_type || 'fixo'),
      participacao_pct: participacaoPct || null,
      body: notes || null,
      status,
      title: `${serviceType || proposal.title || '—'} — ${clientName.trim()}`,
    })
    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar alterações.')
    } else {
      toast.success('Proposta atualizada.')
      onSave()
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Editar Proposta</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Cliente
              {isLinked && <span className={styles.linkedNote}> · vinculado ao cadastro</span>}
            </label>
            <input
              className={styles.input}
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Tipo de Serviço</label>
            {serviceTypes.length > 0 ? (
              <select className={styles.select} value={serviceType} onChange={e => setServiceType(e.target.value)}>
                <option value="">Selecionar…</option>
                {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input className={styles.input} type="text" value={serviceType} onChange={e => setServiceType(e.target.value)} placeholder="Ex.: Ação Trabalhista" />
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Valor dos Honorários</label>
            <div className={styles.currencyWrap}>
              <span className={styles.currencyPrefix}>R$</span>
              <input
                className={`${styles.input} ${styles.currencyInput}`}
                type="text"
                inputMode="decimal"
                value={valorStr}
                onChange={e => setValorStr(e.target.value)}
                onBlur={e => setValorStr(formatCurrencyInput(e.target.value))}
                placeholder="0,00"
              />
            </div>
          </div>

          {quotaOptions.length > 0 && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Participação Final de Êxito</label>
              <select className={styles.select} value={participacaoPct} onChange={e => setParticipacaoPct(e.target.value)}>
                <option value="">Sem participação de êxito</option>
                {quotaOptions.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Status</label>
            <select className={styles.select} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="enviada">Enviada</option>
              <option value="aceita">Aceita</option>
              <option value="recusada">Recusada</option>
              <option value="rascunho">Rascunho</option>
              <option value="expirada">Expirada</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Observações</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Condições adicionais, prazos…"
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.modalCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.modalSave} onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Pipeline (history tab) ─────────────────────────────────────────── */

function PipelineView({ proposals, onPDF, onEdit, onDeleteRequest, onDeleteConfirm, confirmDeleteId, onStatusChange }) {
  return (
    <div className={styles.pipelineWrapper}>
      <div className={styles.pipeline}>
        {PIPELINE_COLS.map(col => {
          const items = proposals.filter(p => p.status === col.key)
          return (
            <div key={col.key} className={styles.pipelineCol}>
              <div className={styles.pipelineColHeader}>
                <span
                  className={styles.pipelineColTitle}
                  style={{ color: col.color, background: col.bg }}
                >
                  {col.label}
                </span>
                <span className={styles.pipelineColCount}>{items.length}</span>
              </div>
              {col.key === 'recusada' && (
                <div className={styles.colPurgeNote}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                    <circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8"/><circle cx="8" cy="11" r="0.5" fill="currentColor"/>
                  </svg>
                  Purge automático após 6 meses
                </div>
              )}
              <div className={styles.pipelineItems}>
                {items.length === 0
                  ? <div className={styles.pipelineEmpty}>Nenhuma proposta</div>
                  : items.map(p => {
                      const clientName = p.client_name_override || p.clients?.full_name || '—'
                      const age = daysSince(p.created_at)
                      const nearExpiry = p.status === 'recusada' && age >= MONTHS_5
                      const isConfirming = confirmDeleteId === p.id
                      return (
                        <div key={p.id} className={`${styles.pipelineCard} ${nearExpiry ? styles.pipelineCardExpiring : ''}`}>
                          {nearExpiry && (
                            <div className={styles.expiryChip}>
                              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                                <path d="M8 1L1 14h14L8 1z"/><line x1="8" y1="6" x2="8" y2="9"/><circle cx="8" cy="12" r="0.5" fill="currentColor"/>
                              </svg>
                              {age >= MONTHS_6 ? 'Aguardando remoção' : 'Expira em breve'}
                            </div>
                          )}
                          <div className={styles.pipelineCardClient}>{clientName}</div>
                          {p.service_type && (
                            <div className={styles.pipelineCardService}>{p.service_type}</div>
                          )}
                          <div className={styles.pipelineCardFee}>
                            {Number(p.fee_amount) > 0 ? fmtBRL(p.fee_amount) : '—'}
                          </div>

                          <div className={styles.cardActionsRow}>
                            <span className={styles.pipelineCardDate}>{shortDate(p.created_at)}</span>
                            {isConfirming ? (
                              <div className={styles.confirmDeleteInline}>
                                <span className={styles.confirmDeleteLabel}>Excluir?</span>
                                <button
                                  className={styles.confirmYesBtn}
                                  onClick={() => onDeleteConfirm(p.id)}
                                >
                                  Sim
                                </button>
                                <button
                                  className={styles.confirmNoBtn}
                                  onClick={() => onDeleteRequest(null)}
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <div className={styles.cardBtns}>
                                <button className={styles.cardIconBtn} title="Gerar PDF" onClick={() => onPDF(p)}>
                                  <PdfIcon />
                                </button>
                                <button className={styles.cardIconBtn} title="Editar" onClick={() => onEdit(p)}>
                                  <EditIcon />
                                </button>
                                <button className={`${styles.cardIconBtn} ${styles.cardDeleteBtn}`} title="Excluir" onClick={() => onDeleteRequest(p.id)}>
                                  <TrashIcon />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className={styles.pipelineCardFooter}>
                            <StatusSelect
                              proposalId={p.id}
                              current={p.status}
                              onChanged={onStatusChange}
                            />
                          </div>
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

/* ── List view (history tab) ─────────────────────────────────────────── */

function ListView({ proposals, onPDF, onEdit, onDeleteRequest, onDeleteConfirm, confirmDeleteId, onStatusChange }) {
  if (proposals.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIconWrap}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <p className={styles.emptyText}>Nenhuma proposta encontrada</p>
      </div>
    )
  }

  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {proposals.map(p => {
            const clientName = p.client_name_override || p.clients?.full_name || '—'
            const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.rascunho
            const age = daysSince(p.created_at)
            const nearExpiry = p.status === 'recusada' && age >= MONTHS_5
            const isConfirming = confirmDeleteId === p.id
            return (
              <tr key={p.id} className={`${styles.tableRow} ${nearExpiry ? styles.tableRowExpiring : ''}`}>
                <td className={styles.clientCell}>
                  {clientName}
                  {nearExpiry && (
                    <span className={styles.expiryInline} title={age >= MONTHS_6 ? 'Aguardando remoção automática' : 'Será removida em breve'}>
                      ⚠
                    </span>
                  )}
                </td>
                <td className={styles.serviceCell}>{p.service_type || '—'}</td>
                <td className={styles.valorCell}>
                  {Number(p.fee_amount) > 0 ? fmtBRL(p.fee_amount) : '—'}
                </td>
                <td><span className={badge.cls}>{badge.label}</span></td>
                <td className={styles.dateCell}>{shortDate(p.created_at)}</td>
                <td onClick={e => e.stopPropagation()} className={styles.actionsCell}>
                  {isConfirming ? (
                    <div className={styles.confirmDeleteRow}>
                      <span className={styles.confirmDeleteLabel}>Excluir?</span>
                      <button className={styles.confirmYesBtn} onClick={() => onDeleteConfirm(p.id)}>Sim</button>
                      <button className={styles.confirmNoBtn} onClick={() => onDeleteRequest(null)}>Não</button>
                    </div>
                  ) : (
                    <div className={styles.cardBtns}>
                      <button className={styles.cardIconBtn} title="PDF" onClick={() => onPDF(p)}><PdfIcon /></button>
                      <button className={styles.cardIconBtn} title="Editar" onClick={() => onEdit(p)}><EditIcon /></button>
                      <button className={`${styles.cardIconBtn} ${styles.cardDeleteBtn}`} title="Excluir" onClick={() => onDeleteRequest(p.id)}><TrashIcon /></button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── CardFeesPanel ─────────────────────────────────────────────────── */

function CardFeesPanel({ lawyer, refreshLawyer, toast }) {
  const saved = lawyer?.preferences?.prop_fees ?? {}
  const [open, setOpen] = useState(false)
  const [fees, setFees] = useState(() => {
    const obj = {}
    for (let i = 2; i <= 12; i++) obj[i] = saved[i] ?? saved[String(i)] ?? ''
    return obj
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const parsed = {}
    for (let i = 2; i <= 12; i++) {
      const v = parseFloat(String(fees[i]).replace(',', '.'))
      parsed[i] = isNaN(v) ? 0 : v
    }
    const newPrefs = { ...(lawyer?.preferences ?? {}), prop_fees: parsed }
    const { error } = await supabase
      .from('lawyers')
      .update({ preferences: newPrefs })
      .eq('id', lawyer.id)
    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar taxas.')
    } else {
      await refreshLawyer()
      toast.success('Taxas do cartão salvas.')
    }
  }

  return (
    <div className={styles.feesPanel}>
      <button className={styles.feesPanelToggle} onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        Taxas do Cartão
        <span className={`${styles.feesPanelChevron} ${open ? styles.feesPanelChevronOpen : ''}`}>
          <ChevronDown />
        </span>
      </button>
      {open && (
        <div className={styles.feesBody}>
          <p className={styles.feesHint}>Configure as taxas aplicadas a cada parcelamento. Estes valores são usados no PDF gerado.</p>
          <div className={styles.feesGrid}>
            {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
              <div key={n} className={styles.feeRow}>
                <label className={styles.feeLabel}>{n}x</label>
                <div className={styles.feeInputWrap}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={styles.feeInput}
                    value={fees[n]}
                    onChange={e => setFees(f => ({ ...f, [n]: e.target.value }))}
                    placeholder="0,00"
                  />
                  <span className={styles.feeSuffix}>%</span>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.feesFooter}>
            <button className={styles.feesSaveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar taxas'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────────────── */

export default function Proposals() {
  const { lawyer, refreshLawyer } = useAuth()
  const toast = useToast()

  const [tab, setTab]           = useState('nova')
  const [histView, setHistView] = useState('pipeline')

  const { data: rawProposals, loading, error, refetch } = useProposals()

  /* edit / delete state */
  const [editingProposal, setEditingProposal] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  /* auto-purge recusadas older than 6 months */
  const purgedRef = useRef(false)
  useEffect(() => {
    if (purgedRef.current || !rawProposals || rawProposals.length === 0) return
    const stale = rawProposals.filter(p => p.status === 'recusada' && daysSince(p.created_at) >= MONTHS_6)
    if (stale.length === 0) { purgedRef.current = true; return }
    purgedRef.current = true
    Promise.all(stale.map(p => deleteProposal(p.id))).then(() => {
      const n = stale.length
      toast.info(`${n} proposta${n > 1 ? 's' : ''} recusada${n > 1 ? 's' : ''} com mais de 6 meses ${n > 1 ? 'foram removidas' : 'foi removida'} automaticamente.`)
      refetch()
    })
  }, [rawProposals])

  /* form state */
  const serviceTypes = lawyer?.preferences?.service_types ?? []
  const quotaOptions = lawyer?.preferences?.quota_litis_options ?? []
  const propFees     = lawyer?.preferences?.prop_fees ?? {}

  const [clientMode, setClientMode] = useState('db')
  const [clientId, setClientId]     = useState('')
  const [clientFreeText, setClientFreeText] = useState('')
  const [serviceType, setServiceType]       = useState('')
  const [valorStr, setValorStr]             = useState('')
  const [participacaoPct, setParticipacaoPct] = useState('')
  const [isPartner, setIsPartner]           = useState(false)
  const [notes, setNotes]                   = useState('')
  const [submitting, setSubmitting]         = useState(false)

  const [dbClients, setDbClients] = useState(null)

  const loadClients = useCallback(async () => {
    if (dbClients !== null) return
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .order('full_name')
    setDbClients(data ?? [])
  }, [dbClients])

  const baseValor  = useMemo(() => parseBRL(valorStr), [valorStr])
  const finalValor = useMemo(() => isPartner ? baseValor * 1.3 : baseValor, [baseValor, isPartner])
  const pixValor   = useMemo(() => finalValor * 0.9, [finalValor])

  const resolvedClientName = useMemo(() => {
    if (clientMode === 'free') return clientFreeText.trim() || ''
    const found = (dbClients ?? []).find(c => c.id === clientId)
    return found?.full_name ?? ''
  }, [clientMode, clientFreeText, clientId, dbClients])

  async function handleGenerate() {
    if (!resolvedClientName) { toast.error('Informe o nome do cliente.'); return }
    if (!serviceType) { toast.error('Selecione o tipo de serviço.'); return }
    if (!finalValor)  { toast.error('Informe o valor dos honorários.'); return }

    setSubmitting(true)
    const { error: saveErr } = await saveProposal(lawyer.id, {
      title: `${serviceType} — ${resolvedClientName}`,
      status: 'enviada',
      fee_type: 'fixo',
      fee_amount: finalValor,
      client_id: clientMode === 'db' ? (clientId || null) : null,
      client_name_override: clientMode === 'free' ? clientFreeText.trim() : null,
      service_type: serviceType,
      participacao_pct: participacaoPct || null,
      is_partner: isPartner,
      body: notes || null,
    })

    if (saveErr) {
      toast.error('Erro ao salvar proposta.')
      setSubmitting(false)
      return
    }

    const ok = generatePDF({
      clientName: resolvedClientName,
      serviceType,
      valor: finalValor,
      participacaoPct: participacaoPct || null,
      notes: notes || null,
      propFees,
      lawyer,
    })

    if (!ok) toast.error('Permita pop-ups no navegador para gerar o PDF.')
    else     toast.success('Proposta salva e PDF gerado.')

    await refetch()
    setSubmitting(false)
    setTab('historico')
  }

  function handleHistPDF(proposal) {
    const clientName = proposal.client_name_override || proposal.clients?.full_name || '—'
    const ok = generatePDF({
      clientName,
      serviceType: proposal.service_type || proposal.title || '—',
      valor: Number(proposal.fee_amount) || 0,
      participacaoPct: proposal.participacao_pct || null,
      notes: proposal.body || null,
      propFees,
      lawyer,
    })
    if (!ok) toast.error('Permita pop-ups no navegador para gerar o PDF.')
  }

  async function handleDeleteConfirm(id) {
    const { error: delErr } = await deleteProposal(id)
    setConfirmDeleteId(null)
    if (delErr) {
      toast.error('Erro ao excluir proposta.')
    } else {
      toast.success('Proposta excluída.')
      refetch()
    }
  }

  const proposalCount = (rawProposals ?? []).length

  return (
    <PageShell
      title="Propostas"
      subtitle={loading ? 'Carregando…' : `${proposalCount} ${proposalCount === 1 ? 'proposta' : 'propostas'}`}
    >
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${tab === 'nova' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('nova')}
        >
          Nova Proposta
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'historico' ? styles.tabBtnActive : ''}`}
          onClick={() => { setTab('historico'); refetch() }}
        >
          Histórico
          {proposalCount > 0 && (
            <span className={styles.tabCount}>{proposalCount}</span>
          )}
        </button>
      </div>

      {tab === 'nova' && (
        <div className={styles.splitLayout}>
          {/* ── Left: form ── */}
          <div className={styles.formCard}>
            <h2 className={styles.cardTitle}>Dados da Proposta</h2>

            {/* Client */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeader}>
                <label className={styles.fieldLabel}>Cliente</label>
                <div className={styles.clientModeToggle}>
                  <button
                    className={`${styles.clientModeBtn} ${clientMode === 'db' ? styles.clientModeBtnActive : ''}`}
                    onClick={() => { setClientMode('db'); loadClients() }}
                    type="button"
                  >
                    Da lista
                  </button>
                  <button
                    className={`${styles.clientModeBtn} ${clientMode === 'free' ? styles.clientModeBtnActive : ''}`}
                    onClick={() => setClientMode('free')}
                    type="button"
                  >
                    Digitar
                  </button>
                </div>
              </div>
              {clientMode === 'db' ? (
                <select
                  className={styles.select}
                  value={clientId}
                  onFocus={loadClients}
                  onChange={e => setClientId(e.target.value)}
                >
                  <option value="">Selecionar cliente…</option>
                  {(dbClients ?? []).map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Nome do cliente"
                  value={clientFreeText}
                  onChange={e => setClientFreeText(e.target.value)}
                />
              )}
            </div>

            {/* Service type */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Tipo de Serviço</label>
              {serviceTypes.length > 0 ? (
                <select
                  className={styles.select}
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                >
                  <option value="">Selecionar…</option>
                  {serviceTypes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Ex.: Ação Trabalhista"
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                />
              )}
            </div>

            {/* Valor */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Valor dos Honorários</label>
              <div className={styles.currencyWrap}>
                <span className={styles.currencyPrefix}>R$</span>
                <input
                  className={`${styles.input} ${styles.currencyInput}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorStr}
                  onChange={e => setValorStr(e.target.value)}
                  onBlur={e => setValorStr(formatCurrencyInput(e.target.value))}
                />
              </div>
            </div>

            {/* Participação */}
            {quotaOptions.length > 0 && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Participação Final de Êxito</label>
                <select
                  className={styles.select}
                  value={participacaoPct}
                  onChange={e => setParticipacaoPct(e.target.value)}
                >
                  <option value="">Sem participação de êxito</option>
                  {quotaOptions.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Partner toggle */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Correspondente / Parceiro</label>
              <label className={styles.toggleRow}>
                <span className={`${styles.toggle} ${isPartner ? styles.toggleOn : ''}`}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={isPartner}
                    onChange={e => setIsPartner(e.target.checked)}
                  />
                  <span className={styles.toggleThumb} />
                </span>
                <span className={styles.toggleLabel}>
                  Aplicar markup de parceiro (+30%)
                  <span className={styles.toggleHint}> — não aparece no PDF</span>
                </span>
              </label>
            </div>

            {/* Notes */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Observações</label>
              <textarea
                className={styles.textarea}
                rows={4}
                placeholder="Condições adicionais, prazos, informações relevantes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* ── Right: summary + fees ── */}
          <div className={styles.summaryCol}>
            <div className={styles.summaryCard}>
              <h2 className={styles.cardTitle}>Resumo</h2>

              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryRowLabel}>Valor base</span>
                  <span className={styles.summaryRowValue}>{fmtBRL(baseValor)}</span>
                </div>
                {isPartner && (
                  <div className={`${styles.summaryRow} ${styles.summaryRowPartner}`}>
                    <span className={styles.summaryRowLabel}>Markup parceiro (+30%)</span>
                    <span className={styles.summaryRowValue}>+ {fmtBRL(baseValor * 0.3)}</span>
                  </div>
                )}
                <div className={`${styles.summaryRow} ${styles.summaryRowFinal}`}>
                  <span className={styles.summaryRowLabel}>Valor final</span>
                  <span className={styles.summaryRowValueBig}>{fmtBRL(finalValor)}</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.summaryRowPix}`}>
                  <span className={styles.summaryRowLabel}>
                    <span className={styles.pixBadge}>PIX</span>
                    Valor à vista (10% off)
                  </span>
                  <span className={styles.summaryRowValuePix}>{fmtBRL(pixValor)}</span>
                </div>
              </div>

              <button
                className={styles.btnGerar}
                onClick={handleGenerate}
                disabled={submitting}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                {submitting ? 'Gerando…' : 'Gerar PDF da Proposta'}
              </button>
            </div>

            <CardFeesPanel lawyer={lawyer} refreshLawyer={refreshLawyer} toast={toast} />
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <div className={styles.histSection}>
          <div className={styles.histToolbar}>
            <div className={styles.viewSwitch}>
              <button
                className={`${styles.viewBtn} ${histView === 'pipeline' ? styles.viewActive : ''}`}
                onClick={() => setHistView('pipeline')}
              >
                Pipeline
              </button>
              <button
                className={`${styles.viewBtn} ${histView === 'lista' ? styles.viewActive : ''}`}
                onClick={() => setHistView('lista')}
              >
                Lista
              </button>
            </div>
          </div>

          {error ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>Erro ao carregar propostas.</p>
            </div>
          ) : loading ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>Carregando…</p>
            </div>
          ) : histView === 'pipeline' ? (
            <PipelineView
              proposals={rawProposals ?? []}
              onPDF={handleHistPDF}
              onEdit={setEditingProposal}
              onDeleteRequest={setConfirmDeleteId}
              onDeleteConfirm={handleDeleteConfirm}
              confirmDeleteId={confirmDeleteId}
              onStatusChange={refetch}
            />
          ) : (
            <ListView
              proposals={rawProposals ?? []}
              onPDF={handleHistPDF}
              onEdit={setEditingProposal}
              onDeleteRequest={setConfirmDeleteId}
              onDeleteConfirm={handleDeleteConfirm}
              confirmDeleteId={confirmDeleteId}
              onStatusChange={refetch}
            />
          )}
        </div>
      )}

      {editingProposal && (
        <EditModal
          proposal={editingProposal}
          serviceTypes={serviceTypes}
          quotaOptions={quotaOptions}
          toast={toast}
          onSave={async () => { setEditingProposal(null); await refetch() }}
          onClose={() => setEditingProposal(null)}
        />
      )}
    </PageShell>
  )
}
