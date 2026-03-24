import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import MobileSidebar from '../components/layout/MobileSidebar'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import FullScreenLoader from '../components/ui/FullScreenLoader'
import { navigationItems, pageMetaByPath } from '../config/navigation'
import { useAuthStore } from '../store/useAuthStore'
import { useGovernanceStore } from '../store/useGovernanceStore'
import { useOperationsStore } from '../store/useOperationsStore'

function AppLayout() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const bootstrapData = useOperationsStore((state) => state.bootstrapData)
  const bootstrapGovernanceData = useGovernanceStore((state) => state.bootstrapGovernanceData)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPreparingData, setIsPreparingData] = useState(true)

  const currentMeta = useMemo(() => {
    return pageMetaByPath[location.pathname] || pageMetaByPath['/usuarios']
  }, [location.pathname])

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      if (!user?.uid) {
        if (mounted) {
          setIsPreparingData(true)
        }
        return
      }

      if (mounted) {
        setIsPreparingData(true)
      }

      const [operationsResult, governanceResult] = await Promise.all([
        bootstrapData(),
        bootstrapGovernanceData(),
      ])

      if (!operationsResult?.ok) {
        toast.error(operationsResult?.message || 'No se pudo cargar la operación desde Firebase.')
      }

      if (!governanceResult?.ok) {
        toast.error(governanceResult?.message || 'No se pudo cargar la gobernanza desde Firebase.')
      }

      if (mounted) {
        setIsPreparingData(false)
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [user?.uid, bootstrapData, bootstrapGovernanceData])

  if (isPreparingData) {
    return (
      <FullScreenLoader
        title="Cargando datos"
        subtitle="Sincronizando información del dashboard con Firebase..."
      />
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-warm text-ink">
      <div className="pointer-events-none absolute -top-16 right-[-80px] h-72 w-72 rounded-full bg-primary/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[-100px] h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative flex h-full w-full">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
          items={navigationItems}
        />

        <MobileSidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          items={navigationItems}
        />

        <div className="flex flex-1 flex-col min-w-0 h-full overflow-y-auto">
          <Topbar
            title={currentMeta.title}
            description={currentMeta.description}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout
