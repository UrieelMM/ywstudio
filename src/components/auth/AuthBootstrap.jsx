import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

function AuthBootstrap() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return <Outlet />
}

export default AuthBootstrap
