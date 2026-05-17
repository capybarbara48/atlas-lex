import { Component } from 'react'

/* ── Page-level fallback (inside AppLayout — sidebar stays) ─────────── */
function PageFallback({ error, onReset }) {
  const isDev = import.meta.env.DEV
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', minHeight: '320px',
      padding: '2rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '2.25rem', marginBottom: '1rem', opacity: 0.45 }}>⚠️</div>
      <h2 style={{
        fontSize: '1.05rem', fontWeight: 700,
        color: 'var(--text)', margin: '0 0 0.5rem',
      }}>
        Algo deu errado
      </h2>
      <p style={{
        fontSize: '0.875rem', color: 'var(--text-2)',
        margin: '0 0 1.5rem', maxWidth: '380px', lineHeight: 1.6,
      }}>
        Ocorreu um erro inesperado nesta página. Tente novamente ou volte ao painel.
      </p>

      {isDev && error?.message && (
        <pre style={{
          fontSize: '0.7rem', fontFamily: 'monospace',
          background: 'var(--bg)', border: 'var(--border)',
          borderRadius: '6px', padding: '0.6rem 0.85rem',
          color: '#dc2626', marginBottom: '1.5rem',
          maxWidth: '480px', width: '100%', textAlign: 'left',
          overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {error.message}
        </pre>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onReset}
          style={{
            padding: '0.55rem 1.25rem',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem', fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
        <a
          href="/painel"
          style={{
            padding: '0.55rem 1.25rem',
            background: 'var(--card)', color: 'var(--text-2)',
            border: 'var(--border)', borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem', fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
          }}
        >
          Ir ao painel
        </a>
      </div>
    </div>
  )
}

/* ── App-level fallback (full screen — last resort) ─────────────────── */
function AppFallback({ error, onReset }) {
  const isDev = import.meta.env.DEV
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center',
      background: 'var(--bg)', fontFamily: 'inherit',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1.25rem', opacity: 0.4 }}>⚠️</div>
      <h1 style={{
        fontSize: '1.25rem', fontWeight: 700,
        color: 'var(--text)', margin: '0 0 0.5rem',
      }}>
        Atlas Lex encontrou um problema
      </h1>
      <p style={{
        fontSize: '0.875rem', color: 'var(--text-2)',
        margin: '0 0 2rem', maxWidth: '400px', lineHeight: 1.6,
      }}>
        Ocorreu um erro inesperado. Recarregue a página ou limpe o cache do navegador.
      </p>

      {isDev && error?.message && (
        <pre style={{
          fontSize: '0.7rem', fontFamily: 'monospace',
          background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '8px', padding: '0.75rem 1rem',
          color: '#dc2626', marginBottom: '2rem',
          maxWidth: '520px', width: '100%', textAlign: 'left',
          overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {error.message}
        </pre>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.6rem 1.5rem',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: '8px',
            fontSize: '0.875rem', fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Recarregar página
        </button>
        <button
          onClick={onReset}
          style={{
            padding: '0.6rem 1.5rem',
            background: 'transparent', color: 'var(--text-2)',
            border: '1px solid rgba(var(--accent-rgb),0.15)',
            borderRadius: '8px',
            fontSize: '0.875rem', fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}

/* ── Boundary class ─────────────────────────────────────────────────── */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    const reset = () => this.setState({ error: null })
    return this.props.variant === 'app'
      ? <AppFallback error={this.state.error} onReset={reset} />
      : <PageFallback error={this.state.error} onReset={reset} />
  }
}
