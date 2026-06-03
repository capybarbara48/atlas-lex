import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const DEFAULT_AREAS = [
  'Cível', 'Trabalhista', 'Família', 'Criminal', 'Tributário', 'Bancário',
  'Societário', 'Imobiliário', 'Ambiental', 'Administrativo', 'Previdenciário',
  'Consumidor', 'Outro',
]

export function useAreas() {
  const { lawyer } = useAuth()
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!lawyer?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('lawyer_list_items')
      .select('id, value, sort_order')
      .eq('lawyer_id', lawyer.id)
      .eq('list_type', 'area_atuacao')
      .order('sort_order')

    if (data && data.length > 0) {
      setAreas(data)
    } else {
      const rows = DEFAULT_AREAS.map((v, i) => ({
        lawyer_id: lawyer.id,
        list_type: 'area_atuacao',
        value: v,
        sort_order: i,
      }))
      const { data: inserted } = await supabase
        .from('lawyer_list_items')
        .upsert(rows, { onConflict: 'lawyer_id,list_type,value' })
        .select('id, value, sort_order')
        .order('sort_order')
      setAreas(inserted ?? [])
    }
    setLoading(false)
  }, [lawyer?.id])

  useEffect(() => { load() }, [load])

  async function addArea(value) {
    const trimmed = value.trim()
    if (!trimmed) return { error: { message: 'Nome vazio' } }
    const maxOrder = areas.length > 0 ? Math.max(...areas.map(a => a.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('lawyer_list_items')
      .insert({ lawyer_id: lawyer.id, list_type: 'area_atuacao', value: trimmed, sort_order: maxOrder })
      .select('id, value, sort_order')
      .single()
    if (!error && data) setAreas(prev => [...prev, data])
    return { data, error }
  }

  async function deleteArea(id) {
    const { error } = await supabase
      .from('lawyer_list_items')
      .delete()
      .eq('id', id)
      .eq('lawyer_id', lawyer.id)
    if (!error) setAreas(prev => prev.filter(a => a.id !== id))
    return { error }
  }

  return { areas, loading, addArea, deleteArea }
}
