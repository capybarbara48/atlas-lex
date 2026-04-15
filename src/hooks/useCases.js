import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useCases({ limit } = {}) {
  return useSupabaseQuery(async () => {
    let q = supabase
      .from('cases')
      .select('id, title, status, created_at, clients(full_name)')
      .order('created_at', { ascending: false })
    if (limit) q = q.limit(limit)
    return q
  }, [limit])
}

export function useCaseStats() {
  return useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('cases')
      .select('status')
    if (error) return { data: null, error }
    const counts = { ativo: 0, encerrado: 0, arquivado: 0, suspenso: 0 }
    data.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++ })
    return { data: { ...counts, total: data.length }, error: null }
  }, [])
}
