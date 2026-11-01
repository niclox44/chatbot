import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { PlatformRole } from '../../types/auth'

export default function RoleRoute({ allowedRoles }: { allowedRoles: PlatformRole[] }) {
  const { profile } = useAuth()
  if (!profile) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(profile.platform_role)) {
    return <Navigate to={profile.platform_role === 'admin' ? '/admin' : '/app'} replace />
  }
  return <Outlet />
}
