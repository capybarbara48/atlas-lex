import { useSupabaseQuery } from './useSupabaseQuery'
import { supabase } from '@/lib/supabase'

export function useMonthFinancials() {
  return useSupabaseQuery(async () => {
    const now  = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data, error } = await supabase
      .from('financial_entries')
      .select('type, amount, status')
      .gte('created_at', from)
      .lte('created_at', to)

    if (error) return { data: null, error }

    let receita = 0, despesa = 0, pendente = 0
    data.forEach(e => {
      const v = Number(e.amount) || 0
      if      (e.type === 'receita' && e.status === 'pago')    receita  += v
      else if (e.type === 'despesa' && e.status === 'pago')    despesa  += v
      else if (e.status === 'pendente')                         pendente += v
    })

    return { data: { receita, despesa, saldo: receita - despesa, pendente }, error: null }
  }, [])
}

export function useRecentEntries({ limit = 5 } = {}) {
  return useSupabaseQuery(async () => {
    return supabase
      .from('financial_entries')
      .select('id, description, type, amount, status, due_date, paid_at, created_at, cases ( title )')
      .order('created_at', { ascending: false })
      .limit(limit)
  }, [limit])
}

export function useAllEntries() {
  return useSupabaseQuery(async () => {
    return supabase
      .from('financial_entries')
      .select('id, description, type, amount, status, due_date, paid_at, created_at, category, recurring, installment_of, installment_total, cases ( title )')
      .order('created_at', { ascending: false })
  }, [])
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('financial_entries').delete().eq('id', id)
  return { error }
}

export async function confirmEntry(id) {
  const { error } = await supabase
    .from('financial_entries')
    .update({ status: 'pago', paid_at: new Date().toISOString() })
    .eq('id', id)
  return { error }
}

export async function unconfirmEntry(id) {
  const { error } = await supabase
    .from('financial_entries')
    .update({ status: 'pendente', paid_at: null })
    .eq('id', id)
  return { error }
}
