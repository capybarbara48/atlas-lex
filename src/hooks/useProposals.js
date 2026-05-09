import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useProposals({ limit } = {}) {
  return useSupabaseQuery(async () => {
    let q = supabase
      .from('proposals')
      .select(`
        id, title, status, fee_type, fee_amount, fee_percentage,
        valid_until, created_at,
        clients ( full_name )
      `)
      .order('created_at', { ascending: false })
    if (limit) q = q.limit(limit)
    return q
  }, [limit])
}
