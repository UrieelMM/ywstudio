import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import defaultLogo from '../../assets/ywstudio_logo.jpg'
import { useOperationsStore } from '../../store/useOperationsStore'

function MobileSidebar({ isOpen, onClose, items }) {
  const appConfig = useOperationsStore((state) => state.appConfig)
  const logo = appConfig.logoUrl || defaultLogo
  const topItems = items.filter((item) => item.placement !== 'bottom')
  const bottomItems = items.filter((item) => item.placement === 'bottom')

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-md xl:hidden" onClick={onClose}>
      <div
        className="h-full w-[84%] max-w-[320px] bg-shell p-4 shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-secondary/10">
              <img src={logo} alt="YW Studio" className="h-12 w-12 object-cover" />
            </span>
            <div>
              <p className="font-display text-2xl font-normal text-ink" style={{ letterSpacing: '0.5px' }}>ywstudio</p>
              <p className="text-xs text-ink/60">Loyalty Dashboard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-secondary/20 bg-white p-2 text-ink"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {topItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-secondary text-white shadow-soft'
                      : 'text-ink/80 hover:bg-primary/45 hover:text-ink'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {bottomItems.length ? (
          <nav className="mt-auto border-t border-secondary/15 pt-3 space-y-1">
            {bottomItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-secondary text-white shadow-soft'
                        : 'text-ink/80 hover:bg-primary/45 hover:text-ink'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        ) : null}
      </div>
    </div>
  )
}

export default MobileSidebar
