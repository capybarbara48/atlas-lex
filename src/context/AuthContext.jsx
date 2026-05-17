import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchLawyer(session.user.id)
      else {
        setLawyer(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
