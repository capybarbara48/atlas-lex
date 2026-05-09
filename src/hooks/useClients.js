import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useClientCount() {
  return useSupabaseQuery(async () => {
    return supabase.from('clients').select('id')
  }, [])
}

export function useClients({ limit } = {}) {
  return useSupabaseQuery(async () => {
    let q = supabase
      .from('clients')
      .select(`
        id, full_name, email, phone, cpf_cnpj,
        cidade, estado, tipo, created_at,
        cases ( count )
      `)
      .order('full_name')
    if (limit) q = q.limit(limit)
    return q
  }, [limit])
}
