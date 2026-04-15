import { createContext, useContext, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ThemeContext = createContext(null)

// Fallback defaults — overridden by the lawyer's DB row
const DEFAULTS = {
  accent: '#043b61',
  accentDark: '#032d4a',
  firmName: 'Atlas Lex',
  logoUrl: null,
}

export function ThemeProvider({ children }) {
  const { lawyer } = useAuth()

  useEffect(() => {
    const theme = {
      accent: lawyer?.theme_accent ?? DEFAULTS.accent,
      accentDark: lawyer?.theme_accent_dark ?? DEFAULTS.accentDark,
      firmName: lawyer?.firm_name ?? DEFAULTS.firmName,
      logoUrl: lawyer?.logo_url ?? DEFAULTS.logoUrl,
    }

    const root = document.documentElement
    root.style.setProperty('--color-accent', theme.accent)
    root.style.setProperty('--color-accent-dark', theme.accentDark)
    root.style.setProperty('--accent', theme.accent)
    root.style.setProperty('--accent-dark', theme.accentDark)
    root.style.setProperty('--firm-name', `"${theme.firmName}"`)
    if (theme.logoUrl) root.style.setProperty('--logo-url', `url(${theme.logoUrl})`)
  }, [lawyer])

  return (
    <ThemeContext.Provider value={null}>
      {children}
    </ThemeContext.Provider>
  )
}
