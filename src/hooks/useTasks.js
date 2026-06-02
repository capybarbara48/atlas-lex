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
      .select('id, title, status, priority, due_date, description, assigned_to, sort_order, cases ( title )')
      .order('due_date', { ascending: true, nullsFirst: false })
  }, [])
}

export async function updateTaskOrder(taskId, order) {
  const val = order !== '' && order !== null ? parseInt(order, 10) : null
  const { error } = await supabase.from('tasks').update({ sort_order: isNaN(val) ? null : val }).eq('id', taskId)
  return { error }
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

export function useWeekDoneTasks() {
  return useSupabaseQuery(async () => {
    const now   = new Date()
    const day   = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
    const monday = new Date(now); monday.setDate(now.getDate() - day); monday.setHours(0, 0, 0, 0)
    return supabase
      .from('tasks')
      .select('id, title, completed_at')
      .eq('status', 'concluida')
      .gte('completed_at', monday.toISOString())
      .order('completed_at', { ascending: false })
  }, [])
}

/** Persist task status change — call from kanban or checklist */
export async function updateTaskStatus(taskId, newStatus) {
  const updates = { status: newStatus }
  if (newStatus === 'concluida') updates.completed_at = new Date().toISOString()
  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
  return { error }
}
