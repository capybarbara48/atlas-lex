import styles from './ViewToggle.module.css'

export default function ViewToggle({ value, onChange, showCalendar, showAgenda }) {
  return (
    <div className={styles.wrap}>
      {showAgenda && (
        <button
          className={`${styles.btn} ${value === 'agenda' ? styles.active : ''}`}
          onClick={() => onChange('agenda')}
          title="Visão Agenda"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <rect x="1" y="1" width="6.5" height="6.5" rx="1.5"/>
            <rect x="8.5" y="1" width="6.5" height="6.5" rx="1.5"/>
            <rect x="1" y="8.5" width="6.5" height="6.5" rx="1.5"/>
            <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="1.5"/>
          </svg>
        </button>
      )}
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
      {showCalendar && (
        <button
          className={`${styles.btn} ${value === 'calendario' ? styles.active : ''}`}
          onClick={() => onChange('calendario')}
          title="Visão Calendário"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.5 1a.5.5 0 0 1 .5.5V3h6V1.5a.5.5 0 0 1 1 0V3h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1V1.5a.5.5 0 0 1 .5-.5ZM2 6.5V14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6.5H2ZM3 4a1 1 0 0 0-1 1v.5h12V5a1 1 0 0 0-1-1H3Z"/>
          </svg>
        </button>
      )}
    </div>
  )
}
