import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { applyFonts } from '@/lib/fonts'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session,    setSession]    = useState(null)
  const [lawyer,     setLawyer]     = useState(null)
  const [memberRole, setMemberRole] = useState(null)   // null = owner; 'advogado'|'estagiario' = team member
  const [memberName, setMemberName] = useState(null)   // team member's own full_name
  const [loading,    setLoading]    = useState(true)

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
        setMemberRole(null)
        setMemberName(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchLawyer(userId) {
    // 1. Try to find the user's own lawyers row (owner path)
    const { data: ownRow } = await supabase
      .from('lawyers')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (ownRow) {
      setLawyer(ownRow)
      setMemberRole(null)
      setMemberName(null)
      setLoading(false)
      return
    }

    // 2. Not an owner — check if they're an active team member
    const { data: member } = await supabase
      .from('team_members')
      .select('lawyer_id, role, full_name')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (member) {
      const { data: firmRow } = await supabase
        .from('lawyers')
        .select('*')
        .eq('id', member.lawyer_id)
        .maybeSingle()

      if (firmRow) {
        setLawyer(firmRow)           // lawyer = the owner's row (firm data)
        setMemberRole(member.role)
        setMemberName(member.full_name)
        setLoading(false)
        return
      }
    }

    // No lawyers row and no team_members record — new user not yet onboarded
    setLawyer(null)
    setMemberRole(null)
    setMemberName(null)
    setLoading(false)
  }

  async function refreshLawyer() {
    if (!session?.user?.id) return
    await fetchLawyer(session.user.id)
  }

  useEffect(() => {
    if (!lawyer?.preferences) return
    const { font_heading, font_body, font_mono, font_scope, custom_font_url } = lawyer.preferences
    if (font_heading || font_body || font_mono || custom_font_url) {
      applyFonts({ font_heading, font_body, font_mono, font_scope, custom_font_url })
    }
  }, [lawyer])

  // teamRole: 'advogado' for owners (and admins); member's role for team members
  const teamRole     = memberRole ?? 'advogado'
  const isTeamMember = memberRole !== null
  const isAdmin      = lawyer?.role === 'admin'
  const isBeta       = lawyer?.role === 'beta'

  return (
    <AuthContext.Provider value={{
      session, lawyer, loading, refreshLawyer,
      memberRole, memberName, teamRole, isTeamMember,
      isAdmin, isBeta,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
