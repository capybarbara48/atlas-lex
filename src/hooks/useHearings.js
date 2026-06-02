import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useUpcomingHearings() {
  return useSupabaseQuery(async () => {
    const today = new Date().toISOString().split('T')[0]
    return supabase
      .from('hearings')
      .select('id, title, date, time, location, type, cases ( title )')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(30)
  }, [])
}

export function useCaseHearings(caseId) {
  return useSupabaseQuery(async () => {
    if (!caseId) return { data: [], error: null }
    return supabase
      .from('hearings')
      .select('id, title, date, time, location, type')
      .eq('case_id', caseId)
      .order('date', { ascending: false })
  }, [caseId])
}

export async function addHearing(hearing) {
  const { data, error } = await supabase.from('hearings').insert(hearing).select().single()
  return { data, error }
}

export async function deleteHearing(id) {
  const { error } = await supabase.from('hearings').delete().eq('id', id)
  return { error }
}
