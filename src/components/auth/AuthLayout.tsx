import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, MessageCircle, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../../styles/auth.css'

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export default function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <div className="auth-grid" aria-hidden="true" />
      <header className="auth-header">
        <Link to="/" className="brand brand--light" aria-label="Setter, volver al inicio">
          <span className="brand-mark" aria-hidden="true"><span /><span /></span>
          setter<i>.</i>
        </Link>
        <Link to="/" className="auth-back"><ArrowLeft size={15} /> Volver al inicio</Link>
      </header>
      <div className="auth-layout">
        <section className="auth-intro" aria-label="Tu espacio en Setter">
          <span className="auth-eyebrow"><MessageCircle size={15} /> TU ESPACIO EN SETTER</span>
          <h2>Cada conversación.<br /><span>Más cerca.</span></h2>
          <p>Tu asistente y tu negocio, conectados en un mismo lugar.</p>
          <div className="auth-benefits">
            <div><SlidersHorizontal size={19} /><span>Configura cómo responde tu asistente.</span></div>
            <div><MessageCircle size={19} /><span>Mantén tus conversaciones organizadas.</span></div>
            <div><ShieldCheck size={19} /><span>Decide cuándo tomar el control.</span></div>
          </div>
          <span className="auth-intro-note">Tu criterio. Tu asistente. Tu control.<ArrowRight size={17} /></span>
        </section>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card-heading">
            <span className="auth-card-kicker">BIENVENIDO A SETTER</span>
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          {footer && <div className="auth-card-footer">{footer}</div>}
        </section>
      </div>
    </main>
  )
}

export function SessionStatus({ loading = false, message, onRetry }: { loading?: boolean; message: string; onRetry?: () => void }) {
  return (
    <div className="auth-session-status" role={loading ? 'status' : 'alert'}>
      {loading && <LoaderCircle className="auth-spinner" size={24} aria-hidden="true" />}
      <p>{message}</p>
      {onRetry && <button type="button" className="auth-submit" onClick={onRetry}>Volver a intentarlo<ArrowRight size={17} /></button>}
    </div>
  )
}
