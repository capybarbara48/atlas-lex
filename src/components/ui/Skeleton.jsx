import styles from './Skeleton.module.css'

export function Skeleton({ width, height, radius, style, className }) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

export function SkeletonText({ lines = 1, lastWidth = '60%' }) {
  return (
    <div className={styles.textGroup}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height="0.75rem"
          width={i === lines - 1 && lines > 1 ? lastWidth : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonRow({ cols = 4 }) {
  const widths = ['30%', '20%', '15%', '12%', '10%', '8%']
  return (
    <div className={styles.row}>
      {Array.from({ length: cols }, (_, i) => (
        <Skeleton key={i} height="0.75rem" width={widths[i] ?? '10%'} />
      ))}
    </div>
  )
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className={styles.card}>
      <Skeleton height="0.85rem" width="40%" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height="0.7rem" width={i % 2 === 0 ? '70%' : '50%'} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className={styles.table}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  )
}

export function SkeletonListItem() {
  return (
    <div className={styles.listItem}>
      <div className={styles.listMain}>
        <Skeleton height="0.85rem" width="55%" />
        <Skeleton height="0.65rem" width="35%" />
      </div>
      <div className={styles.listMeta}>
        <Skeleton height="1.2rem" width="3.5rem" radius="999px" />
        <Skeleton height="1.2rem" width="3rem" radius="999px" />
        <Skeleton height="0.65rem" width="4rem" />
      </div>
    </div>
  )
}

export function SkeletonKanbanCard() {
  return (
    <div className={styles.kanbanCard}>
      <Skeleton height="0.78rem" width="80%" />
      <Skeleton height="0.68rem" width="50%" />
      <div className={styles.kanbanMeta}>
        <Skeleton height="1.1rem" width="3rem" radius="999px" />
      </div>
    </div>
  )
}
