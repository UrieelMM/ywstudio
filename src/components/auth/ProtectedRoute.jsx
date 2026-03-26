import { useState, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import FullScreenLoader from '../ui/FullScreenLoader'
import { useAuthStore } from '../../store/useAuthStore'

function ProtectedRoute() {
  const user = useAuthStore((state) => state.user)
  const isCheckingSession = useAuthStore((state) => state.isCheckingSession)
  const location = useLocation()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (isCheckingSession || !minTimeElapsed) {
    return <FullScreenLoader />
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}

export default ProtectedRoute
