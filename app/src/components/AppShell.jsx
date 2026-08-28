import { NavLink, useLocation } from 'react-router-dom'
import { Lightning, Barbell, ChartLineUp } from '@phosphor-icons/react'

// The bottom tab bar. Persistent on EVERY authenticated screen — no exceptions
// (spec §6). It is the always-reliable way home when an in-app back action is
// ambiguous. Only true modal overlays (bottom sheets, confirm dialogs) may
// temporarily cover it; no full screen relies on a back arrow as its only exit.
const TABS = [
  { to: '/', label: 'Today', icon: Lightning, active: (p) => p === '/' || p.startsWith('/day') || p === '/calendar' },
  { to: '/library', label: 'Library', icon: Barbell, active: (p) => p.startsWith('/library') },
  { to: '/progress', label: 'Progress', icon: ChartLineUp, active: (p) => p.startsWith('/progress') },
]

export default function AppShell({ children }) {
  const { pathname } = useLocation()
  return (
    <div className="app-shell">
      <div className="screen">{children}</div>
      <nav className="bottom-nav">
        {TABS.map(({ to, label, icon: Icon, active }) => (
          <NavLink key={to} to={to} className={active(pathname) ? 'active' : undefined}>
            <Icon size={19} weight="bold" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
