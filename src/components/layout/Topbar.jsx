import { useState } from 'react'
import { Bell, LogOut, Menu, UserCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/useAuthStore'

function Topbar({ title, description, onOpenMobileMenu }) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const result = await logout()
      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success('Sesión cerrada correctamente.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-secondary/20 bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="rounded-lg border border-secondary/20 bg-shell p-2 text-ink lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-ink">{title}</p>
            <p className="truncate text-xs text-ink/65 sm:text-sm">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-secondary/20 bg-shell px-3 py-2 text-sm font-medium text-ink transition hover:border-secondary/45"
          >
            <span className="inline-flex items-center gap-2">
              <Bell size={16} />
              Alertas
            </span>
          </button>

          <div className="hidden items-center gap-2 rounded-xl border border-secondary/20 bg-shell px-3 py-2 text-sm text-ink sm:flex">
            <UserCircle2 size={16} className="text-secondary" />
            <span className="max-w-44 truncate font-medium">{user?.email || 'Usuario'}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-xl border border-secondary/25 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-secondary/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <LogOut size={16} />
              {isLoggingOut ? 'Saliendo...' : 'Cerrar sesión'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Topbar
