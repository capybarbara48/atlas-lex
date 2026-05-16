import { useSupabaseQuery } from './useSupabaseQuery'

export function useNotes() {
  return useSupabaseQuery(sb =>
    sb.from('notas')
      .select('*')
      .order('fixada', { ascending: false })
      .order('updated_at', { ascending: false })
  )
}
