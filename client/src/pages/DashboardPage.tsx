import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useTitle } from '../hooks/useTitle'
import { formatCurrency } from '../lib/utils'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, AlertCircle, CheckCircle, DollarSign, ArrowRight } from 'lucide-react'

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

interface TrendPoint {
  month: string
  deductions: number
  totalAmount: number
  disputedAmount: number
  recoveredAmount: number
  recoveryRate: number
}

const tooltipStyle = {
  backgroundColor: 'var(--c-panel)',
  borderColor: 'var(--c-edge)',
  borderRadius: '8px',
  color: 'var(--c-heading)',
}

export function DashboardPage() {
  useTitle('Dashboard')
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [byRetailer, setByRetailer] = useState<RetailerBreakdown[]>([])
  const [aging, setAging] = useState<AgingBucket[]>([])
  const [trends, setTrends] = useState<TrendPoint[]>([])

  useEffect(() => {
    const companyId = (window as any).__companyId
    const qs = companyId ? `?companyId=${companyId}` : ''
    api<Summary>(`/dashboard/summary${qs}`).then(setSummary)
    api<RetailerBreakdown[]>(`/dashboard/by-retailer${qs}`).then(setByRetailer)
    api<AgingBucket[]>(`/dashboard/aging${qs}`).then(setAging)
    api<TrendPoint[]>(`/dashboard/trends${qs}`).then(setTrends)
  }, [])

  if (!summary) {
    return (
      <div>
        <div className="h-7 w-48 skeleton mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-panel rounded-lg border border-edge p-4">
              <div className="h-3 w-20 skeleton mb-3" />
              <div className="h-8 w-32 skeleton mb-2" />
              <div className="h-3 w-24 skeleton" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-panel rounded-lg border border-edge p-4 h-[340px] skeleton" />
          <div className="bg-panel rounded-lg border border-edge p-4 h-[340px] skeleton" />
        </div>
      </div>
    )
  }

  if (summary.totalDeductions === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-heading mb-4">Recovery Dashboard</h2>
        <div className="bg-panel rounded-lg border border-edge p-8 text-center">
          <DollarSign size={32} className="mx-auto text-faint mb-3" />
          <h3 className="text-base font-medium text-prose mb-1">No deductions yet</h3>
          <p className="text-sm text-subtle mb-4">
            Run the seed script to import existing data, or add deductions manually from the Deductions page.
          </p>
          <code className="text-xs bg-panel-hover border border-edge rounded px-3 py-2 text-prose block max-w-md mx-auto">
            cd server && npx tsx src/seed/seed.ts
          </code>
        </div>
      </div>
    )
  }

  const metrics = [
    { label: 'Total Deductions', value: formatCurrency(summary.totalAmount), sub: `${summary.totalDeductions} deductions`, icon: DollarSign, color: 'text-heading', link: '/deductions' },
    { label: 'In Dispute', value: formatCurrency(Math.abs(summary.inDisputeAmount)), sub: `${summary.inDisputeCount} active`, icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400', link: '/deductions?status=in_dispute,dispute_filed' },
    { label: 'Recovered', value: formatCurrency(summary.totalRecovered), sub: `${summary.resolvedCount} resolved`, icon: CheckCircle, color: 'text-green-600 dark:text-green-400', link: '/deductions?status=resolved_won,resolved_lost,resolved_partial' },
  ]

  const pipeline = [
    { label: 'Open', count: summary.openCount, color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/25', link: '/deductions?status=open' },
    { label: 'On Hold', count: summary.parkedCount, color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25', link: '/deductions?status=parked' },
    { label: 'In Dispute', count: summary.inDisputeCount, color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/25', link: '/deductions?status=in_dispute,dispute_filed' },
    { label: 'Resolved', count: summary.resolvedCount, color: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/25', link: '/deductions?status=resolved_won,resolved_lost,resolved_partial' },
    { label: 'Accepted', count: summary.acceptedCount, color: 'bg-panel-hover text-prose border-edge', link: '/deductions?status=accepted' },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold text-heading mb-4">Recovery Dashboard</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            onClick={() => navigate(m.link)}
            className="bg-panel rounded-lg border border-edge p-3 sm:p-4 cursor-pointer hover:border-accent/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase">{m.label}</span>
              <m.icon size={16} className={m.color} />
            </div>
            <div className="text-lg sm:text-2xl font-bold text-heading">{m.value}</div>
            <div className="text-[10px] sm:text-xs text-subtle mt-1">{m.sub}</div>
          </div>
        ))}
        {/* Recovery Rate — navigates to /recovery */}
        <div
          onClick={() => navigate('/recovery')}
          className="bg-panel rounded-lg border border-edge p-3 sm:p-4 cursor-pointer hover:border-accent/40 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase">Recovery Rate</span>
            <TrendingUp size={16} className="text-accent-text" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-heading">{summary.recoveryRate}%</div>
          <div className="text-[10px] sm:text-xs text-subtle mt-1">{summary.resolvedCount} resolved cases</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recovery by Retailer */}
        <div className="bg-panel rounded-lg border border-edge p-4">
          <h3 className="text-sm font-medium text-prose mb-3">Deductions by Retailer</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byRetailer.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--c-subtle)', fontSize: 12 }} />
              <YAxis dataKey="retailerName" type="category" width={90} tick={{ fill: 'var(--c-subtle)', fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} labelStyle={{ color: 'var(--c-subtle)' }} />
              <Bar dataKey="totalAmount" name="Total" fill="var(--c-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Aging */}
        <div className="bg-panel rounded-lg border border-edge p-4">
          <h3 className="text-sm font-medium text-prose mb-3">Aging of Active Disputes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aging}>
              <XAxis dataKey="label" tick={{ fill: 'var(--c-subtle)', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--c-subtle)', fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} labelStyle={{ color: 'var(--c-subtle)' }} />
              <Bar dataKey="totalAmount" name="Amount" fill="var(--c-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-2 text-xs text-subtle px-4">
            {aging.map((b) => (
              <span key={b.label}>{b.count} deductions</span>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      {trends.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="bg-panel rounded-lg border border-edge p-4">
            <h3 className="text-sm font-medium text-prose mb-3">Monthly Dispute Volume</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--c-subtle)', fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--c-subtle)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: 'var(--c-subtle)' }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === 'disputedAmount' ? 'Disputed' : 'Recovered',
                  ]}
                />
                <Bar dataKey="disputedAmount" name="disputedAmount" fill="var(--c-accent)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="recoveredAmount" name="recoveredAmount" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-panel rounded-lg border border-edge p-4">
            <h3 className="text-sm font-medium text-prose mb-3">Recovery Rate Over Time</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-edge)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--c-subtle)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--c-subtle)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: 'var(--c-subtle)' }}
                  formatter={(value) => [`${value}%`, 'Recovery Rate']}
                />
                <Line type="monotone" dataKey="recoveryRate" stroke="var(--c-accent)" strokeWidth={2} dot={{ fill: 'var(--c-accent)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pipeline Overview */}
      <div className="mt-4 bg-panel rounded-lg border border-edge p-4">
        <h3 className="text-sm font-medium text-prose mb-3">Pipeline Overview</h3>
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
                <ArrowRight size={14} className="text-faint shrink-0 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
