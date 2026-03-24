import { Navigate, Outlet, useLocation } from 'react-router-dom'
import FullScreenLoader from '../ui/FullScreenLoader'
import { useAuthStore } from '../../store/useAuthStore'

function ProtectedRoute() {
  const user = useAuthStore((state) => state.user)
  const isCheckingSession = useAuthStore((state) => state.isCheckingSession)
  const location = useLocation()

  if (isCheckingSession) {
    return <FullScreenLoader />
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}

export default ProtectedRoute
