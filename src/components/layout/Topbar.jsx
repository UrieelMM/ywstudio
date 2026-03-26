import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Bell, LogOut, Menu, UserCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/useAuthStore'
import { useOperationsStore } from '../../store/useOperationsStore'

function Topbar({ title, description, onOpenMobileMenu }) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const adminName = useOperationsStore((state) => state.appConfig.adminName)
  const notifications = useOperationsStore((state) => state.notifications)
  const markNotificationAsRead = useOperationsStore((state) => state.markNotificationAsRead)
  const markAllNotificationsAsRead = useOperationsStore((state) => state.markAllNotificationsAsRead)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [visibleNotifications, setVisibleNotifications] = useState(10)
  const notificationsPanelRef = useRef(null)

  const unreadCount = useMemo(
    () => notifications.filter((entry) => !entry.isRead).length,
    [notifications],
  )
  const notificationItems = useMemo(
    () => notifications.slice(0, visibleNotifications),
    [notifications, visibleNotifications],
  )

  useEffect(() => {
    if (!isNotificationsOpen) {
      return undefined
    }

    setVisibleNotifications(10)

    const handleOutsideClick = (event) => {
      if (
        notificationsPanelRef.current &&
        event.target instanceof Node &&
        !notificationsPanelRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isNotificationsOpen])

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
            className="rounded-lg border border-secondary/20 bg-shell p-2 text-ink xl:hidden"
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
          <div className="relative" ref={notificationsPanelRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((value) => !value)}
              className="relative rounded-xl border border-secondary/20 bg-shell p-2 sm:px-3 sm:py-2 text-sm font-medium text-ink transition hover:border-secondary/45"
            >
              <span className="inline-flex items-center gap-2">
                <Bell size={16} />
                <span className="hidden sm:inline">Notificaciones</span>
              </span>
              {unreadCount ? (
                <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>

            {isNotificationsOpen ? (
              <div className="absolute right-0 z-40 mt-2 w-[min(90vw,360px)] rounded-2xl border border-secondary/20 bg-white/95 p-3 shadow-xl backdrop-blur">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">Notificaciones</p>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await markAllNotificationsAsRead('admin-ui')
                      if (!result.ok) {
                        toast.error(result.message || 'No se pudieron actualizar las notificaciones.')
                        return
                      }
                      toast.success('Notificaciones marcadas como leídas.')
                    }}
                    className="rounded-lg border border-secondary/25 bg-white px-2 py-1 text-xs font-semibold text-ink transition hover:bg-secondary/5"
                  >
                    Marcar todo como leído
                  </button>
                </div>

                {notificationItems.length ? (
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {notificationItems.map((notification) => (
                      <button
                        key={notification.notificationId}
                        type="button"
                        onClick={async () => {
                          if (!notification.isRead) {
                            await markNotificationAsRead(notification.notificationId, 'admin-ui')
                          }
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          notification.isRead
                            ? 'border-secondary/15 bg-white'
                            : 'border-secondary/35 bg-secondary/5'
                        }`}
                      >
                        <p className="text-sm font-semibold text-ink">{notification.title}</p>
                        <p className="mt-0.5 text-xs text-ink/75">{notification.message}</p>
                        <p className="mt-1 text-[11px] text-ink/55">
                          {dayjs(notification.createdAtCustom).format('DD MMM YYYY · HH:mm')}
                        </p>
                      </button>
                    ))}
                    {notifications.length > notificationItems.length ? (
                      <button
                        type="button"
                        onClick={() => setVisibleNotifications((previous) => previous + 10)}
                        className="w-full rounded-xl border border-secondary/25 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-secondary/5"
                      >
                        Ver más notificaciones
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-secondary/25 bg-surface/60 p-4 text-center text-sm text-ink/65">
                    No hay notificaciones nuevas.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-secondary/20 bg-shell px-3 py-2 text-sm text-ink sm:flex">
            <UserCircle2 size={16} className="text-secondary" />
            <span className="max-w-44 truncate font-medium">{adminName || user?.email || 'Administrador'}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-xl border border-secondary/25 bg-white p-2 sm:px-3 sm:py-2 text-sm font-semibold text-ink transition hover:border-secondary/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <LogOut size={16} />
              <span className="hidden sm:inline">{isLoggingOut ? 'Saliendo...' : 'Cerrar sesión'}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Topbar
