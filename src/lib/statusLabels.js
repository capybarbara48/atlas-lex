export const STATUS_CASE_CSS = {
  ativo: 'st-teal',
  encerrado: 'st-gray',
  arquivado: 'st-gray',
  suspenso: 'st-orange',
}

export const STATUS_TASK_CSS = {
  pendente: 'st-orange',
  em_andamento: 'st-blue',
  concluida: 'st-teal',
  cancelada: 'st-gray',
}

export const STATUS_FIN_CSS = {
  pago: 'st-teal',
  pendente: 'st-orange',
  cancelado: 'st-gray',
}

export const PRIORITY_CSS = {
  alta: 'st-red',
  urgente: 'st-red',
  media: 'st-orange',
  baixa: 'st-gray',
}

export function caseStatusLabel(t, value) {
  return t(`status.case.${value}`, value)
}

export function taskStatusLabel(t, value) {
  return t(`status.task.${value}`, value)
}

export function finStatusLabel(t, value) {
  return t(`status.financial.${value}`, value)
}

export function priorityLabel(t, value) {
  return t(`status.priority.${value}`, value)
}
