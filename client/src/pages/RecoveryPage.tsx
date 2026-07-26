import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useTitle } from '../hooks/useTitle'
import { formatCurrency, formatDate } from '../lib/utils'
import { STATUS_CONFIG } from '../lib/constants'
import { TrendingUp, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'

interface Summary {
  totalDeductions: number
  totalAmount: number
  inDisputeCount: number
  inDisputeAmount: number
  resolvedCount: number
  totalRecovered: number
  recoveryRate: number
  resolvedPool: number
  acceptedCount: number
  acceptedAmount: number
  openCount: number
  parkedCount: number
}

interface Deduction {
  id: number
  companyId: number | null
  retailerId: number | null
  amount: string
  status: string
  invoiceNumber: string | null
  deductedAt: string | null
  recoveredAmount: string | null
  company: { name: string } | null
  retailer: { name: string } | null
  reason: { label: string; code: string } | null
  handledBy?: { id: number; name: string }[]
}

interface ListResponse {
  data: Deduction[]
  total: number
  page: number
  limit: number
}

type Tab = 'resolved' | 'open'
type SortField = 'deductedAt' | 'amount' | 'retailerName'
type SortDir = 'asc' | 'desc'

const SORT_OPTIONS: { label: string; field: SortField; dir: SortDir }[] = [
  { label: 'Newest First', field: 'deductedAt', dir: 'desc' },
  { label: 'Oldest First', field: 'deductedAt', dir: 'asc' },
  { label: 'Amount: High → Low', field: 'amount', dir: 'desc' },
  { label: 'Amount: Low → High', field: 'amount', dir: 'asc' },
]

export function RecoveryPage() {
  useTitle('Recovery')
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [tab, setTab] = useState<Tab>('resolved')
  const [sortField, setSortField] = useState<SortField>('deductedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [page, setPage] = useState(1)
  const [response, setResponse] = useState<ListResponse | null>(null)

  useEffect(() => {
    const companyId = (window as any).__companyId
    const qs = companyId ? `?companyId=${companyId}` : ''
    api<Summary>(`/dashboard/summary${qs}`).then(setSummary)
  }, [])

  useEffect(() => {
    const companyId = (window as any).__companyId
    const params = new URLSearchParams()
    if (companyId) params.set('companyId', companyId)

    if (tab === 'resolved') {
      params.set('status', 'resolved_won,resolved_lost,resolved_partial,closed')
    } else {
      params.set('status', 'open')
    }

    params.set('sort', `${sortField}:${sortDir}`)
    params.set('page', String(page))
    params.set('limit', '25')

    api<ListResponse>(`/deductions?${params}`).then(setResponse)
  }, [tab, sortField, sortDir, page])

  const totalPages = response ? Math.ceil(response.total / response.limit) : 0

  const currentSortLabel = SORT_OPTIONS.find(o => o.field === sortField && o.dir === sortDir)?.label ?? 'Sort'

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown size={10} className="text-faint ml-0.5" />
    return sortDir === 'asc'
      ? <ChevronUp size={10} className="text-heading ml-0.5" />
      : <ChevronDown size={10} className="text-heading ml-0.5" />
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(1)
  }

  return (
    <div>
      {/* Hero Section */}
      {summary && (
        <div className="bg-panel rounded-lg border border-edge p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp size={24} className="text-accent-text" />
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-heading">{summary.recoveryRate}%</div>
                <div className="text-sm text-subtle">Recovery Rate</div>
              </div>
            </div>
            <div className="hidden sm:block w-px h-14 bg-edge" />
            <div className="grid grid-cols-3 gap-4 sm:gap-8 flex-1">
              <div>
                <div className="text-xs text-subtle uppercase mb-1">Resolved Cases</div>
                <div className="text-lg font-semibold text-heading">{summary.resolvedCount}</div>
              </div>
              <div>
                <div className="text-xs text-subtle uppercase mb-1">Total Disputed</div>
                <div className="text-lg font-semibold text-heading">{formatCurrency(summary.resolvedPool)}</div>
                <div className="text-[10px] text-faint mt-0.5">Only resolved cases, not all deductions</div>
              </div>
              <div>
                <div className="text-xs text-subtle uppercase mb-1">Recovered</div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">{formatCurrency(summary.totalRecovered)}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-edge">
            <span className="text-xs text-subtle font-mono">
              {formatCurrency(summary.totalRecovered)} / {formatCurrency(summary.resolvedPool)} × 100 = {summary.recoveryRate}%
            </span>
          </div>
        </div>
      )}

      {/* Tabs + Sort */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-surface rounded-lg p-1">
          <button
            onClick={() => { setTab('resolved'); setPage(1) }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'resolved' ? 'bg-accent text-white' : 'text-subtle hover:text-heading'}`}
          >
            Resolved Cases{response && tab === 'resolved' ? ` (${response.total})` : ''}
          </button>
          <button
            onClick={() => { setTab('open'); setPage(1) }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'open' ? 'bg-accent text-white' : 'text-subtle hover:text-heading'}`}
          >
            Open Cases{response && tab === 'open' ? ` (${response.total})` : ''}
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-subtle hover:text-heading border border-edge rounded-lg bg-panel"
          >
            {currentSortLabel} <ChevronDown size={14} />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-panel border border-edge rounded-lg shadow-lg z-20 py-1 min-w-[180px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={`${opt.field}-${opt.dir}`}
                    onClick={() => { setSortField(opt.field); setSortDir(opt.dir); setPage(1); setShowSortMenu(false) }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-panel-hover ${sortField === opt.field && sortDir === opt.dir ? 'text-accent-text font-medium' : 'text-prose'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-panel rounded-lg border border-edge overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="px-3 py-2 font-medium text-subtle cursor-pointer select-none" onClick={() => toggleSort('deductedAt')}>
                  <span className="flex items-center">ID</span>
                </th>
                <th className="px-3 py-2 font-medium text-subtle">Company</th>
                <th className="px-3 py-2 font-medium text-subtle">Retailer</th>
                <th className="px-3 py-2 font-medium text-subtle">Reason</th>
                <th className="px-3 py-2 font-medium text-subtle">Invoice</th>
                <th className="px-3 py-2 font-medium text-subtle cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <span className="flex items-center">Amount <SortIcon field="amount" /></span>
                </th>
                <th className="px-3 py-2 font-medium text-subtle cursor-pointer select-none" onClick={() => toggleSort('deductedAt')}>
                  <span className="flex items-center">Date <SortIcon field="deductedAt" /></span>
                </th>
                <th className="px-3 py-2 font-medium text-subtle">Status</th>
                {tab === 'resolved' && (
                  <th className="px-3 py-2 font-medium text-subtle">Recovered</th>
                )}
              </tr>
            </thead>
            <tbody>
              {response?.data.map((d) => {
                const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.open
                return (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/deductions/${d.id}`)}
                    className="border-b border-edge hover:bg-panel-hover cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 text-heading font-medium">#{d.id}</td>
                    <td className="px-3 py-2 text-prose">{d.company?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-prose">{d.retailer?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-prose">{d.reason?.label ?? '—'}</td>
                    <td className="px-3 py-2 text-prose font-mono text-xs">{d.invoiceNumber || '—'}</td>
                    <td className="px-3 py-2 text-heading font-medium text-right">{formatCurrency(parseFloat(d.amount))}</td>
                    <td className="px-3 py-2 text-subtle">{d.deductedAt ? formatDate(d.deductedAt) : '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    </td>
                    {tab === 'resolved' && (
                      <td className="px-3 py-2 text-green-600 dark:text-green-400 font-medium text-right">
                        {d.recoveredAmount ? formatCurrency(parseFloat(d.recoveredAmount)) : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
              {response && response.data.length === 0 && (
                <tr>
                  <td colSpan={tab === 'resolved' ? 9 : 8} className="px-3 py-8 text-center text-subtle">
                    No {tab === 'resolved' ? 'resolved' : 'open'} cases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {response && totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-edge text-xs text-subtle">
            <span>{response.total} total deductions</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 hover:text-heading disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1 hover:text-heading disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
