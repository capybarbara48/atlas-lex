import styles from './ViewToggle.module.css'

/**
 * ViewToggle — alterna entre 'kanban' e 'lista'.
 * Props: value ('kanban'|'lista'), onChange(value)
 */
export default function ViewToggle({ value, onChange }) {
  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.btn} ${value === 'kanban' ? styles.active : ''}`}
        onClick={() => onChange('kanban')}
        title="Visão Kanban"
      >
        <svg viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="4" height="14" rx="1"/>
          <rect x="6" y="1" width="4" height="10" rx="1"/>
          <rect x="11" y="1" width="4" height="12" rx="1"/>
        </svg>
      </button>
      <button
        className={`${styles.btn} ${value === 'lista' ? styles.active : ''}`}
        onClick={() => onChange('lista')}
        title="Visão Lista"
      >
        <svg viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="2"  width="14" height="2.5" rx="1"/>
          <rect x="1" y="6.75" width="14" height="2.5" rx="1"/>
          <rect x="1" y="11.5" width="14" height="2.5" rx="1"/>
        </svg>
      </button>
    </div>
  )
}
