import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout, { SessionStatus } from '../../components/auth/AuthLayout'
import PasswordField from '../../components/auth/PasswordField'
import { useAuth } from '../../hooks/useAuth'

export default function RegisterPage() {
  const { user, profile, loading, error: sessionError, signUp, refresh } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!loading && !sessionError && user && profile) return <Navigate to={profile.platform_role === 'admin' ? '/admin' : '/app'} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const password = String(data.get('password'))
    setError(null)
    if (password !== String(data.get('confirm-password'))) {
      setError('Las contraseñas no coinciden.')
      ;(form.elements.namedItem('confirm-password') as HTMLInputElement)?.focus()
      return
    }
    if (!String(data.get('name')).trim() || !String(data.get('company_name')).trim()) {
      setError('Escribe tu nombre y el nombre de tu empresa.')
      return
    }
    setPending(true)
    try {
      await signUp({ name: String(data.get('name')).trim(), company_name: String(data.get('company_name')).trim(), email: String(data.get('email')).trim(), password })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No hemos podido crear tu cuenta. Vuelve a intentarlo.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Tu próximo paso." description="Crea tu cuenta y empieza a configurar tu asistente." footer={<p>¿Ya tienes cuenta? <Link to="/login">Iniciar sesión<ArrowRight size={14} /></Link></p>}>
      {loading && !pending ? <SessionStatus loading message="Comprobando tu sesión…" /> : sessionError && !pending ? (
        <SessionStatus message={sessionError} onRetry={() => { void refresh().catch(() => undefined) }} />
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} aria-busy={pending}>
          <div className="auth-field-row">
            <div className="auth-field">
              <label htmlFor="register-name">Tu nombre</label>
              <input id="register-name" name="name" type="text" autoComplete="name" placeholder="Nombre completo" maxLength={120} required disabled={pending} />
            </div>
            <div className="auth-field">
              <label htmlFor="register-company">Empresa</label>
              <input id="register-company" name="company_name" type="text" autoComplete="organization" placeholder="Tu negocio" maxLength={120} required disabled={pending} />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="register-email">Email</label>
            <input id="register-email" name="email" type="email" autoComplete="email" placeholder="tu@empresa.com" maxLength={254} required disabled={pending} />
          </div>
          <PasswordField name="password" label="Contraseña" autoComplete="new-password" placeholder="Crea una contraseña" hint="Entre 8 y 128 caracteres." minLength={8} maxLength={128} required disabled={pending} />
          <PasswordField name="confirm-password" label="Repite la contraseña" autoComplete="new-password" placeholder="Confirma tu contraseña" minLength={8} maxLength={128} required disabled={pending} />
          {error && <p className="auth-notice auth-notice--error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={pending}>
            {pending ? <>Creando tu cuenta…<LoaderCircle size={18} className="auth-spinner" /></> : <>Crear cuenta<ArrowRight size={18} /></>}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
