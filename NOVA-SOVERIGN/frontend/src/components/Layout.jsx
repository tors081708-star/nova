import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  NotebookPen,
  ListChecks,
  FileText,
  Drama,
  Settings as SettingsIcon,
  Sparkles,
  LogOut,
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Briefing', icon: LayoutDashboard, testid: 'nav-dashboard', end: true },
  { to: '/chat', label: 'Chat', icon: MessageSquare, testid: 'nav-chat' },
  { to: '/notes', label: 'Notes', icon: NotebookPen, testid: 'nav-notes' },
  { to: '/tasks', label: 'Tasks', icon: ListChecks, testid: 'nav-tasks' },
  { to: '/docs', label: 'Documents', icon: FileText, testid: 'nav-docs' },
  { to: '/personas', label: 'Personas', icon: Drama, testid: 'nav-personas' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, testid: 'nav-settings' },
]

export default function Layout({ children }) {
  const nav = useNavigate()
  const email = localStorage.getItem('nova_email') || ''

  function logout() {
    localStorage.removeItem('nova_token')
    localStorage.removeItem('nova_email')
    window.dispatchEvent(new Event('nova-auth-change'))
    nav('/login')
  }

  return (
    <div className="grain min-h-screen flex relative">
      <aside className="w-60 shrink-0 bg-bg border-r border-line flex flex-col py-6 px-4 relative z-10">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-8 h-8 rounded-md bg-brand/20 border border-brand/40 grid place-items-center">
            <Sparkles size={16} strokeWidth={1.5} className="text-brand" />
          </div>
          <div>
            <div className="font-display text-lg tracking-wide leading-none">NOVA</div>
            <div className="overline mt-0.5">personal ai</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ to, label, icon: Icon, testid, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={testid}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-bg-soft text-ink border-l-2 border-brand pl-[10px]'
                    : 'text-ink-muted hover:text-ink hover:bg-bg-elev border-l-2 border-transparent pl-[10px]'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.5} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="pt-4 mt-4 border-t border-line">
          <div className="text-xs text-ink-muted truncate px-2" data-testid="nav-email">
            {email}
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost w-full mt-2 text-sm justify-start"
            data-testid="nav-logout"
          >
            <LogOut size={14} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 relative z-10">{children}</main>
    </div>
  )
}
