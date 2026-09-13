const DATE_LOCALE = { pt: 'pt-BR', en: 'en-US' }

function resolveLocale(lang) {
  return DATE_LOCALE[lang] ?? DATE_LOCALE.pt
}

export function formatDate(value, lang, opts) {
  if (!value) return '—'
  const iso = typeof value === 'string' && value.length === 10 ? `${value}T12:00:00` : value
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(resolveLocale(lang), opts)
}

export function formatCurrency(value, lang) {
  return new Intl.NumberFormat(resolveLocale(lang), { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

export function formatNumber(value, lang, opts) {
  return new Intl.NumberFormat(resolveLocale(lang), opts).format(value ?? 0)
}
