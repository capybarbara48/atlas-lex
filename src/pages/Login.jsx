import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import styles from './Login.module.css'

export default function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Atlas Lex</h1>
        <p className={styles.subtitle}>Gestão jurídica inteligente</p>
        <button className="btn-primary" onClick={handleGoogleLogin}>
          Entrar com Google
        </button>
      </div>
    </div>
  )
}
