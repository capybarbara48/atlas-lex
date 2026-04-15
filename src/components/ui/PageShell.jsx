import styles from './PageShell.module.css'

/**
 * PageShell — wrapper padrão de todas as páginas internas.
 *
 * Props:
 *   title        string       — título principal
 *   subtitle     string       — subtítulo / contagem
 *   action       ReactNode    — botão de ação primária (canto superior direito)
 *   filters      ReactNode    — barra de busca / filtros
 *   viewToggle   ReactNode    — toggle kanban/lista
 *   children     ReactNode    — conteúdo principal
 */
export default function PageShell({ title, subtitle, action, filters, viewToggle, children }) {
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        <div className={styles.topRight}>
          {viewToggle && <div className={styles.viewToggleWrap}>{viewToggle}</div>}
          {action}
        </div>
      </div>

      {filters && <div className={styles.filtersBar}>{filters}</div>}

      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}
