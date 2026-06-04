import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useCases({ status, limit } = {}) {
  return useSupabaseQuery(async () => {
    let q = supabase
      .from('cases')
      .select(`
        id, title, case_number, status, situation, situation_changed_at, despacho_attempts, area, court, valor,
        opened_at, updated_at, created_at, client_id,
        outcome, outcome_reason, finalizado_at,
        quota_litis_pct, quota_litis_received, partner,
        clients ( id, full_name )
      `)
      .order('updated_at', { ascending: false })
    if (status) q = q.eq('status', status)
    if (limit)  q = q.limit(limit)
    return q
  }, [status, limit])
}

export function useQuotaLitisCases() {
  return useSupabaseQuery(async () => {
    return supabase
      .from('cases')
      .select('id, title, case_number, valor, quota_litis_pct, quota_litis_received, client_id, clients(id, full_name)')
      .not('quota_litis_pct', 'is', null)
      .neq('quota_litis_pct', '')
      .neq('status', 'finalizado')
      .order('valor', { ascending: false })
  }, [])
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
    const total      = data.length
    const finalizados = data.filter(c => c.status === 'finalizado').length
    const ativo      = total - finalizados
    return { data: { ativo, finalizados, total }, error: null }
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
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('cases')
    .update({ situation: situationId, situation_changed_at: now, updated_at: now })
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

/** Toggle quota-litis received state */
export async function toggleQuotaLitisReceived(caseId, received) {
  const { error } = await supabase
    .from('cases')
    .update({ quota_litis_received: received, updated_at: new Date().toISOString() })
    .eq('id', caseId)
  return { error }
}

/** Update despacho attempt timestamps (array of 3: ISO string or null) */
export async function updateDespachoAttempts(caseId, attempts) {
  const { error } = await supabase
    .from('cases')
    .update({ despacho_attempts: attempts })
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
