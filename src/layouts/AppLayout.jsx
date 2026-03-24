import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import MobileSidebar from '../components/layout/MobileSidebar'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import { navigationItems, pageMetaByPath } from '../config/navigation'

function AppLayout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentMeta = useMemo(() => {
    return pageMetaByPath[location.pathname] || pageMetaByPath['/usuarios']
  }, [location.pathname])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-warm text-ink">
      <div className="pointer-events-none absolute -top-16 right-[-80px] h-72 w-72 rounded-full bg-primary/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[-100px] h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative flex min-h-screen">
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

        <div className="flex min-h-screen flex-1 flex-col min-w-0">
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
