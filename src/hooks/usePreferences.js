import { supabase } from '@/lib/supabase'

const DEFAULTS = {
  casos_view:       'kanban',  // 'kanban' | 'lista'
  clientes_view:    'lista',   // 'lista'  | 'grid'
  tarefas_view:     'kanban',  // 'kanban' | 'lista'
  financeiro_view:  'lista',   // 'lista'  | 'grafico'
  nav_mode:         'sidebar', // 'sidebar' | 'top' | 'bottom'
}

// In-memory cache keyed by lawyerId — updated optimistically on save/reset
const cache = {}

/**
 * Read UI preferences synchronously.
 * Accepts a lawyer object (preferred) or a lawyerId string.
 * On first call per session, seeds cache from lawyer.preferences.ui_prefs.
 * Subsequent calls (after save/reset) read from cache.
 */
export function loadPreferences(lawyer) {
  const id = lawyer?.id ?? (typeof lawyer === 'string' ? lawyer : null)
  if (!id) return { ...DEFAULTS }
  if (cache[id] !== undefined) return { ...cache[id] }
  const stored = (typeof lawyer === 'object' && lawyer !== null)
    ? (lawyer?.preferences?.ui_prefs ?? {})
    : {}
  cache[id] = { ...DEFAULTS, ...stored }
  return { ...cache[id] }
}

/**
 * Save UI preferences to Supabase (fire-and-forget).
 * Accepts a lawyer object (preferred) or a lawyerId string.
 * Updates cache immediately so loadPreferences is consistent within the session.
 */
export async function savePreferences(lawyer, prefs) {
  const id = lawyer?.id ?? (typeof lawyer === 'string' ? lawyer : null)
  if (!id) return
  const current = cache[id] ?? { ...DEFAULTS }
  cache[id] = { ...current, ...prefs }
  window.dispatchEvent(new CustomEvent('atlasPrefsChanged'))
  const existingPrefs = (typeof lawyer === 'object' && lawyer !== null && lawyer?.preferences)
    ? lawyer.preferences
    : {}
  await supabase.from('lawyers').update({
    preferences: { ...existingPrefs, ui_prefs: cache[id] },
  }).eq('id', id)
}

/**
 * Reset UI preferences to defaults.
 * Clears cache to DEFAULTS and removes ui_prefs from Supabase.
 */
export async function resetPreferences(lawyer) {
  const id = lawyer?.id ?? (typeof lawyer === 'string' ? lawyer : null)
  if (!id) return
  cache[id] = { ...DEFAULTS }
  window.dispatchEvent(new CustomEvent('atlasPrefsChanged'))
  const existingPrefs = (typeof lawyer === 'object' && lawyer !== null && lawyer?.preferences)
    ? { ...lawyer.preferences }
    : {}
  delete existingPrefs.ui_prefs
  await supabase.from('lawyers').update({ preferences: existingPrefs }).eq('id', id)
}
