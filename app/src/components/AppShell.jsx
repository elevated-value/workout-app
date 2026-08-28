import { NavLink, useLocation } from 'react-router-dom'
import { Lightning, Barbell, ChartLineUp } from '@phosphor-icons/react'

const TABS = [
  { to: '/', label: 'Today', icon: Lightning, exact: true },
  { to: '/library', label: 'Library', icon: Barbell },
  { to: '/progress', label: 'Progress', icon: ChartLineUp },
]

// The persistent phone frame. `nav` shows the bottom tab bar (Home / Library /
// Progress); full-screen flows (logging, day builder, day record) pass nav={false}
// so they get the whole viewport with their own back affordance.
export default function AppShell({ children, nav = false }) {
  const { pathname } = useLocation()
  return (
    <div className="app-shell">
      <div className="screen">{children}</div>
      {nav && (
        <nav className="bottom-nav">
          {TABS.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to)
            return (
              <NavLink key={to} to={to} className={active ? 'active' : undefined}>
                <Icon size={19} weight="bold" />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>
      )}
    </div>
  )
}
