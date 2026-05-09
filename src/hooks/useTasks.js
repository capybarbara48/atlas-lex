import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useTodayTasks() {
  return useSupabaseQuery(async () => {
    const today = new Date().toISOString().split('T')[0]
    return supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, cases ( title )')
      .lte('due_date', today + 'T23:59:59')
      .neq('status', 'concluida')
      .neq('status', 'cancelada')
      .order('priority', { ascending: false })
      .order('due_date',  { ascending: true })
      .limit(8)
  }, [])
}

export function useAllTasks() {
  return useSupabaseQuery(async () => {
    return supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, cases ( title )')
      .order('due_date', { ascending: true, nullsFirst: false })
  }, [])
}

export function useTaskStats() {
  return useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('tasks').select('status')
    if (error) return { data: null, error }
    const counts = { pendente: 0, em_andamento: 0, concluida: 0, cancelada: 0 }
    data.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++ })
    return { data: { ...counts, total: data.length }, error: null }
  }, [])
}

/** Persist task status change — call from kanban or checklist */
export async function updateTaskStatus(taskId, newStatus) {
  const updates = { status: newStatus }
  if (newStatus === 'concluida') updates.completed_at = new Date().toISOString()
  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
  return { error }
}
