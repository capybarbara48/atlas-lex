import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import styles from './Login.module.css'

export default function Login() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/painel', { replace: true })
  }, [session, navigate])

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/painel' },
    })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Atlas Adv</h1>
        <p className={styles.subtitle}>{t('login.tagline', 'Gestão jurídica inteligente')}</p>
        <button className="btn-primary" onClick={handleGoogleLogin}>
          {t('login.signInWithGoogle', 'Entrar com Google')}
        </button>
      </div>
    </div>
  )
}
