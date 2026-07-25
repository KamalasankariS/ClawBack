import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { formatCurrency } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, AlertCircle, CheckCircle, DollarSign } from 'lucide-react'

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

  if (!summary) return <div className="text-gray-500">Loading...</div>

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

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Recovery Dashboard</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            onClick={() => navigate(m.link)}
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">{m.label}</span>
              <m.icon size={16} className={m.color} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{m.value}</div>
            <div className="text-xs text-gray-500 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Recovery by Retailer */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Deductions by Retailer</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byRetailer.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis dataKey="retailerName" type="category" width={90} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
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

      {/* Pipeline Summary */}
      <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Pipeline Overview</h3>
        <div className="flex gap-2">
          {[
            { label: 'Open', count: summary.openCount, color: 'bg-blue-100 text-blue-700', link: '/deductions?status=open' },
            { label: 'On Hold', count: summary.parkedCount, color: 'bg-amber-100 text-amber-700', link: '/deductions?status=parked' },
            { label: 'In Dispute', count: summary.inDisputeCount, color: 'bg-orange-100 text-orange-700', link: '/deductions?status=in_dispute,dispute_filed' },
            { label: 'Resolved', count: summary.resolvedCount, color: 'bg-green-100 text-green-700', link: '/deductions?status=resolved_won,resolved_lost,resolved_partial' },
            { label: 'Accepted', count: summary.acceptedCount, color: 'bg-gray-100 text-gray-700', link: '/deductions?status=accepted' },
          ].map((s) => (
            <div
              key={s.label}
              onClick={() => navigate(s.link)}
              className={`flex-1 rounded-lg px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity ${s.color}`}
            >
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
