import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AuthLayout, { SessionStatus } from './AuthLayout'

export default function ProtectedRoute() {
  const { user, loading, error, suspended, sessionExpired, refresh } = useAuth()
  const location = useLocation()

  if (loading || error) {
    return (
      <AuthLayout title={loading ? 'Un momento…' : 'Revisemos la conexión'} description="Estamos comprobando el acceso a tu espacio.">
        <SessionStatus loading={loading} message={loading ? 'Comprobando tu sesión…' : error!} onRetry={loading ? undefined : () => { void refresh().catch(() => undefined) }} />
      </AuthLayout>
    )
  }

  if (!user || suspended) {
    const reason = suspended ? '?reason=suspended' : sessionExpired ? '?reason=session-expired' : ''
    return <Navigate to={`/login${reason}`} state={{ from: location.pathname + location.search }} replace />
  }

  return <Outlet />
}
