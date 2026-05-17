import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './SearchPalette.module.css'

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

export default function SearchPalette({ onClose }) {
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [active, setActive]  = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const dq = useDebounce(query, 200)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!dq.trim()) { setResults([]); return }
    const q = dq.trim()
    setLoading(true)

    Promise.all([
      supabase.from('clients')
        .select('id, full_name, email, tipo')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,cpf_cnpj.ilike.%${q}%`)
        .limit(5),
      supabase.from('cases')
        .select('id, title, case_number, status, court')
        .or(`title.ilike.%${q}%,case_number.ilike.%${q}%,court.ilike.%${q}%`)
        .limit(5),
      supabase.from('tasks')
        .select('id, title, status, priority, cases(title)')
        .ilike('title', `%${q}%`)
        .not('status', 'in', '("concluida","cancelada")')
        .limit(4),
    ]).then(([clients, cases, tasks]) => {
      const r = []
      if (clients.data?.length) {
        r.push({ type: 'header', label: 'Clientes' })
        clients.data.forEach(c => r.push({ type: 'client', id: c.id, label: c.full_name, sub: c.email, badge: c.tipo }))
      }
      if (cases.data?.length) {
        r.push({ type: 'header', label: 'Casos' })
        cases.data.forEach(c => r.push({ type: 'case', id: c.id, label: c.title, sub: c.case_number ?? c.court, badge: c.status }))
      }
      if (tasks.data?.length) {
        r.push({ type: 'header', label: 'Tarefas' })
        tasks.data.forEach(t => r.push({ type: 'task', id: t.id, label: t.title, sub: t.cases?.title, badge: t.priority }))
      }
      setResults(r)
      setActive(0)
      setLoading(false)
    })
  }, [dq])

  const items = results.filter(r => r.type !== 'header')

  const go = useCallback((item) => {
    if (item.type === 'client') navigate(`/painel/clientes/${item.id}`)
    if (item.type === 'case')   navigate(`/painel/casos/${item.id}`)
    if (item.type === 'task')   navigate('/painel/tarefas')
    onClose()
  }, [navigate, onClose])

  function handleKey(e) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && items[active]) {
      go(items[active])
    }
  }

  let itemIdx = -1

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.palette} onClick={e => e.stopPropagation()}>
        <div className={styles.inputWrap}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd"/>
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar clientes, casos, tarefas…"
          />
          {loading && <div className={styles.spinner} />}
          <kbd className={styles.esc}>Esc</kbd>
        </div>

        <div className={styles.results}>
          {!dq.trim() && (
            <div className={styles.hint}>
              <span>Digite para buscar em toda a plataforma</span>
            </div>
          )}

          {dq.trim() && results.length === 0 && !loading && (
            <div className={styles.hint}>Nenhum resultado para <strong>"{dq}"</strong></div>
          )}

          {results.map((r, i) => {
            if (r.type === 'header') {
              return <div key={`h-${i}`} className={styles.groupHeader}>{r.label}</div>
            }
            itemIdx++
            const ii = itemIdx
            const isActive = ii === active
            return (
              <button
                key={`${r.type}-${r.id}`}
                className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                onMouseEnter={() => setActive(ii)}
                onClick={() => go(r)}
              >
                <span className={styles.itemIcon}>
                  {r.type === 'client' ? '👤' : r.type === 'case' ? '⚖' : '✓'}
                </span>
                <span className={styles.itemLabel}>{r.label}</span>
                {r.sub && <span className={styles.itemSub}>{r.sub}</span>}
                {r.badge && <span className={styles.itemBadge}>{r.badge}</span>}
              </button>
            )
          })}
        </div>

        <div className={styles.footer}>
          <span><kbd>↑↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}
