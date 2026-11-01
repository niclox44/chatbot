import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import AuthLayout, { SessionStatus } from '../../components/auth/AuthLayout'
import PasswordField from '../../components/auth/PasswordField'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const { user, profile, loading, error: sessionError, suspended, signIn, refresh } = useAuth()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!loading && !sessionError && user && profile) return <Navigate to={profile.platform_role === 'admin' ? '/admin' : '/app'} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    setPending(true)
    try {
      await signIn({ email: String(data.get('email')).trim(), password: String(data.get('password')) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No hemos podido iniciar sesión. Vuelve a intentarlo.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Qué bueno verte." description="Inicia sesión para entrar en tu espacio." footer={<p>¿Todavía no tienes cuenta? <Link to="/registro">Crear cuenta<ArrowRight size={14} /></Link></p>}>
      {loading && !pending ? <SessionStatus loading message="Comprobando tu sesión…" /> : sessionError && !pending ? (
        <SessionStatus message={sessionError} onRetry={() => { void refresh().catch(() => undefined) }} />
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} aria-busy={pending}>
          {(suspended || searchParams.get('reason') === 'suspended') && <p className="auth-notice auth-notice--error" role="alert">Tu cuenta está suspendida. Contacta con el administrador de la plataforma. Puedes iniciar sesión con otra cuenta.</p>}
          {!suspended && searchParams.get('reason') === 'session-expired' && <p className="auth-notice" role="status">Tu sesión ha caducado. Inicia sesión de nuevo para continuar.</p>}
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" autoComplete="email" placeholder="tu@empresa.com" maxLength={254} required disabled={pending} />
          </div>
          <PasswordField name="password" label="Contraseña" autoComplete="current-password" placeholder="Tu contraseña" required disabled={pending} />
          {error && <p className="auth-notice auth-notice--error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={pending}>
            {pending ? <>Entrando…<LoaderCircle size={18} className="auth-spinner" /></> : <>Iniciar sesión<ArrowRight size={18} /></>}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
