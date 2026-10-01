import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function RequireAuth() {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireAdmin() {
  const { esAdmin } = useAuth()
  if (!esAdmin) return <Navigate to="/sesiones" replace />
  return <Outlet />
}
