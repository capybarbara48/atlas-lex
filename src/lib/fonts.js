export function loadCustomFont(url) {
  if (!url) return
  const id = 'custom-font-face'
  const existing = document.getElementById(id)
  if (existing) existing.remove()
  const style = document.createElement('style')
  style.id = id
  style.textContent = `@font-face { font-family: 'CustomFont'; src: url('${url}'); font-display: swap; font-weight: 100 900; }`
  document.head.appendChild(style)
}

export function loadGoogleFont(family) {
  if (!family) return
  const id = 'gf-' + family.replace(/\s+/g, '-').toLowerCase()
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`
  document.head.appendChild(link)
}

export function applyFonts({ font_heading, font_body, font_mono, font_scope, custom_font_url } = {}) {
  if (custom_font_url) loadCustomFont(custom_font_url)
  if (font_scope === 'pdf_only') return
  if (font_heading) {
    if (font_heading !== 'CustomFont') loadGoogleFont(font_heading)
    document.documentElement.style.setProperty('--font-primary', `'${font_heading}', Georgia, 'Times New Roman', serif`)
  }
  if (font_body) {
    if (font_body !== 'CustomFont') loadGoogleFont(font_body)
    document.documentElement.style.setProperty('--font-secondary', `'${font_body}', -apple-system, BlinkMacSystemFont, sans-serif`)
  }
  if (font_mono) {
    if (font_mono !== 'CustomFont') loadGoogleFont(font_mono)
    document.documentElement.style.setProperty('--font-mono', `'${font_mono}', ui-monospace, monospace`)
  }
}
