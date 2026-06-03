import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useProposals({ limit } = {}) {
  return useSupabaseQuery(async () => {
    let q = supabase
      .from('proposals')
      .select(`
        id, title, status, fee_type, fee_amount, fee_percentage,
        valid_until, created_at, body,
        service_type, participacao_pct, is_partner, client_name_override,
        clients ( id, full_name )
      `)
      .order('created_at', { ascending: false })
    if (limit) q = q.limit(limit)
    return q
  }, [limit])
}

export async function saveProposal(lawyerId, fields) {
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      lawyer_id: lawyerId,
      title: fields.title,
      status: fields.status ?? 'enviada',
      fee_type: fields.fee_type ?? 'fixo',
      fee_amount: fields.fee_amount ?? null,
      fee_percentage: fields.fee_percentage ?? null,
      valid_until: fields.valid_until ?? null,
      body: fields.body ?? null,
      sent_at: fields.status === 'enviada' ? new Date().toISOString() : null,
      client_id: fields.client_id ?? null,
      service_type: fields.service_type ?? null,
      participacao_pct: fields.participacao_pct ?? null,
      is_partner: fields.is_partner ?? false,
      client_name_override: fields.client_name_override ?? null,
    })
    .select('id')
    .single()
  return { data, error }
}

export async function updateProposalStatus(id, status) {
  const patch = { status, updated_at: new Date().toISOString() }
  if (status === 'aceita' || status === 'recusada') patch.responded_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('proposals')
    .update(patch)
    .eq('id', id)
    .select('id')
    .single()
  return { data, error }
}

export async function updateProposal(id, fields) {
  const patch = { ...fields, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('proposals')
    .update(patch)
    .eq('id', id)
    .select('id')
    .single()
  return { data, error }
}

export async function deleteProposal(id) {
  const { error } = await supabase.from('proposals').delete().eq('id', id)
  return { error }
}
