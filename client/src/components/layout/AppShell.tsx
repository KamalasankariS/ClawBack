import { type ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, ClipboardList, Building2, LogOut, Menu, X, Sun, Moon, TrendingUp } from 'lucide-react'
import { api, getStoredUser, logout } from '../../api/client'
import { useTheme } from '../../hooks/useTheme'

interface Company { id: number; name: string }

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/deductions', icon: FileText, label: 'Deductions' },
  { to: '/recovery', icon: TrendingUp, label: 'Recovery' },
  { to: '/import-audit', icon: ClipboardList, label: 'Data Cleanup' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>(localStorage.getItem('confido_companyFilter') || '')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = getStoredUser()

  useEffect(() => {
    api<Company[]>('/companies').then(setCompanies)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Persist company filter
  useEffect(() => {
    localStorage.setItem('confido_companyFilter', selectedCompany);
    (window as any).__companyId = selectedCompany ? parseInt(selectedCompany) : undefined
  }, [selectedCompany])

  const sidebar = (
    <>
      <div className="p-4 border-b border-edge">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-heading">Confido</h1>
            <p className="text-xs text-subtle">Deduction Recovery</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="p-1.5 text-faint hover:text-heading hover:bg-panel-hover rounded transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-faint hover:text-heading"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors ${
                active
                  ? 'bg-accent-soft text-accent-text font-medium'
                  : 'text-subtle hover:bg-panel-hover hover:text-heading'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-edge space-y-2">
        <div>
          <label className="flex items-center gap-1 text-xs text-subtle mb-1">
            <Building2 size={12} /> Company
          </label>
          <select
            className="w-full text-sm border border-edge rounded px-2 py-1.5 bg-input-bg text-heading"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {user && (
          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-heading truncate">{user.name}</p>
              <p className="text-[10px] text-faint truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-faint hover:text-heading hover:bg-panel-hover rounded transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-surface">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide-in */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 bg-sidebar border-r border-edge flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-panel border-b border-edge">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-subtle hover:text-heading"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base font-semibold text-heading">Confido</h1>
          <button
            onClick={toggle}
            className="ml-auto p-1.5 text-faint hover:text-heading hover:bg-panel-hover rounded transition-colors"
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
