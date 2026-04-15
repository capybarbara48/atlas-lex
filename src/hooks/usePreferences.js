/**
 * usePreferences — preferências por advogado, salvas em localStorage.
 *
 * Cada advogado tem suas preferências isoladas pela chave `prefs_${lawyerId}`.
 * Isso permite que cada usuário configure visões padrão, etc., sem migração de DB.
 *
 * Valores padrão podem ser sobrescritos pelo advogado na página de Configurações.
 */

const DEFAULTS = {
  casos_view:       'kanban',  // 'kanban' | 'lista'
  clientes_view:    'lista',   // 'lista'  | 'grid'
  tarefas_view:     'kanban',  // 'kanban' | 'lista'
  financeiro_view:  'lista',   // 'lista'  | 'grafico'
}

function getKey(lawyerId) {
  return `prefs_${lawyerId}`
}

export function loadPreferences(lawyerId) {
  if (!lawyerId) return DEFAULTS
  try {
    const stored = localStorage.getItem(getKey(lawyerId))
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePreferences(lawyerId, prefs) {
  if (!lawyerId) return
  const current = loadPreferences(lawyerId)
  localStorage.setItem(getKey(lawyerId), JSON.stringify({ ...current, ...prefs }))
}

export function resetPreferences(lawyerId) {
  if (!lawyerId) return
  localStorage.removeItem(getKey(lawyerId))
}
