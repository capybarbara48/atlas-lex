import { useState, useMemo, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useNotes } from '@/hooks/useNotes'
import PageShell from '@/components/ui/PageShell'
import s from './Notes.module.css'

/* ── Color palette ─────────────────────────────────────────────── */
const CORES = [
  { key: 'amarelo', bg: '#fef9c3', border: '#f59e0b', label: 'Amarelo' },
  { key: 'azul',    bg: '#dbeafe', border: '#3b82f6', label: 'Azul'    },
  { key: 'verde',   bg: '#dcfce7', border: '#22c55e', label: 'Verde'   },
  { key: 'vermelho',bg: '#fee2e2', border: '#ef4444', label: 'Vermelho'},
  { key: 'roxo',    bg: '#ede9fe', border: '#a855f7', label: 'Roxo'    },
  { key: 'laranja', bg: '#ffedd5', border: '#f97316', label: 'Laranja' },
]
const COR_MAP = Object.fromEntries(CORES.map(c => [c.key, c]))

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/* ── Note card ─────────────────────────────────────────────────── */
function NoteCard({ nota, onExpand, onPin, onDelete }) {
  const cor = nota.cor ? COR_MAP[nota.cor] : null

  return (
    <div
      className={s.card}
      style={cor ? { background: cor.bg, borderLeftColor: cor.border } : {}}
      onClick={() => onExpand(nota)}
    >
      <div className={s.cardHeader}>
        <span className={s.cardDate}>{fmtDate(nota.updated_at)}</span>
        <div className={s.cardActions} onClick={e => e.stopPropagation()}>
          <button
            className={`${s.iconBtn} ${nota.fixada ? s.pinActive : ''}`}
            title={nota.fixada ? 'Desafixar' : 'Fixar'}
            onClick={() => onPin(nota)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="17" x2="12" y2="22"/>
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
            </svg>
          </button>
          <button
            className={`${s.iconBtn} ${s.delBtn}`}
            title="Excluir"
            onClick={() => onDelete(nota)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>
      {nota.titulo
        ? <div className={s.cardTitle}>{nota.titulo}</div>
        : <div className={`${s.cardTitle} ${s.noTitle}`}>Sem título</div>
      }
      {nota.corpo && <div className={s.cardBody}>{nota.corpo}</div>}
    </div>
  )
}

/* ── Color picker row ──────────────────────────────────────────── */
function ColorPicker({ value, onChange }) {
  return (
    <div className={s.colorPicker}>
      {CORES.map(c => (
        <button
          key={c.key}
          type="button"
          title={c.label}
          className={`${s.colorDot} ${value === c.key ? s.colorDotActive : ''}`}
          style={{ background: c.bg, borderColor: c.border }}
          onClick={() => onChange(value === c.key ? null : c.key)}
        />
      ))}
    </div>
  )
}

/* ── Note expand overlay ───────────────────────────────────────── */
function NoteExpand({ nota, onClose, onSaved }) {
  const [titulo,  setTitulo]  = useState(nota.titulo  ?? '')
  const [corpo,   setCorpo]   = useState(nota.corpo   ?? '')
  const [cor,     setCor]     = useState(nota.cor     ?? null)
  const [fixada,  setFixada]  = useState(nota.fixada  ?? false)
  const [saving,  setSaving]  = useState(false)
  const [maximized, setMaximized] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => { bodyRef.current?.focus() }, [])

  const corStyle = cor ? COR_MAP[cor] : null

  async function save() {
    setSaving(true)
    await supabase.from('notas').update({ titulo: titulo || null, corpo: corpo || null, cor, fixada }).eq('id', nota.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div
      className={s.expandOverlay}
      onClick={e => { if (e.target === e.currentTarget) save() }}
    >
      <div
        className={`${s.expandCard} ${maximized ? s.maximized : ''}`}
        style={corStyle ? { borderTop: `4px solid ${corStyle.border}` } : {}}
      >
        {/* Header */}
        <div className={s.expandHead}>
          <input
            className={s.expandTitle}
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Título da nota"
          />
          <div className={s.expandActions}>
            <button
              className={`${s.expandBtn} ${fixada ? s.pinActive : ''}`}
              title={fixada ? 'Desafixar' : 'Fixar'}
              onClick={() => setFixada(v => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"/>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
              </svg>
            </button>
            <button className={s.expandBtn} title={maximized ? 'Restaurar' : 'Maximizar'} onClick={() => setMaximized(v => !v)}>
              {maximized
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              }
            </button>
            <button className={`${s.expandBtn} ${s.closeBtn}`} title="Fechar" onClick={save}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Color bar */}
        <div className={s.expandColorBar}>
          {CORES.map(c => (
            <button
              key={c.key}
              type="button"
              title={c.label}
              className={`${s.expandColorDot} ${cor === c.key ? s.colorDotActive : ''}`}
              style={{ background: c.bg, borderColor: c.border }}
              onClick={() => setCor(cor === c.key ? null : c.key)}
            />
          ))}
          {cor && (
            <button className={s.clearColor} onClick={() => setCor(null)}>Sem cor</button>
          )}
        </div>

        {/* Body */}
        <textarea
          ref={bodyRef}
          className={s.expandBody}
          value={corpo}
          onChange={e => setCorpo(e.target.value)}
          placeholder="Escreva sua nota…"
        />

        {/* Footer */}
        <div className={s.expandFooter}>
          <span className={s.charCount}>{corpo.length} caracteres</span>
          <button className={s.expandSave} onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function Notes() {
  const { session, lawyer } = useAuth()
  const { data: rawNotes, loading, error, refetch } = useNotes()

  const [tab,       setTab]       = useState('todas')
  const [search,    setSearch]    = useState('')
  const [addOpen,   setAddOpen]   = useState(false)
  const [newTitulo, setNewTitulo] = useState('')
  const [newCorpo,  setNewCorpo]  = useState('')
  const [newCor,    setNewCor]    = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [expandNota, setExpandNota] = useState(null)

  const notes = useMemo(() => {
    let list = rawNotes ?? []
    if (tab === 'fixadas') list = list.filter(n => n.fixada)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(n =>
        (n.titulo ?? '').toLowerCase().includes(q) ||
        (n.corpo  ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [rawNotes, tab, search])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newTitulo.trim() && !newCorpo.trim()) return
    setSaving(true)
    await supabase.from('notas').insert({
      lawyer_id: lawyer?.id ?? session.user.id,
      titulo: newTitulo.trim() || null,
      corpo:  newCorpo.trim()  || null,
      cor:    newCor,
    })
    setSaving(false)
    setNewTitulo(''); setNewCorpo(''); setNewCor(null)
    setAddOpen(false)
    refetch()
  }

  async function handlePin(nota) {
    await supabase.from('notas').update({ fixada: !nota.fixada }).eq('id', nota.id)
    refetch()
  }

  async function handleDelete(nota) {
    if (!window.confirm('Excluir esta anotação?')) return
    await supabase.from('notas').delete().eq('id', nota.id)
    refetch()
  }

  const totalLabel = `${rawNotes?.length ?? 0} anotaç${rawNotes?.length === 1 ? 'ão' : 'ões'}`

  return (
    <PageShell
      title="Notas"
      subtitle={loading ? '—' : totalLabel}
      action={
        <button className={s.btnNew} onClick={() => { setAddOpen(v => !v); setNewTitulo(''); setNewCorpo(''); setNewCor(null) }}>
          {addOpen ? '✕ Cancelar' : '+ Nova nota'}
        </button>
      }
    >
      {/* Controls */}
      <div className={s.controls}>
        <div className={s.tabs}>
          <button className={`${s.tab} ${tab === 'todas'   ? s.tabActive : ''}`} onClick={() => setTab('todas')}>Todas</button>
          <button className={`${s.tab} ${tab === 'fixadas' ? s.tabActive : ''}`} onClick={() => setTab('fixadas')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,verticalAlign:'-1px'}}>
              <line x1="12" y1="17" x2="12" y2="22"/>
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
            </svg>
            Fixadas
          </button>
        </div>
        <div className={s.searchWrap}>
          <svg className={s.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className={s.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nas notas…"
          />
        </div>
      </div>

      {/* Add form */}
      {addOpen && (
        <form className={s.addForm} onSubmit={handleAdd}>
          <div className={s.addFormTop}>
            <input
              className={s.addTitle}
              value={newTitulo}
              onChange={e => setNewTitulo(e.target.value)}
              placeholder="Título da nota"
              autoFocus
            />
            <ColorPicker value={newCor} onChange={setNewCor} />
          </div>
          <textarea
            className={s.addBody}
            value={newCorpo}
            onChange={e => setNewCorpo(e.target.value)}
            placeholder="Escreva sua nota… (Ctrl+Enter para salvar)"
            rows={4}
            onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleAdd(e) } }}
          />
          <div className={s.addFooter}>
            <span className={s.charCount}>{newCorpo.length} caracteres</span>
            <div className={s.addActions}>
              <button type="button" className={s.btnCancel} onClick={() => setAddOpen(false)}>Cancelar</button>
              <button type="submit" className={s.btnSave} disabled={saving || (!newTitulo.trim() && !newCorpo.trim())}>
                {saving ? 'Salvando…' : 'Salvar nota'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Notes grid */}
      {loading && <div className={s.empty}>Carregando…</div>}
      {error   && <div className={s.errorMsg}>{error}</div>}
      {!loading && !error && notes.length === 0 && (
        <div className={s.empty}>
          {tab === 'fixadas'
            ? 'Nenhuma nota fixada.'
            : search
              ? 'Nenhuma nota encontrada.'
              : 'Nenhuma anotação ainda. Clique em + Nova nota para começar.'}
        </div>
      )}
      {!loading && notes.length > 0 && (
        <div className={s.grid}>
          {notes.map(n => (
            <NoteCard
              key={n.id}
              nota={n}
              onExpand={setExpandNota}
              onPin={handlePin}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Expand overlay */}
      {expandNota && (
        <NoteExpand
          nota={expandNota}
          onClose={() => setExpandNota(null)}
          onSaved={refetch}
        />
      )}
    </PageShell>
  )
}
