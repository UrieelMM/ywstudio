import { NavLink } from 'react-router-dom'
import { X, Sparkles } from 'lucide-react'

function MobileSidebar({ isOpen, onClose, items }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/35 lg:hidden" onClick={onClose}>
      <div
        className="h-full w-[84%] max-w-[320px] bg-shell p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-secondary p-2 text-white">
              <Sparkles size={18} />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-ink">ywstudio</p>
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
          {items.map((item) => {
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
      </div>
    </div>
  )
}

export default MobileSidebar
