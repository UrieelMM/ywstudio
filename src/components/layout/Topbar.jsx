import { Bell, Menu } from 'lucide-react'

function Topbar({ title, description, onOpenMobileMenu }) {
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

        <button
          type="button"
          className="rounded-xl border border-secondary/20 bg-shell px-3 py-2 text-sm font-medium text-ink transition hover:border-secondary/45"
        >
          <span className="inline-flex items-center gap-2">
            <Bell size={16} />
            Alertas
          </span>
        </button>
      </div>
    </header>
  )
}

export default Topbar
