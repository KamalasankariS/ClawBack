import { type ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, ClipboardList, Building2, LogOut } from 'lucide-react'
import { api, getStoredUser, logout } from '../../api/client'

interface Company { id: number; name: string }

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/deductions', icon: FileText, label: 'Deductions' },
  { to: '/import-audit', icon: ClipboardList, label: 'Import Audit' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>(localStorage.getItem('confido_companyFilter') || '')
  const user = getStoredUser()

  useEffect(() => {
    api<Company[]>('/companies').then(setCompanies)
  }, [])

  // Persist company filter
  useEffect(() => {
    localStorage.setItem('confido_companyFilter', selectedCompany);
    (window as any).__companyId = selectedCompany ? parseInt(selectedCompany) : undefined
  }, [selectedCompany])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Confido</h1>
          <p className="text-xs text-gray-500">Deduction Recovery</p>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-0.5 ${
                  active
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-gray-200 space-y-2">
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Building2 size={12} /> Company
            </label>
            <select
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
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
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
