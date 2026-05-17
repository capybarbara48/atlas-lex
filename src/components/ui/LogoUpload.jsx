import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import styles from './LogoUpload.module.css'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED  = 'image/png,image/jpeg,image/webp,image/svg+xml'
const ACCEPTED_TYPES = ACCEPTED.split(',')

export default function LogoUpload({ value, onChange }) {
  const { session } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState(null)
  const [dragging,  setDragging]  = useState(false)
  const inputRef = useRef()

  async function handleFile(file) {
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato inválido. Use PNG, JPG, WebP ou SVG.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Arquivo muito grande. Máximo 2 MB.')
      return
    }
    setUploading(true)
    const ext  = file.name.split('.').pop().toLowerCase()
    const path = `${session.user.id}/logo.${ext}`

    const { error: upErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      setError('Erro ao enviar: ' + upErr.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    // Bust cache so the new image loads even if path is same
    onChange(data.publicUrl + '?t=' + Date.now())
    setUploading(false)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function remove() { onChange('') }

  return (
    <div className={styles.wrap}>
      {value ? (
        <div className={styles.preview}>
          <div className={styles.previewImgWrap}>
            <img
              src={value}
              alt="logo"
              className={styles.previewImg}
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
          <div className={styles.previewActions}>
            <button type="button" className={styles.changeBtnSm} onClick={() => inputRef.current.click()}>
              Trocar
            </button>
            <button type="button" className={styles.removeBtnSm} onClick={remove}>
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`${styles.zone} ${dragging ? styles.dragging : ''} ${uploading ? styles.busy : ''}`}
          onClick={() => !uploading && inputRef.current.click()}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDragEnter={e => { e.preventDefault(); setDragging(true) }}
        >
          {uploading ? (
            <div className={styles.spinner} />
          ) : (
            <>
              <div className={styles.icon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/>
                </svg>
              </div>
              <p className={styles.zoneText}>
                <span className={styles.zoneLink}>Clique para selecionar</span> ou arraste seu logo aqui
              </p>
              <p className={styles.zoneHint}>PNG, JPG, WebP ou SVG · máx. 2 MB</p>
            </>
          )}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </div>
  )
}
