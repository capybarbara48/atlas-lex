import { createContext, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ThemeContext = createContext(null)

const DEFAULTS = {
  accent:    '#043b61',
  firmName:  'Atlas Adv',
  logoUrl:   null,
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return { r, g, b, css: `${r}, ${g}, ${b}` }
}

function darken(hex, amount = 0.18) {
  const { r, g, b } = hexToRgb(hex)
  const d = v => Math.max(0, Math.round(v * (1 - amount)))
  return `#${[d(r), d(g), d(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

export function ThemeProvider({ children }) {
  const { lawyer } = useAuth()

  useEffect(() => {
    const accent   = lawyer?.theme_accent ?? DEFAULTS.accent
    const dark     = lawyer?.theme_accent_dark ?? darken(accent)
    const firmName = lawyer?.firm_name ?? DEFAULTS.firmName
    const logoUrl  = lawyer?.logo_url  ?? DEFAULTS.logoUrl
    const rgb      = hexToRgb(accent)

    const root = document.documentElement
    root.style.setProperty('--accent',          accent)
    root.style.setProperty('--accent-dark',     dark)
    root.style.setProperty('--accent-rgb',      rgb.css)
    root.style.setProperty('--accent-dim',      `rgba(${rgb.css}, 0.08)`)
    root.style.setProperty('--color-accent',    accent)
    root.style.setProperty('--color-accent-dark', dark)
    root.style.setProperty('--firm-name',       `"${firmName}"`)
    if (logoUrl) root.style.setProperty('--logo-url', `url(${logoUrl})`)
  }, [lawyer])

  return (
    <ThemeContext.Provider value={null}>
      {children}
    </ThemeContext.Provider>
  )
}
