import { useEffect } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Landing, AppDashboard } from '../App'
import { useAuth } from '../hooks/useAuth'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import RoleRoute from '../components/auth/RoleRoute'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'

function LandingPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const dashboard = profile?.platform_role === 'admin' ? '/admin' : '/app'
  return <Landing openApp={() => navigate(user ? dashboard : '/registro')} openLogin={() => navigate(user ? dashboard : '/login')} authenticated={Boolean(user)} />
}

function ClientPage() {
  const navigate = useNavigate()
  return <AppDashboard goLanding={() => navigate('/')} />
}

export default function AppRouter() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/registro" element={<RegisterPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<RoleRoute allowedRoles={['client']} />}><Route path="/app/*" element={<ClientPage />} /></Route>
      <Route element={<RoleRoute allowedRoles={['admin']} />}><Route path="/admin" element={<AdminDashboardPage />} /></Route>
    </Route>
    <Route path="*" element={<div className="auth-page"><div className="auth-card"><h1>Página no encontrada</h1><p>La dirección que buscas no existe.</p><Link className="pill-button pill-button--primary" to="/">Volver al inicio</Link></div></div>} />
  </Routes>
}
