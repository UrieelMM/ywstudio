import { Navigate, Outlet } from 'react-router-dom'
import FullScreenLoader from '../ui/FullScreenLoader'
import { useAuthStore } from '../../store/useAuthStore'

function PublicOnlyRoute() {
  const user = useAuthStore((state) => state.user)
  const isCheckingSession = useAuthStore((state) => state.isCheckingSession)

  if (isCheckingSession) {
    return <FullScreenLoader />
  }

  if (user) {
    return <Navigate to="/usuarios" replace />
  }

  return <Outlet />
}

export default PublicOnlyRoute
