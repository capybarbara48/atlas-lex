import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const DEFAULTS = [
  { value: 'Aguardando Andamento', color: '#4361ee', sort_order: 0 },
  { value: 'Tarefas a Fazer',      color: '#f4a261', sort_order: 1 },
  { value: 'Em Andamento',         color: '#2a9d8f', sort_order: 2 },
  { value: 'Aguard. Julgamento',   color: '#457b9d', sort_order: 3 },
  { value: 'Encerrado',            color: '#6c757d', sort_order: 4 },
]

export function useKanbanSituations() {
  const { lawyer } = useAuth()
  const [situations, setSituations] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!lawyer?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('lawyer_list_items')
      .select('id, value, color, sort_order')
      .eq('lawyer_id', lawyer.id)
      .eq('list_type', 'kanban_situation')
      .order('sort_order')

    if (data && data.length > 0) {
      setSituations(data)
    } else {
      const rows = DEFAULTS.map(d => ({ lawyer_id: lawyer.id, list_type: 'kanban_situation', ...d }))
      const { data: inserted } = await supabase
        .from('lawyer_list_items')
        .upsert(rows, { onConflict: 'lawyer_id,list_type,value' })
        .select('id, value, color, sort_order')
        .order('sort_order')
      setSituations(inserted ?? [])
    }
    setLoading(false)
  }, [lawyer?.id])

  useEffect(() => { load() }, [load])

  async function addSituation(value, color) {
    const maxOrder = situations.length > 0 ? Math.max(...situations.map(s => s.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('lawyer_list_items')
      .insert({ lawyer_id: lawyer.id, list_type: 'kanban_situation', value, color, sort_order: maxOrder })
      .select('id, value, color, sort_order')
      .single()
    if (!error && data) setSituations(prev => [...prev, data])
    return { data, error }
  }

  async function updateSituation(id, updates) {
    const { error } = await supabase
      .from('lawyer_list_items')
      .update(updates)
      .eq('id', id)
      .eq('lawyer_id', lawyer.id)
    if (!error) setSituations(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    return { error }
  }

  async function deleteSituation(id) {
    const { error } = await supabase
      .from('lawyer_list_items')
      .delete()
      .eq('id', id)
      .eq('lawyer_id', lawyer.id)
    if (!error) setSituations(prev => prev.filter(s => s.id !== id))
    return { error }
  }

  async function reorderSituations(newList) {
    setSituations(newList)
    await Promise.all(
      newList.map((s, i) =>
        supabase.from('lawyer_list_items').update({ sort_order: i }).eq('id', s.id)
      )
    )
  }

  return { situations, loading, addSituation, updateSituation, deleteSituation, reorderSituations }
}
