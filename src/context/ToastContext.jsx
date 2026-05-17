import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './Toast.module.css'

const ToastCtx = createContext(null)

const DURATION = { success: 4000, error: 6000, info: 4000 }

const ICONS = {
  success: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd"/>
    </svg>
  ),
  error: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
      <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-9 .75a.75.75 0 0 0 0 1.5h1.25v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 8.75H6ZM8 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/>
    </svg>
  ),
}

function ToastItem({ toast, onDismiss }) {
  return (
    <div className={`${styles.toast} ${styles[toast.type]} ${toast.leaving ? styles.leaving : ''}`}>
      <span className={styles.icon}>{ICONS[toast.type]}</span>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={() => onDismiss(toast.id)} aria-label="Fechar">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z"/>
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 280)
  }, [])

  const add = useCallback((message, type) => {
    const id = ++idRef.current
    setToasts(prev => [...prev.slice(-4), { id, message, type, leaving: false }])
    setTimeout(() => dismiss(id), DURATION[type] ?? 4000)
  }, [dismiss])

  const toast = {
    success: msg => add(msg, 'success'),
    error:   msg => add(msg, 'error'),
    info:    msg => add(msg, 'info'),
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {createPortal(
        <div className={styles.container}>
          {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
