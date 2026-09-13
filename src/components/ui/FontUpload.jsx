import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { loadCustomFont } from '@/lib/fonts'
import styles from './FontUpload.module.css'

const ACCEPTED_EXTS = ['woff', 'woff2', 'ttf', 'otf']
const MAX_BYTES = 5 * 1024 * 1024

export default function FontUpload({ customFont, onFont, onRemove }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  async function handleFile(file) {
    setError('')
    const ext = file.name.split('.').pop().toLowerCase()
    if (!ACCEPTED_EXTS.includes(ext)) {
      setError(t('ui.fontUpload.invalidFormat', 'Formato inválido. Use WOFF2, TTF ou OTF.'))
      return
    }
    if (file.size > MAX_BYTES) {
      setError(t('ui.fontUpload.tooLarge', 'Arquivo muito grande. Máximo 5 MB.'))
      return
    }

    setUploading(true)
    const path = `${session.user.id}/custom-font.${ext}`

    const { error: upErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' })

    if (upErr) {
      setError(t('ui.fontUpload.uploadError', 'Erro ao enviar: {{message}}', { message: upErr.message }))
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()

    const displayName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .trim() || t('ui.fontUpload.defaultName', 'Fonte Personalizada')

    loadCustomFont(url)
    onFont({ displayName, url })
    setUploading(false)
  }

  if (customFont) {
    return (
      <div className={styles.uploaded}>
        <span className={styles.uploadedLabel}>{t('ui.fontUpload.loadedLabel', 'Fonte carregada:')}</span>
        <span className={styles.uploadedName} style={{ fontFamily: "'CustomFont', sans-serif" }}>
          {customFont.displayName}
        </span>
        <div className={styles.uploadedActions}>
          <button type="button" className={styles.changeBtn}
            onClick={() => inputRef.current.click()} disabled={uploading}>
            {t('ui.fontUpload.changeButton', 'Trocar')}
          </button>
          <button type="button" className={styles.removeBtn} onClick={onRemove}>
            {t('ui.fontUpload.removeButton', 'Remover')}
          </button>
        </div>
        <input ref={inputRef} type="file" accept=".woff,.woff2,.ttf,.otf"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.uploadBtn}
        onClick={() => inputRef.current.click()}
        disabled={uploading}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
          <path d="M8 1a.75.75 0 0 1 .75.75V9.44l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 1.06-1.06L7.25 9.44V1.75A.75.75 0 0 1 8 1ZM1.5 14.25a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Z"/>
        </svg>
        {uploading ? t('ui.fontUpload.uploading', 'Enviando…') : t('ui.fontUpload.uploadButton', 'Upload sua fonte')}
      </button>
      <span className={styles.hint}>{t('ui.fontUpload.hint', 'WOFF2, TTF ou OTF · máx. 5 MB')}</span>
      {error && <span className={styles.error}>{error}</span>}
      <input ref={inputRef} type="file" accept=".woff,.woff2,.ttf,.otf"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}
