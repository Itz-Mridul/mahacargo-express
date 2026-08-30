import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAppStore } from '../store/appStore'

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuthStore()
  const { userRole } = useAppStore() // Fallback if needed
  const location = useLocation()

  const currentRole = user?.user_metadata?.role || userRole

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to="/" replace />
  }

  return children
}
