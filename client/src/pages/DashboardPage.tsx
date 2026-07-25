import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useTitle } from '../hooks/useTitle'
import { formatCurrency } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, AlertCircle, CheckCircle, DollarSign, ArrowRight } from 'lucide-react'

interface Summary {
  totalDeductions: number
  totalAmount: number
  inDisputeCount: number
  inDisputeAmount: number
  resolvedCount: number
  totalRecovered: number
  recoveryRate: number
  acceptedCount: number
  acceptedAmount: number
  openCount: number
  parkedCount: number
}

interface RetailerBreakdown {
  retailerId: number
  retailerName: string
  totalAmount: number
  disputedAmount: number
  recoveredAmount: number
  deductionCount: number
  recoveryRate: number
}

interface AgingBucket {
  label: string
  count: number
  totalAmount: number
}

export function DashboardPage() {
  useTitle('Dashboard')
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [byRetailer, setByRetailer] = useState<RetailerBreakdown[]>([])
  const [aging, setAging] = useState<AgingBucket[]>([])

  useEffect(() => {
    const companyId = (window as any).__companyId
    const qs = companyId ? `?companyId=${companyId}` : ''
    api<Summary>(`/dashboard/summary${qs}`).then(setSummary)
    api<RetailerBreakdown[]>(`/dashboard/by-retailer${qs}`).then(setByRetailer)
    api<AgingBucket[]>(`/dashboard/aging${qs}`).then(setAging)
  }, [])

  if (!summary) {
    return (
      <div>
        <div className="h-7 w-48 skeleton mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="h-3 w-20 skeleton mb-3" />
              <div className="h-8 w-32 skeleton mb-2" />
              <div className="h-3 w-24 skeleton" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 h-[340px] skeleton" />
          <div className="bg-white rounded-lg border border-gray-200 p-4 h-[340px] skeleton" />
        </div>
      </div>
    )
  }

  if (summary.totalDeductions === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recovery Dashboard</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <DollarSign size={32} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-medium text-gray-700 mb-1">No deductions yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Run the seed script to import existing data, or add deductions manually from the Deductions page.
          </p>
          <code className="text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-600 block max-w-md mx-auto">
            cd server && npx tsx src/seed/seed.ts
          </code>
        </div>
      </div>
    )
  }

  const metrics = [
    { label: 'Total Deductions', value: formatCurrency(summary.totalAmount), sub: `${summary.totalDeductions} deductions`, icon: DollarSign, color: 'text-gray-700', link: '/deductions' },
    { label: 'In Dispute', value: formatCurrency(Math.abs(summary.inDisputeAmount)), sub: `${summary.inDisputeCount} active`, icon: AlertCircle, color: 'text-orange-600', link: '/deductions?status=in_dispute,dispute_filed' },
    { label: 'Recovered', value: formatCurrency(summary.totalRecovered), sub: `${summary.resolvedCount} resolved`, icon: CheckCircle, color: 'text-green-600', link: '/deductions?status=resolved_won,resolved_lost,resolved_partial' },
    { label: 'Recovery Rate', value: `${summary.recoveryRate}%`, sub: `${summary.openCount} still open`, icon: TrendingUp, color: 'text-blue-600', link: '/deductions?status=open' },
  ]

  const pipeline = [
    { label: 'Open', count: summary.openCount, color: 'bg-blue-100 text-blue-700 border-blue-200', link: '/deductions?status=open' },
    { label: 'On Hold', count: summary.parkedCount, color: 'bg-amber-100 text-amber-700 border-amber-200', link: '/deductions?status=parked' },
    { label: 'In Dispute', count: summary.inDisputeCount, color: 'bg-orange-100 text-orange-700 border-orange-200', link: '/deductions?status=in_dispute,dispute_filed' },
    { label: 'Resolved', count: summary.resolvedCount, color: 'bg-green-100 text-green-700 border-green-200', link: '/deductions?status=resolved_won,resolved_lost,resolved_partial' },
    { label: 'Accepted', count: summary.acceptedCount, color: 'bg-gray-100 text-gray-700 border-gray-200', link: '/deductions?status=accepted' },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Recovery Dashboard</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            onClick={() => navigate(m.link)}
            className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 cursor-pointer hover:border-gray-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase">{m.label}</span>
              <m.icon size={16} className={m.color} />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{m.value}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recovery by Retailer */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Deductions by Retailer</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byRetailer.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="retailerName" type="category" width={90} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="totalAmount" name="Total" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Aging */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Aging of Active Disputes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aging}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="totalAmount" name="Amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-2 text-xs text-gray-500 px-4">
            {aging.map((b) => (
              <span key={b.label}>{b.count} deductions</span>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Pipeline Overview</h3>
        <div className="flex flex-wrap gap-2">
          {pipeline.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 flex-1 min-w-[100px]">
              <div
                onClick={() => navigate(s.link)}
                className={`flex-1 rounded-lg px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity border ${s.color}`}
              >
                <div className="text-2xl font-bold">{s.count}</div>
                <div className="text-xs font-medium">{s.label}</div>
              </div>
              {i < pipeline.length - 1 && (
                <ArrowRight size={14} className="text-gray-300 shrink-0 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
