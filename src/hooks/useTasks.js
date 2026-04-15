import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useTodayTasks() {
  return useSupabaseQuery(async () => {
    const today = new Date().toISOString().split('T')[0]
    return supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, cases(title)')
      .lte('due_date', today)
      .neq('status', 'concluida')
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .limit(8)
  }, [])
}

export function useTaskStats() {
  return useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('status')
    if (error) return { data: null, error }
    const counts = { pendente: 0, em_andamento: 0, concluida: 0, cancelada: 0 }
    data.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++ })
    return { data: { ...counts, total: data.length }, error: null }
  }, [])
}
