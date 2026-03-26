import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import defaultLogo from '../../assets/ywstudio_logo.jpg'
import { useOperationsStore } from '../../store/useOperationsStore'

function Sidebar({ collapsed, onToggle, items }) {
  const appConfig = useOperationsStore((state) => state.appConfig)
  const logo = appConfig.logoUrl || defaultLogo
  const topItems = items.filter((item) => item.placement !== 'bottom')
  const bottomItems = items.filter((item) => item.placement === 'bottom')

  const renderNavItem = (item) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition ${
            collapsed ? 'justify-center px-0 w-12' : 'px-3'
          } ${
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
  }

  return (
    <aside
      className={`h-full hidden flex-col overflow-y-auto border-r border-secondary/20 bg-white px-3 py-4 backdrop-blur xl:flex transition-all duration-300 shrink-0 ${
        collapsed ? 'w-[88px] items-center' : 'w-[290px]'
      }`}
    >
      <div className={`mb-6 flex w-full items-center ${collapsed ? 'flex-col gap-4' : 'justify-between px-2'}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-secondary/10">
            <img src={logo} alt="YW Studio" className="h-12 w-12 object-cover" />
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-normal text-ink" style={{ letterSpacing: '0.5px' }}>ywstudio</p>
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
        {topItems.map((item) => renderNavItem(item))}
      </nav>

      {bottomItems.length ? (
        <nav className="mt-auto border-t border-secondary/15 pt-3 space-y-1">
          {bottomItems.map((item) => renderNavItem(item))}
        </nav>
      ) : null}
    </aside>
  )
}

export default Sidebar
