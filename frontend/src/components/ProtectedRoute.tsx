import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requirePlatformAdmin?: boolean
  requireTenantAdmin?: boolean
  requireEstimator?: boolean
}

export default function ProtectedRoute({ 
  children, 
  requirePlatformAdmin = false,
  requireTenantAdmin = false,
  requireEstimator = false
}: ProtectedRouteProps) {
  const { isAuthenticated, isPlatformAdmin, isTenantAdmin, isEstimator } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireTenantAdmin && !isTenantAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireEstimator && !isEstimator && !isTenantAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
