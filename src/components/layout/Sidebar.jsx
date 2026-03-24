import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react'

function Sidebar({ collapsed, onToggle, items }) {
  return (
    <aside
      className={`hidden border-r border-secondary/20 bg-shell/90 px-3 py-4 backdrop-blur lg:flex lg:flex-col ${
        collapsed ? 'w-[88px]' : 'w-[290px]'
      }`}
    >
      <div className="mb-6 flex items-center justify-between px-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-xl bg-secondary p-2 text-white">
            <Sparkles size={18} />
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-ink">ywstudio</p>
              <p className="truncate text-xs text-ink/60">Loyalty Program</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg border border-secondary/20 bg-white p-2 text-ink transition hover:border-secondary/45"
          aria-label="Contraer menú"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-secondary text-white shadow-soft'
                    : 'text-ink/75 hover:bg-primary/45 hover:text-ink'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
