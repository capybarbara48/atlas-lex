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

export function applyFonts({ font_heading, font_body, font_mono, font_scope } = {}) {
  if (font_scope === 'pdf_only') return
  if (font_heading) {
    loadGoogleFont(font_heading)
    document.documentElement.style.setProperty('--font-primary', `'${font_heading}', Georgia, 'Times New Roman', serif`)
  }
  if (font_body) {
    loadGoogleFont(font_body)
    document.documentElement.style.setProperty('--font-secondary', `'${font_body}', -apple-system, BlinkMacSystemFont, sans-serif`)
  }
  if (font_mono) {
    loadGoogleFont(font_mono)
    document.documentElement.style.setProperty('--font-mono', `'${font_mono}', ui-monospace, monospace`)
  }
}
