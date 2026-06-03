import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useCases({ status, limit } = {}) {
  return useSupabaseQuery(async () => {
    let q = supabase
      .from('cases')
      .select(`
        id, title, case_number, status, situation, area, court, valor,
        opened_at, updated_at, created_at, client_id,
        outcome, outcome_reason, finalizado_at,
        clients ( id, full_name )
      `)
      .order('updated_at', { ascending: false })
    if (status) q = q.eq('status', status)
    if (limit)  q = q.limit(limit)
    return q
  }, [status, limit])
}

export function useFinalisedCases() {
  return useSupabaseQuery(async () => {
    return supabase
      .from('cases')
      .select(`
        id, title, case_number, status, area, court, valor,
        outcome, outcome_reason, finalizado_at, client_id,
        clients ( id, full_name )
      `)
      .eq('status', 'finalizado')
      .order('finalizado_at', { ascending: false })
  }, [])
}

export function useCaseStats() {
  return useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('cases').select('status')
    if (error) return { data: null, error }
    const counts = { ativo: 0, encerrado: 0, arquivado: 0, suspenso: 0 }
    data.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++ })
    return { data: { ...counts, total: data.length }, error: null }
  }, [])
}

/** Persist a kanban drag — call this when a card is moved to a new status column */
export async function updateCaseStatus(caseId, newStatus) {
  const { error } = await supabase
    .from('cases')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', caseId)
  return { error }
}

/** Persist a kanban drag — call this when a card is moved to a new situation column */
export async function updateCaseSituation(caseId, situationId) {
  const { error } = await supabase
    .from('cases')
    .update({ situation: situationId, updated_at: new Date().toISOString() })
    .eq('id', caseId)
  return { error }
}

/** Finalise a case with an outcome */
export async function finalizeCase(caseId, outcome, outcomeReason) {
  const { error } = await supabase
    .from('cases')
    .update({
      status: 'finalizado',
      outcome,
      outcome_reason: outcomeReason?.trim() || null,
      finalizado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId)
  return { error }
}

/** Permanently delete a case */
export async function deleteCase(caseId) {
  const { error } = await supabase
    .from('cases')
    .delete()
    .eq('id', caseId)
  return { error }
}
