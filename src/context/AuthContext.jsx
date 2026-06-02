import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { applyFonts } from '@/lib/fonts'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [lawyer, setLawyer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchLawyer(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) {
        fetchLawyer(session.user.id)
        if (event === 'SIGNED_IN' && session.provider_token) {
          storeGoogleTokens(session)
        }
      } else {
        setLawyer(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function storeGoogleTokens(session) {
    try {
      await supabase.from('google_tokens').upsert({
        lawyer_id:     session.user.id,
        access_token:  session.provider_token,
        refresh_token: session.provider_refresh_token ?? null,
        expires_at:    new Date(Date.now() + 3500 * 1000).toISOString(),
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'lawyer_id' })
    } catch { /* table may not exist yet */ }
  }

  async function fetchLawyer(userId) {
    const { data, error } = await supabase
      .from('lawyers')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) setLawyer(data)
    setLoading(false)
  }

  async function refreshLawyer() {
    if (!session?.user?.id) return
    await fetchLawyer(session.user.id)
  }

  useEffect(() => {
    if (!lawyer?.preferences) return
    const { font_heading, font_body, font_mono, font_scope } = lawyer.preferences
    const { custom_font_url } = lawyer.preferences
    if (font_heading || font_body || font_mono || custom_font_url) {
      applyFonts({ font_heading, font_body, font_mono, font_scope, custom_font_url })
    }
  }, [lawyer])

  const isAdmin = lawyer?.role === 'admin'
  const isBeta  = lawyer?.role === 'beta'

  return (
    <AuthContext.Provider value={{ session, lawyer, loading, refreshLawyer, isAdmin, isBeta }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
