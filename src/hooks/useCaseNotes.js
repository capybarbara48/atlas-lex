import { useSupabaseQuery } from './useSupabaseQuery'

export function useCaseNotes(caseId) {
  return useSupabaseQuery(
    sb => sb.from('notas')
      .select('*')
      .eq('case_id', caseId)
      .order('fixada', { ascending: false })
      .order('updated_at', { ascending: false }),
    [caseId]
  )
}
