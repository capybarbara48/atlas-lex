const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/** Normaliza nomes e títulos: primeira letra de cada palavra maiúscula, resto minúsculo,
 *  mantendo preposições (de/da/do/das/dos/e) em minúsculo quando não são a primeira palavra. */
export function toTitleCase(str) {
  if (!str) return str
  return str
    .trim()
    .toLowerCase()
    .split(/(\s+)/)
    .map((chunk, i) => {
      if (/^\s+$/.test(chunk)) return chunk
      if (i !== 0 && LOWERCASE_WORDS.has(chunk)) return chunk
      return chunk.charAt(0).toUpperCase() + chunk.slice(1)
    })
    .join('')
}
