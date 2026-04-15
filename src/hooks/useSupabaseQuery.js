import { useState, useEffect, useCallback } from 'react'

/**
 * Generic hook for Supabase queries.
 * queryFn receives the supabase client and must return a Supabase query builder.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useSupabaseQuery(
 *     (sb) => sb.from('cases').select('*').order('created_at', { ascending: false })
 *   )
 */
export function useSupabaseQuery(queryFn, deps = []) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await queryFn(supabase)
    if (error) setError(error.message)
    else setData(data)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])

  return { data, loading, error, refetch: run }
}
