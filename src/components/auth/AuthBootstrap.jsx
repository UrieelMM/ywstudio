import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useOperationsStore } from '../../store/useOperationsStore'

function AuthBootstrap() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const bootstrapPublicBranding = useOperationsStore((state) => state.bootstrapPublicBranding)

  useEffect(() => {
    initializeAuth()
    bootstrapPublicBranding()
  }, [initializeAuth, bootstrapPublicBranding])

  return <Outlet />
}

export default AuthBootstrap
